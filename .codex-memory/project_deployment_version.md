---
name: deployment-version-injection
description: 部署版本注入与生产守护进程不可主动停用的约束
metadata:
  type: project
---

自动部署发现新提交后先 fast-forward，再重新执行仓库中的最新脚本；构建时必须显式传入 `APP_DEPLOYMENT_VERSION`，运行容器保留镜像内的值，健康检查核对 `/api/version`。

**Why:** 部署进程可能在拉取提交前已启动，继续执行旧脚本会让带版本功能的首次部署回退为 `dev`。
**How to apply:** 修改自动部署流程或排查版本显示时，保持重新执行和显式 build arg 两项约束。

生产主机通过本机 SSH alias `server` 连接，禁止直接使用 IP 推断远程用户名。远程非交互 shell 的 `PATH` 不包含 Docker，执行生产只读核验时使用 `/usr/local/bin/docker`；项目目录为 `/Users/server/work/fgai-app`，PostgreSQL 容器为 `fgai-app-postgres-1`。连接信息仅引用 `~/.ssh/config` 中的 alias，不在项目记忆中保存密钥或密码。

## 守护进程保护

用户明确要求：绝不能主动停止生产守护进程，除非用户强制、明确要求停止对应服务。受保护的 LaunchAgent 清单、禁止命令及授权边界以 [AGENTS.md 的生产守护进程保护规则](../AGENTS.md#生产守护进程保护硬性约束) 为准；任何涉及守护进程的操作前必须读取该规则。一般性的修复、部署或重载请求不包含停止授权，脚本中的间接停用同样禁止。

**Why:** 2026-10-12 的生产系统日志确认：14:32:55，经 SSH 执行的 Python 程序主动调用 `launchctl bootout` 卸载 NAS supervisor 和 service-monitor；NAS 任务于 14:33:00 被移除。已查到调用链，尚未确认具体操作者或 Python 脚本来源，不能归因于 NAS 网络故障或普通进程崩溃。LaunchAgent 的 plist 存在且 enabled 不等于任务已加载；被卸载后定时器不会自行恢复任务。

**How to apply:** 先只读区分任务未加载、探针失败和 NAS 网络故障；已加载任务保持运行，缺失且未显式禁用的任务可按授权恢复。安装器与维护脚本也必须遵守保护规则，不得通过暂停生产任务验证恢复逻辑；不能以状态日志长时间没有更新推断进程已停止。
