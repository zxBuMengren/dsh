# @local/git-viz — DSH Git 可视化插件

自研的 DSH Web GUI 插件：**git 提交图谱可视化 + 分支切换 + 提交历史浏览 + GitLab 集成（MR 角标 / 流水线状态 / 项目直达）**。纯 JavaScript，无构建工具链（改码即生效）。

## 功能

- **🌿 图谱按钮**：挂在会话输入区 dock（`conversation.composer.dock`，2s 未挂自动回退 `conversation.input.dock`），空白会话和进行中会话都可见。
- **⎇ 分支切换器**（2026-10-09 追加）：紧跟图谱按钮的内联下拉——直接显示当前分支名，点开即可切换，**无需打开弹层**；非仓库会话自动隐藏。
- **远端分支直切**（2026-10-09 追加）：下拉和弹层分支面板都会列出**远端已有、本地未检出**的分支（`↳` 前缀、`远端 origin · 未检出` 分组）；点击即在本地创建**跟踪分支**并检出（`git switch -c <name> --track origin/<name>`，upstream 自动设好）。列表底部 `⟳ 拉取远端` 按钮执行 `git fetch --prune`（60s 超时、`GIT_TERMINAL_PROMPT=0` 防凭据交互挂死；离线/无权限时报清晰错误，不影响其他功能）。
- **提交图谱**：SVG 泳道图，分叉/合并拓扑清晰；每行含 refs 彩色标签（HEAD 红 / branch 蓝 / tag 黄）、subject、作者、时间；分页"加载更多"。文本宽度按 CJK/半角实测度量 + 固定列预算，**中文长说明不再与作者/日期重叠**。
- **分支面板**：当前分支 ✓、ahead/behind、脏区/冲突角标、被其他 worktree 占用的分支标灰禁点。
- **切换守卫**：分支名合法性校验、未解决冲突拒绝、目标分支不存在/被其他 worktree 检出拒绝、脏工作区交由 git 自身保护（错误分类成稳定错误码提示）。
- **GitLab 集成**（2026-10-09 新增）：仓库 origin 指向 GitLab（gitlab.com 或自建）时自动生效——
  - 图谱行上挂 **`!N` MR 角标**（merged 绿 / opened 蓝 / closed 灰），点击新开标签直达 MR 页；
  - 分支行挂**最新流水线状态**角标（✓ 成功 / ✗ 失败 / ⟳ 运行中），点击直达 pipeline 页；
  - 弹层头部出现 **⧉ 主机名** 链接直达项目页。
  - 无 token 时公开项目走匿名 API；非 GitLab 仓库 / 无 remote / 网络不通 → 全部安静降级，不影响本地功能。
- **☀/🌙 明暗主题**（2026-10-09 追加，同日二次修正）：弹层/下拉**默认跟随 GUI 实际主题**——优先读 GUI 自己的暗色标记 `body[data-ds-dark-theme]`，再退回 token 亮度判定；配色不再自造皮肤，而是从应用树内**收割 8 个 `--dsw-alias-*` token 转发到弹窗根**（弹窗 portal 挂在 body 下、位于主题容器外，拿不到运行时注入的 token，这是首版弹窗在白色页面上呈黑色的根因）。头部 ☀/🌙 可手动覆盖，选择持久化在 localStorage（`dsh-gv-theme`）。

## 架构

```
dsh-git-viz/
├── package.json      # @local/git-viz；exports: ". /client /package.json /locale/*.json"
├── cordis.patch.yml  # roster insert: id=git-viz
├── index.js          # host 半区：webServer 前缀路由 /gitviz/*，调 lib/git.js + lib/gitlab.js
├── client.js         # 浏览器半区：__ModuleLoader__.load 工厂，React 取平台共享表
├── lib/git.js        # 纯函数 git 层（spawn git，无框架依赖，可独立测试）
├── lib/gitlab.js     # GitLab 集成：remote 推断实例 + 只读 REST API 客户端
└── locale/{en,zh}.json
```

