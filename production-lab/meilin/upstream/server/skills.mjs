// Skill catalog: FG's own skills in ./skills plus the creative skills installed for Claude Code on this computer.
// Skills are read in place (never copied into this repo) and only loaded into prompts in live mode.
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {createHash} from 'node:crypto';
import {context,integrated} from './fg-context.mjs';

const LOCAL = join(dirname(fileURLToPath(import.meta.url)), '..', 'skills');
export const SKILLS_DIR = process.env.MEILIN_SKILLS_DIR || join(homedir(), '.claude', 'skills');

// stage: script | style | asset | segment | action | boost
const CATALOG = [
  { id: 'fg-overseas-drama-script', stage: 'script', local: true, label: 'FG 海外剧本包', note: 'AI Studio 指引 + 剧本合同 + 四条可复制 Prompt' },
  { id: 'short-drama-factory', stage: 'script', label: '爆款短剧工厂', note: '钩子库、反转矩阵、断章公式、时长换算', default: true,
    parts:{episode:['references/golden-3s-hook-library.md','references/cliffhanger-master-formulas.md','references/dialogue-doctor-anti-ai.md','references/craft-quality-layer.md','references/inner-monologue-vo.md','references/conflict-modes.md']} },
  { id: 'screenwriter', stage: 'script', label: 'Screenwriter', note: '分集大纲、节拍表、改稿' },

  { id: 'zy-cinematic-realism', stage: 'style', label: 'ZY 造梦师 · Dream Decode', note: '解析参考图的媒介、光线与质感并迁移为画风规范', license: 'CC BY-NC 4.0', default: true,
    parts: { decode: ['references/reference-role-router.md', 'references/medium-router.md', 'references/dream-decode.md'] } },

  { id: 'short-drama-asset-prompts', stage: 'asset', label: '短剧资产提示词', note: '定妆照、无人场景、单件道具；所有资产都用它写', default: true },

  // render: the style layer applied when an asset is actually generated
  { id: 'plain', stage: 'render', local: true, virtual: true, label: '原样出图', note: '直接用短剧资产提示词，不加额外风格层', default: true },
  { id: 'zy-cinematic-realism', stage: 'render', label: 'ZY 电影感', note: '电影级写实：动机化光源、可信机位、反 AI 痕迹，按所选生图模型编译', license: 'CC BY-NC 4.0',
    parts: { compile: ['references/cinematic-principles.md', 'references/camera-and-light.md', 'references/anti-ai-cleanup.md', 'references/quality-checklist.md'] } },
  { id: 'deepwhite-image-prompt-builder', stage: 'render', label: 'DeepWhite 静帧', note: '电影静帧与角色海报质感，中英双语' },
  { id: 'lira-image-prompts', stage: 'render', label: 'Lira 人像', note: '写实人像与定妆细节' },
  { id: 'gpt-image-2-style-library', stage: 'render', label: 'GPT Image 2 风格库', note: '工业模板，适合 GPT Image 系列' },

  // Segment skills only change the directing method; every segment prompt is still written in the FG video prompt format.
  { id: 'script-to-drama-prompt-dev', stage: 'segment', label: '剧本转文戏', note: '按剧情把剧本拆成文戏单元，声线锁定；输出用 FG 视频提示词格式', default: true },
  { id: 'fg-drama-video-prompt', stage: 'segment', local: true, label: 'FG 文戏导演', note: 'FG 标准格式 + 段间衔接锁' },
  { id: 'cinedance-higgsfield', stage: 'segment', label: 'CineDance 走位视线', note: '首帧占位、视线、身体朝向、多镜连续' },

  { id: 'wuxi-action-director-public', stage: 'action', label: '武戏导演', note: '节奏曲线、有来有回的交锋、环境反馈', default: true },
  { id: 'seedance-combat-prompt', stage: 'action', label: 'Seedance 打戏', note: '格斗、追逐与特技' },

  { id: 'zy-cinematic-realism', stage: 'boost', label: 'ZY 电影感', note: '动机化光源、可信机位、反 AI 痕迹清理', license: 'CC BY-NC 4.0',
    parts: { boost: ['references/cinematic-principles.md', 'references/camera-and-light.md', 'references/anti-ai-cleanup.md'] } },
  { id: 'acting', stage: 'boost', label: '表演指导', note: '目标、潜台词、眼神与身体' },
  { id: 'cinema-dna-21x9x3', stage: 'boost', label: 'Cinema DNA', note: '电影感单帧与九镜分镜' },
  { id: 'xiaotang-ai-prompt-architect', stage: 'boost', label: '小唐导演架构', note: '运镜、光色、材质与情绪反差' },
];

