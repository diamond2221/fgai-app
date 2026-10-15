// FG text tasks: the gateway owns provider credentials and billing.
import {integrated,context,bridge} from './fg-context.mjs';
import {createHash,randomUUID} from 'node:crypto';

export const liveText = integrated;

export async function chat({ model, system, messages, maxTokens = 8000, temperature = 0.7, timeoutMs = 180000, streamPresentation = 'status' }) {
  if(!integrated)throw Error('模拟模式不调用付费模型');
  const c=context();c.textOrdinal=(c.textOrdinal||0)+1;
  const hash=createHash('sha256').update(`${c.operationId}:${c.textOrdinal}`).digest('hex');
  const operationId=c.operationId?`${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`:randomUUID();
  const submitted=await bridge('submit',{operationId,kind:'text',model,payload:{messages:[{role:'system',content:system},...messages],max_tokens:maxTokens,temperature},metadata:{episodeId:c.episodeId||null,sourceAction:c.action||'turn',skills:c.skillsUsed||{}}});
  const until=Date.now()+timeoutMs;
  let after=0,text='';c.emit?.('status',{text:'模型正在思考，收到正文后会实时显示。'});
  while(Date.now()<until){const task=await bridge('task',{taskId:submitted.taskId,...(c.emit?{after}:{})});
    for(const delta of task.replay?.deltas||[]){if(delta.sequence>after){after=delta.sequence;text+=delta.content;if(streamPresentation!=='status')c.emit?.('text',{text,format:streamPresentation,action:c.action});}}
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

// A conversational suggestion without actions is valid. Never infer writes from prose.
export function parseDirectorTurn(text) {
  try {
    const result = parseJson(text);
    if (!result || Array.isArray(result) || typeof result.reply !== 'string' || (result.actions !== undefined && !Array.isArray(result.actions))) throw Error('导演响应结构无效');
    return {...result, actions: result.actions || []};
  } catch (error) {
    if (typeof text === 'string' && text.trim() && !/[\[{}\]]|```/.test(text)) return {reply:text.trim(),actions:[]};
    throw error;
  }
}
