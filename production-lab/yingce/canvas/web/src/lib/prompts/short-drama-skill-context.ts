import assetSkill from "./short-drama-skills/short-drama-asset-prompts/SKILL.md?raw";
import assetTemplates from "./short-drama-skills/short-drama-asset-prompts/references/public-asset-templates.md?raw";
import videoSkill from "./short-drama-skills/script-to-drama-prompt-dev/SKILL.md?raw";
import approvedFormat from "./short-drama-skills/script-to-drama-prompt-dev/references/approved-format-example.md?raw";

export const SHORT_DRAMA_BUILTIN_SKILLS = [
    { name: "short-drama-asset-prompts", files: [{ path: "SKILL.md", content: assetSkill }, { path: "references/public-asset-templates.md", content: assetTemplates }] },
    { name: "script-to-drama-prompt-dev", files: [{ path: "SKILL.md", content: videoSkill }, { path: "references/approved-format-example.md", content: approvedFormat }] },
];

export function shortDramaSkillContext() {
    return SHORT_DRAMA_BUILTIN_SKILLS.map(skill => `<skill-context name="${skill.name}">\n${skill.files.map(file => `<skill-file path="${file.path}">\n${file.content}\n</skill-file>`).join("\n\n")}\n</skill-context>`).join("\n\n");
}

export async function shortDramaSkillProvenance() {
    return Promise.all(SHORT_DRAMA_BUILTIN_SKILLS.map(async skill => ({
        name: skill.name,
        files: await Promise.all(skill.files.map(async file => ({
            path: file.path,
            sha256: Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(file.content)))).map(byte => byte.toString(16).padStart(2, "0")).join(""),
        }))),
    })));
}
