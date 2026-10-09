# @local/dsh-ctl — dsh 控制台插件

在 DSH Web 输入区提供 **⚙ dsh** 控制台：查看运行状态（版本/pid/运行时长/访问地址）、一键刷新页面、以及**接力棒式重启 dsh**——旧进程退出后自动拉起新进程，浏览器轮询本地跳板拿到新访问 URL 并自动跳转，无需手动去控制台抄地址。

## 功能

- **状态卡**：dsh 版本、Node 版本、pid、已运行时长、启动时间、工作目录、完整命令行、当前访问 URL（带 token，一键复制）
- **⟳ 刷新页面**：等价 F5（重新加载 SPA 与插件）
- **⟲ 重启 dsh**：两段式确认（红键）→ 触发接力棒重启流程
  - host 先 spawn 独立 `lib/restart-helper.mjs`（脱离父进程存活）再自杀
  - helper：等旧 pid 退出 → **后台**重新执行原命令行（windowsHide + stdio 重定向到 `~/.dsh/logs/dsh-web-console.log`，无控制台窗口）→ 轮询 `~/.dsh/dsh-web-port.json` 直到出现新一代（pid 变化 + 新 URL）
  - helper 同时在 `127.0.0.1:3081` 起一次性**跳板 HTTP**（CORS 全开，202=还在等 / 200=新 URL 纯文本）
  - 浏览器每秒轮询跳板；拿到 200 后 `location.replace` 到新 URL；120 秒未拿到则提示查看 `~/.dsh/logs/dsh-web-console.log`
  - 全程日志：`~/.dsh/logs/dshctl-restart.log`
- **主题跟随**：弹窗/chip 从应用容器收割 `--dsw-alias-*` token（portal 在主题树外，需转发）；MutationObserver 监听主题属性变化实时重收割

## 架构

```
dsh-dshctl/
├── package.json        # @local/dsh-ctl；dsh.client.inject=[dsh-client-locale]，platform=web
├── cordis.patch.yml    # - insert: - id: dsh-ctl
├── locale/{zh,en}.json # 插件元数据
├── index.js            # host：ctx.webServer prefix /dshctl；status / restart 两路由
├── lib/restart-helper.mjs # 独立 node 脚本：接力棒（等退出→重启→跳板）
└── client.js           # 浏览器半区：⚙ chip + 控制台弹窗（token 感知）
```

## HTTP 契约（POST /dshctl/*，JSON）

| 路由 | 请求 | 应答 |
|---|---|---|
| `status` | `{}` | `{ok,value:{pid,ppid,node,platform,dshVersion,uptimeSec,uptimeText,startedAt,argv,cwd,url,port}}` |
| `restart` | `{confirm:'restart'}` | `{ok,value:{restarting:true,bridge:'http://127.0.0.1:3081/'}}`；confirm 缺失→400 `confirm-required` |

错误信封：`{ok:false,error:{code,message}}`。

## 安全模型

- 仅 **loopback**：remoteAddress ∈ {127.0.0.1, ::1, ::ffff:127.0.0.1}，Host ∈ {localhost, [::1], 127.0.0.1}，`sec-fetch-site` 非 cross-site，Origin 与 Host 一致——否则 403
- 非 POST → 405；Content-Type 非 `application/json` → 415；body 上限 64KB
- restart 需显式 `confirm:'restart'` 双保险（UI 已有红键确认）
- 跳板（3081）只回**本机文件里的 URL**，不接受任何输入；120s 后自动退出

## 安装 / 更新 / 卸载

```powershell
# 安装（从 GitHub，pnpm #path: 子目录依赖）
dsh plugin --profile web add "github:zxBuMengren/dsh#path:dsh-dshctl"

# 本地开发（link 模式：改 client.js 刷新页面即生效；host 半区改动需重启 dsh web）
dsh plugin --profile web add link:<本仓库克隆路径>\dsh-dshctl

# 卸载
dsh plugin --profile web remove @local/dsh-ctl
```

## 验证状态（2026-10-09）

| 项 | 结果 |
|---|---|
| node --check 三文件 | ✅ |
| index.js 动态 import（exports=apply, inject=['webServer']） | ✅ |
| helper DRYRUN 演练（替身进程当旧 dsh + 假端口文件） | ✅ 跳板 202→200+新URL、退出检测 2s、重启命令行正确、BOM 兼容、EADDRINUSE 优雅降级 |
| 安装（dsh plugin add link:） | ✅ roster 激活（dump-config 含 `# == @local/dsh-ctl`） |
| 活 bundle 上线 | ✅ rev 63075a26c6d7，14183B，九特征在线（dshctl/、pollBridge、harvestAliases、data-ds-dark-theme、dsh-dc-、location.replace、dsh-dc-btn danger、等新地址超时、dsh 控制台） |
| handler 直驱回归（.scratch/dshctl-drive.mjs） | ✅ 12/12——status 200、GET 405、未知子路由 404 信封、restart 缺 confirm 400、text/plain 415、外部 Host 403、裸 /dshctl 404、坏 JSON 400、真实浏览器头形态（Host:port+Origin:port）200、Origin 不匹配 403、cross-site 403 |
| **真实重启** | ⚠️ 未执行——重启活 dsh 会断当前会话；首用需先手动重启一次 dsh web 激活 host 路由（鸡生蛋），此后全部走插件 |
| 视觉 | ⚠️ 待用户刷新页面确认 |

### 踩坑记录（host handler 契约）

首版 handler 写成 `(req, res, next, pathname)` 并依赖 `pathname`/`next()`——但 dsh-host-webserver 的调度是 `await route.handler(req, res)`（仅两参），`pathname` 恒 undefined → `pathname.startsWith` 每请求必抛 → 平台 catch 兜底成 **HTTP 400 空 body**（这就是"点重启没反应"的深层根因）。另 `req.remoteAddress` 不存在（真名是 `req.socket.remoteAddress`，gitviz 一直用对了）。修正：handler 自行 `new URL(req.url).pathname` 解析、去掉 next、loopback 判定对齐 gitviz。

## 已知限制

- **鸡生蛋**：host 半区（status/restart 路由）随 dsh web 进程启动加载——插件装好后第一次必须手动重启 dsh web 一次，路由才可用（弹窗会显示"需重启一次激活"提示；client 半区已即时生效）
- **端口锁定（一键重启自动保持地址不变）**：桌面壳启动器用 `dsh web --port 0`（OS 随机挑端口）。helper 在 relaunch 前读旧端口文件，把 `--port 0`（或缺失 --port）换成旧端口——浏览器 cookie 的 audience 绑定 host:port 且签名密钥持久化在 ~/.dsh 凭据（30 天），端口不变 ⇒ 重启后旧 cookie 仍有效，页面 F5 即恢复。显式非零 `--port` 原样保留（DRYRUN 验证两种分支）。若重启不是走 ⚙ 按钮（桌面壳自己拉起），启动参数不归插件管，端口会再随机——想永久固定可手动 `dsh web --port <N>` 起一次，此后 ⚙ 重启一直保持
- 重启后 URL token 换新，但端口锁定后旧 cookie 仍有效——跳板自动带你去同一地址（token 都不用输）
- helper 跳板端口 3081 若被占，优雅降级为"无自动跳转"（后台日志见 ~/.dsh/logs/dsh-web-console.log 与 dshctl-restart.log）
- status 里 argv/cwd 为 dsh web 进程视角；重启为**后台拉起**（无控制台窗口：windowsHide + stdio 重定向到 ~/.dsh/logs/dsh-web-console.log），并锁定旧端口
