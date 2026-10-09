# dsh-plugins

[DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) Web 插件集——两个自研插件的源码仓库。

| 插件 | 功能 |
|---|---|
| [`dsh-git-viz/`](./dsh-git-viz) | 🌿 Git 可视化：提交图谱（泳道/refs/MR 角标）、分支面板 + 输入区分支切换器、远端分支直切、子仓库自动发现、GitLab 集成、亮暗主题跟随 |
| [`dsh-dshctl/`](./dsh-dshctl) | ⚙ dsh 控制台：运行状态卡（版本/pid/时长/地址）、一键刷新、接力棒式重启（后台拉起 + 端口锁定 + 跳板自动跳回） |

## 安装

要求：DSH `>= 0.2.0-rc.2`，机器上有 `git`（插件通过它执行 git 命令）。

```powershell
dsh plugin --profile web add "github:zxBuMengren/dsh#path:dsh-git-viz"
dsh plugin --profile web add "github:zxBuMengren/dsh#path:dsh-dshctl"
```

装完**手动重启一次 dsh web**（host 半区路由随进程启动加载），然后刷新页面：

- 输入区出现 **🌿 图谱** 按钮和 **⎇ 分支** 切换器 → git-viz 生效
- 输入区出现 **⚙ dsh** 按钮（绿点 = 健康）→ dsh-ctl 生效；此后重启 dsh 都可以走 ⚙ 一键重启

## 更新 / 卸载

```powershell
# 更新（重新 add 拉最新；host 半区改动需重启 dsh web 生效）
dsh plugin --profile web add "github:zxBuMengren/dsh#path:dsh-git-viz"
dsh plugin --profile web add "github:zxBuMengren/dsh#path:dsh-dshctl"

# 卸载
dsh plugin --profile web remove @local/git-viz
dsh plugin --profile web remove @local/dsh-ctl
```

本地开发（改码即生效）见各插件 README 的 link 安装说明。
