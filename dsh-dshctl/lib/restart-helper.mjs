// restart-helper.mjs — detached relay-baton for @local/dsh-ctl.
// Spawned by the dying dsh web process with a JSON payload on argv[2]:
//   { node, script, rest[], cwd, bridgePort, oldPid }
// Phases:
//   0. start one-shot bridge (127.0.0.1:bridgePort) answering 202 'waiting'
//   1. wait for oldPid to exit (<= 60s)
//   2. relaunch dsh web in a NEW console window (Windows `start`), detached otherwise
//   3. poll ~/.dsh/dsh-web-port.json until pid changes (<= 120s)
//   4. bridge answers 200 + new URL (plain text) so the waiting page can redirect;
//      keeps serving 120s more, then exits.
// DRYRUN=1: phase 2 logs the command instead of spawning; DRYRUN_PORTFILE overrides
// the port file path for rehearsal.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { appendFileSync, readFileSync, openSync, closeSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DRYRUN = process.env.DRYRUN === '1';
// payload via env (robust against argv quoting) with argv fallback (host spawn quotes correctly)
const payload = JSON.parse(process.env.DSHCTL_PAYLOAD || process.argv[2] || '{}');
const { node, script, rest = [], cwd = process.cwd(), bridgePort = 3081, oldPid } = payload;

const HOME = homedir();
const LOG = DRYRUN && process.env.DRYRUN_LOG
  ? process.env.DRYRUN_LOG
  : join(HOME, '.dsh', 'logs', 'dshctl-restart.log');
const PORTFILE = DRYRUN && process.env.DRYRUN_PORTFILE
  ? process.env.DRYRUN_PORTFILE
  : join(HOME, '.dsh', 'dsh-web-port.json');

const log = (m) => {
  const line = `[${new Date().toISOString()}] ${m}`;
  try { appendFileSync(LOG, line + '\n'); } catch { /* best effort */ }
  if (DRYRUN) console.log(line);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };

let bridgeUrl = null; // set once the new port file is seen

// ---- phase 0: bridge ----
let bridgeServed = 0;
const BRIDGE_HEADERS = {
  'content-type': 'text/plain; charset=utf-8',
  'cache-control': 'no-store',
  // The waiting page lives on another origin (the dsh web port) — allow it to poll.
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
};
const bridge = createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, BRIDGE_HEADERS);
    res.end();
    return;
  }
  if (bridgeUrl) {
    bridgeServed++;
    res.writeHead(200, BRIDGE_HEADERS);
    res.end(bridgeUrl);
  } else {
    res.writeHead(202, BRIDGE_HEADERS);
    res.end('waiting');
  }
});
const bridgeUp = await new Promise((resolve) => {
  bridge.once('error', (e) => { log(`bridge disabled: ${e.code || e.message}`); resolve(false); });
  bridge.listen(bridgePort, '127.0.0.1', () => { log(`bridge listening on 127.0.0.1:${bridgePort}`); resolve(true); });
});

// ---- phase 1: wait for the old process to die ----
if (oldPid) {
  let waited = 0;
  while (alive(oldPid) && waited < 60000) { await sleep(250); waited += 250; }
  log(`old pid ${oldPid} ${alive(oldPid) ? 'STILL ALIVE after 60s' : 'exited'} (waited ${Math.round(waited / 1000)}s)`);
}

// ---- phase 1.5: keep the SAME port across restarts ----
// The browser cookie is audience-bound to host:port (dsh-client-connection
// canonicalAuthority), so a stable port means the existing session cookie
// stays valid and the page only needs an F5 after restart. The desktop-shell
// launcher spawns `dsh web --port 0` (OS picks random) — treat "--port 0" as
// NOT pinned: strip it and reuse the port the old process was serving on
// (read the port file BEFORE it gets rewritten). A nonzero explicit --port is
// respected as-is.
function effectiveRest(args, oldPort) {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && i + 1 < args.length) {
      const v = args[i + 1];
      i++;
      if (String(Number(v)) !== '0') out.push('--port', v);
      continue;
    }
    if (args[i].startsWith('--port=')) {
      if (String(Number(args[i].slice(7))) !== '0') out.push(args[i]);
      continue;
    }
    out.push(args[i]);
  }
  if (!out.some((a) => a === '--port' || a.startsWith('--port=')) && oldPort) {
    out.push('--port', String(oldPort));
  }
  return out;
}
let launchRest = rest;
{
  let oldPort = null;
  try {
    const old = JSON.parse(readFileSync(PORTFILE, 'utf8').replace(/^\uFEFF/, ''));
    if (old && Number.isInteger(old.port) && old.port > 0) oldPort = old.port;
  } catch { /* no port file yet — let the OS pick */ }
  const pinned = effectiveRest(rest, oldPort);
  if (pinned.join('\u0000') !== rest.join('\u0000')) {
    log(`pinning port ${oldPort} for the relaunch (stable cookie authority; was: ${rest.join(' ')})`);
  }
  launchRest = pinned;
}

// ---- phase 2: relaunch (background — no console window) ----
// The user asked for no lingering frontend console: dsh web is relaunched
// detached with windowsHide, output appended to a log file. The fresh URL is
// delivered by the bridge (and with port pinning the old URL keeps working
// anyway), so nothing depends on a visible console anymore.
const CONSOLE_LOG = join(HOME, '.dsh', 'logs', 'dsh-web-console.log');
if (DRYRUN) {
  log(`DRYRUN relaunch (background): "${node}" "${script}" ${launchRest.join(' ')} (cwd "${cwd}", output >> ${CONSOLE_LOG})`);
} else {
  let outFd;
  try { outFd = openSync(CONSOLE_LOG, 'a'); } catch { /* fall back to ignore */ }
  try {
    const child = spawn(node, [script, ...launchRest], {
      detached: true,
      cwd,
      stdio: ['ignore', outFd !== undefined ? outFd : 'ignore', outFd !== undefined ? outFd : 'ignore'],
      windowsHide: true,
    });
    child.unref();
    log(`relaunched in background: ${node} ${script} ${launchRest.join(' ')} (pid ${child.pid}, output >> ${CONSOLE_LOG})`);
  } finally {
    if (outFd !== undefined) try { closeSync(outFd); } catch { /* best effort */ }
  }
}

// ---- phase 3: wait for the new port file generation ----
let pf = null;
for (let i = 0; i < 240; i++) {
  await sleep(500);
  try {
    const j = JSON.parse(readFileSync(PORTFILE, 'utf8').replace(/^\uFEFF/, ''));
    if (j && j.url && j.pid && j.pid !== oldPid) { pf = j; break; }
  } catch { /* keep polling */ }
}
if (pf) {
  bridgeUrl = pf.url;
  log(`new generation: pid ${pf.pid} port ${pf.port} — bridge now serving the new URL`);
} else {
  log('timeout: new port file generation not seen in 120s');
}

// ---- phase 4: linger for late pollers, then exit ----
if (DRYRUN && !bridgeUp) process.exit(0);
const lingerMs = bridgeUp ? (bridgeUrl ? 120000 : 60000) : 1000;
await sleep(lingerMs);
log(`exiting (served ${bridgeServed} redirect(s))`);
bridge.close();
process.exit(0);
