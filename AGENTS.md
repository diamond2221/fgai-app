# AGENTS.md

## Codex 项目记忆

长期项目记忆在 `.codex-memory/MEMORY.md`。开始涉及部署、版本管理、构建流程、前端守卫、版本接口或生产守护进程问题前，先读取该索引，并按任务读取相关记忆文件。

## 生产守护进程保护（硬性约束）

**绝对禁止主动停止、卸载、禁用或杀死生产守护进程，除非用户明确、强制要求停止对应服务。** 修复、部署、安装、更新、审计、性能排查或消除锁冲突，都不构成停用授权；承诺稍后恢复也不能作为例外。

以下为必须保护的已知 LaunchAgent；同样保护后续新增的生产守护任务：

| LaunchAgent | 职责 |
|---|---|
| `com.fgstudio.nas-supervisor` | NAS 探测、重连与存储保护 |
| `com.fgstudio.service-monitor` | 服务健康监测与故障恢复 |
| `com.fgstudio.auto-deploy` | 自动部署 |
| `com.fgstudio.report-scheduler` | 定时报表 |
| `com.fgstudio.six.runtime-requests` | 第六板块运行请求处理 |
| `com.fgstudio.six.yingce` | 第六板块 Yingce 运行服务 |

- 禁止直接或通过 Shell、Python、SSH、安装器等间接执行 `launchctl bootout/unload/disable/stop`、`kickstart -k`、`kill/pkill/killall`，以及删除或移走 plist 等导致任务停止或失去自动启动的操作。
- 执行任何生产脚本前，先检查其是否包含上述副作用；不得为验证自动恢复而主动停止生产守护进程。
- 默认只做只读诊断、更新下一轮执行会读取的脚本，或恢复缺失且未被显式禁用的任务。任务已加载时，不得强制重启；用户显式禁用的任务不得擅自重新启用。
- 如果确实需要停止，先说明目标服务、原因、影响与恢复方式，取得用户针对该停止操作的明确要求后再执行；授权仅限指定服务与本次操作。
- 事故背景及执行约束见 [.codex-memory/project_deployment_version.md](.codex-memory/project_deployment_version.md)。

## 第三方依赖复用规则

- 新增基础 UI、日期时间、表单或交互能力前，必须先检查 `package.json` 和现有组件，确认项目是否已有可用依赖。
- 项目已有且适配的第三方库必须优先复用，例如 `antd`、`dayjs`；禁止重复实现同等能力的自研组件，避免冗余和行为不一致。
- 仅当现有依赖无法满足需求、与当前运行环境不兼容，或新增依赖成本明显低于适配成本时，才允许自研或引入新的库，并在改动说明中写明原因。
