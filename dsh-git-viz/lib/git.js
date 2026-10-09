// git-viz host git core: run git in the host process, framework-free.
// All commands are read-only except switchBranch, which is guarded.
// Field separator \x1f, record separator \x1e — survives any commit text.
import { spawn } from 'node:child_process';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const GIT_TIMEOUT_MS = 15000;
const MAX_OUTPUT = 8 * 1024 * 1024;

export function runGit(cwd, args, timeoutMs = GIT_TIMEOUT_MS, env = null) {
  return new Promise((resolve) => {
    const child = spawn('git', ['--no-optional-locks', ...args], {
      cwd,
      windowsHide: true,
      ...(env ? { env: { ...process.env, ...env } } : {}),
    });
    let stdout = '';
    let stderr = '';
    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      child.kill();
    }, timeoutMs);
    let overflow = false;
    const onChunk = (buf, prev) => {
      if (stdout.length + stderr.length > MAX_OUTPUT) {
        overflow = true;
        child.kill();
        return prev;
      }
      return prev + buf.toString('utf8');
    };
    child.stdout.on('data', (b) => { stdout = onChunk(b, stdout); });
    child.stderr.on('data', (b) => { stderr = onChunk(b, stderr); });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ ok: false, code: -1, stdout: '', stderr: String(err && err.message || err) });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (killed) resolve({ ok: false, code: 124, stdout, stderr: stderr || 'git timed out' });
      else if (overflow) resolve({ ok: false, code: 124, stdout: '', stderr: 'git output exceeded limit' });
      else resolve({ ok: code === 0, code, stdout, stderr });
    });
  });
}

const FS = '\x1f';
const RS = '\x1e';

function ok(result, what) {
  if (!result.ok) {
    const detail = (result.stderr || '').split('\n').filter(Boolean).slice(-1)[0] || `git exited ${result.code}`;
    throw new Error(`${what}: ${detail}`);
  }
  return result.stdout;
}

/** Resolve the repo root for a workspace cwd; null when not a git repo. */
export async function resolveRepo(cwd) {
  const r = await runGit(cwd, ['rev-parse', '--show-toplevel']);
  if (!r.ok) return null;
  return r.stdout.trim();
}

