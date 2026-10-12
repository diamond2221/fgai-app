import { describe, expect, test } from "bun:test";
import { createModelChannel, defaultConfig, type AiConfig } from "@/stores/use-config-store";
import { defaultModelCapabilityConfig } from "@/lib/model-capabilities";
import { resolveVideoOperationForModel } from "@/lib/model-selection";
import { buildGenerationConfig, buildVideoGenerationMetadata } from "@/lib/canvas/canvas-project-generation";
import { buildNodeConfig } from "@/components/canvas/canvas-node-prompt-config";
import { modelQuoteRequest } from "@/lib/model-pricing";
import { createDramaProductionPlan, dramaSegmentDurations, dramaPlanFromBeats, validateDramaStoryboard } from "@/lib/short-drama-production";
import { chapterStoryboardPrompt, chapterStoryboardFromGenerationTask } from "@/pages/projects/detail/project-chapter-ai";
import { storyboardRowsToProjectShots } from "@/pages/projects/detail/chapter-storyboard-production";
import { CanvasNodeType, type CanvasNodeData, type StoryboardRow } from "@/types/canvas";

function config(max = 30): AiConfig {
    const model = "doubao-seedance-2-5";
    const capabilityConfig = defaultModelCapabilityConfig();
    capabilityConfig.video!.operations = ["text_to_video", "reference_to_video", "image_to_video"];
    capabilityConfig.video!.duration = { selection: "range", min: 4, max, step: 1, default: 15 };
    capabilityConfig.video!.ratios = ["16:9", "9:16", "adaptive"];
    capabilityConfig.video!.references.maxImages = 30;
    const channel = createModelChannel({ id: "qa", name: "QA", scope: "system", models: [model], modelCosts: [{ model, capability: "video", billingMode: "per_second", unitPriceMicrocredits: 1, logicalModelId: "seed25", capabilityConfig }] });
    const selected = `${channel.id}::${model}`;
    return { ...defaultConfig, channels: [channel], models: [selected], videoModels: [selected], model: selected, videoModel: selected, size: "16:9", videoSeconds: "20" };
}
const input = { textCount: 1, imageCount: 2, videoCount: 0, audioCount: 0, characterCount: 0 };
function node(operation?: "image_to_video" | "reference_to_video"): CanvasNodeData {
    return { id: "v", type: CanvasNodeType.Video, title: "v", position: { x: 0, y: 0 }, width: 100, height: 100, metadata: { videoEditOperation: operation, videoStartFrameNodeId: "first", videoEndFrameNodeId: "last", seconds: "20", size: "16:9" } };
}
const refs = { referenceImages: [{ id: "first", url: "https://example.com/a.png" }, { id: "last", url: "https://example.com/b.png" }], referenceVideos: [], referenceAudios: [] };

describe("视频参考模式与真实请求报价一致", () => {
    test("一张或两张图片自动全能参考，断开媒体自动回到文生", () => {
        const cfg = config();
        for (const imageCount of [1, 2, 3]) expect(resolveVideoOperationForModel(cfg, cfg.model, { ...input, imageCount })).toBe("reference_to_video");
        expect(resolveVideoOperationForModel(cfg, cfg.model, { ...input, imageCount: 0 }, "reference_to_video")).toBe("text_to_video");
        expect(resolveVideoOperationForModel(cfg, cfg.model, input, "image_to_video")).toBe("image_to_video");
        expect(buildVideoGenerationMetadata(node(), refs, cfg).videoStartFrameNodeId).toBeUndefined();
    });
    test("手选首尾帧保留角色且 Seedance 2.5 显示配置与实际提交均为 adaptive", () => {
        const cfg = config();
        const requirements = { capability: "video" as const, input, videoOperation: "image_to_video" };
        const display = buildNodeConfig(cfg, node("image_to_video"), "video", requirements);
        const submitted = buildGenerationConfig(cfg, node("image_to_video"), "video", requirements);
        expect(display.size).toBe("adaptive"); expect(submitted.size).toBe("adaptive");
        expect(buildVideoGenerationMetadata(node("image_to_video"), refs, cfg)).toMatchObject({ videoEditOperation: "image_to_video", videoStartFrameNodeId: "first", videoEndFrameNodeId: "last" });
        expect(modelQuoteRequest(display, display.model, "video", requirements)).toMatchObject({ intent: { operation: "image_to_video", options: { size: "adaptive", videoSeconds: 20 } } });
        expect(modelQuoteRequest(cfg, cfg.model, "video", { capability: "video", input })).toMatchObject({ intent: { operation: "reference_to_video" } });
    });
    test("首尾帧拒绝混入音频视频或超过两图", () => {
        expect(() => buildVideoGenerationMetadata(node("image_to_video"), { ...refs, referenceImages: [...refs.referenceImages, { id: "third", url: "https://example.com/c.png" }] }, config())).toThrow("全能参考");
    });
});

