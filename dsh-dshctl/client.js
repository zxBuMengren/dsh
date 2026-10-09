// @local/dsh-ctl — client half (browser bundle via window.__ModuleLoader__).
// "⚙ dsh" chip in the composer dock: status card + page reload + relay-baton
// restart with auto-redirect through the helper bridge (127.0.0.1:3081).
window.__ModuleLoader__.load({
  id: '@local/dsh-ctl',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    const React = require('react');
    const { createPortal } = require('react-dom');
    const h = React.createElement;

    /* ---------------- theme tokens (portals/chips live outside the themed tree) ---------------- */
    const ALIASES = [
      '--dsw-alias-color-border', '--dsw-alias-color-bg-secondary', '--dsw-alias-color-text-primary',
      '--dsw-alias-color-bg-hover', '--dsw-alias-color-bg-elevated', '--dsw-alias-color-text-secondary',
      '--dsw-alias-color-bg', '--dsw-alias-font-family',
    ];
    function harvestAliases() {
      const out = {};
      try {
        let el = document.getElementById('root') || document.body;
        while (el && el instanceof Element) {
          const cs = getComputedStyle(el);
          for (const a of ALIASES) {
            if (!(a in out)) { const v = cs.getPropertyValue(a); if (v && v.trim()) out[a] = v.trim(); }
          }
          if (ALIASES.every((a) => a in out)) break;
          el = el.parentElement;
        }
      } catch { /* defaults below */ }
      return out;
    }
    function detectLightTheme() {
      try {
        const b = document.body, ht = document.documentElement;
        if (b && b.hasAttribute('data-ds-dark-theme')) return false;
        if ((b && b.hasAttribute('data-ds-light-theme')) || (ht && ht.hasAttribute('data-ds-light-theme'))) return true;
        const t = harvestAliases();
        const c = t['--dsw-alias-color-bg-elevated'] || t['--dsw-alias-color-bg'] || '';
        let m = /rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(c);
        if (m) return (0.2126 * +m[1] + 0.7152 * +m[2] + 0.0722 * +m[3]) / 255 > 0.5;
        m = /rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(getComputedStyle(b).backgroundColor || '');
        if (m) return (0.2126 * +m[1] + 0.7152 * +m[2] + 0.0722 * +m[3]) / 255 > 0.5;
      } catch { /* */ }
      return false;
    }

    /* ---------------- styles ---------------- */
    function ensureStyle() {
      if (document.querySelector('style[data-plugin="dsh-ctl"]')) return;
      const s = document.createElement('style');
      s.setAttribute('data-plugin', 'dsh-ctl');
      s.textContent = `
.dsh-dc-chip{display:inline-flex;align-items:center;gap:5px;padding:2px 10px;border-radius:999px;cursor:pointer;
  font-size:12px;line-height:20px;color:var(--dsw-alias-color-text-primary,inherit);
  border:1px solid var(--dsw-alias-color-border,rgba(128,128,128,.35));background:var(--dsw-alias-color-bg-secondary,rgba(128,128,128,.10));}
.dsh-dc-chip:hover{background:var(--dsw-alias-color-bg-hover,rgba(128,128,128,.18));}
.dsh-dc-dot{width:7px;height:7px;border-radius:50%;flex:none;background:#8b8b93;}
.dsh-dc-dot.ok{background:#3fb950;box-shadow:0 0 4px rgba(63,185,80,.9);}
.dsh-dc-dot.down{background:#e5534b;box-shadow:0 0 4px rgba(229,83,75,.9);}
.dsh-dc-chip.ok{border-color:rgba(63,185,80,.55);}
.dsh-dc-chip.down{border-color:rgba(229,83,75,.55);}
.dsh-dc-bdrop{position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;}
.dsh-dc-dialog{width:400px;max-width:calc(100vw - 32px);max-height:80vh;overflow:auto;border-radius:12px;padding:16px 18px;
  background:var(--dsw-alias-color-bg-elevated,#232327);color:var(--dsw-alias-color-text-primary,#e8e8ea);
  border:1px solid var(--dsw-alias-color-border,#3a3a40);box-shadow:0 18px 50px rgba(0,0,0,.35);}
.dsh-dc-title{display:flex;align-items:center;justify-content:space-between;font-size:14px;font-weight:600;margin-bottom:10px;}
.dsh-dc-x{cursor:pointer;border:none;background:none;font-size:15px;color:inherit;padding:2px 6px;border-radius:6px;}
.dsh-dc-x:hover{background:var(--dsw-alias-color-bg-hover,rgba(128,128,128,.2));}
.dsh-dc-row{display:flex;justify-content:space-between;gap:10px;font-size:12px;padding:4px 0;}
.dsh-dc-row .k{opacity:.65;flex:none;}
.dsh-dc-row .v{text-align:right;word-break:break-all;}
.dsh-dc-url{display:flex;align-items:center;gap:6px;justify-content:flex-end;}
.dsh-dc-mini{cursor:pointer;border:1px solid var(--dsw-alias-color-border,rgba(128,128,128,.4));background:transparent;color:inherit;
  font-size:11px;padding:1px 7px;border-radius:6px;}
.dsh-dc-mini:hover{background:var(--dsw-alias-color-bg-hover,rgba(128,128,128,.15));}
.dsh-dc-actions{display:flex;gap:8px;margin-top:14px;}
.dsh-dc-btn{flex:1;padding:7px 10px;border-radius:8px;cursor:pointer;font-size:12.5px;
  border:1px solid var(--dsw-alias-color-border,rgba(128,128,128,.4));
  background:var(--dsw-alias-color-bg-secondary,transparent);color:inherit;}
.dsh-dc-btn:hover{background:var(--dsw-alias-color-bg-hover,rgba(128,128,128,.15));}
.dsh-dc-btn.danger{border-color:transparent;color:#fff;background:#e5534b;}
.dsh-dc-btn.danger:hover{background:#c8443d;}
.dsh-dc-note{font-size:11px;opacity:.7;margin-top:10px;line-height:1.5;}
.dsh-dc-err{font-size:12px;color:#e57373;margin-top:8px;line-height:1.5;}
.dsh-dc-wait{font-size:12.5px;text-align:center;padding:28px 8px;line-height:2;}
.dsh-dc-spin{display:inline-block;animation:dshdcspin 1s linear infinite;}
@keyframes dshdcspin{to{transform:rotate(360deg)}}`;
      document.head.appendChild(s);
    }

    /* ---------------- api ---------------- */
    async function api(route, body) {
      const res = await fetch('dshctl/' + route, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body || {}),
      });
      const j = await res.json().catch(() => null);
      /* our host handler always answers JSON — a non-JSON reply (e.g. empty HTTP 400
         from the pre-restart fall-through) means the /dshctl routes are not loaded yet */
      if (!j) throw { code: 'not-activated', message: 'HTTP ' + res.status };
      if (!j.ok) throw j.error || { code: 'error', message: 'unknown' };
      return j.value;
    }

    /* ---------------- dialog ---------------- */
    function DshCtlDialog({ onClose }) {
      const [st, setSt] = React.useState(null);
      const [errn, setErrn] = React.useState(null);
      const [phase, setPhase] = React.useState('idle'); // idle | confirm | restarting
      const [copied, setCopied] = React.useState(false);
      const [waitMsg, setWaitMsg] = React.useState('等待服务器回来…');
      const tokens = React.useMemo(() => harvestAliases(), []);

      React.useEffect(() => {
        let dead = false;
        api('status').then((v) => { if (!dead) setSt(v); }).catch((e) => { if (!dead) setErrn(e); });
        return () => { dead = true; };
      }, []);

      React.useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape' && phase !== 'restarting') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [phase, onClose]);

      function pollBridge(bridge) {
        const started = Date.now();
        const tick = async () => {
          if (Date.now() - started > 120000) {
            setWaitMsg('等新地址超时：dsh 已在后台重启，若页面未自动恢复请稍后刷新；日志见 ~/.dsh/logs/dsh-web-console.log');
            return;
          }
          try {
            const r = await fetch(bridge, { cache: 'no-store' });
            if (r.status === 200) {
              const url = (await r.text()).trim();
              if (url && url.startsWith('http')) { location.replace(url); return; }
            }
          } catch { /* server down mid-poll is expected */ }
          setTimeout(tick, 1000);
        };
        tick();
      }

      async function doRestart() {
        setPhase('restarting');
        try {
          const v = await api('restart', { confirm: 'restart' });
          if (v && v.bridge) pollBridge(v.bridge);
        } catch (e) {
          setErrn(e);
          setPhase('idle');
        }
      }

      const rows = st ? [
        ['版本', st.dshVersion || '—'],
        ['进程', 'pid ' + st.pid],
        ['已运行', st.uptimeText],
        ['启动时间', st.startedAt ? st.startedAt.replace('T', ' ').slice(0, 19) : '—'],
        ['Node', st.node],
      ] : [];

      return createPortal(
        h('div', { className: 'dsh-dc-bdrop', onClick: () => { if (phase !== 'restarting') onClose(); }, 'data-dsh-plugin': 'dsh-ctl' },
          h('div', {
            className: 'dsh-dc-dialog', style: tokens || undefined, role: 'dialog', 'aria-label': 'dsh 控制台',
            onClick: (e) => e.stopPropagation(),
          },
            phase === 'restarting'
              ? h('div', { className: 'dsh-dc-wait' },
                h('div', null, h('span', { className: 'dsh-dc-spin' }, '⟳'), ' 正在重启 dsh…'),
                h('div', { style: { opacity: 0.7, fontSize: 11.5 } }, waitMsg))
              : h(React.Fragment, null,
                h('div', { className: 'dsh-dc-title' },
                  h('span', null, '⚙ dsh 控制台'),
                  h('button', { className: 'dsh-dc-x', onClick: onClose, 'aria-label': '关闭' }, '✕')),
                (errn && !st) ? h('div', { className: 'dsh-dc-err' },
                  (errn.code === 'unknown-route' || errn.code === 'not-activated')
                    ? '接口未激活：当前 dsh web 进程启动时还没有本插件，需手动重启一次 dsh web（关闭旧窗口，重新运行 dsh web，用新窗口里的新 URL 打开）。之后即可一键重启。' + (errn.message ? ' · ' + errn.message : '')
                    : `[${errn.code}] ${errn.message || ''}`) : null,
                !st && !errn ? h('div', { className: 'dsh-dc-row' }, h('span', { className: 'k' }, '读取中…')) : null,
                rows.map(([k, v]) => h('div', { className: 'dsh-dc-row', key: k },
                  h('span', { className: 'k' }, k), h('span', { className: 'v' }, v))),
                (st && st.url) ? h('div', { className: 'dsh-dc-row' },
                  h('span', { className: 'k' }, '访问地址'),
                  h('span', { className: 'v dsh-dc-url' },
                    h('span', {
                      title: st.url,
                      style: { maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', verticalAlign: 'bottom' },
                    }, st.url.replace(/^https?:\/\/[^/]+\//, '')),
                    h('button', {
                      className: 'dsh-dc-mini', onClick: async () => {
                        try {
                          await navigator.clipboard.writeText(st.url);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1500);
                        } catch { /* clipboard may need permission */ }
                      },
                    }, copied ? '✓ 已复制' : '复制'))) : null,
                phase === 'confirm'
                  ? h('div', { style: { marginTop: 10 } },
                    h('div', { style: { fontSize: 12, marginBottom: 8, color: '#e57373' } },
                      '⚠ 确认重启？所有会话会保存并在重启后恢复；页面会短暂失联，随后自动跳回。'),
                    h('div', { className: 'dsh-dc-actions' },
                      h('button', { className: 'dsh-dc-btn danger', onClick: doRestart }, '确认重启'),
                      h('button', { className: 'dsh-dc-btn', onClick: () => setPhase('idle') }, '取消')))
                  : h('div', { className: 'dsh-dc-actions' },
                    h('button', { className: 'dsh-dc-btn', onClick: () => location.reload() }, '⟳ 刷新页面'),
                    h('button', {
                      className: 'dsh-dc-btn danger', onClick: () => setPhase('confirm'),
                      title: st ? '重启 dsh web 进程' : '接口未激活时点击会得到激活提示（不会误重启）',
                    }, '⟲ 重启 dsh')),
                h('div', { className: 'dsh-dc-note' },
                  '刷新页面即可加载最新的插件前端（client 侧改动）；host 侧路由改动需要重启 dsh web。'),
              ))),
        document.body);
    }

    /* ---------------- chip ---------------- */
    function DshCtlChip() {
      const [open, setOpen] = React.useState(false);
      const [health, setHealth] = React.useState('loading'); // loading | ok | down
      const [, setTick] = React.useState(0);
      /* health dot: green = /dshctl/status answers; red = routes not loaded (needs one
         manual dsh web restart) or server error; re-check every 30s + on dialog close */
      const pollHealth = React.useCallback(() => {
        api('status').then(() => setHealth('ok')).catch(() => setHealth('down'));
      }, []);
      React.useEffect(() => {
        pollHealth();
        const iv = setInterval(pollHealth, 30000);
        return () => clearInterval(iv);
      }, [pollHealth]);
      React.useEffect(() => {
        let queued = false;
        const mo = new MutationObserver(() => {
          if (queued) return;
          queued = true;
          requestAnimationFrame(() => { queued = false; setTick((t) => t + 1); });
        });
        try {
          mo.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['style', 'class', 'data-ds-dark-theme', 'data-ds-light-theme'] });
        } catch { /* observer optional */ }
        return () => mo.disconnect();
      }, []);
      /* chips may sit outside the token-injected container: forward harvested tokens,
         with an explicit theme-detected text color when nothing is harvestable. */
      const chipTokens = {};
      try {
        Object.assign(chipTokens, harvestAliases());
      } catch { /* */ }
      if (!chipTokens['--dsw-alias-color-text-primary']) chipTokens.color = detectLightTheme() ? '#1f1f24' : '#e8e8ea';
      return h(React.Fragment, null,
        h('button', {
          className: 'dsh-dc-chip' + (health === 'ok' ? ' ok' : health === 'down' ? ' down' : ''),
          style: chipTokens,
          onClick: () => setOpen(true),
          title: health === 'ok'
            ? 'dsh 运行正常 · 状态 / 刷新 / 重启'
            : health === 'down'
              ? '控制接口未激活：需重启一次 dsh web（点开查看详情）'
              : 'dsh 控制：状态 / 刷新 / 重启',
        }, h('span', { className: 'dsh-dc-dot ' + health }), '⚙ dsh'),
        open ? createPortal(h(DshCtlDialog, { onClose: () => { setOpen(false); pollHealth(); } }), document.body) : null);
    }

    /* ---------------- mount (dual-slot with fallback, mirroring git-viz) ---------------- */
    exports.inject = ['slots', 'locale'];

    exports.apply = function (ctx) {
      ensureStyle();
      try {
        ctx.locale.register('dsh-ctl', {
          zh: { title: 'dsh 控制', description: '查看 dsh 运行状态、刷新页面、一键重启 dsh web' },
          en: { title: 'dsh control', description: 'dsh status, page reload, one-click dsh web restart' },
        });
      } catch { /* locale optional */ }

      return ctx.inject(['slots'], (scope) => {
        let mounted = false;
        let fallbackTimer = null;
        let dispose = null;
        const entry = { id: 'dsh-ctl', order: 120, locale: 'dsh-ctl' };
        const mountAt = (slot) => scope.slots.inject(slot, () => {
          mounted = true;
          try {
            return scope.slots.register(Object.assign({ name: slot }, entry), DshCtlChip);
          } catch {
            return () => {};
          }
        });
        dispose = mountAt('conversation.composer.dock');
        // if the dock slot is never declared by the shell, fall back after 2s
        fallbackTimer = setTimeout(() => {
          if (mounted) return;
          try { dispose && dispose(); } catch { /* */ }
          mountAt('conversation.input.dock');
        }, 2000);
        return () => {
          if (fallbackTimer) clearTimeout(fallbackTimer);
          try { dispose && dispose(); } catch { /* */ }
        };
      });
    };

    return module.exports;
  },
});
