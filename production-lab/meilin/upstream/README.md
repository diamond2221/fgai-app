# 美林 · FG 超级导演（本地原型 v0.4.1）

不靠画布的"对话即制片"板块。成员说一句想法，美林把它推进成立项、剧集圣经、剧本、资产、分段视频提示词、拍摄任务和后期清单；成员只需要看、选、确认。本期先跑通 **海外 AI 短剧**，贝瓦儿童短视频与商业广告已预留入口。

设计说明见 `docs/DESIGN.md`（v0.4.1：沿用 v0.3 的白天界面；加上长期记忆页、资产改名删除、按剧情 10–25 秒分段、每段参考图审核、成片只带音效对白旁白、剧集增删）。接入 FG Studio 的交接说明见 `docs/INTEGRATION.md`。

## 运行

需要 Node 20 以上。

```bash
npm install
npm run build     # 构建前端到 web/dist
npm start         # http://127.0.0.1:5310
```

开发时用 `npm run dev`（编排服务 5310 + Vite 5311，打开 http://127.0.0.1:5311）。

`npm run smoke` 会在已启动的服务上用接口跑一遍完整的模拟流程。

## 两种模式

| 模式 | 条件 | 行为 |
|---|---|---|
| 模拟模式（默认） | 没有 `.env` 或没填 `WETOKEN_API_KEY` | 用示例剧《The Bride Who Bought Him / 新娘买下了他》演示全流程；剧本、提示词为预置内容；出图出片为模拟任务，不调用任何付费接口 |
| 实时文本 | 复制 `.env.example` 为 `.env` 并填入 WeToken Key | 立项、圣经、剧本、资产提示词、分段大纲、视频提示词、武戏方向卡、自由对话意图都由所选主模型实时生成；出图出视频仍是模拟任务 |

主模型默认 Claude Sonnet 5.5，顶栏可切换。界面模型 id 与 WeToken 实际 id 的对应可用 `WETOKEN_MODEL_MAP` 覆盖。

## 可选配置

| 变量 | 作用 |
|---|---|
| `MEILIN_SKILLS_DIR` | 技能目录，默认 `~/.claude/skills` |
| `FG_CANVAS_PUBLIC` | FG 画布 `web/public` 路径，用于灵感库；默认自动查找 `D:/FG.AI/fg-studio/...` |
| `MEILIN_REAL_MEDIA=1` | 配合 WeToken Key，让 GPT Image 系列真实出图（会产生费用）；其它模型接入 FG 后走任务中心 |

## 目录

```
server/            Node 编排服务（无第三方依赖）
  index.mjs        HTTP 接口 + 静态前端
  brain.mjs        阶段状态机、意图路由、技能执行器（模拟 / 实时）
  fgformat.mjs     FG 标准导演格式渲染 + 衔接锁 + 衔接检查
  llm.mjs          WeToken（OpenAI 兼容）文本调用
  presets.mjs      方向预设、模型、画风、Suno 配乐描述
  mock-story.mjs   示例剧内容（立项、圣经、两集剧本、11 个资产、第 1 集 6 段）
  store.mjs        本地 JSON 项目存储（data/projects）
skills/            本板块使用的三个 Skill（剧本包、FG 文戏导演、武戏方向卡）
web/               React + three.js 前端（光球为自定义着色器）
docs/DESIGN.md     业务逻辑与 FG 接入方案
```

## 当前边界

- 出图、出视频是模拟任务（界面标注"示意""模拟成片"），接入 FG 后走原生 `/api/tasks` 与人民币报价。
- 语音输入用浏览器自带识别（Chrome / Edge）；接入 FG 后改用公司语音识别服务。
- 模拟模式只预置了第 1 集的分段和前两集剧本。
- Suno 配乐由成员用公司 Gmail 手动生成（验证码需人工），界面提供步骤和可复制的风格描述。
# FG 接入副本

本目录是美林原型的 FG 适配版本。正式入口、模型、费用、权限、测试和部署方式以 [FG-USAGE.md](../FG-USAGE.md) 为准。生产启动 `server/fg-server.mjs`，不配置个人供应商密钥；以下保留的原型设计记录不是生产部署步骤。