const dirOf = (s) => (s.local ? join(LOCAL, s.id) : join(SKILLS_DIR, s.id));
const ZY_ADAPTER = (model = '') => (/gpt-image/.test(model) ? 'references/models/gpt-image-2.md' : /seedream/.test(model) ? 'references/models/seedream-5-pro.md' : /gemini/.test(model) ? 'references/models/nano-banana.md' : null);

export function catalog() {
  return CATALOG.map((s) => ({ ...s, key: `${s.stage}:${s.id}`, installed: s.virtual || existsSync(join(dirOf(s), 'SKILL.md')) }));
}

export function defaults() {
  const d = {};
  for (const s of CATALOG) if (s.default && !d[s.stage]) d[s.stage] = s.id;
  return { script: d.script, style: d.style, asset: d.asset, render: d.render, segment: d.segment, action: d.action, boost: [] };
}

export const labelOf = (stage, id) => CATALOG.find((s) => s.stage === stage && s.id === id)?.label || id;

// Load a skill for a live prompt. `part` picks the reference files listed for that use.
export function loadSkill(stage, id, part, model) {
  const s = CATALOG.find((x) => x.stage === stage && x.id === id) || CATALOG.find((x) => x.id === id);
  if (!s || s.virtual) return '';
  const dir = dirOf(s);
  if(integrated&&!existsSync(join(dir,'SKILL.md')))throw Error(`技能未安装：${id}，请由管理员安装完整技能包`);
  const adapter = s.id === 'zy-cinematic-realism' && part === 'compile' ? ZY_ADAPTER(model) : null;
  const files = ['SKILL.md', ...((part && s.parts?.[part]) || []), ...(adapter ? [adapter] : [])];
  const out = [];
  for (const f of files) {
    const p = join(dir, f);
    if(integrated&&!existsSync(p))throw Error(`技能文件缺失：${id}/${f}，请安装完整技能包`);
    if (existsSync(p)) out.push(`<<${s.id}/${f}>>\n${readFileSync(p, 'utf8')}`);
  }
  const text=out.join('\n\n');if(integrated){const c=context();c.skillsUsed ||= {};c.skillsUsed[`${stage}:${id}`]=createHash('sha256').update(text).digest('hex');}return text;
}

// Free-text matching for the agent ("用 zy 电影感", "分段用 cinedance").
const ALIASES = { zy: 'zy-cinematic-realism', 造梦师: 'zy-cinematic-realism', 电影感: 'zy-cinematic-realism', cinedance: 'cinedance-higgsfield', 剧本转文戏: 'script-to-drama-prompt-dev', 转文戏: 'script-to-drama-prompt-dev', deepwhite: 'deepwhite-image-prompt-builder', 武戏: 'wuxi-action-director-public', wuxi: 'wuxi-action-director-public', 工厂: 'short-drama-factory', factory: 'short-drama-factory', lira: 'lira-image-prompts', 表演: 'acting', acting: 'acting', 'work-fisher': 'script-to-drama-prompt-dev', 文戏导演: 'fg-drama-video-prompt' };
export function matchSkill(text) {
  const t = text.toLowerCase();
  for (const [k, v] of Object.entries(ALIASES)) if (t.includes(k.toLowerCase())) return v;
  const hit = CATALOG.find((s) => t.includes(s.id) || t.includes(s.label.toLowerCase()));
  return hit?.id || null;
}
export const validIn = (stage, id) => CATALOG.some((s) => s.stage === stage && s.id === id);
export const stagesOf = (id) => CATALOG.filter((s) => s.id === id).map((s) => s.stage);