**host**（Node）：`inject: ['webServer', 'workspaceRegistry']`；五个 POST JSON 路由：
- `POST /gitviz/status` `{path}` → 仓库解析 + 分支表 + worktree 占用 + 远端分支表（refs/remotes，剥 `origin/HEAD`；仅反映上次 fetch 结果，不联网）
- `POST /gitviz/log` `{path, limit≤500, skip≤100000}` → topo 序提交（多取 1 条判 hasMore）+ sha→分支 tips
- `POST /gitviz/switch` `{path, branch, source?}` → 守卫 + `git switch --no-guess`；带 `source`（如 `origin/feature`）且本地无同名分支时 → `git switch -c <branch> --track <source>` 创建跟踪分支
- `POST /gitviz/fetch` `{path, remote?=origin}` → `git fetch --prune`（唯一联网路由，显式用户动作；60s 超时、禁凭据交互，失败返回 `fetch-failed`）
- `POST /gitviz/gitlab` `{path}` → origin 推断 GitLab 实例 → 项目信息 + 最近 100 条 MR + 最近 20 条流水线（始终 200 + 降级信封，不抛错）
- `POST /gitviz/discover` `{path}` → 工作区根不是仓库时，向下扫子目录（深度 ≤2、≤200 目录、≤8 候选，跳过 node_modules/.venv 等重目录）找 `.git`；找到多个时弹层头部出现仓库下拉

**子仓库自动发现**：会话目录（工作区根）不是 git 仓库时，自动扫描其子目录定位仓库并直接打开图谱（多个候选时可在头部下拉切换）——覆盖「仓库克隆在工作区子目录里」的场景。

**安全模型**（全部实测）：非 POST→405；非 JSON→415；非 loopback（remoteAddress/Host/sec-fetch-site/Origin 四重校验，不信 XFF）→拒绝；`path` 的 realpath 必须等于或位于 workspaceRegistry 注册的工作区之内（含子目录，Windows 大小写不敏感），否则 403；请求体上限 1MB。所有响应统一信封 `{ok:true,value} | {ok:false,error:{code,message}}`。

**GitLab 访问的边界**：只对仓库自身 origin 指向的实例发**只读 GET**（`/api/v4/projects/...`，10s 超时，1MB 响应上限）；自建 GitLab 在私网同样可用。私有项目需要令牌：启动 dsh 前设置环境变量 `GIT_VIZ_GITLAB_TOKEN`（或 `GITLAB_TOKEN`）= 你的 Personal Access Token（read_api 权限即可）；无令牌时私有项目在弹层底部会收到设置提示，其余功能不受影响。**host 半区改码需重启 dsh web 生效**（client 半区刷新页面即生效）。

**client**（浏览器）：React 18（`require('react')` 平台共享）；样式只用 `--dsw-alias-*` token + `.dsh-gv-*` 前缀；文本走 locale 服务；弹层用自建 Backdrop + `createPortal(document.body)`。

## 安装 / 更新 / 卸载

```powershell
# 安装（从 GitHub，pnpm #path: 子目录依赖）
dsh plugin --profile web add "github:zxBuMengren/dsh#path:dsh-git-viz"

# 本地开发（link 模式：改 client.js 刷新页面即生效；host 半区改动需重启 dsh web）
dsh plugin --profile web add link:<本仓库克隆路径>\dsh-git-viz

# 更新（GitHub 模式：重新 add 拉最新，host 半区需重启 dsh web 生效）
dsh plugin --profile web add "github:zxBuMengren/dsh#path:dsh-git-viz"

# 卸载
dsh plugin --profile web remove @local/git-viz
```

旧插件 `@linxin666/dsh-client-ui-git-graph` 已在 `~/.dsh/profiles/web/cordis.patch.yml` 中以 `- id: ui-git-graph disabled: true` 禁用（避免双入口）。恢复旧插件：删掉那三行即可。

## 验证状态（2026-10-09）

