// @local/git-viz — host half.
// Cordis plugin: registers /gitviz/* HTTP routes for the web GUI client half.
// Security: loopback fence + workspace gate + POST/JSON only (per official contract).
import { realpath } from 'node:fs/promises';
import * as git from './lib/git.js';
import { gitlabSnapshot } from './lib/gitlab.js';

export const inject = ['webServer', 'workspaceRegistry'];

const MOUNT_KEY = Symbol.for('dsh-web.mounted-plugins');
const BODY_LIMIT = 1024 * 1024;

const err = (code, message) => ({ ok: false, error: { code, message } });

/** Stable error codes for common git switch failures (contract §5). */
function classifySwitchFailure(message) {
  const m = String(message || '');
  if (/local changes to the following files would be overwritten/i.test(m)) return 'tracked-changes-would-be-overwritten';
  if (/untracked working tree files would be overwritten/i.test(m)) return 'untracked-would-be-overwritten';
  if (/did not match any file|invalid reference|not a valid branch|local branch not found/i.test(m)) return 'target-branch-not-found';
  if (/already exists/i.test(m)) return 'branch-exists';
  if (/is checked out in another worktree|already used by worktree/i.test(m)) return 'branch-in-other-worktree';
  if (/unresolved conflict/i.test(m)) return 'unmerged-conflicts';
  return 'switch-failed';
}

function hostname(hostHeader) {
  if (!hostHeader) return null;
  return String(hostHeader).replace(/:\d+$/, '').toLowerCase();
}

/** Loopback fence — only same-machine, same-origin browser requests (contract §4). */
function isLoopbackRequest(req) {
  const remote = req.socket?.remoteAddress;
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote)) return false;
  const host = hostname(req.headers.host);
  if (!['localhost', '[::1]', '127.0.0.1'].includes(host)) return false;
  if (req.headers['sec-fetch-site'] === 'cross-site') return false;
  const origin = req.headers.origin;
  if (origin !== undefined) {
    try {
      if (new URL(origin).host.replace(/:\d+$/, '') !== host) return false;
    } catch {
      return false;
    }
  }
  return true;
}

function readBody(req) {
  return new Promise((resolve) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > BODY_LIMIT) {
        req.destroy();
        resolve(null);
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        resolve(null);
      }
    });
    req.on('error', () => resolve(null));
  });
}

function send(res, status, payload) {
  if (res.writableEnded) return;
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  });
  res.end(body);
}

async function resolveWorkspacePath(ctx, raw) {
  if (typeof raw !== 'string' || !raw.trim()) return { error: err('invalid-request', 'missing path') };
  let canonical;
  try {
    canonical = await realpath(raw);
  } catch {
    return { error: err('workspace-unknown', 'path does not exist') };
  }
  const isWin = process.platform === 'win32';
  const norm = (p) => (isWin ? String(p).toLowerCase() : String(p));
  const inside = (root, p) => {
    const r = norm(root).replace(/[\\/]+$/, '');
    const q = norm(p);
    return q === r || q.startsWith(r + '\\') || q.startsWith(r + '/');
  };
  const known = ctx.workspaceRegistry.list().some((w) => inside(w.path, canonical));
  if (!known) return { error: err('workspace-unknown', 'path is not inside an open workspace') };
  return { canonical };
}

