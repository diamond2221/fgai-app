import {useEffect,useRef,useState} from 'react';
import {api,Drama} from '../api';
import {useDirector} from '../lib/ctx';
const money=(v:number|null|undefined)=>v===null||v===undefined?'按实际用量计费':`¥${v.toLocaleString('zh-CN',{maximumFractionDigits:6})}`;
export default function ProductionReview({drama,onUpdate}:{drama:Drama;onUpdate:(d:Drama)=>void}){
 const {config}=useDirector();
 const ref=useRef<HTMLDialogElement>(null),[hidden,setHidden]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const ops=(drama.production||[]).filter(p=>p.status==='awaiting_confirmation'&&(!p.actorId||p.actorId===config.actor?.id)),signature=ops.map(p=>p.id).join(','),open=Boolean(signature&&signature!==hidden);
 useEffect(()=>{const d=ref.current;if(!d)return;if(open&&!d.open)d.showModal();if(!open&&d.open)d.close();},[open]);
 const close=()=>setHidden(signature);
 const run=async(action:'confirm'|'cancel'|'requote')=>{setBusy(true);setError('');try{const r=action==='confirm'?await api.confirm(drama.id,ops):action==='cancel'?await api.cancel(drama.id,ops.map(p=>p.id)):await api.requote(drama.id,ops.map(p=>p.id));onUpdate(r.project);if(action!=='requote')close();}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 const known=ops.every(p=>typeof p.quote.estimatedCny==='number'),total=known?ops.reduce((s,p)=>s+p.quote.estimatedCny!,0):null,budget=ops[0]?.quote.budget;
 return <>{signature&&!open&&<button className="btn production-reopen" onClick={()=>setHidden('')}>核对待提交任务 · {ops.length}</button>}
 <dialog ref={ref} className="drawer production-review" onCancel={close} onClose={close} aria-label="确认生成任务">
  <div className="drawer-in"><header className="drawer-head"><h2>核对生成任务</h2><button className="icon-btn" onClick={close} aria-label="关闭">×</button></header>
  <div className="drawer-body"><p>尚未提交付费任务。请核对模型、素材和报价；确认后可关闭页面，任务在后台继续。</p>
   <p><b>{ops.length} 个任务 · 合计 {money(total)}</b></p><p>本月剩余额度：{budget?.monthlyCny===null?'未设限额':money(budget?.remainingCny)}{Boolean(budget?.unknown)&&'（有待确认金额）'}</p>
   {ops.map(p=><section className="production-item" key={p.id}><h3>{p.label} · {p.kind==='image'?'图片':'视频'}</h3><p>{config.models.find(m=>m.id===p.model)?.label||p.model}</p><p>{Object.entries(p.params||{}).filter(([k])=>k!=='prompt').map(([k,v])=>`${k}: ${v}`).join(' · ')}</p><p>参考：{p.referenceNames?.join('、')||'无参考图'}</p><details><summary>核对实际提示词</summary><p className="prompt-text">{String(p.params?.prompt||'')}</p></details><p>{money(p.quote.estimatedCny)}</p>{p.quote.lines.map((x,i)=><p key={i}>{x}</p>)}<small>{p.quote.notes.join(' ')}</small></section>)}
   {error&&<p role="alert">{error}</p>}
  </div><footer className="production-actions"><button className="btn ghost" disabled={busy} onClick={()=>run('cancel')}>取消提交</button><button className="btn ghost" disabled={busy} onClick={()=>run('requote')}>更新报价</button><button className="btn" disabled={busy||!ops.length} onClick={()=>run('confirm')}>{busy?'正在处理…':'确认并在后台生成'}</button></footer></div>
 </dialog></>;
}