| 验证项 | 结果 |
|---|---|
| lib/git.js 冒烟（临时仓库全链路） | 16/16 ✓ |
| 泳道布局算法（分叉/合并/多根/refs/截断） | 8/8 ✓ |
| host API 端到端（curl，真仓库 5 提交） | status/log/switch 全对 ✓ |
| 安全闸（405/415/403/not-a-repo） | 全对 ✓ |
| roster 激活（dump-config） | ✓ |
| 浏览器引导表（__DSH_BOOT__ entries + combo 200，内容含本插件） | ✓ |
| 旧插件禁用（boot 表中消失） | ✓ |
| parseGitLabRemote（https/自建域名/scp-like ssh/ssh 端口/非 git URL） | 7/7 ✓ |
| gitlabSnapshot 真实 API（gitlab.com/gitlab-org/gitlab-test，匿名） | 68 MR + 11 流水线 ✓（2.6s） |
| gitlab 降级路径（无 remote / 非 GitLab / 非仓库） | no-remote / not-gitlab-or-invisible / not-a-repo ✓ |
| 新 client bundle 上线（rev 7c378376，活服务器已伺服新代码） | ✓ |
| discoverRepos（ml-roadmap 真场景 / 本仓库 / C:\Windows） | 定位嵌套仓库 ✓ / repo=自身 ✓ / 空候选 ✓ |
| 新 client bundle 二次上线（rev 00031e15，discover/候选下拉已伺服） | ✓ |
| CJK 文本宽度度量（ml_workflow_demo-cc 真提交说明离线复算） | 新算法 4/4 无重叠 ✓（旧算法差 131px） |
| client bundle 三次上线（rev 13aebbc，BranchSwitcher/clipToWidth 已伺服） | ✓ |
| 截断图谱渲染回归（提取 CommitGraph 真跑，父在视图外的 stub 边；旧码 TDZ 必崩） | ✓ |
| client bundle 四次上线（rev c522dcf，闪退修复已伺服） | ✓ |
| 下拉翻转/钳制数学（底 chip 翻上 / 中部向下 / 右缘钳制） | 3/3 ✓ |
| client bundle 五次上线（rev 667f374，z-index+翻转已伺服） | ✓ |
| 主题逻辑（detectLightTheme 亮度判定 5 场景 + CommitGraph 双调色板回归渲染 + 默认暗色兜底） | 5/5 + 3/3 ✓ |
| client bundle 六次上线（rev 44128a90，detectLightTheme/GV_PAL/data-gv-theme 全伺服） | ✓ |
| token 转发（parseRGB hex3/hex6/rgb/rgba/透明跳过/垃圾输入 7 例 + isLight 4 例 + 双调色板回归） | 11/11 + 2/2 ✓ |
| client bundle 七次上线（rev 21eac91a，harvestAliases/data-ds-dark-theme/parseRGB 全伺服） | ✓ |
| chip 主题实时跟随（MutationObserver + 显式兜底色，theme-test 13 项无回归） | ✓（rev 41472 级） |
| 远端分支（bare 仓库当 origin 全离线：列表剥 HEAD/字段/创建+跟踪 upstream 落位/worktree 切换/fetch/三个拒绝用例） | 11/11 ✓ |
| client bundle 八次上线（rev c803e17a，远端区/拉取按钮/source 透传已伺服） | ✓ |
| **视觉效果**（按钮渲染/弹层交互/MR·流水线角标/子仓库下拉/⎇ 内联切换器/明暗换肤/远端分支区/⟳ 拉取） | **待重启 dsh web + 刷新页面人工确认** |

## 已知限制

- worktree 占用只做展示级探测（`git worktree list`），不提供 worktree 创建/管理（旧插件的能力，如需要可再加）。
- 远端分支列表反映的是**上次 fetch** 的结果（不自动联网）；点 `⟳ 拉取远端` 才刷新。下拉最多显示 30 条、面板 50 条未检出远端分支。
- 泳道图为只读浏览，不支持从图上创建分支/checkout 提交。
- 视觉层未经自动化测试，主题适配依赖 `--dsw-alias-*` token 的存在。
- 主题跟随的实现依赖 GUI 的 `body[data-ds-dark-theme]` 标记与运行时注入的 `--dsw-alias-*` token（当前实测有效；若 GUI 改版换机制，手动 ☀/🌙 切换仍可用作兜底）。
- GitLab：MR 拉最近 100 条、流水线拉最近 20 条（按 ref 取最新一条）；自建实例需 host 进程能访问该地址；不集成 GitHub（origin 是 GitHub 时安静降级）。
