import { expect, test } from "bun:test";
import { projectAssetGenerationPrompt, runAssetBatch } from "../src/pages/projects/detail/project-asset-generation-plan";
import type { ProjectAsset } from "../src/services/api/projects";
const asset = { id: "evan", title: "Evan", category: "character", definition: { appearance: "28岁白人男性，棕色短发" } } as ProjectAsset;
test("asset prompts preserve explicit identity and unstructured global style", () => {
    const prompt = projectAssetGenerationPrompt(asset, "美国纽约，真人心理悬疑电影，蓝灰雨夜");
    expect(prompt).toContain("28岁白人男性");
    expect(prompt).toContain("美国纽约");
    expect(prompt).toContain("蓝灰雨夜");
    expect(prompt).not.toContain("一位年轻中国");
    expect(prompt).toContain("正面、右侧面、背面");
});
test("saved editable prompt is the generation prompt until explicitly rebuilt", () => {
    const edited = { ...asset, definition: { ...asset.definition, generationPrompt: "我的已确认提示词" } };
    expect(projectAssetGenerationPrompt(edited, "新风格")).toBe("我的已确认提示词");
    expect(projectAssetGenerationPrompt(edited, "新风格", true)).toContain("新风格");
});
test("bounded batch reports partial failures and never resubmits a failed operation", async () => {
    let active = 0,
        maximum = 0;
    const called: number[] = [];
    const results: number[] = [];
    await runAssetBatch(
        [1, 2, 3, 4],
        async (item) => {
            called.push(item);
            active++;
            maximum = Math.max(maximum, active);
            await Promise.resolve();
            active--;
            if (item === 2) throw Error("unknown submit");
        },
        (item, error) => results.push(error ? -item : item),
    );
    expect(maximum).toBeLessThanOrEqual(2);
    expect(called.sort()).toEqual([1, 2, 3, 4]);
    expect(results).toContain(-2);
    expect(results).toContain(4);
});
