// git-viz GitLab integration: infer the instance from the repo's remote URL,
// then read-only API calls for project info / merge requests / pipelines.
// Token comes from env GIT_VIZ_GITLAB_TOKEN (or GITLAB_TOKEN), read at request
// time. Without a token we fall back to anonymous access (public projects).
// Every failure degrades quietly — the plugin must never block local git views.

import { runGit, resolveRepo } from './git.js';

const HTTP_TIMEOUT_MS = 10000;
const MAX_BODY = 1024 * 1024; // 1MB response cap

/** Extract {base, host, projectPath} from a remote URL; null when unparseable. */
export function parseGitLabRemote(url) {
  if (!url) return null;
  url = url.trim();
  let m = url.match(/^https?:\/\/([^/]+)\/(.+?)(?:\.git)?\/?$/);
  if (m) {
    const scheme = url.startsWith('http://') ? 'http' : 'https';
    return { base: `${scheme}://${m[1]}`, host: m[1], projectPath: m[2] };
  }
  m = url.match(/^git@([^:]+):(.+?)(?:\.git)?$/); // scp-like ssh
  if (m) return { base: `https://${m[1]}`, host: m[1], projectPath: m[2] };
  m = url.match(/^ssh:\/\/git@([^:/]+)(?::\d+)?\/(.+?)(?:\.git)?$/);
  if (m) return { base: `https://${m[1]}`, host: m[1], projectPath: m[2] };
  return null;
}

/** One GET against <base>/api/v4/<path>; returns {status, body|null}. */
async function apiGet(base, path, token, query) {
  const fetchFn = globalThis.fetch;
  if (!fetchFn) throw new Error('host runtime has no global fetch');
  const url = new URL(`${base}/api/v4/${path}`);
  if (query) for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v));
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), HTTP_TIMEOUT_MS);
  try {
    const headers = { accept: 'application/json' };
    if (token) headers['private-token'] = token;
    const res = await fetchFn(url, { signal: ctrl.signal, headers });
    const len = Number(res.headers.get('content-length') || 0);
    if (len > MAX_BODY) return { status: res.status, body: null };
    const text = await res.text();
    if (text.length > MAX_BODY) return { status: res.status, body: null };
    let body = null;
    try { body = JSON.parse(text); } catch { body = null; }
    return { status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

async function originUrl(repoRoot) {
  const direct = await runGit(repoRoot, ['remote', 'get-url', 'origin']);
  if (direct.ok && direct.stdout.trim()) return direct.stdout.trim();
  const list = await runGit(repoRoot, ['remote']);
  const first = list.ok ? list.stdout.split('\n').filter(Boolean).sort()[0] : null;
  if (!first) return null;
  const r = await runGit(repoRoot, ['remote', 'get-url', first]);
  return r.ok ? r.stdout.trim() : null;
}

/**
 * Full GitLab snapshot for a workspace cwd.
 * Always resolves: {available:false, reason} when integration cannot serve.
 */
export async function gitlabSnapshot(cwd, env = process.env) {
  const repoRoot = await resolveRepo(cwd);
  if (!repoRoot) return { available: false, reason: 'not-a-repo' };
  const origin = await originUrl(repoRoot);
  if (!origin) return { available: false, reason: 'no-remote' };
  const inst = parseGitLabRemote(origin);
  if (!inst) return { available: false, reason: 'unrecognized-remote' };

  const token = env.GIT_VIZ_GITLAB_TOKEN || env.GITLAB_TOKEN || '';
  const enc = encodeURIComponent(inst.projectPath);
  let proj;
  try {
    proj = await apiGet(inst.base, `projects/${enc}`, token);
  } catch (err) {
    return { available: false, reason: 'network-error', detail: String(err && err.message || err).slice(0, 200) };
  }
  if (!proj) return { available: false, reason: 'network-error' };
  if (proj.status === 401 || proj.status === 403) {
    return { available: false, reason: 'auth-required', projectUrl: `${inst.base}/${inst.projectPath}`, host: inst.host };
  }
  if (proj.status === 404 || !proj.body || typeof proj.body !== 'object') {
    return { available: false, reason: 'not-gitlab-or-invisible', host: inst.host };
  }

  // Project reachable — now MR list + pipelines in parallel; tolerate failures.
  const encId = proj.body.id != null ? String(proj.body.id) : enc;
  let mrs = { status: 0, body: null };
  let pipes = { status: 0, body: null };
  try {
    [mrs, pipes] = await Promise.all([
      apiGet(inst.base, `projects/${encId}/merge_requests`, token, { state: 'all', per_page: 100, order_by: 'updated_at', sort: 'desc' }),
      apiGet(inst.base, `projects/${encId}/pipelines`, token, { per_page: 20, sort: 'desc', order_by: 'id' }),
    ]);
  } catch { /* degrade with empty lists */ }

  return {
    available: true,
    authenticated: Boolean(token),
    origin,
    host: inst.host,
    project: {
      name: proj.body.path_with_namespace || inst.projectPath,
      url: proj.body.web_url || `${inst.base}/${inst.projectPath}`,
      defaultBranch: proj.body.default_branch || null,
    },
    mrs: (Array.isArray(mrs.body) ? mrs.body : []).map((x) => ({
      iid: x.iid,
      title: String(x.title || '').slice(0, 200),
      state: x.state, // opened / merged / closed / locked
      sha: x.sha || null,
      mergeCommitSha: x.merge_commit_sha || null,
      source: x.source_branch,
      target: x.target_branch,
      url: x.web_url,
      author: (x.author && x.author.username) || '',
    })),
    pipelines: (Array.isArray(pipes.body) ? pipes.body : []).map((x) => ({
      id: x.id,
      status: x.status, // success / failed / running / pending / canceled ...
      ref: x.ref,
      sha: x.sha,
      url: x.web_url,
    })),
  };
}
