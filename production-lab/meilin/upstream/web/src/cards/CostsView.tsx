import {useEffect,useState} from 'react';
import {api} from '../api';
import {useDirector} from '../lib/ctx';
import {Card} from './Card';
const money=(x:any)=>x===null||x===undefined?'待确认':`¥${Number(x).toLocaleString('zh-CN',{maximumFractionDigits:6})}`;
export default function CostsView(){const {drama}=useDirector(),[data,setData]=useState<{calls:any[];budget:any}>(),[error,setError]=useState(''),[group,setGroup]=useState('all');
 const load=()=>api.costs(drama.id).then(setData).catch(e=>setError(e.message));useEffect(()=>{load();},[drama.id]);
 const source=(data?.calls||[]).map(c=>c.model==='gpt-6.1-sol'?{...c,personalKey:true,estimatedCny:0,settledCny:0}:c),key=group==='asset'?'assetCode':group==='segment'?'segmentId':'episodeId';
 const names=new Map<string,string>();for(const e of drama.episodes){if(e.id)names.set(e.id,`第 ${e.n} 集`);for(const s of e.segments)if(s.id)names.set(s.id,`第 ${e.n} 集 · 第 ${s.n} 段`);}for(const a of drama.assets.items)names.set(a.code,`${a.code} ${a.name}`);
 const grouped=new Map<string,any>();for(const c of source){const id=c.metadata?.[key]||'全剧',label=names.get(id)||id;const row=grouped.get(id)||{id,label,model:'',count:0,estimatedCny:0,settledCny:0,unknownEstimate:false,unknownSettled:false};row.count++;row.model=`${row.count} 次调用`;if(c.estimatedCny===null)row.unknownEstimate=true;else row.estimatedCny+=c.estimatedCny;if(c.settledCny===null)row.unknownSettled=true;else row.settledCny+=c.settledCny;grouped.set(id,row);}
 const rows=group==='all'?source.map(c=>({...c,label:names.get(c.metadata?.assetCode||c.metadata?.segmentId||c.metadata?.episodeId)||'全剧文本'})):[...grouped.values()].map(c=>({...c,estimatedCny:c.unknownEstimate?null:c.estimatedCny,settledCny:c.unknownSettled?null:c.settledCny}));
 const complete=source.every(c=>c.settledCny!==null),total=source.reduce((s,c)=>s+(c.settledCny||0),0);
 return <Card wide title="费用" sub="复用 FG 人民币账本；Trings 个人 Key 不计入 FG 额度，外部费用以个人账户为准。" footer={<button className="btn ghost" onClick={load}>刷新账单</button>}>
 <div className="viewbar"><label>查看范围 <select value={group} onChange={e=>setGroup(e.target.value)}><option value="all">全剧</option><option value="episode">分集</option><option value="segment">分段</option><option value="asset">资产</option></select></label></div>
 <p>FG 费用合计 {money(total)}{!complete&&' · 部分请求仍待核销'}；本月剩余 {data?.budget?.monthlyCny===null?'未设限额':money(data?.budget?.remainingCny)}</p>
 <p className="small muted">GPT6.1 Sol 使用自己的 Trings Key。这里零金额只表示 FG 不扣内部额度，不表示上游免费或外部账单已结算；Trings 实际费用与剩余额度请查看个人账户。仍记录实际 Token 用量。</p>
 <p className="small muted">服务商独立回报金额：当前账本尚未提供，显示为待确认。按用量估算的金额不视为已核销。</p>
 {error&&<p role="alert">{error}</p>}<div className="cost-table-wrap"><table className="cost-table"><thead><tr><th>归属</th><th>模型 / 调用数</th><th>预估</th><th>服务商回报</th><th>已核销</th><th>FG 任务</th></tr></thead><tbody>{rows.map(c=><tr key={c.id}><td>{c.label}</td><td>{c.model}</td><td>{money(c.estimatedCny)}</td><td>待确认</td><td>{money(c.settledCny)}</td><td>{c.task_id||'见全剧明细'}</td></tr>)}</tbody></table></div>{data&&!rows.length&&<p>暂无此范围的费用记录。</p>}
 </Card>;}