async function handleAction(url, body) {
  const sub = url.replace(/^\/gitviz\/?/, '').replace(/\/+$/, '').replace(/\?.*$/, '');
  if (sub === 'status') {
    const repo = await git.resolveRepo(body.path);
    if (!repo) return err('not-a-repo', 'not a git repository');
    const [st, branches, occupied, remotes] = await Promise.all([
      git.status(repo),
      git.listBranches(repo),
      git.worktreeOccupancy(repo),
      git.listRemoteBranches(repo).catch(() => []), // remote refs are optional
    ]);
    return { ok: true, value: { repo, ...st, branches, occupied, remotes } };
  }
  if (sub === 'log') {
    const repo = await git.resolveRepo(body.path);
    if (!repo) return err('not-a-repo', 'not a git repository');
    const limit = Math.max(1, Math.min(500, Number(body.limit) || 100));
    const skip = Math.max(0, Math.min(100000, Number(body.skip) || 0));
    // fetch limit+1 to detect hasMore without an extra roundtrip
    const [commits, tips] = await Promise.all([
      git.log(repo, { limit: limit + 1, skip }),
      git.branchTips(repo),
    ]);
    const hasMore = commits.length > limit;
    return { ok: true, value: { commits: hasMore ? commits.slice(0, limit) : commits, tips, hasMore } };
  }
  if (sub === 'switch') {
    const repo = await git.resolveRepo(body.path);
    if (!repo) return err('not-a-repo', 'not a git repository');
    if (typeof body.branch !== 'string' || !body.branch.trim()) {
      return err('invalid-request', 'missing branch');
    }
    // body.source (optional, e.g. "origin/feature"): create a local tracking
    // branch from a remote-only ref when no local branch of that name exists.
    try {
      const value = await git.switchBranch(repo, body.branch, {
        allowDirty: true,
        source: typeof body.source === 'string' && body.source.trim() ? body.source : null,
      });
      return { ok: true, value };
    } catch (e) {
      const message = String(e && e.message || e);
      return err(classifySwitchFailure(message), message);
    }
  }
  if (sub === 'fetch') {
    // Explicit user action only — touches the network (git fetch --prune).
    const repo = await git.resolveRepo(body.path);
    if (!repo) return err('not-a-repo', 'not a git repository');
    try {
      const value = await git.fetchRemote(repo, typeof body.remote === 'string' && body.remote.trim() ? body.remote : 'origin');
      return { ok: true, value };
    } catch (e) {
      const message = String(e && e.message || e);
      return err('fetch-failed', message.slice(0, 200));
    }
  }
  if (sub === 'discover') {
    // Workspace root may not be a repo itself — find repos at-or-below it.
    const value = await git.discoverRepos(body.path);
    return { ok: true, value };
  }
  if (sub === 'gitlab') {
    // Always resolves with a degraded shape — client hides extras quietly.
    try {
      const value = await gitlabSnapshot(String(body.path || ''));
      return { ok: true, value };
    } catch (e) {
      const message = String(e && e.message || e);
      return err('gitlab-failed', message.slice(0, 200));
    }
  }
  return err('unknown-route', `no handler for ${sub}`);
}

export function apply(ctx) {
  const mounted = (globalThis[MOUNT_KEY] ||= new Set());
  if (mounted.has('@local/git-viz')) return;
  mounted.add('@local/git-viz');

  ctx.effect(() => {
    const off = ctx.webServer.register({
      kind: 'prefix',
      path: '/gitviz',
      handler: async (req, res) => {
        try {
          if (req.method !== 'POST') return send(res, 405, err('method-not-allowed', 'POST only'));
          const ct = String(req.headers['content-type'] || '');
          if (!ct.includes('application/json')) return send(res, 415, err('unsupported-media-type', 'application/json only'));
          if (!isLoopbackRequest(req)) return send(res, 403, err('forbidden', 'loopback only'));
          const body = await readBody(req);
          if (body === null) return send(res, 400, err('invalid-request', 'bad JSON body'));
          const gate = await resolveWorkspacePath(ctx, body.path);
          if (gate.error) return send(res, 403, gate.error);
          const payload = await handleAction(req.url, body);
          send(res, payload.ok ? 200 : 400, payload);
        } catch (e) {
          send(res, 500, err('internal-error', String(e && e.message || e)));
        }
      },
    });
    return () => {
      try { off && off(); } catch { /* best effort */ }
      mounted.delete('@local/git-viz');
    };
  }, 'git-viz routes');
}
