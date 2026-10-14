import type { ProjectAsset } from "@/services/api/projects";

export const ASSET_PROMPT_SKILL = "short-drama-asset-prompts";
export function projectAssetHasImage(asset: ProjectAsset) {
    return asset.category === "character" ? Boolean(asset.character?.representations.length) : asset.mediaType === "image" && Boolean(asset.storageKey);
}
export function projectAssetGenerationPrompt(asset: ProjectAsset, style: string, regenerate = false) {
    const definition = asset.character?.definition || asset.definition || {};
    if (!regenerate && typeof definition.generationPrompt === "string" && definition.generationPrompt.trim()) return definition.generationPrompt;
    const details = Object.entries(definition)
        .filter(([key, value]) => !["generationPrompt", "generationReferenceIds"].includes(key) && value != null && value !== "")
        .map(([key, value]) => `${key}：${typeof value === "string" ? value : JSON.stringify(value)}`)
        .join("；");
    const subject =
        asset.category === "character"
            ? "角色定妆三视图：同一角色正面、右侧面、背面全身并排，头顶到脚底完整入画，同一服装发型体态，正常透视；人物哑光皮肤、自然睁眼。保持原物种和外貌；动物或非人角色不强加人类皮肤与五官。"
            : asset.category === "environment"
              ? "场景环境设定图：无人空镜，按空间结构、具体物件位置与材质磨损、光源方向色温和阴影、空气质感、摄影焦段与景深的顺序表现。"
              : "单件道具设定图：完整展示形状、尺寸比例、材质与已有使用痕迹，三分之四角度、简洁背景、清晰布光，无人物或手部。";
    return [
        subject,
        `资产：${asset.title}。${details || asset.previewText || "按项目和原设定呈现，不编造身份信息。"}`,
        style ? `项目全局画风与世界观：\n${style}` : "项目未设置全局画风；保留已有视觉媒介。",
        "身份与参考约束：原设定和参考图中的身份、地区、族裔、时代、物种优先；未明确时不默认中国人物或东亚面孔，也不凭名字推断族裔。参考图只用于所标注资产，保留角色与道具的稳定特征。",
        "使用具体材质、空间和光线；已有画风优先，不擅自改成写实、动画或中国古装。不添加文字、标签、水印或额外人物。",
    ].join("\n\n");
}

export async function runAssetBatch<T>(items: T[], operation: (item: T) => Promise<void>, onResult: (item: T, error?: unknown) => void, concurrency = 2) {
    let next = 0;
    await Promise.all(
        Array.from({ length: Math.min(concurrency, items.length) }, async () => {
            while (next < items.length) {
                const item = items[next++];
                try {
                    await operation(item);
                    onResult(item);
                } catch (error) {
                    onResult(item, error);
                }
            }
        }),
    );
}