const fullPrompt = "【分镜】\n\n人物站位：林默在门内左侧，手扶门把。\n镜头1：推门后说‘有人吗？’\n镜头2：停下侧耳倾听。\n【林默声线】青年男声，低音区，平稳语速。\n【禁止项】\n文字/UI/水印/Logo/角标/可读文字/真实UI\n【强制声明】\n无背景音乐,仅保留环境音与人声和音效;画面禁字幕/文字/水印/Logo;禁止可读文字(指画面字幕文字,不含人声台词)";
const row = { durationSeconds: 20, videoMotionPrompt: fullPrompt, plotDescription: "推门进入旧屋", dialogue: "林默：有人吗？", shotSize: "中景", camera: "平视", motion: "推进", timeBeats: "0-20秒", imageGenerationPrompt: "旧屋第一帧", negativePrompt: "", continuityOut: "门内左侧手扶门把", characters: [], assetBindings: [], narrativeIntent: "揭示", performanceBlocking: "推门", emotion: "谨慎", lightingAndAtmosphere: "月光", audioEffects: "门响" } as unknown as StoryboardRow;
describe("剧情视频片段规划与恢复", () => {
    test("最长15秒的模型不出现20/25/30，固定与剧情策略保留合法长片段", () => {
        expect(dramaSegmentDurations(config(15), config().model)).toEqual([13, 15]);
        expect(() => createDramaProductionPlan(config(15), config().model, 30, "fixed")).toThrow();
        expect(createDramaProductionPlan(config(), config().model, 30, "story").allowedSeconds).toEqual([13, 15, 20, 25, 30]);
    });
    test("真实提示词包含画风与资产ID和两个Skill正文", () => {
        const plan = createDramaProductionPlan(config(), config().model, 20, "fixed");
        const prompt = chapterStoryboardPrompt({ productionPlan: plan, projectStyle: { presetId: "test", title: "写实", prompt: "冷雨夜" }, characters: [{ name: "林默", assetId: "character-real", definition: { appearance: "黑风衣" } }], assets: [{ id: "character-real", title: "林默", type: "character", tags: [], prompt: "黑风衣" }] }, "本章对白：有人吗？");
        for (const text of ["冷雨夜", "character-real", "short-drama-asset-prompts", "script-to-drama-prompt-dev", "characterVersionId", "assetBindings", "20 秒"]) expect(prompt).toContain(text);
    });
    test("生成结果先校验，3秒碎镜和简陋运镜不能替换原数据", () => {
        const plan = createDramaProductionPlan(config(), config().model, 20, "fixed");
        expect(() => validateDramaStoryboard([row], plan)).not.toThrow();
        expect(() => validateDramaStoryboard([{ ...row, durationSeconds: 3 }], plan)).toThrow("未替换");
        expect(() => validateDramaStoryboard([{ ...row, videoMotionPrompt: "慢推人物" }], plan)).toThrow("未替换");
        expect(() => validateDramaStoryboard([{ ...row, dialogue: "林默：这句台词必须保留。" }], plan)).toThrow("遗漏或改写");
        const shot = storyboardRowsToProjectShots([row], undefined, plan)[0];
        expect(dramaPlanFromBeats(JSON.stringify(shot.revision.actionBeats))).toEqual(plan);
        expect(shot.durationMs).toBe(20000); expect(shot.revision.videoPrompt).toBe(fullPrompt);
        expect(dramaPlanFromBeats('[{"type":"drama_video_segment","productionPlan":{"model":"x","seconds":30,"allowedSeconds":[3]}}]')).toBeUndefined();
    });
    test("刷新恢复保留目标模型并拒绝不存在的资产", () => {
        const plan = createDramaProductionPlan(config(), config().model, 20, "fixed");
        const task = { id: "qa", type: "canvas_text", status: "succeeded", prompt: "", attempts: 1, createdAt: "", updatedAt: "", inputJson: JSON.stringify({ metadata: { dramaProductionPlan: plan, dramaAssetIds: [] } }), resultJson: JSON.stringify({ mode: "text", text: JSON.stringify({ title: "QA", rows: [row] }) }) };
        expect(chapterStoryboardFromGenerationTask(task).productionPlan).toEqual(plan);
        task.resultJson = JSON.stringify({ mode: "text", text: JSON.stringify({ title: "QA", rows: [{ ...row, assetBindings: [{ nodeId: "invented", role: "prop", priority: 1 }] }] }) });
        expect(() => chapterStoryboardFromGenerationTask(task)).toThrow("不存在");
    });
});
