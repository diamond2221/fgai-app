import { modelCapabilityConfigFor, videoDurationAllowed } from "@/lib/model-capabilities";
import type { AiConfig } from "@/stores/use-config-store";
import type { StoryboardRow } from "@/types/canvas";

export const DRAMA_SKILL_ATTRIBUTION = "该SKILL 由Work-Fisher制作，免费公开，禁止任何盗卖行为";
export type DramaProductionPlan = { model: string; seconds: number; strategy: "story" | "fixed"; allowedSeconds: number[] };

export function parseDramaProductionPlan(value: unknown): DramaProductionPlan | undefined {
    if (!value || typeof value !== "object") return undefined;
    const plan = value as DramaProductionPlan;
    if (typeof plan.model !== "string" || !plan.model.trim() || ![13, 15, 20, 25, 30].includes(plan.seconds) || !["story", "fixed"].includes(plan.strategy) || !Array.isArray(plan.allowedSeconds) || !plan.allowedSeconds.length) return undefined;
    if (plan.allowedSeconds.some(seconds => ![13, 15, 20, 25, 30].includes(seconds) || seconds > plan.seconds)) return undefined;
    if (plan.strategy === "fixed" && (plan.allowedSeconds.length !== 1 || plan.allowedSeconds[0] !== plan.seconds)) return undefined;
    return plan;
}

export function dramaSegmentDurations(config: AiConfig, model: string) {
    if (!model) return [];
    const profile = modelCapabilityConfigFor(config, model).video;
    return profile ? [13, 15, 20, 25, 30].filter(seconds => videoDurationAllowed(profile, seconds)) : [];
}

export function createDramaProductionPlan(config: AiConfig, model: string, seconds: number, strategy: DramaProductionPlan["strategy"]): DramaProductionPlan {
    const supported = dramaSegmentDurations(config, model);
    if (!supported.includes(seconds)) throw new Error("请选择目标视频模型支持的片段时长；短剧片段至少 13 秒");
    return { model, seconds, strategy, allowedSeconds: strategy === "fixed" ? [seconds] : supported.filter(value => value <= seconds) };
}

export function dramaStoryboardContract(plan: DramaProductionPlan, modelName: string) {
    return [
        `【短剧视频片段规划】目标视频模型：${modelName}；${plan.strategy === "fixed" ? "每段固定" : "按剧情划分，每段不超过"} ${plan.seconds} 秒。`,
        `每行是一次完整视频生成的剧情片段，durationSeconds 只可选 ${plan.allowedSeconds.join(" / ")} 秒。不要把 3、4 秒的内部镜头拆成独立行；一行内允许多个有叙事动机的内部镜头。`,
        "先通读全章，按一个主要场景、一段关系变化、明确落点划分；切在决定、揭示、拒绝或新行动处。相邻片段保持因果、人物左右位置、道具交接、轴线和光线连续，不能通过删台词缩短时长。",
        "完整保留原文对白和明确的 OS，不为抽象心理描述虚构 OS。对白过长时在完整句与剧情落点处另开片段；不加速、不删词、不重复。dialogue 必须包含本片段完整台词，一行一位说话人，使用‘角色名：完整原文台词’格式，videoMotionPrompt 同样逐字包含这些台词。",
        "script-to-drama-prompt-dev 用于 videoMotionPrompt；按用户时长缩放原 Skill 的 30 秒单元，30 秒通常 6–10 个有效内部镜头，短片段减少镜头，切换须有叙事动机，通常只用 1–2 次有动机的运镜。",
        "short-drama-asset-prompts 只用于角色、场景、道具设定与引用校验；保留原身份、族裔、物种和画风，不将默认亚洲人物、棚拍背景或空景无人要求强加到视频与分镜首帧。引用图分别说明身份与场景用途。",
        "每个角色先确定一份声线（年龄性别、音区音色、语速音量、句尾习惯），跨片段原样复用；只在出现人声的片段附对应角色声线。每段 2–3 个连续情绪状态，每个近景用 1–2 个可见信号，不写肌肉术语。",
        "videoMotionPrompt 必须是一份可直接提交的完整提示词，格式如下（括号说明须替换成实际内容）：",
        "【分镜】\n\n人物站位：（实际人物位置、视线、空间和道具状态；不写‘承接上段’代替内容）\n\n镜头1：（景别、可见动作、完整台词、倾听者反应）\n镜头2：（按剧情继续，直到本段自然落点）\n\n【角色名声线】（复用该角色声线，有几位说话角色就各写一块）\n\n【禁止项】\n\n文字/UI/水印/Logo/角标/可读文字/真实UI\n\n【强制声明】\n\n无背景音乐,仅保留环境音与人声和音效;画面禁字幕/文字/水印/Logo;禁止可读文字(指画面字幕文字,不含人声台词)",
        "切到倾听者、道具或空镜时，使用‘角色名画外音继续’保持同一句台词连续，不让两人同时说话。人物站位不计为镜头，镜头1必须开始实际动作。",
        "imageGenerationPrompt 是本片段真正第一帧，continuityOut 具体记录结尾人物位置、视线、道具状态与下一段入口；timeBeats 写覆盖本片段完整时长的节拍。不要用一句运镜描述替代完整视频提示词。",
        `Skill 署名只放在顶层 skillAttribution 字段：${DRAMA_SKILL_ATTRIBUTION}；不要放入 videoMotionPrompt 或人物台词。`,
    ].join("\n\n");
}

export function validateDramaStoryboard(rows: StoryboardRow[], plan?: DramaProductionPlan) {
    if (!plan) return;
    for (const [index, row] of rows.entries()) {
        if (!plan.allowedSeconds.includes(row.durationSeconds)) throw new Error(`第 ${index + 1} 段时长不符合所选模型与片段规划，未替换原分镜`);
        const prompt = row.videoMotionPrompt.trim();
        if (!prompt.startsWith("【分镜】") || !prompt.includes("人物站位：") || !prompt.includes("镜头1") || !prompt.includes("【禁止项】") || !prompt.includes("【强制声明】") || !prompt.includes("无背景音乐,仅保留环境音与人声和音效")) {
            throw new Error(`第 ${index + 1} 段缺少完整视频提示词，未替换原分镜`);
        }
        const comparable = (value: string) => value.replace(/[\s"'“”‘’「」『』]/g, "");
        const spokenLines = row.dialogue.split(/\r?\n/).flatMap(line => {
            const body = line.trim().match(/^[^：:\n]{1,40}[：:]\s*(.+)$/)?.[1];
            return body ? [comparable(body)] : [];
        });
        if (spokenLines.some(line => !comparable(prompt).includes(line))) throw new Error(`第 ${index + 1} 段视频提示词遗漏或改写了本段对白，未替换原分镜`);
    }
}

export function dramaPlanFromBeats(value: string): DramaProductionPlan | undefined {
    try {
        const beats: unknown = JSON.parse(value || "[]");
        if (!Array.isArray(beats)) return undefined;
        const plan = beats.find(item => item?.type === "drama_video_segment")?.productionPlan;
        return parseDramaProductionPlan(plan);
    } catch { return undefined; }
}
