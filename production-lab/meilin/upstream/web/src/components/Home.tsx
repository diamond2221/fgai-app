import { ReactNode, useState } from 'react';
import { Config, DramaSummary, ExistingScript } from '../api';

type Props = { config: Config; dramas: DramaSummary[]; busy:boolean;onRemove:(id:string)=>Promise<boolean|undefined>; onCreate: (d: string, idea?: string, script?:ExistingScript) => void; onOpen: (id: string) => void; orb: ReactNode };
const STAGE: Record<string, string> = { brief: '立项中', bible: '定画风', assets: '定资产', ready: '制作中' };

export default function Home({ config, dramas, busy,onRemove,onCreate, onOpen, orb }: Props) {
  const [idea, setIdea] = useState('');
  const [dir, setDir] = useState('overseas-drama');
  const [deleting,setDeleting]=useState('');
  const [importing,setImporting]=useState(false);
  const [script,setScript]=useState<ExistingScript>({title:'',text:'',episodeSeconds:90,language:'英文台词，中文制作说明'});
  return (
    <main className="home">
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-mark"><i aria-hidden="true" />FG 超级导演</span>
          <h1 className="hero-title"><span className="hero-zh">美林</span><span className="hero-latin">Meilin</span></h1>
          <p className="hero-lede">说一句故事，美林把它推进成剧本、角色、分段提示词和成片。每部剧都有一位只属于它的导演，从立项到最后一集都记得你定下的每个决定。</p>
          <form className="hero-ask beam" onSubmit={(e) => { e.preventDefault(); onCreate(dir, idea.trim() || undefined); }}>
            <label htmlFor="home-idea" className="sr-only">一句话想法</label>
            <input id="home-idea" value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="被抛弃的新娘反手收购了前夫的公司" autoComplete="off" />
            <button type="submit" className="btn primary" disabled={busy}>{busy?'正在处理…':idea.trim() ? '开拍' : '新建一部剧'}</button>
          </form>
          <button className="btn ghost" disabled={busy} onClick={()=>setImporting(true)}>已有剧本，直接开始制作</button>
          {importing&&<section className="script-import" aria-label="导入已有剧本">
            <h3>使用已有剧本</h3><p>保存原稿后直接进入剧本页，不调用 AI 重新立项。人物和画风可稍后修改。</p>
            <label>剧名<input className="field" value={script.title} onChange={e=>setScript({...script,title:e.target.value})}/></label>
            <label>单集时长（秒）<input className="field" type="number" min={15} max={600} value={script.episodeSeconds} onChange={e=>setScript({...script,episodeSeconds:Number(e.target.value)})}/></label>
            <label>对白语言<input className="field" value={script.language} onChange={e=>setScript({...script,language:e.target.value})}/></label>
            <label>粘贴第一集剧本<textarea className="field" rows={8} value={script.text} onChange={e=>setScript({...script,text:e.target.value,file:undefined})}/></label>
            <label>或上传文件<input type="file" accept=".docx,.txt,.md,.srt,.fountain" disabled={busy} onChange={e=>setScript({...script,file:e.target.files?.[0],text:''})}/></label>
            <div className="row"><button className="btn primary" disabled={busy||(!script.text.trim()&&!script.file)||script.episodeSeconds<15||script.episodeSeconds>600} onClick={()=>onCreate(dir,undefined,script)}>保存原稿并开始</button><button className="btn ghost" disabled={busy} onClick={()=>setImporting(false)}>收起</button></div>
          </section>}
          <div className="directions" role="radiogroup" aria-label="方向">
            {config.directions.map((d) => (
              <button key={d.id} role="radio" aria-checked={dir === d.id} disabled={!d.enabled} className={`direction ${dir === d.id ? 'picked' : ''}`} onClick={() => setDir(d.id)}>
                <span className="direction-name">{d.name}</span>
                <span className="direction-tag">{d.enabled ? d.tagline : '即将开放'}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="hero-stage" aria-hidden="true">
          <span className="orbit" />
          <span className="orbit"><i className="orbit-tick" /></span>
          <span className="orbit" />
          <div className="hero-orb">{orb}</div>
        </div>
      </section>

      {dramas.length > 0 && (
        <section className="shelf" aria-label="我的剧">
          <header className="shelf-head"><h2>我的剧</h2><span>{dramas.length} 部</span></header>
          <div className="posters">
            {dramas.map((d, i) => (
              <article key={d.id} className="poster tilt" style={{ animationDelay: `${Math.min(i, 12) * 50}ms` }}>
                <button className="poster-open" disabled={busy} onClick={()=>onOpen(d.id)}>
                <span className="poster-frame">
                  <span className="poster-img" style={d.cover ? { backgroundImage: `url(${d.cover})` } : d.palette?.length ? { background: `linear-gradient(135deg, ${d.palette.slice(0, 3).join(', ')})` } : undefined} />
                  <span className="sheen" aria-hidden="true" />
                  <span className="poster-stage">{STAGE[d.stage] || d.stage}</span>
                </span>
                <span className="poster-body">
                  <span className="poster-title">{d.title || '未命名'}</span>
                  <span className="poster-zh">{d.titleZh || d.premise}</span>
                  <span className="poster-meter" aria-label={`已完成 ${d.done} 集，共 ${d.planned || '—'} 集`}>
                    <i style={{ width: `${d.planned ? Math.min(100, (d.done / d.planned) * 100) : 0}%` }} />
                  </span>
                  <span className="poster-meta">{d.episodes ? `${d.done}/${d.planned || d.episodes} 集完成` : '尚未开集'} · {new Date(d.updatedAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}</span>
                </span>
                </button>
                {d.canDelete!==false&&<div className="poster-actions">{deleting===d.id?<><span>删除后从列表移除，已有费用保留。</span><button className="btn tiny" disabled={busy} onClick={async()=>{if(await onRemove(d.id))setDeleting('');}}>确认删除</button><button className="btn tiny ghost" disabled={busy} onClick={()=>setDeleting('')}>取消</button></>:<button className="btn tiny ghost" disabled={busy} onClick={()=>setDeleting(d.id)} aria-label={`删除${d.titleZh||d.title||'未命名剧目'}`}>删除剧目</button>}</div>}
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
