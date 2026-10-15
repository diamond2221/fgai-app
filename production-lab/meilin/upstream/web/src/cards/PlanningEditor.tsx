import {useState} from 'react';
import {useDirector} from '../lib/ctx';
import {copyText} from './Card';

export default function PlanningEditor({kind}:{kind:'brief'|'bible'}){
  const {drama:d,config,run,busy,toast}=useDirector();
  const [editing,setEditing]=useState(false),[external,setExternal]=useState('');
  const [draft,setDraft]=useState<Record<string,any>>({});
  const labels=kind==='brief'?{premiseZh:'中文故事概念',premise:'英文故事概念（可选）',genre:'题材',market:'目标市场',language:'成片台词语言',protagonist:'主角设定'}:{titleZh:'中文片名',title:'英文片名（可选）',loglineZh:'中文故事主线',faces:'选角、面孔与身份规则',performance:'表演方式',rulesText:'红线（每行一条）',stylePrompt:'全剧画风规范'};
  const start=()=>{
    if(kind==='brief')setDraft({...d.brief,episodes:d.brief?.episodes||30,episodeSeconds:d.brief?.episodeSeconds||90});
    else setDraft({...d.bible,cast:(d.bible?.cast||[]).map(c=>({...c})),rulesText:(d.bible?.rules||[]).join('\n'),stylePrompt:d.bible?.style?.prompt||''});
    setEditing(true);
  };
  const save=async()=>{
    const value=kind==='bible'?{...draft,rules:String(draft.rulesText||'').split('\n').filter(Boolean)}:draft;
    if(await run(`${kind}.update`,{value}))setEditing(false);
  };
  return <section className="planning-editor">
    <div className="row"><button className="btn small" disabled={busy} onClick={start}>{kind==='brief'?'手动填写 / 修改立项':'编辑圣经、演员与画风'}</button>
      {kind==='bible'&&d.bible&&<button className="btn ghost small" disabled={busy} onClick={()=>run('bible.translate')}>将说明翻译为中文</button>}
    </div>
    {editing&&<form onSubmit={e=>{e.preventDefault();void save();}}>
      {Object.entries(labels).map(([key,label])=><label className="planning-field" key={key}><span>{label}</span><textarea className="field" rows={key==='stylePrompt'?8:2} value={draft[key]||''} onChange={e=>setDraft(v=>({...v,[key]:e.target.value}))}/></label>)}
      {kind==='brief'&&<div className="row"><label>集数 <input type="number" min="1" max="300" value={draft.episodes} onChange={e=>setDraft(v=>({...v,episodes:Number(e.target.value)}))}/></label><label>每集秒数 <input type="number" min="15" max="600" value={draft.episodeSeconds} onChange={e=>setDraft(v=>({...v,episodeSeconds:Number(e.target.value)}))}/></label></div>}
      {kind==='bible'&&(draft.cast||[]).map((c:any,i:number)=><fieldset key={c.code}><legend>{c.key} · {c.zh||c.name}</legend>{Object.entries({name:'角色原名',zh:'中文名',age:'年龄',look:'外貌与服装',role:'剧情定位'}).map(([key,label])=><label className="planning-field" key={key}><span>{label}</span><textarea className="field" rows={2} value={c[key]||''} onChange={e=>setDraft(v=>({...v,cast:v.cast.map((x:any,n:number)=>n===i?{...x,[key]:e.target.value}:x)}))}/></label>)}</fieldset>)}
      {kind==='bible'&&<button type="button" className="btn small" disabled={(draft.cast||[]).length>=20} onClick={()=>setDraft(v=>{const n=Math.max(0,...v.cast.map((c:any)=>Number(c.code.replace('@角色',''))||0))+1;const key='ABDEFGHIJKLMNOPQRSTUVWXYZ'.split('').find(k=>!v.cast.some((c:any)=>c.key===k));return {...v,cast:[...v.cast,{code:`@角色${n}`,key,name:'',zh:'',age:'',look:'',role:''}]};})}>增加角色</button>}
      <p className="small muted">保存后需要重新确认。已有剧本、资产和视频保留，不自动重生成。</p>
      <div className="row"><button className="btn primary small" disabled={busy}>保存草稿</button><button type="button" className="btn ghost small" onClick={()=>setEditing(false)}>取消</button></div>
    </form>}
    <details><summary>使用 Google AI Studio 起草{kind==='brief'?'立项':'圣经'}，再导入</summary>
      <p className="small muted">复制指引，去 AI Studio 讨论、修改；把确认好的完整 JSON 粘贴回来，导入后先核对，再确认。</p>
      <div className="row"><button className="btn small" disabled={busy} onClick={async()=>{const prompt=config.planningPrompts?.[kind]||'';if(await copyText(prompt+(kind==='brief'?(d.brief?.idea||'请填写你的故事想法'):JSON.stringify(d.brief,null,2))))toast('起草指引已复制');}}>复制起草指引</button><a href="https://aistudio.google.com/" target="_blank" rel="noreferrer">打开 Google AI Studio</a></div>
      <textarea className="field" rows={6} aria-label={`${kind==='brief'?'立项':'圣经'}导入内容`} placeholder="粘贴 AI Studio 返回的完整 JSON（支持代码块）" value={external} onChange={e=>setExternal(e.target.value)}/>
      <button className="btn small" disabled={busy||!external.trim()} onClick={()=>run(`${kind}.import`,{text:external})}>导入为待确认草稿</button>
    </details>
  </section>;
}
