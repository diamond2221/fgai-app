---
name: fg-overseas-drama-script
description: 海外 AI 短剧剧本包：立项问题、Google AI Studio 傻瓜式操作指引与可复制 Prompt（灵感风暴、一句话生第一集、续写下一集、按意见修改），以及 Sonnet 直接生成时使用的同一剧本合同。用于海外短剧方向的立项与逐集剧本。
---

# 海外 AI 短剧 · 剧本包

## 1. 剧本合同（两条通道共用）

每集剧本必须按下面结构输出，方便后续自动抽取资产与分段：

```text
# 剧名（英文）/ 中文译名
## 第N集《集名》 时长约 X 秒
【本集钩子】开场 3 秒内的台词或动作钩子
【出场人物】姓名｜年龄｜一句外观｜一句身份关系（新角色才写全）
【场景】场景名｜时间｜天气｜一句空间描述
【正文】
场1 · 场景名 · 时间
（动作）人物做了什么，看得见的动作。
人物名：English line.（中文意思）
人物名（OS）：English inner voice.（中文意思）
……
【结尾悬念】最后一个镜头停在什么画面，留给下一集什么问题
```

规则：

- 台词语言按剧集圣经（默认英文，括号附中文意思供成员核对）。
- 只写看得见、听得见的内容；心理活动转成动作或 OS。
- 每集 60–120 秒；开头 3 秒必须有钩子，结尾必须有悬念。
- 高能量、强反转、强情绪；但避免平台禁止的血腥、性暗示、真实品牌与真人。

## 2. Google AI Studio 傻瓜指引（给成员看的）

1. 打开 aistudio.google.com，用公司 Google 账号登录。
2. 左侧选择 **Chat**，右上角模型选列表里**最新的 Gemini Flash**（教程视频里用的是 Flash 版本，台词能力强）。
3. 每部剧开一个新对话，不要在旧对话里换剧。
4. 先复制下面的 **Prompt ①** 得到一批灵感（可选）；挑一个喜欢的，复制 **Prompt ②** 把那一句话填进去，发送。
5. 不满意就用 **Prompt ④** 说哪里不舒服；满意后全选复制整集，回到美林点"粘贴 AI Studio 剧本"。
6. 下一集在同一个对话里发 **Prompt ③**。
7. 如果它把一集写得太长（例如本该 90 秒写成 5 分钟），直接告诉它"压缩到约 90 秒，保留钩子和结尾悬念"。

## 3. 可复制 Prompt

### Prompt ① 灵感风暴

```text
You are a top showrunner for viral vertical short dramas on ReelShort / DramaBox for US audiences.
Genre: {题材，例如 CEO romance / revenge / werewolf / mafia / rebirth / supernatural thriller}.
Give me 20 one-sentence premises. Each must have: an absurd-but-irresistible hook, a clear power reversal, and a protagonist the audience roots for. Be bold and a little unhinged. Number them. No explanations.
```

### Prompt ② 一句话生第一集

```text
You are a top showrunner for viral vertical short dramas for US audiences (ReelShort / DramaBox style).
Premise: {一句话想法}
Write EPISODE 1 only, about {90} seconds of screen time, in this exact structure:
# Title (English) / 中文译名
## Episode 1 "Episode title"  ~{90}s
【Hook】the line or action in the first 3 seconds
【Characters】name | age | one-line look | one-line relationship
【Locations】name | time | weather | one-line description
【Script】
Scene 1 · location · time
(Action) only visible actions.
NAME: English line. (中文意思)
NAME (V.O.): inner voice. (中文意思)
...
【Cliffhanger】the final image and the question it leaves
Rules: dialogue in natural American English with sharp, quotable lines; strong reversal; no gore, no explicit content, no real brands or real people. Do not explain, just write.
```

### Prompt ③ 下一集

```text
Continue with EPISODE {N}, same structure, about {90} seconds. Pick up exactly from the previous cliffhanger, escalate the conflict, and end on a stronger cliffhanger. Keep every character's personality, look and voice consistent.
```

### Prompt ④ 修改

```text
Revise episode {N}: {哪里不舒服，例如"女主太被动，让她在第二场主动反击""台词再狠一点"}. Keep the structure, length and everything I didn't mention.
```

## 4. 立项最多问三个问题

只问会改变结构的：目标市场与台词语言、集数与单集时长、题材/主角关系。其余用方向预设默认值并在立项卡上标明"默认"。
