// @local/git-viz — client half. One top-level ModuleLoader.load statement (contract §2).
// Pure JS, no build chain: React via require('react') from the platform module table.
window.__ModuleLoader__.load({
  id: '@local/git-viz',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    const React = require('react');
    const { createPortal } = require('react-dom');
    const h = React.createElement;

    /* ---------------- styles (namespaced .dsh-gv-*, injected once) ---------------- */
    const CSS = `
.dsh-gv-chip{display:inline-flex;align-items:center;gap:4px;padding:2px 10px;border-radius:999px;
  border:1px solid var(--dsw-alias-color-border,rgba(128,128,128,.35));background:var(--dsw-alias-color-bg-secondary,rgba(128,128,128,.10));
  color:var(--dsw-alias-color-text-primary,inherit);font-size:12px;cursor:pointer;white-space:nowrap;}
.dsh-gv-chip:hover{background:var(--dsw-alias-color-bg-hover,rgba(128,128,128,.18));}
.dsh-gv-backdrop{position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.45);
  display:flex;align-items:center;justify-content:center;}
.dsh-gv-dialog{display:flex;flex-direction:column;width:min(92vw,1080px);height:min(86vh,760px);
  border-radius:12px;border:1px solid var(--dsw-alias-color-border,#3a3a40);
  background:var(--dsw-alias-color-bg-elevated,#232327);color:var(--dsw-alias-color-text-primary,#e8e8ea);
  box-shadow:0 18px 48px rgba(0,0,0,.5);overflow:hidden;}
.dsh-gv-head{display:flex;align-items:center;gap:8px;padding:10px 14px;
  border-bottom:1px solid var(--dsw-alias-color-border,#3a3a40);flex:0 0 auto;}
.dsh-gv-title{font-weight:600;font-size:14px;}
.dsh-gv-repo{font-size:12px;color:var(--dsw-alias-color-text-secondary,#9a9aa2);
  max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dsh-gv-badge{font-size:11px;padding:1px 8px;border-radius:999px;border:1px solid #55555c;color:#cfcfd6;}
.dsh-gv-badge.warn{border-color:#8a6d3b;color:#e2b557;}
.dsh-gv-badge.bad{border-color:#8a3b3b;color:#e57373;}
.dsh-gv-spacer{flex:1;}
.dsh-gv-btn{padding:3px 12px;font-size:12px;border-radius:7px;cursor:pointer;
  border:1px solid var(--dsw-alias-color-border,#4a4a52);
  background:var(--dsw-alias-color-bg-secondary,rgba(255,255,255,.05));color:inherit;}
.dsh-gv-btn:hover{background:var(--dsw-alias-color-bg-hover,rgba(255,255,255,.1));}
.dsh-gv-btn:disabled{opacity:.5;cursor:default;}
.dsh-gv-body{display:flex;flex:1;min-height:0;}
.dsh-gv-branches{flex:0 0 262px;overflow:auto;border-right:1px solid var(--dsw-alias-color-border,#3a3a40);padding:6px;}
.dsh-gv-btitle{font-size:11px;color:var(--dsw-alias-color-text-secondary,#9a9aa2);padding:6px 6px 4px;text-transform:uppercase;letter-spacing:.4px;}
.dsh-gv-bdiv{font-size:10.5px;color:var(--dsw-alias-color-text-secondary,#9a9aa2);padding:8px 6px 2px;margin-top:4px;
  border-top:1px solid var(--dsw-alias-color-border,#3a3a40);letter-spacing:.3px;}
.dsh-gv-bopt-rm span{font-weight:400;}
.dsh-gv-bsync{display:block;width:100%;padding:6px 8px;margin-top:6px;border:0;border-radius:8px;cursor:pointer;
  font-size:11.5px;color:var(--dsw-alias-color-text-secondary,inherit);
  background:var(--dsw-alias-color-bg-secondary,rgba(128,128,128,.08));}
.dsh-gv-bsync:hover:not(:disabled){background:var(--dsw-alias-color-bg-hover,rgba(128,128,128,.16));}
.dsh-gv-bsync:disabled{opacity:.55;cursor:default;}
.dsh-gv-bitem{display:block;width:100%;text-align:left;padding:6px 8px;border:0;border-radius:8px;
  background:transparent;color:inherit;cursor:pointer;font-size:12px;}
.dsh-gv-bitem:hover{background:var(--dsw-alias-color-bg-hover,rgba(255,255,255,.08));}
.dsh-gv-bitem.cur{background:rgba(79,142,247,.16);}
.dsh-gv-bitem:disabled{opacity:.45;cursor:default;}
.dsh-gv-bname{display:flex;align-items:center;gap:6px;font-weight:500;}
.dsh-gv-bsub{font-size:11px;color:var(--dsw-alias-color-text-secondary,#8b8b93);margin-top:2px;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dsh-gv-graphwrap{flex:1;min-width:0;display:flex;flex-direction:column;}
.dsh-gv-scroll{flex:1;overflow:auto;}
.dsh-gv-more{flex:0 0 auto;padding:8px;display:flex;justify-content:center;gap:10px;align-items:center;
  border-top:1px solid var(--dsw-alias-color-border,#3a3a40);}
.dsh-gv-foot{flex:0 0 auto;padding:6px 14px;font-size:12px;min-height:30px;display:flex;align-items:center;gap:10px;
  border-top:1px solid var(--dsw-alias-color-border,#3a3a40);}
.dsh-gv-err{color:#e57373;}
.dsh-gv-hint{color:var(--dsw-alias-color-text-secondary,#8b8b93);}
.dsh-gv-empty{padding:40px;text-align:center;color:var(--dsw-alias-color-text-secondary,#8b8b93);font-size:13px;}
.dsh-gv-svg text{font-family:var(--dsw-alias-font-family,ui-sans-serif,system-ui,'Segoe UI',sans-serif);}
.dsh-gv-spin{animation:dsh-gv-rot 1s linear infinite;display:inline-block;}
@keyframes dsh-gv-rot{to{transform:rotate(360deg)}}
.dsh-gv-chip-ghost{opacity:.55;cursor:default;}
.dsh-gv-bdrop{z-index:9990;padding:4px;max-height:280px;overflow:auto;
  background:var(--dsw-alias-color-bg-elevated,#26262c);
  border:1px solid var(--dsw-alias-color-border,#4a4a52);border-radius:10px;
  box-shadow:0 8px 24px rgba(0,0,0,.45);
  font-family:var(--dsw-alias-font-family,ui-sans-serif,system-ui,'Segoe UI',sans-serif);}
.dsh-gv-bopt{display:flex;align-items:center;gap:6px;width:100%;text-align:left;padding:6px 10px;
  border:0;border-radius:7px;background:transparent;color:inherit;cursor:pointer;font-size:12px;}
.dsh-gv-bopt:hover{background:var(--dsw-alias-color-bg-hover,rgba(255,255,255,.09));}
.dsh-gv-bopt.cur{font-weight:700;}
.dsh-gv-bopt.dis{opacity:.5;cursor:default;}
.dsh-gv-bopt small{margin-left:auto;color:var(--dsw-alias-color-text-secondary,#8b8b93);font-size:10px;}
/* explicit light theme — data-gv-theme sits on the backdrop / dropdown roots.
   Values use var(--dsw-alias-*, light-fallback): forwarded tokens (harvested from the app tree)
   win when present, so the chrome follows the app's REAL theme; literals only fill gaps. */
.dsh-gv-backdrop[data-gv-theme="light"]{background:rgba(0,0,0,.30);}
.dsh-gv-backdrop[data-gv-theme="light"] .dsh-gv-dialog{background:var(--dsw-alias-color-bg-elevated,#fff);color:var(--dsw-alias-color-text-primary,#1f1f24);border-color:var(--dsw-alias-color-border,#d9d9e0);box-shadow:0 18px 48px rgba(0,0,0,.22);}
.dsh-gv-backdrop[data-gv-theme="light"] .dsh-gv-badge{border-color:var(--dsw-alias-color-border,#c6c6cf);color:var(--dsw-alias-color-text-secondary,#4a4a55);}
.dsh-gv-backdrop[data-gv-theme="light"] .dsh-gv-btn:hover,
.dsh-gv-backdrop[data-gv-theme="light"] .dsh-gv-bitem:hover{background:rgba(0,0,0,.06);}
.dsh-gv-backdrop[data-gv-theme="light"] .dsh-gv-bitem.cur{background:rgba(79,142,247,.14);}
.dsh-gv-bdrop[data-gv-theme="light"]{background:var(--dsw-alias-color-bg-elevated,#fff);border-color:var(--dsw-alias-color-border,#d9d9e0);color:var(--dsw-alias-color-text-primary,#1f1f24);box-shadow:0 8px 24px rgba(0,0,0,.18);}
.dsh-gv-bdrop[data-gv-theme="light"] .dsh-gv-bopt:hover{background:rgba(0,0,0,.06);}
`;
    function ensureStyle() {
      try {
        if (document.querySelector('style[data-plugin="git-viz"]')) return;
        const s = document.createElement('style');
        s.setAttribute('data-plugin', 'git-viz');
        s.textContent = CSS;
        document.head.appendChild(s);
      } catch { /* non-fatal */ }
    }

    /* ---------------- host API (document-relative per contract: <base href="./">) ---------------- */
    async function api(route, body) {
      const res = await fetch('gitviz/' + route, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      try {
        return await res.json();
      } catch {
        return { ok: false, error: { code: 'bad-response', message: 'HTTP ' + res.status } };
      }
    }

    /* ---------------- lane layout (verified by .scratch/lane-test.mjs 8/8) ---------------- */
    function layoutGraph(commits, tips) {
      const rows = [];
      const edges = [];
      const lanes = [];
      const laneOfIncoming = new Map();
      const rowOfSha = new Map();
      commits.forEach((c, i) => rowOfSha.set(c.sha, i));
      const takeFreeLane = (sha) => {
        let k = lanes.indexOf(null);
        if (k === -1) { k = lanes.length; lanes.push(undefined); }
        lanes[k] = sha;
        laneOfIncoming.set(sha, k);
        return k;
      };
      commits.forEach((c, row) => {
        let k = laneOfIncoming.get(c.sha);
        if (k === undefined) k = takeFreeLane(c.sha);
        laneOfIncoming.delete(c.sha);
        rows.push({ sha: c.sha, lane: k, refs: tips[c.sha] || [] });
        lanes[k] = null;
        c.parents.forEach((p, pi) => {
          let pk = laneOfIncoming.get(p);
          if (pk === undefined) {
            pk = pi === 0 ? k : takeFreeLane(p);
            lanes[pk] = p;
            laneOfIncoming.set(p, pk);
          }
          if (rowOfSha.has(p)) edges.push({ from: { row, lane: k }, to: { row: rowOfSha.get(p), lane: pk } });
          else edges.push({ from: { row, lane: k }, to: null, stub: true });
        });
      });
      return { rows, edges, laneCount: Math.max(1, lanes.length) };
    }

    /* ---------------- graph rendering ---------------- */
    const LANE_W = 14, ROW_H = 30, DOT_R = 4.5, LANE_X0 = 10, TEXT_X0 = 0;
    const LANE_COLORS = ['#4f8ef7', '#f2a63b', '#57b883', '#b57ef7', '#e06c6f', '#4fb3d9', '#d4a05a', '#8fb4c9', '#c76fd4', '#8ac24a', '#f2779e', '#6d8fd9'];
    const laneColor = (k) => LANE_COLORS[k % LANE_COLORS.length];
    const laneX = (k) => LANE_X0 + k * LANE_W;
    const rowY = (r) => r * ROW_H + ROW_H / 2;

    function esc(s) { return String(s == null ? '' : s); }
    // CJK/fullwidth glyphs are ~1em wide, ASCII ~0.58em — naive char-count broke on Chinese subjects (overlap bug).
    const CJK_RE = /[\u1100-\u11FF\u2E80-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\u3000-\u303F\uFF00-\uFFEF]/;
    function textW(s, size) {
      let w = 0;
      for (const ch of String(s)) w += (CJK_RE.test(ch) ? 1.0 : 0.58) * size;
      return w;
    }
    function clipToWidth(s, size, max) {
      s = String(s);
      if (textW(s, size) <= max) return s;
      let out = '';
      for (const ch of s) {
        if (textW(out + ch, size) > max - size * 1.1) return out + '…';
        out += ch;
      }
      return out + '…';
    }
    function shortDate(iso) {
      const d = new Date(iso);
      if (isNaN(d)) return '';
      const p = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
    }

    const MR_COLORS = { merged: '#7bc96f', opened: '#4f8ef7', closed: '#8b8b93', locked: '#e2b557' };
    const PIPE_GLYPH = { success: ['✓', '#7bc96f'], failed: ['✗', '#e57373'], running: ['⟳', '#e2b557'], pending: ['○', '#8b8b93'], canceled: ['⊘', '#8b8b93'], skipped: ['○', '#6f6f78'] };

    /* ---------------- theme (follow the app's real theme; explicit choice persisted) ----------------
       The GUI marks dark mode with body[data-ds-dark-theme] and injects --dsw-alias-* tokens into the
       app container at runtime — our portals hang off document.body, OUTSIDE that container, so
       var(--dsw-alias-*) falls back to our dark literals. Fix: (a) read the attribute for the theme,
       (b) harvest the token values from an in-tree element and forward them inline to portal roots. */
    const GV_ALIASES = ['--dsw-alias-color-border', '--dsw-alias-color-bg-secondary', '--dsw-alias-color-text-primary',
      '--dsw-alias-color-bg-hover', '--dsw-alias-color-bg-elevated', '--dsw-alias-color-text-secondary',
      '--dsw-alias-color-bg', '--dsw-alias-font-family'];
    function harvestAliases() {
      const out = {};
      try {
        const start = document.querySelector('.dsh-gv-chip') || document.getElementById('root') || document.body;
        // walking up and keeping the FIRST non-empty value per name mirrors CSS inheritance exactly
        for (let el = start; el; el = el.parentElement) {
          const cs = getComputedStyle(el);
          for (const name of GV_ALIASES) {
            if (out[name]) continue;
            const v = (cs.getPropertyValue(name) || '').trim();
            if (v) out[name] = v;
          }
        }
      } catch { /* no DOM yet */ }
      return out;
    }
    function parseRGB(v) {
      if (!v) return null;
      v = String(v).trim();
      let m = /^#([0-9a-f]{3})$/i.exec(v);
      if (m) return [parseInt(m[1][0] + m[1][0], 16), parseInt(m[1][1] + m[1][1], 16), parseInt(m[1][2] + m[1][2], 16)];
      m = /^#([0-9a-f]{6})/i.exec(v);
      if (m) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)];
      m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+%?))?\)/.exec(v);
      if (m) {
        if (m[4] !== undefined && parseFloat(m[4]) === 0) return null; // fully transparent — carries no signal
        return [+m[1], +m[2], +m[3]];
      }
      return null;
    }
    function isLightColor(v) {
      const c = parseRGB(v);
      return !!c && (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255 > 0.5;
    }
    function detectLightTheme() {
      try {
        const b = document.body, h = document.documentElement;
        // 1) the app's own dark-mode marker (its CSS keys off body[data-ds-dark-theme])
        if ((b && b.hasAttribute('data-ds-dark-theme')) || (h && h.hasAttribute('data-ds-dark-theme'))) return false;
        if ((b && b.hasAttribute('data-ds-light-theme')) || (h && h.hasAttribute('data-ds-light-theme'))) return true;
        // 2) luminance of the harvested alias tokens (values the app actually renders with)
        const av = harvestAliases();
        if (av['--dsw-alias-color-bg-elevated']) return isLightColor(av['--dsw-alias-color-bg-elevated']);
        if (av['--dsw-alias-color-bg']) return isLightColor(av['--dsw-alias-color-bg']);
        // 3) luminance of painted backgrounds
        const cs = getComputedStyle(document.body);
        if (parseRGB(cs.backgroundColor)) return isLightColor(cs.backgroundColor);
        const hs = getComputedStyle(document.documentElement);
        if (parseRGB(hs.backgroundColor)) return isLightColor(hs.backgroundColor);
      } catch { /* no DOM */ }
      return false;
    }
    function gvTheme() {
      try { const s = localStorage.getItem('dsh-gv-theme'); if (s === 'light' || s === 'dark') return s; } catch { /* private mode */ }
      return detectLightTheme() ? 'light' : 'dark';
    }
    const GV_PAL = {
      dark: { subject: '#e8e8ea', author: '#8b8b93', date: '#6f6f78', dotStroke: '#1d1d21' },
      light: { subject: '#26262e', author: '#5f5f68', date: '#6b6b76', dotStroke: '#ffffff' },
    };

    function CommitGraph({ commits, tips, mrsBySha, pal }) {
      const P = pal || GV_PAL.dark;
      const layout = React.useMemo(() => layoutGraph(commits, tips), [commits, tips]);
      const laneAreaW = LANE_X0 + layout.laneCount * LANE_W + 8;
      const textX = laneAreaW + 6;
      const SUBJ_W = 520, AUTHOR_W = 150; // fixed column budgets → no cross-column overlap
      const height = commits.length * ROW_H + 8; // must precede the edge loop: stub edges read it
      let maxX = textX;
      const kids = [];
      // edges first (under dots)
      for (const e of layout.edges) {
        const color = laneColor(e.from.lane);
        const y1 = rowY(e.from.row), x1 = laneX(e.from.lane);
        let d;
        if (e.stub) {
          const y2 = height;
          d = `M ${x1} ${y1} L ${x1} ${y2}`;
        } else {
          const x2 = laneX(e.to.lane), y2 = rowY(e.to.row);
          if (x1 === x2) d = `M ${x1} ${y1} L ${x2} ${y2}`;
          else {
            const my = (y1 + y2) / 2;
            d = `M ${x1} ${y1} C ${x1} ${my} ${x2} ${my} ${x2} ${y2}`;
          }
        }
        kids.push(h('path', {
          key: 'e' + kids.length, d, fill: 'none',
          stroke: color, strokeWidth: 1.6, opacity: 0.85,
          strokeDasharray: e.stub ? '3 3' : undefined,
        }));
      }
      // rows
      layout.rows.forEach((row, i) => {
        const c = commits[i];
        const color = laneColor(row.lane);
        const y = rowY(i);
        kids.push(h('circle', { key: 'd' + i, cx: laneX(row.lane), cy: y, r: DOT_R, fill: color, stroke: P.dotStroke, strokeWidth: 1 }));
        let x = textX;
        // ref labels (HEAD / branches / tags)
        const headRef = c.refs.find((r) => r === 'HEAD' || r.startsWith('HEAD ->'));
        const otherRefs = c.refs.filter((r) => r !== headRef);
        const refTexts = [];
        if (headRef) refTexts.push({ text: 'HEAD', color: '#e57373' });
        for (const r of otherRefs) refTexts.push({ text: r.replace('tag: ', ''), color: r.startsWith('tag:') ? '#e2b557' : '#4f8ef7' });
        for (const rt of refTexts) {
          const label = clipToWidth(rt.text, 11, 160);
          kids.push(h('text', { key: 'r' + i + '-' + Math.round(x), x, y: y + 3.5, fill: rt.color, fontSize: 11, fontWeight: 600 }, label + ' '));
          x += textW(label, 11) + 8;
        }
        // GitLab MR badge — anchored to the row's commit sha
        const mr = mrsBySha && mrsBySha.get(c.sha);
        if (mr) {
          const label = `!${mr.iid}`;
          const mc = MR_COLORS[mr.state] || '#8b8b93';
          kids.push(h('a', { key: 'm' + i, href: mr.url, target: '_blank', rel: 'noopener' },
            h('text', { x, y: y + 3.5, fill: mc, fontSize: 11, fontWeight: 700, textDecoration: 'underline' }, `${label} `)));
          x += textW(label, 11) + 8;
        }
        const subj = clipToWidth(esc(c.subject), 12.5, SUBJ_W);
        kids.push(h('text', { key: 's' + i, x, y: y + 3.5, fill: P.subject, fontSize: 12.5 }, subj));
        x += textW(subj, 12.5) + 16;
        const author = clipToWidth(esc(c.author), 11.5, AUTHOR_W);
        kids.push(h('text', { key: 'a' + i, x, y: y + 3.5, fill: P.author, fontSize: 11.5 }, author));
        x += textW(author, 11.5) + 14;
        kids.push(h('text', { key: 't' + i, x, y: y + 3.5, fill: P.date, fontSize: 11 }, shortDate(c.date)));
        x += textW(shortDate(c.date), 11);
        if (x > maxX) maxX = x;
      });
      const width = Math.max(textX + 860, maxX + 24);
      return h('svg', { class: 'dsh-gv-svg', width, height, style: { display: 'block' } }, kids);
    }

    /* ---------------- branch panel ---------------- */
    function BranchPanel({ status, busy, onSwitch, onFetch, fetching, pipelineByRef }) {
      const occupied = new Set(status.occupied || []);
      const localNames = new Set(status.branches.map((b) => b.name));
      const remoteOnly = (status.remotes || [])
        .filter((r) => !localNames.has(r.short) && r.short !== dispBranch(status))
        .sort((a, b) => b.date - a.date);
      return h('div', { className: 'dsh-gv-branches' },
        h('div', { className: 'dsh-gv-btitle' }, `分支（${status.branches.length}）`),
        status.branches.map((b) => {
          const pipe = pipelineByRef && pipelineByRef.get(b.name);
          const [pg, pc] = pipe ? (PIPE_GLYPH[pipe.status] || ['●', '#8b8b93']) : [null, null];
          return h('button', {
            key: b.name,
            className: 'dsh-gv-bitem' + (b.current ? ' cur' : ''),
            disabled: busy || b.current,
            title: occupied.has(b.name) ? '已被其他 worktree 检出' : `${b.sha}${b.upstream ? ' → ' + b.upstream : ''}`,
            onClick: () => onSwitch(b.name),
          },
            h('div', { className: 'dsh-gv-bname' },
              h('span', null, b.current ? '✓ ' : '　'),
              h('span', { style: { color: occupied.has(b.name) ? '#8b8b93' : '#4f8ef7' } }, b.name),
              occupied.has(b.name) ? h('span', { style: { fontSize: 10, color: '#6f6f78' } }, ' (worktree)') : null,
              pipe ? h('a', {
                href: pipe.url, target: '_blank', rel: 'noopener',
                title: `pipeline #${pipe.id} · ${pipe.status}`,
                style: { marginLeft: 6, color: pc, fontWeight: 700, textDecoration: 'none' },
                onClick: (e) => e.stopPropagation(),
              }, `${pg} `) : null),
            h('div', { className: 'dsh-gv-bsub' }, `${b.sha} · ${esc(b.subject).slice(0, 30)}`),
          );
        }),
        remoteOnly.length ? h('div', { className: 'dsh-gv-bdiv' }, `远端 ${remoteOnly[0].remote} · 未检出（点击创建跟踪分支）`) : null,
        remoteOnly.slice(0, 50).map((r) => {
          const pipe = pipelineByRef && pipelineByRef.get(r.short);
          const [pg, pc] = pipe ? (PIPE_GLYPH[pipe.status] || ['●', '#8b8b93']) : [null, null];
          return h('button', {
            key: r.name,
            className: 'dsh-gv-bitem',
            disabled: busy,
            title: `${r.name} · ${r.sha}\n本地创建跟踪分支并检出`,
            onClick: () => onSwitch(r.short, r.name),
          },
            h('div', { className: 'dsh-gv-bname' },
              h('span', null, '　'),
              h('span', { style: { color: '#4f8ef7' } }, '↳ ' + r.short),
              h('span', { style: { fontSize: 10, color: '#6f6f78' } }, ' (' + r.remote + ')'),
              pipe ? h('a', {
                href: pipe.url, target: '_blank', rel: 'noopener',
                title: `pipeline #${pipe.id} · ${pipe.status}`,
                style: { marginLeft: 6, color: pc, fontWeight: 700, textDecoration: 'none' },
                onClick: (e) => e.stopPropagation(),
              }, `${pg} `) : null),
            h('div', { className: 'dsh-gv-bsub' }, `${r.sha} · ${esc(r.subject).slice(0, 30)}`),
          );
        }),
        onFetch ? h('button', { className: 'dsh-gv-bsync', disabled: busy || fetching, onClick: onFetch },
          fetching ? '拉取中…' : '⟳ 拉取远端（fetch --prune）') : null,
      );
    }

    /* ---------------- dialog ---------------- */
    const LIMIT = 100;
    function GitVizDialog({ path, onClose }) {
      const [status, setStatus] = React.useState(null);
      const [log, setLog] = React.useState(null); // {commits, tips, hasMore}
      const [skip, setSkip] = React.useState(0);
      const [err, setErr] = React.useState(null);
      const [hint, setHint] = React.useState(null);
      const [busy, setBusy] = React.useState(false);
      const [gl, setGl] = React.useState(null); // GitLab snapshot, null = degraded/off
      const [glNote, setGlNote] = React.useState(null); // auth-required hint
      const [repoPath, setRepoPath] = React.useState(null); // discovered repo (workspace root not a repo)
      const [candidates, setCandidates] = React.useState(null); // discovered repo list
      const [theme, setTheme] = React.useState(gvTheme); // 'dark' | 'light' (follows the app's real theme)
      const tokens = React.useMemo(() => harvestAliases(), []); // forwarded --dsw-alias-* values for our body-level portals
      const eff = repoPath || path; // effective repo path for every api call
      const toggleTheme = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        try { localStorage.setItem('dsh-gv-theme', next); } catch { /* private mode */ }
        setTheme(next);
      };

      const loadGitlab = React.useCallback(async (p) => {
        try {
          const r = await api('gitlab', { path: p || eff });
          if (r.ok && r.value && r.value.available) { setGl(r.value); setGlNote(null); }
          else {
            setGl(null);
            setGlNote(r.ok && r.value && r.value.reason === 'auth-required'
              ? 'GitLab 需要访问令牌：设置环境变量 GIT_VIZ_GITLAB_TOKEN 后重启 dsh' : null);
          }
        } catch { setGl(null); }
      }, [eff]);

      const loadStatus = React.useCallback(async () => {
        const r = await api('status', { path: eff });
        if (!r.ok) { setErr(`${r.error.code}: ${r.error.message}`); return null; }
        setStatus(r.value);
        return r.value;
      }, [eff]);

      const loadLog = React.useCallback(async (reset) => {
        const sk = reset ? 0 : undefined;
        const r = await api('log', { path: eff, limit: LIMIT, ...(sk !== undefined ? { skip: sk } : { skip }) });
        if (!r.ok) { setErr(`${r.error.code}: ${r.error.message}`); return; }
        setErr(null);
        setSkip(reset ? LIMIT : skip + LIMIT);
        if (reset) setLog(r.value);
        else setLog((prev) => ({
          commits: prev ? prev.commits.concat(r.value.commits) : r.value.commits,
          tips: r.value.tips,
          hasMore: r.value.hasMore,
        }));
      }, [eff, skip]);

      React.useEffect(() => {
        (async () => {
          setBusy(true);
          let target = path;
          let st = await api('status', { path: target });
          if (!st.ok && st.error.code === 'not-a-repo') {
            // workspace root is not a repo — look for repos in child dirs
            const d = await api('discover', { path: target }).catch(() => null);
            const cands = d && d.ok && d.value && d.value.candidates ? d.value.candidates : [];
            if (cands.length) {
              setCandidates(cands);
              target = cands[0];
              setRepoPath(target);
              setHint(`工作区根不是仓库，已定位子仓库 ${target.split(/[\\/]/).pop()}`);
              st = await api('status', { path: target });
            }
          }
          if (!st.ok) {
            setErr(st.error.code === 'not-a-repo'
              ? 'not-a-repo: 此工作区不是 git 仓库，子目录中也未发现 .git（可先 git init 或检查路径）'
              : `${st.error.code}: ${st.error.message}`);
          } else {
            setStatus(st.value);
            const lg = await api('log', { path: target, limit: LIMIT, skip: 0 });
            if (lg.ok) { setLog(lg.value); setSkip(LIMIT); }
            else if (lg.error.code !== 'not-a-repo') setErr(`${lg.error.code}: ${lg.error.message}`);
          }
          setBusy(false);
          loadGitlab(target); // fire-and-forget: never blocks local git views
        })();
      }, []); // eslint-disable-line

      const mrsBySha = React.useMemo(() => {
        if (!gl) return null;
        const m = new Map();
        for (const mr of gl.mrs) {
          if (mr.sha) m.set(mr.sha, mr);
          if (mr.mergeCommitSha) m.set(mr.mergeCommitSha, mr);
        }
        return m;
      }, [gl]);
      const pipelineByRef = React.useMemo(() => {
        if (!gl) return null;
        const m = new Map(); // pipelines sorted desc → first seen per ref is latest
        for (const p of gl.pipelines) if (!m.has(p.ref)) m.set(p.ref, p);
        return m;
      }, [gl]);

      React.useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [onClose]);

      const doSwitch = async (name, source) => {
        setBusy(true); setErr(null); setHint(source ? `从 ${source} 创建并切换到 ${name} …` : `切换到 ${name} …`);
        const body = { path: eff, branch: name };
        if (source) body.source = source; // remote-only ref → host creates a tracking branch
        const r = await api('switch', body);
        setBusy(false);
        if (!r.ok) { setHint(null); setErr(`切换失败 [${r.error.code}] ${r.error.message}`); return; }
        setHint(r.value.switched ? `已切换到 ${name}` : `当前就在 ${name}`);
        setBusy(true);
        await loadStatus();
        await loadLog(true);
        setBusy(false);
      };

      const doFetch = async () => {
        setBusy(true); setErr(null); setHint('拉取远端 …');
        const r = await api('fetch', { path: eff });
        if (!r.ok) { setHint(null); setErr(`拉取失败 [${r.error.code}] ${r.error.message}`); setBusy(false); return; }
        await loadStatus();
        setHint('已拉取远端分支');
        setBusy(false);
      };

      const switchTarget = async (c) => {
        setBusy(true); setErr(null); setStatus(null); setLog(null);
        setRepoPath(c);
        const st = await api('status', { path: c });
        if (!st.ok) { setErr(`${st.error.code}: ${st.error.message}`); setBusy(false); return; }
        setStatus(st.value);
        const lg = await api('log', { path: c, limit: LIMIT, skip: 0 });
        if (lg.ok) { setLog(lg.value); setSkip(LIMIT); }
        setBusy(false);
        loadGitlab(c);
      };

      if (!path) {
        return h(DialogShell, { onClose },
          h('div', { className: 'dsh-gv-empty' }, '未找到当前会话的工作目录，无法打开图谱。'));
      }

      const badges = [];
      if (status) {
        if (status.detached) badges.push(h('span', { key: 'det', className: 'dsh-gv-badge bad' }, 'detached HEAD'));
        if (status.ahead) badges.push(h('span', { key: 'ad', className: 'dsh-gv-badge' }, `↑${status.ahead}`));
        if (status.behind) badges.push(h('span', { key: 'bd', className: 'dsh-gv-badge' }, `↓${status.behind}`));
        if (status.dirty) badges.push(h('span', { key: 'dt', className: 'dsh-gv-badge warn' }, `${status.dirty} 处改动`));
        if (status.unmerged) badges.push(h('span', { key: 'um', className: 'dsh-gv-badge bad' }, `${status.unmerged} 冲突`));
      }

      const repoPicker = candidates && candidates.length > 1
        ? h('select', {
            className: 'dsh-gv-btn', value: eff, title: '切换目标仓库',
            style: { padding: '2px 6px', maxWidth: 180 },
            onChange: (e) => { if (e.target.value !== eff) switchTarget(e.target.value); },
          }, candidates.map((c) => h('option', { key: c, value: c }, c.split(/[\\/]/).pop())))
        : null;

      return h(DialogShell, { onClose, repo: status && status.repo, branch: status && status.branch, badges, busy, gl, picker: repoPicker,
        theme, onToggleTheme: toggleTheme, tokens,
        onRefresh: async () => { setBusy(true); await loadStatus(); await loadLog(true); setBusy(false); loadGitlab(); } },
        status
          ? h('div', { className: 'dsh-gv-body' },
              h(BranchPanel, { status, busy, onSwitch: doSwitch, onFetch: doFetch, fetching: busy, pipelineByRef }),
              h('div', { className: 'dsh-gv-graphwrap' },
                h('div', { className: 'dsh-gv-scroll' },
                  log && log.commits.length
                    ? h(CommitGraph, { commits: log.commits, tips: log.tips, mrsBySha, pal: GV_PAL[theme] })
                    : h('div', { className: 'dsh-gv-empty' }, busy ? '加载中…' : '（无提交）')),
                log && log.hasMore
                  ? h('div', { className: 'dsh-gv-more' },
                      h('button', { className: 'dsh-gv-btn', disabled: busy, onClick: () => loadLog(false) }, '加载更多'))
                  : null))
          : h('div', { className: 'dsh-gv-empty' }, busy ? '加载中…' : ' '),
        h('div', { className: 'dsh-gv-foot' },
          err ? h('span', { className: 'dsh-gv-err' }, err) : null,
          hint ? h('span', { className: 'dsh-gv-hint' }, hint) : null,
          glNote ? h('span', { className: 'dsh-gv-hint' }, glNote) : null,
          !err && !hint && status ? h('span', { className: 'dsh-gv-hint' }, gl ? `GitLab: ${gl.mrs.length} MR · 图谱中 !N 角标可点击 · 分支后为最新流水线` : '点击左侧分支切换 · 曲线颜色 = 泳道 · 虚线 = 更早历史') : null));
    }

    function DialogShell({ onClose, repo, branch, badges, busy, gl, picker, theme, onToggleTheme, tokens, onRefresh, children }) {
      return createPortal(
        h('div', {
          className: 'dsh-gv-backdrop',
          'data-gv-theme': theme || 'dark',
          style: tokens || undefined, // forwarded --dsw-alias-* values (portal lives outside the app's themed tree)
          onMouseDown: (e) => { if (e.target === e.currentTarget) onClose(); },
        },
          h('div', { className: 'dsh-gv-dialog', role: 'dialog', 'aria-modal': 'true', 'data-dsh-plugin': 'git-viz', 'data-dsh-part': 'dialog' },
            h('div', { className: 'dsh-gv-head' },
              h('span', { className: 'dsh-gv-title' }, '🌿 Git 图谱'),
              picker,
              repo ? h('span', { className: 'dsh-gv-repo', title: repo }, `${repo.split(/[\\/]/).pop()}${branch ? ' · ' + String(branch).split('...')[0] : ''}`) : null,
              gl && gl.project ? h('a', {
                href: gl.project.url, target: '_blank', rel: 'noopener',
                title: gl.project.name + (gl.authenticated ? '' : ' · 匿名访问'),
                style: { fontSize: 11, color: '#e28b50', textDecoration: 'none', marginLeft: 4 },
              }, `⧉ ${gl.host}`) : null,
              badges,
              h('span', { className: 'dsh-gv-spacer' }),
              busy ? h('span', { className: 'dsh-gv-hint' }, '⏳') : null,
              onToggleTheme ? h('button', {
                className: 'dsh-gv-btn',
                title: theme === 'light' ? '当前：亮色 · 点击切换暗色' : '当前：暗色 · 点击切换亮色',
                onClick: onToggleTheme,
              }, theme === 'light' ? '☀ 亮' : '🌙 暗') : null,
              onRefresh ? h('button', { className: 'dsh-gv-btn', disabled: busy, onClick: onRefresh }, '刷新') : null,
              h('button', { className: 'dsh-gv-btn', onClick: onClose }, '关闭 ✕')),
            children)),
        document.body);
    }

    /* ---------------- chip (slot component) ---------------- */
    // resolve session cwd → effective repo path (with sub-repo discovery), shared by chip + switcher
    async function resolveTarget(path) {
      if (!path) return null;
      let st = await api('status', { path }).catch(() => null);
      if (st && st.ok) return { path, status: st.value };
      if (st && st.error && st.error.code === 'not-a-repo') {
        const d = await api('discover', { path }).catch(() => null);
        const cands = d && d.ok && d.value && d.value.candidates ? d.value.candidates : [];
        if (cands.length) {
          st = await api('status', { path: cands[0] }).catch(() => null);
          if (st && st.ok) return { path: cands[0], status: st.value };
        }
      }
      return null;
    }
    const dispBranch = (st) => (st.detached
      ? ((st.branches || []).find((b) => b.current) || {}).sha ? ((st.branches.find((b) => b.current).sha) || '').slice(0, 7) : 'detached'
      : String(st.branch || '').split('...')[0] || '—');

    /** Inline branch switcher next to the graph chip: current branch + dropdown, no dialog needed. */
    function BranchSwitcher({ getTarget }) {
      const [info, setInfo] = React.useState(null); // {path, status} | 'fail'
      const [open, setOpen] = React.useState(false);
      const [loading, setLoading] = React.useState(false);
      const [err, setErr] = React.useState(null);
      const [menuPos, setMenuPos] = React.useState(null);
      const [fetching, setFetching] = React.useState(false);
      const btnRef = React.useRef(null);

      const refresh = React.useCallback(async (target) => {
        const t = target || await resolveTarget(getTarget());
        setInfo(t || 'fail');
        return t;
      }, [getTarget]);

      React.useEffect(() => { refresh(); }, []); // eslint-disable-line

      React.useEffect(() => {
        if (!open) return;
        const onDown = (e) => { if (!e.target.closest || !e.target.closest('[data-dsh-gv-menu]')) setOpen(false); };
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        window.addEventListener('mousedown', onDown);
        window.addEventListener('keydown', onKey);
        return () => { window.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey); };
      }, [open]);

      if (!info) return h('span', { className: 'dsh-gv-chip dsh-gv-chip-ghost', title: '读取分支…' }, '⎇ …');
      if (info === 'fail') return null; // not a repo and nothing discovered → stay quiet

      const st = info.status;
      const toggle = () => {
        if (open) { setOpen(false); return; }
        const r = btnRef.current && btnRef.current.getBoundingClientRect();
        if (!r) { setMenuPos({ left: 0, top: 0, minW: 170 }); setOpen(true); setErr(null); setLoading(true); return; }
        const vh = window.innerHeight, vw = window.innerWidth;
        const minW = Math.max(170, r.width);
        const estH = Math.min(280, ((st.branches || []).length + (st.remotes || []).length || 1) * 29 + 60);
        // chip lives in the composer dock (bottom of screen): flip UP when the menu would not fit below
        const flipUp = r.bottom + estH + 12 > vh;
        const left = Math.max(8, Math.min(r.left, vw - minW - 8)); // keep inside right edge
        setMenuPos(flipUp
          ? { left, bottom: vh - r.top + 6, minW }
          : { left, top: r.bottom + 4, minW });
        setOpen(true);
        setErr(null);
        setLoading(true);
        api('status', { path: info.path }).then((res) => {
          setLoading(false);
          if (res.ok) setInfo({ path: info.path, status: res.value });
          else setErr(`${res.error.code}: ${res.error.message}`);
        }).catch(() => setLoading(false));
      };
      const doSwitch = async (name, source) => {
        setErr(null); setLoading(true);
        const body = { path: info.path, branch: name };
        if (source) body.source = source; // remote-only ref → host creates a tracking branch
        const r = await api('switch', body).catch(() => null);
        setLoading(false);
        if (!r || !r.ok) { setErr(!r ? '网络错误' : `切换失败 [${r.error.code}] ${r.error.message}`); return; }
        setOpen(false);
        refresh({ path: info.path, status: { ...st, branch: name + (st.branch && st.branch.includes('...') ? '...' : ''), branches: st.branches.map((b) => ({ ...b, current: b.name === name })) } });
      };
      const doFetch = async () => {
        setErr(null); setFetching(true);
        const r = await api('fetch', { path: info.path }).catch(() => null);
        setFetching(false);
        if (!r || !r.ok) { setErr(!r ? '网络错误' : `拉取失败 [${r.error.code}] ${r.error.message}`); return; }
        setLoading(true);
        api('status', { path: info.path }).then((res) => {
          setLoading(false);
          if (res.ok) setInfo({ path: info.path, status: res.value });
          else setErr(`${res.error.code}: ${res.error.message}`);
        }).catch(() => setLoading(false));
      };
      const occupied = new Set(st.occupied || []);
      // remote branches with no local counterpart → offered as "check out & track"
      const localNames = new Set((st.branches || []).map((b) => b.name));
      const remoteOnly = (st.remotes || [])
        .filter((r) => !localNames.has(r.short) && r.short !== dispBranch(st))
        .sort((a, b) => b.date - a.date);
      return h(React.Fragment, null,
        h('button', {
          ref: btnRef, className: 'dsh-gv-chip', onClick: toggle,
          title: `当前分支 ${dispBranch(st)} · 点击直接切换`,
          style: { opacity: st.detached ? 0.75 : 1 },
        }, `⎇ ${dispBranch(st)} ▾`),
        open ? createPortal(
          h('div', { 'data-dsh-gv-menu': '1', 'data-dsh-plugin': 'git-viz', className: 'dsh-gv-bdrop', 'data-gv-theme': gvTheme(),
            style: Object.assign(harvestAliases(), menuPos.bottom != null
              ? { position: 'fixed', left: menuPos.left, bottom: menuPos.bottom, minWidth: menuPos.minW }
              : { position: 'fixed', left: menuPos.left, top: menuPos.top, minWidth: menuPos.minW }) },
            h('div', { className: 'dsh-gv-btitle' }, '切换分支'),
            loading ? h('div', { className: 'dsh-gv-bopt dis' }, '加载中…') : (st.branches || []).map((b) =>
              h('button', {
                key: b.name, className: 'dsh-gv-bopt' + (b.current ? ' cur' : ''),
                disabled: b.current || occupied.has(b.name),
                title: occupied.has(b.name) ? '已被其他 worktree 检出' : `${b.sha}${b.upstream ? ' → ' + b.upstream : ''}`,
                onClick: () => doSwitch(b.name),
              },
                h('span', null, (b.current ? '✓ ' : '') + b.name),
                occupied.has(b.name) ? h('small', null, 'worktree') : null)),
            (!loading && remoteOnly.length) ? h('div', { className: 'dsh-gv-bdiv' }, `远端 ${remoteOnly[0].remote} · 未检出`) : null,
            (!loading && remoteOnly.length) ? remoteOnly.slice(0, 30).map((r) =>
              h('button', {
                key: r.name, className: 'dsh-gv-bopt dsh-gv-bopt-rm',
                title: `${r.name} · ${r.sha}\n本地创建跟踪分支并检出`,
                onClick: () => doSwitch(r.short, r.name),
              },
                h('span', null, '↳ ' + r.short),
                h('small', null, shortDate(new Date(r.date).toISOString())))) : null,
            !loading ? h('button', { className: 'dsh-gv-bsync', disabled: fetching, onClick: doFetch },
              fetching ? '拉取中…' : '⟳ 拉取远端') : null,
            err ? h('div', { className: 'dsh-gv-bopt dsh-gv-err', style: { cursor: 'default' } }, err) : null),
          document.body) : null);
    }

    function GitVizChip(props) {
      const [open, setOpen] = React.useState(false);
      const [path, setPath] = React.useState(null);
      const [themeTick, setThemeTick] = React.useState(0);
      React.useEffect(() => {
        let queued = false;
        const mo = new MutationObserver(() => {
          if (queued) return;
          queued = true;
          requestAnimationFrame(() => { queued = false; setThemeTick((t) => t + 1); });
        });
        // a live light/dark switch mutates body[data-ds-*] and/or the token container's style attr
        try {
          mo.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['style', 'class', 'data-ds-dark-theme', 'data-ds-light-theme'] });
        } catch { /* observer optional */ }
        return () => mo.disconnect();
      }, []);
      ensureStyle();
      const openDialog = () => {
        const sid = props.sessionId || (props.session && props.session.id);
        setPath((props.cwdOf && props.cwdOf(sid)) || (typeof props.cwd === 'string' ? props.cwd : null));
        setOpen(true);
      };
      const getTarget = () => {
        const sid = props.sessionId || (props.session && props.session.id);
        return (props.cwdOf && props.cwdOf(sid)) || (typeof props.cwd === 'string' ? props.cwd : null);
      };
      /* chips render in the dock, which may sit outside the app's token-injected
         container (same root cause as the dialogs): forward harvested tokens.
         themeTick re-runs the harvest when the app mutates theme-related
         attributes, so a LIVE light/dark switch restyles the chips too; when no
         token is harvestable at all, fall back to an explicit theme-detected
         text color instead of a frozen one. */
      const chipTokens = React.useMemo(() => {
        const toks = harvestAliases();
        if (!toks['--dsw-alias-color-text-primary']) toks.color = detectLightTheme() ? '#1f1f24' : '#e8e8ea';
        return toks;
      }, [themeTick]);
      return h('span', { style: Object.assign({ display: 'inline-flex', alignItems: 'center', gap: '6px' }, chipTokens) },
        h('button', { className: 'dsh-gv-chip', title: 'Git 图谱：提交历史 / 切换分支', onClick: openDialog }, '🌿 图谱'),
        h(BranchSwitcher, { getTarget }),
        open ? h(GitVizDialog, { path, onClose: () => setOpen(false) }) : null);
    }

    /* ---------------- mount (dual-slot with fallback per contract §7) ---------------- */
    exports.inject = ['slots', 'sessions', 'locale'];

    exports.apply = function (ctx) {
      ensureStyle();
      try {
        ctx.locale.register('git-viz', {
          zh: { title: 'Git 图谱', description: '查看提交历史、可视化分支、切换分支' },
          en: { title: 'Git Graph', description: 'Commit history, branch visualization, branch switching' },
        });
      } catch { /* locale optional */ }

      const cwdOf = (sid) => {
        try {
          const snap = ctx.sessions.list.getSnapshot();
          return (sid && snap.byId[sid] && snap.byId[sid].cwd) || null;
        } catch { return null; }
      };
      const Chip = (props) => h(GitVizChip, Object.assign({}, props, { cwdOf }));

      return ctx.inject(['slots'], (scope) => {
        let mounted = false;
        let fallbackTimer = null;
        let dispose = null;
        const entry = { id: 'git-viz', order: 100, locale: 'git-viz' };
        const mountAt = (slot) => scope.slots.inject(slot, () => {
          mounted = true;
          try {
            return scope.slots.register(Object.assign({ name: slot }, entry), Chip);
          } catch {
            return () => {};
          }
        });
        dispose = mountAt('conversation.composer.dock');
        // if the dock slot is never declared by the shell, fall back after 2s
        fallbackTimer = setTimeout(() => {
          if (mounted) return;
          try { dispose && dispose(); } catch {}
          mountAt('conversation.input.dock');
        }, 2000);
        return () => {
          if (fallbackTimer) clearTimeout(fallbackTimer);
          try { dispose && dispose(); } catch {}
        };
      });
    };

    return module.exports;
  },
});
