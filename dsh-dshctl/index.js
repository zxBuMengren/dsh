// @local/dsh-ctl — host half.
// Provides /dshctl/* routes on the dsh web server:
//   POST /dshctl/status  → runtime info of this dsh web process
//   POST /dshctl/restart → relay-baton restart: spawn detached helper, answer, then exit
// Security: loopback-only fence + POST + JSON, mirroring @local/git-viz.

import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const inject = ['webServer'];

const BRIDGE_PORT = 3081;

/** Host header carries a port ("127.0.0.1:61909") — strip it before comparing. */
function hostnameOf(hostHeader) {
  if (!hostHeader) return null;
  return String(hostHeader).replace(/:\d+$/, '').toLowerCase();
}

function isLoopbackRequest(req) {
  const ra = req.socket?.remoteAddress || '';
  if (ra !== '127.0.0.1' && ra !== '::1' && ra !== '::ffff:127.0.0.1') return false;
  const host = hostnameOf(req.headers.host);
  if (host !== 'localhost' && host !== '[::1]' && host !== '127.0.0.1') return false;
  if (req.headers['sec-fetch-site'] === 'cross-site') return false;
  const origin = req.headers.origin;
  if (origin !== undefined) {
    try {
      if (new URL(origin).host.replace(/:\d+$/, '') !== host) return false;
    } catch { return false; }
  }
  return true;
}

function readBody(req) {
  return new Promise((resolve) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > 64 * 1024) { resolve(null); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { resolve(null); }
    });
    req.on('error', () => resolve(null));
  });
}

function readPortFile() {
  try {
    return JSON.parse(readFileSync(join(homedir(), '.dsh', 'dsh-web-port.json'), 'utf8'));
  } catch { return null; }
}

function readDshVersion() {
  try {
    // process.argv[1] = ...\@deepseek-ai\dsh\lib\bin.js → package.json two levels up
    const pkg = join(dirname(dirname(process.argv[1] || '')), 'package.json');
    return JSON.parse(readFileSync(pkg, 'utf8')).version || '';
  } catch { return ''; }
}

function fmtUptime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h ? `${h}h ${m}m` : m ? `${m}m ${s}s` : `${s}s`;
}

export function apply(ctx, config) {
  const marker = Symbol.for('dsh-web.mounted-plugins');
  const mounted = process[marker] || (process[marker] = new Set());
  if (mounted.has('dsh-ctl')) return;

  const log = (...a) => console.log('[dsh-ctl]', ...a);
  const err = (code, message) => ({ ok: false, error: { code, message } });

  async function handleAction(sub, body) {
    if (sub === 'status') {
      const pf = readPortFile();
      return {
        ok: true,
        value: {
          pid: process.pid,
          ppid: process.ppid,
          node: process.version,
          platform: process.platform,
          dshVersion: readDshVersion(),
          uptimeSec: Math.round(process.uptime()),
          uptimeText: fmtUptime(process.uptime()),
          startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
          argv: process.argv,
          cwd: process.cwd(),
          url: (pf && pf.url) || '',
          port: pf && pf.port,
        },
      };
    }
    if (sub === 'restart') {
      if (!body || body.confirm !== 'restart') {
        return err('confirm-required', 'send {confirm:"restart"} to restart dsh web');
      }
      const helperPath = join(dirname(fileURLToPath(import.meta.url)), 'lib', 'restart-helper.mjs');
      const payload = JSON.stringify({
        node: process.execPath,
        script: process.argv[1],
        rest: process.argv.slice(2),
        cwd: process.cwd(),
        bridgePort: BRIDGE_PORT,
        oldPid: process.pid,
      });
      try {
        const child = spawn(process.execPath, [helperPath, payload], {
          detached: true,
          stdio: 'ignore',
          windowsHide: true,
        });
        child.unref();
      } catch (e) {
        return err('spawn-failed', String(e && e.message || e).slice(0, 200));
      }
      log('restart requested — helper spawned, exiting in 600ms');
      // Answer first, flush, then exit. Sessions persist on disk and resume.
      setTimeout(() => process.exit(0), 600).unref();
      return { ok: true, value: { restarting: true, bridge: `http://127.0.0.1:${BRIDGE_PORT}/` } };
    }
    return err('unknown-route', `no handler for ${sub}`);
  }

  const dispose = ctx.effect(() => {
    mounted.add('dsh-ctl');
    const off = ctx.webServer.register({
      kind: 'prefix',
      path: '/dshctl',
      // dsh-host-webserver calls handler(req, res) only — derive the path from
      // req.url (the router already guaranteed longest-prefix-wins for /dshctl).
      handler: async (req, res) => {
        const pathname = new URL(req.url || '/', 'http://x').pathname;
        const sub = pathname.replace(/^\/dshctl\//, '').replace(/\/+$/, '');
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(err('method-not-allowed', 'POST only')));
          return;
        }
        if (!isLoopbackRequest(req)) {
          res.statusCode = 403;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(err('forbidden', 'loopback only')));
          return;
        }
        const ct = String(req.headers['content-type'] || '');
        if (!ct.includes('application/json')) {
          res.statusCode = 415;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(err('unsupported-media-type', 'application/json required')));
          return;
        }
        const body = await readBody(req);
        if (body === null) {
          res.statusCode = 400;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(err('bad-json', 'invalid JSON body')));
          return;
        }
        const result = await handleAction(sub, body);
        res.statusCode = result.ok ? 200 : (result.error.code === 'unknown-route' ? 404 : 400);
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(result));
      },
    });
    log('mounted: /dshctl/* (status, restart)');
    return () => {
      if (typeof off === 'function') off();
      mounted.delete('dsh-ctl');
    };
  });

  return dispose;
}
