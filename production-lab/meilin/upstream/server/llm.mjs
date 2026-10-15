// WeToken (OpenAI-compatible) text client. Live mode only when WETOKEN_API_KEY is set in the local .env.
import {integrated,context,bridge} from './fg-context.mjs';
import {createHash,randomUUID} from 'node:crypto';

// UI model id → provider model id. Override with WETOKEN_MODEL_MAP='{"claude-sonnet-5-5":"..."}'.
const DEFAULT_MAP = { 'claude-sonnet-5-5': 'claude-sonnet-5-5-t3a' };
let MAP = DEFAULT_MAP;
try { if (process.env.WETOKEN_MODEL_MAP) MAP = { ...DEFAULT_MAP, ...JSON.parse(process.env.WETOKEN_MODEL_MAP) }; } catch { /* keep default */ }

export const liveText = integrated;

export async function chat({ model, system, messages, maxTokens = 8000, temperature = 0.7, timeoutMs = 180000 }) {
  if(!integrated)throw Error('模拟模式不调用付费模型');
  const c=context();c.textOrdinal=(c.textOrdinal||0)+1;
  const hash=createHash('sha256').update(`${c.operationId}:${c.textOrdinal}`).digest('hex');
  const operationId=c.operationId?`${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`:randomUUID();
  const submitted=await bridge('submit',{operationId,kind:'text',model,payload:{messages:[{role:'system',content:system},...messages],max_tokens:maxTokens,temperature},metadata:{episodeId:c.episodeId||null,sourceAction:c.action||'turn',skills:c.skillsUsed||{}}});
  const until=Date.now()+timeoutMs;
  while(Date.now()<until){const task=await bridge('task',{taskId:submitted.taskId});
    if(task.status==='succeeded')return task.result.text||'';
    if(['failed','cancelled'].includes(task.status))throw Error(task.error||'文本任务失败');
    await new Promise(r=>setTimeout(r,1000));
  }
  throw Error('文本任务仍在处理，已保存在 FG 历史；请勿重复提交');
}

export function parseJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.search(/[[{]/);
  const end = Math.max(raw.lastIndexOf('}'), raw.lastIndexOf(']'));
  if (start < 0 || end < start) throw new Error('模型没有返回可解析的 JSON');
  return JSON.parse(raw.slice(start, end + 1));
}