/** Branch + dirty + unmerged snapshot of the worktree. */
export async function status(repoRoot) {
  const out = ok(await runGit(repoRoot, ['status', '--porcelain=v1', '-b']), 'git status');
  const lines = out.split('\n');
  const head = lines[0] || '';
  // "## main...origin/main [ahead 1, behind 2]" or "## No commits yet on main" or "## HEAD (no branch)"
  let branch = null;
  let detached = false;
  let ahead = 0;
  let behind = 0;
  const m = head.match(/^## (?:no commits yet on )?(?:HEAD \(no branch\)|(\S+))(.*)$/);
  if (/HEAD \(no branch\)/.test(head)) { detached = true; }
  else if (m) { branch = m[1]; }
  const ab = head.match(/\[ahead (\d+)(?:, behind (\d+))?\]|\[behind (\d+)\]/);
  if (ab) {
    ahead = Number(ab[1] || 0);
    behind = Number(ab[2] || ab[3] || 0);
  }
  let dirty = 0;
  let unmerged = 0;
  for (const line of lines.slice(1)) {
    if (!line) continue;
    dirty += 1;
    const xy = line.slice(0, 2);
    if (xy.includes('U') || xy.includes('A') && xy.includes('A')) unmerged += 1;
  }
  return { branch, detached, ahead, behind, dirty, unmerged };
}

/** Local branches with metadata; `current` flagged. */
export async function listBranches(repoRoot) {
  const fmt = ['%(refname:short)', '%(HEAD)', '%(objectname:short)', '%(upstream:short)', '%(committerdate:unix)', '%(subject)'].join(FS);
  const out = ok(await runGit(repoRoot, ['for-each-ref', `--format=${fmt}`, 'refs/heads']), 'git for-each-ref');
  return out.split('\n').filter(Boolean).map((line) => {
    const [name, head, sha, upstream, date, subject] = line.split(FS);
    return {
      name,
      current: head === '*',
      sha,
      upstream: upstream || null,
      date: Number(date) * 1000,
      subject,
    };
  });
}

/** Branches checked out in linked worktrees (switch must refuse those). */
export async function worktreeOccupancy(repoRoot) {
  const out = ok(await runGit(repoRoot, ['worktree', 'list', '--porcelain']), 'git worktree list');
  const entries = [];
  let cur = null;
  for (const line of out.split('\n')) {
    if (line.startsWith('worktree ')) {
      if (cur) entries.push(cur);
      cur = { path: line.slice(9), branch: null };
    } else if (line.startsWith('branch ') && cur) {
      cur.branch = line.slice(7).replace(/^refs\/heads\//, '');
    } else if (line.startsWith('detached') && cur) {
      cur.branch = null;
    }
  }
  if (cur) entries.push(cur);
  const real = repoRoot.replace(/[\\/]+$/, '');
  return entries
    .filter((e) => e.branch && e.path.replace(/[\\/]+$/, '') !== real)
    .map((e) => e.branch);
}

/**
 * Remote-tracking branches (refs/remotes) — lets the UI offer branches that
 * exist on the remote but were never checked out locally. No network use:
 * only reflects what the last fetch brought in.
 */
export async function listRemoteBranches(repoRoot) {
  const fmt = ['%(refname:short)', '%(objectname:short)', '%(committerdate:unix)', '%(subject)'].join(FS);
  const out = ok(await runGit(repoRoot, ['for-each-ref', `--format=${fmt}`, 'refs/remotes']), 'git for-each-ref');
  const list = [];
  for (const line of out.split('\n').filter(Boolean)) {
    const [name, sha, date, subject] = line.split(FS);
    if (name.endsWith('/HEAD')) continue; // symbolic default-branch pointer, not a branch
    const slash = name.indexOf('/');
    if (slash <= 0) continue;
    list.push({
      name,                    // "origin/feature/x"
      remote: name.slice(0, slash),
      short: name.slice(slash + 1), // "feature/x"
      sha,
      date: Number(date) * 1000,
      subject,
    });
  }
  return list;
}

/** `git fetch --prune <remote>` — network-touching, hence explicit user action only. */
export async function fetchRemote(repoRoot, remote = 'origin') {
  if (!/^[\w][\w.-]*$/.test(remote)) throw new Error(`invalid remote name: ${remote}`);
  // GIT_TERMINAL_PROMPT=0 → fail fast instead of hanging on credential prompts
  const r = await runGit(repoRoot, ['fetch', '--prune', remote], 60000, { GIT_TERMINAL_PROMPT: '0' });
  if (!r.ok) {
    const detail = (r.stderr || '').split('\n').filter(Boolean).slice(-1)[0] || `git fetch exited ${r.code}`;
    throw new Error(detail);
  }
  return { fetched: true };
}

function validBranchName(name) {
  return typeof name === 'string' && /^[\w][\w./-]*$/.test(name) && !name.includes('..') && name.length < 200;
}

/**
 * Switch branch with guards. Returns {switched, branch, warnings, createdFrom}.
 * When `source` is given (e.g. "origin/feature") and no local branch `name`
 * exists yet, a local tracking branch is created from it (git switch -c --track)
 * — so remote-only branches are switchable without a manual `git checkout -b`.
 */
export async function switchBranch(repoRoot, name, { allowDirty = false, source = null } = {}) {
  if (!validBranchName(name)) throw new Error(`invalid branch name: ${name}`);
  if (source !== null && (!validBranchName(source) || !source.includes('/'))) {
    throw new Error(`invalid source ref: ${source}`);
  }
  const st = await status(repoRoot);
  if (st.unmerged > 0) {
    throw new Error(`worktree has ${st.unmerged} unresolved conflict(s); resolve them before switching`);
  }
  const branches = await listBranches(repoRoot);
  const target = branches.find((b) => b.name === name);
  if (!target && !source) throw new Error(`local branch not found: ${name}`);
  if (target && target.current) return { switched: false, branch: name, warnings: [] };
  if (st.branch === null && !st.detached) { /* unborn branch */ }
  const occupied = await worktreeOccupancy(repoRoot);
  if (occupied.includes(name)) {
    throw new Error(`branch ${name} is checked out in another worktree`);
  }
  const warnings = [];
  if (st.dirty > 0) {
    if (!allowDirty) warnings.push(`${st.dirty} uncommitted change(s) will be carried over or block the switch`);
    // git itself refuses when local changes would be overwritten; we do not force.
  }
  // names are validated above (no leading dash), so no `--` guard needed;
  // in the create case `--` would make git treat the source ref as a path.
  const argv = target
    ? ['switch', '--no-guess', '--', name]
    : ['switch', '--no-guess', '-c', name, '--track', source];
  const r = await runGit(repoRoot, argv);
  if (!r.ok) {
    const detail = (r.stderr || '').split('\n').filter(Boolean).slice(-2).join(' ');
    throw new Error(detail || `git switch failed (${r.code})`);
  }
  return { switched: true, branch: name, warnings, createdFrom: target ? null : source };
}

/** Commit log with parents and ref decorations for graph lanes. */
export async function log(repoRoot, { ref = 'HEAD', limit = 300, skip = 0 } = {}) {
  const limitClamped = Math.max(1, Math.min(1000, Number(limit) || 300));
  const skipClamped = Math.max(0, Math.min(100000, Number(skip) || 0));
  const refArg = ref === 'HEAD' || validBranchName(ref) ? ref : 'HEAD';
  const fmt = `%H${FS}%P${FS}%h${FS}%an${FS}%ad${FS}%D${FS}%s${RS}`;
  const out = ok(await runGit(repoRoot, [
    'log', refArg,
    `--date=iso8601-strict`,
    `--pretty=format:${fmt}`,
    '--topo-order',
    `-n`, String(limitClamped),
    `--skip`, String(skipClamped),
  ]), 'git log');
  return out.split(RS).filter((rec) => rec.trim()).map((rec) => {
    const [sha, parents, short, author, date, refs, subject] = rec.trim().split(FS);
    return {
      sha,
      parents: parents ? parents.split(' ') : [],
      short,
      author,
      date,
      refs: refs ? refs.split(', ').map((s) => s.trim()).filter(Boolean) : [],
      subject,
    };
  });
}

/** Branch tips for decorating the graph (which lane is which branch). */
export async function branchTips(repoRoot) {
  const out = ok(await runGit(repoRoot, [
    'for-each-ref', `--format=%(refname:short)${FS}%(objectname)`, 'refs/heads',
  ]), 'git for-each-ref');
  const tips = {};
  for (const line of out.split('\n').filter(Boolean)) {
    const [name, sha] = line.split(FS);
    tips[sha] = tips[sha] || [];
    tips[sha].push(name);
  }
  return tips;
}

/**
 * Discover git repos at-or-below a start directory (workspace root may not be a repo itself).
 * - If start (or an ancestor) is a repo → { repo: toplevel, candidates: [toplevel] }.
 * - Else scan child dirs (depth ≤ 2) for a `.git` entry (dir or worktree file).
 * Bounded: ≤ 200 dirs scanned, ≤ 8 candidates, skips heavy/vendor dirs. Read-only.
 */
const SKIP_DIRS = new Set(['node_modules', '.venv', 'venv', '__pycache__', 'dist', 'build', 'target', 'site-packages', '.cache', '.scratch', '.git']);
export async function discoverRepos(start, { maxDepth = 2, maxScan = 200, maxHits = 8 } = {}) {
  const repo = await resolveRepo(start);
  if (repo) return { repo, candidates: [repo] };
  const candidates = [];
  let scanned = 0;
  const hasGit = async (dir) => {
    try { await stat(join(dir, '.git')); return true; } catch { return false; }
  };
  const walk = async (dir, depth) => {
    if (candidates.length >= maxHits || scanned >= maxScan) return;
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (candidates.length >= maxHits || scanned >= maxScan) return;
      if (!e.isDirectory() || SKIP_DIRS.has(e.name) || e.name.startsWith('pip-')) continue;
      scanned += 1;
      const child = join(dir, e.name);
      if (await hasGit(child)) {
        candidates.push(child);
        continue; // do not descend into a found repo
      }
      if (depth + 1 < maxDepth) await walk(child, depth + 1);
    }
  };
  await walk(start, 0);
  return { repo: null, candidates };
}
