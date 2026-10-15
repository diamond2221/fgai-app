import {AsyncLocalStorage} from 'node:async_hooks';
const scope=new AsyncLocalStorage();
export const integrated=process.env.MEILIN_MODE==='fg';
export const runContext=(value,fn)=>scope.run(value,fn);
export function context(){const value=scope.getStore();if(integrated&&!value)throw Error('美林缺少可信请求上下文');return value||{};}
export async function bridge(action,payload={}) {
 const c=context();
 if(!c.actor?.id||!c.dramaId)throw Error('美林请求缺少账号或剧目');
 const {signIdentity}=await import('./fg-contract.mjs');
 const path=`/internal/meilin/${c.actor.id}/${c.dramaId}/${action}`;
 const response=await fetch(new URL(path,process.env.MEILIN_GATEWAY_URL||'http://fg-gateway:3010'),{method:'POST',headers:{...signIdentity(c.actor,'POST',path,process.env.MEILIN_INTERNAL_SECRET),'content-type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(120000)});
 const body=await response.json();if(!response.ok)throw Error(body.error||'FG 制作服务暂不可用');return body;
}
