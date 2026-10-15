// Media generation driver. Default is simulated (no paid calls). FG integration routes every model through /api/tasks.
// Optional: MEILIN_REAL_MEDIA=1 with a WeToken key sends GPT Image models to the OpenAI-compatible images endpoint.
import {integrated} from './fg-context.mjs';

export const realImage = integrated;
export const mediaMode = () => (integrated ? 'fg-tasks' : 'simulated');

export function canReallyGenerate(modelId) {
  return integrated;
}

export async function generateImage({ model, prompt, params }) {
  throw Error('媒体生成必须先确认 FG 报价，再按任务 ID 恢复');
}
