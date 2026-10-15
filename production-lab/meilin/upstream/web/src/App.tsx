import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Orb, { OrbState } from './components/Orb';
import Composer from './components/Composer';
import Rail from './components/Rail';
import SidePanel from './components/SidePanel';
import Home from './components/Home';
import SettingsDrawer from './components/SettingsDrawer';
import Caption from './components/Caption';
import { api, Config, Drama, DramaSummary, Nav, Reply, ExistingScript, StreamUpdate } from './api';
import { Ctx, DirectorCtx } from './lib/ctx';
import { burst, installPointerFx } from './lib/fx';
import { extractPalette, readAsDataUrl } from './lib/files';
import EpisodesView from './cards/EpisodesView';
import BriefCard from './cards/BriefCard';
import BibleCard from './cards/BibleCard';
import AssetsView from './cards/AssetsView';
import MemoryView from './cards/MemoryView';
import CostsView from './cards/CostsView';
import ProductionReview from './components/ProductionReview';
import Sharing from './components/Sharing';
import ScriptCard from './cards/ScriptCard';
import CastCard from './cards/CastCard';
import SegmentsCard from './cards/SegmentsCard';
import ShootCard from './cards/ShootCard';
import PostCard from './cards/PostCard';

type Loc = { kind: 'home' } | { kind: 'drama'; view: string } | { kind: 'episode'; n: number; stage: string };

export default function App() {
  const [config, setConfig] = useState<Config | null>(null);
  const [dramas, setDramas] = useState<DramaSummary[]>([]);
  const [drama, setDrama] = useState<Drama | null>(null);
  const [loc, setLoc] = useState<Loc>({ kind: 'home' });
  const [busy, setBusy] = useState(false);
  const [busyText,setBusyText]=useState('');
  const [streamText,setStreamText]=useState('');
  const [busySeconds,setBusySeconds]=useState(0);
  useEffect(()=>{setBusySeconds(0);if(!busy){setStreamText('');return;}const t=window.setInterval(()=>setBusySeconds(v=>v+1),1000);return()=>clearInterval(t);},[busy]);
  const updateStream=useCallback(({event,data}:StreamUpdate)=>{if(event==='status')setBusyText(data.text||'正在处理');if(event==='text'){setStreamText(data.text||'');setBusyText(data.action==='turn'?'美林正在回复':'正在生成正文，完成后自动保存');}},[]);
  const [listening, setListening] = useState(false);
  const [caption, setCaption] = useState('');
  const [captionKey, setCaptionKey] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [side, setSide] = useState<null | 'chat' | 'memory'>(null);
  const [bubble, setBubble] = useState(true);
  const [settings, setSettings] = useState<string | null>(null);
  const [sharing,setSharing]=useState(false);
  const [voice, setVoice] = useState(() => { try { return localStorage.getItem('meilin.voice') === '1'; } catch { return false; } });
  const [toastText, setToastText] = useState('');
  const [error, setError] = useState('');
  const levelRef = useRef(0);
  const bubbleTimer = useRef(0);
  const speakTimer = useRef(0);

  useEffect(() => {
    installPointerFx();
    api.config().then(setConfig).catch((e) => setError(`连接不到本地编排服务：${e.message}`));
    api.list().then(setDramas).catch(() => {});
  }, []);

  const episode = loc.kind === 'episode' ? loc.n : null;

  // poll while simulated media is in flight
  const pending = useMemo(() => {
    if (!drama) return false;
    return drama.assets.items.some((a) => a.status === 'rendering') || drama.episodes.some((e) => e.jobs.some((j) => !['done','failed','cancelled'].includes(j.status)));
  }, [drama]);
  useEffect(() => {
    if (!pending || !drama || busy) return;
    let loading=false;const t = window.setInterval(async()=>{if(loading)return;loading=true;try{setDrama(await api.get(drama.id));}catch{/* Next background poll retries the read. */}finally{loading=false;}}, 5000);
    return () => window.clearInterval(t);
  }, [pending, drama?.id,busy]);

  const toast = useCallback((t: string) => {
    setToastText(t);
    window.setTimeout(() => setToastText((x) => (x === t ? '' : x)), 2400);
  }, []);

  const speak = useCallback((text: string) => {
    if (!text) return;
    setCaption(text);
    setBubble(true);
    window.clearTimeout(bubbleTimer.current);
    // the reply stays readable, then folds away; the full thread lives in the side panel
    bubbleTimer.current = window.setTimeout(() => setBubble(false), Math.max(8000, text.length * 110));
    setCaptionKey((k) => k + 1);
    setSpeaking(true);
    window.clearInterval(speakTimer.current);
    const end = performance.now() + Math.min(6000, 600 + text.length * 32);
    speakTimer.current = window.setInterval(() => {
      levelRef.current = 0.3 + Math.random() * 0.7;
      if (performance.now() > end) { window.clearInterval(speakTimer.current); levelRef.current = 0; setSpeaking(false); }
    }, 70);
    if (voice && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text.replace(/[《》「」“”]/g, ''));
        u.lang = 'zh-CN';
        u.rate = 1.05;
        window.speechSynthesis.speak(u);
      } catch { /* optional */ }
    }
  }, [voice]);

  const go = useCallback((nav: Nav) => {
    if (nav.episode) setLoc({ kind: 'episode', n: nav.episode, stage: nav.stage || 'script' });
    else if (nav.view) setLoc({ kind: 'drama', view: nav.view });
    else if (nav.stage) setLoc({ kind: 'drama', view: nav.stage });
  }, []);

  const apply = useCallback((r: Reply) => {
    setDrama(r.project);
    if (r.reply) speak(r.reply);
    if (r.nav) {
      if (r.nav.episode) {
        const e = r.project.episodes.find((x) => x.n === r.nav!.episode);
        go({ episode: r.nav.episode, stage: r.nav.stage || e?.stage });
      } else go(r.nav);
    }
  }, [speak, go]);

  const ctxOf = () => (episode ? { episode } : {});

  const run = useCallback(async (type: string, payload: Record<string, unknown> = {}, opts: { from?: Element | null } = {}) => {
    if (!drama) return false;
    if(drama.permissions?.canEdit===false){setError('此剧为只读分享，无法修改或生成。');return false;}
    setBusy(true);
    setBusyText('已收到，正在保存或执行操作。');setStreamText('');
    setError('');
    try {
      const r = await api.action(drama.id, type, { ...(episode && !payload.episode ? { episode } : {}), ...payload }, ctxOf(),updateStream);
      apply(r);
      if (opts.from) burst(opts.from);
      return true;
    } catch (e: any) { setError(e.message); return false; } finally { setBusy(false); }
  }, [drama, episode, apply]);

  const send = useCallback(async (text: string) => {
    if (!drama || !text.trim()) return;
    if(drama.permissions?.canEdit===false){setError('此剧为只读分享，无法发送制作指令。');return;}
    setBusy(true);
    setBusyText('已收到，正在读取本剧上下文。');setStreamText('');setSide('chat');
    setError('');
    setDrama({ ...drama, messages: [...drama.messages, { id: `tmp-${Date.now()}`, role: 'user', text, at: new Date().toISOString() }] });
    try { apply(await api.turn(drama.id, text, ctxOf(),updateStream)); } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }, [drama, episode, apply]);

  const upload = useCallback(async (file: File, body: Record<string, unknown>) => {
    if (!drama) return null;
    if (file.size > 25 * 1024 * 1024) { setError(`${file.name} 超过 25MB`); return null; }
    setBusy(true);
    setError('');
    try {
      const dataUrl = await readAsDataUrl(file);
      const palette = file.type.startsWith('image/') ? await extractPalette(dataUrl) : [];
      const r = await api.upload(drama.id, { dataUrl, name: file.name, palette, ...(episode ? { episode } : {}), ...body, ctx: ctxOf() });
      apply(r);
      return r.upload;
    } catch (e: any) { setError(e.message); return null; } finally { setBusy(false); }
  }, [drama, episode, apply]);

  const openDrama = async (id: string) => {
    if(busy)return;setBusy(true);setBusyText('正在打开剧目…');
    try {
      const d = await api.get(id);
      setDrama(d);
      setLoc(d.stage === 'ready' ? { kind: 'drama', view: 'episodes' } : { kind: 'drama', view: d.stage });
      const last = [...d.messages].reverse().find((m) => m.role === 'agent');
      if (last) speak(last.text);
    } catch (e: any) { setError(e.message); }finally{setBusy(false);}
  };

  const create = async (direction: string, idea?: string, script?:ExistingScript) => {
    if(busy)return;setBusy(true);setBusyText('正在创建剧目…');setError('');
    try {
      const d = await api.create(direction);
      setDrama(d);
      setLoc({ kind: 'drama', view: 'brief' });
      speak(d.messages[0]?.text || '');
      if(script){if(script.file){if(script.file.size>25*1024*1024)throw Error('文件超过25MB');apply(await api.upload(d.id,{purpose:'script-start',dataUrl:await readAsDataUrl(script.file),name:script.file.name,spec:{title:script.title,episodeSeconds:script.episodeSeconds,language:script.language}}));}else apply(await api.action(d.id,'script.start',{...script,file:undefined},{},updateStream));}
      else if (idea) apply(await api.turn(d.id, idea, {},updateStream));
      setDramas(await api.list());
    } catch (e: any) { setError(e.message); }finally{setBusy(false);}
  };
  const removeDrama=async(id:string)=>{if(busy)return;setBusy(true);setBusyText('正在删除剧目…');setError('');try{await api.remove(id);setDramas(v=>v.filter(d=>d.id!==id));toast('剧目已删除');return true;}catch(e:any){setError(e.message);return false;}finally{setBusy(false);}};

  const home = async () => {
    setSharing(false);
    setDrama(null);
    setLoc({ kind: 'home' });
    setCaption('');
    setDramas(await api.list().catch(() => []));
  };

  const toggleVoice = () => {
    const v = !voice;
    setVoice(v);
    try { localStorage.setItem('meilin.voice', v ? '1' : '0'); } catch { /* optional */ }
    if (!v && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  };

  const orbState: OrbState = listening ? 'listening' : busy ? 'thinking' : speaking ? 'speaking' : 'idle';

  if (!config) {
    return (
      <div className="boot">
        <div className="boot-orb" />
        <p>{error || '正在唤醒美林…'}</p>
      </div>
    );
  }

  const ctx: DirectorCtx | null = drama ? { config, drama, episode, busy:busy||drama.permissions?.canEdit===false, run, send, upload, go, toast, openSettings: (tab) => setSettings(tab || 'models'), model: (id) => config.models.find((m) => m.id === id) } : null;
  const ep = drama && episode ? drama.episodes.find((e) => e.n === episode) : null;
  const viewKey = loc.kind === 'episode' ? `e${loc.n}-${loc.stage}` : loc.kind === 'drama' ? loc.view : 'home';

  const memCount = drama?.memory?.length || 0;
  return (
    <div className={`app ${drama ? 'is-working' : 'is-home'} ${drama && side ? 'side-open' : ''}`}>
      <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
      <header className="topbar">
        <button className="brand" onClick={home} aria-label="回到首页">
          <span className="brand-orb" aria-hidden="true" />
          <span className="brand-name">美林</span>
          <span className="brand-latin">MEILIN</span>
        </button>
        {drama && (
          <nav className="crumbs" aria-label="位置">
            <button onClick={() => setLoc({ kind: 'drama', view: drama.stage === 'ready' ? 'episodes' : drama.stage })}>
              {drama.title ? <><em>{drama.title}</em><span>{drama.titleZh}</span></> : <span>新剧 · 海外 AI 短剧</span>}
            </button>
            {ep && <><span className="crumb-sep" aria-hidden="true" /><b>第 {ep.n} 集{ep.title ? <small>{ep.title}</small> : null}</b></>}
          </nav>
        )}
        <div className="topbar-tools">
          {drama && (
            <button className="model-chips" onClick={() => setSettings('models')} title="主脑、出图与出片模型">
              {(['textModel', 'imageModel', 'videoModel'] as const).map((k) => (
                <span key={k} className={`mchip ${k}`}><i aria-hidden="true" />{config.models.find((m) => m.id === drama.settings[k])?.label}</span>
              ))}
            </button>
          )}
          {drama && (
            <button className="icon-btn" onClick={() => setSettings('skills')} title="技能">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.4 5.3L20 9l-4.2 3.9L17 19l-5-3-5 3 1.2-6.1L4 9l5.6-.7z" /></svg>
              <span className="sr-only">技能</span>
            </button>
          )}
          <span className={`mode-badge ${config.mode}`} title={config.mode === 'mock' ? '没有配置 WeToken Key：剧本与提示词是示例内容，出图出片是模拟任务，不产生费用' : '已连接 WeToken：文本实时生成'}>
            {config.mode === 'mock' ? '模拟模式' : '实时'}
          </span>
          <button className={`icon-btn ${voice ? 'on' : ''}`} onClick={toggleVoice} aria-pressed={voice} title="朗读美林的回复">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16.5 8.5a5 5 0 0 1 0 7" className={voice ? '' : 'dim'} /><path d="M19 6a8.5 8.5 0 0 1 0 12" className={voice ? '' : 'dim'} /></svg>
            <span className="sr-only">朗读</span>
          </button>
          {drama && (
            <button className={`icon-btn ${side === 'memory' ? 'on' : ''}`} onClick={() => setSide((v) => (v === 'memory' ? null : 'memory'))} aria-expanded={side === 'memory'} title="这部剧的记忆">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4a5 5 0 0 0-5 5c-1.7.4-3 2-3 3.8A4 4 0 0 0 8 17h1v3h6v-3h1a4 4 0 0 0 4-4.2c0-1.8-1.3-3.4-3-3.8a5 5 0 0 0-5-5zM12 9v8" /></svg>
              {memCount > 0 && <span className="dot">{memCount > 99 ? '99' : memCount}</span>}
              <span className="sr-only">记忆</span>
            </button>
          )}
          {drama && (
            <button className={`icon-btn ${side === 'chat' ? 'on' : ''}`} onClick={() => setSide((v) => (v === 'chat' ? null : 'chat'))} aria-expanded={side === 'chat'} title="对话记录">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v10H9l-4 4z" /></svg>
              <span className="sr-only">对话记录</span>
            </button>
          )}
        </div>
      </header>

      {!drama && <Home config={config} dramas={dramas} busy={busy} onRemove={removeDrama} onCreate={create} onOpen={openDrama} orb={<Orb state={orbState} levelRef={levelRef} fill={0.62} />} />}
      {busy&&<aside className="operation-feedback" role="status" aria-live="polite"><b>{busyText||'正在处理…'} · {busySeconds} 秒</b><small>请勿重复点击。页面保持连接，结果完成后自动保存。</small>{streamText&&<pre>{streamText}</pre>}</aside>}

      {drama && ctx && (
        <Ctx.Provider value={ctx}>
          <Rail loc={loc} onLoc={setLoc} />
          <div className="work">
            <main className="stage">
              <section className="deck" key={viewKey}>
                {loc.kind === 'drama' && loc.view === 'episodes' && <EpisodesView />}
                {loc.kind === 'drama' && loc.view === 'brief' && <BriefCard />}
                {loc.kind === 'drama' && loc.view === 'bible' && <BibleCard />}
                {loc.kind === 'drama' && loc.view === 'assets' && <AssetsView />}
              {loc.kind === 'drama' && loc.view === 'memory' && <MemoryView />}
              {loc.kind === 'drama' && loc.view === 'costs' && <CostsView />}
                {loc.kind === 'episode' && loc.stage === 'script' && <ScriptCard />}
                {loc.kind === 'episode' && loc.stage === 'cast' && <CastCard />}
                {loc.kind === 'episode' && loc.stage === 'segments' && <SegmentsCard />}
                {loc.kind === 'episode' && loc.stage === 'shoot' && <ShootCard />}
                {loc.kind === 'episode' && loc.stage === 'post' && <PostCard />}
              </section>
            </main>
            <div className="dock">
              {(busy || (bubble && caption)) && (
                <div className="bubble-now" aria-live="polite" key={busy ? 'busy' : captionKey}>
                  <span className="who">美林</span>
                  {busy ? <span className="thinking-dots" aria-label="正在思考"><i /><i /><i /></span> : <Caption text={caption} />}
                  {!busy && <button className="bubble-x" onClick={() => setBubble(false)} aria-label="收起这条回复">×</button>}
                </div>
              )}
              <div className={`dock-bar beam ${listening ? 'is-listening' : ''} ${busy ? 'is-busy' : ''}`}>
                <div className="dock-orb" aria-hidden="true"><Orb state={orbState} levelRef={levelRef} fill={0.66} /></div>
                <Composer busy={busy} onSend={send} levelRef={levelRef} listening={listening} setListening={setListening} placeholder={placeholderFor(drama, loc)} onError={setError} />
              </div>
            </div>
          </div>
          {side && <SidePanel tab={side} onTab={setSide} onClose={() => setSide(null)} />}
          <SettingsDrawer tab={settings} onClose={() => setSettings(null)} onTab={setSettings} />
          <ProductionReview drama={drama} onUpdate={setDrama} />
          {drama.permissions?.owner&&<button className="btn ghost production-share" onClick={()=>setSharing(true)}>分享剧目</button>}
          {sharing&&<Sharing drama={drama} onClose={()=>setSharing(false)}/>}
        </Ctx.Provider>
      )}

      {error && <div className="error-bar" role="alert">{error}<button onClick={() => setError('')} aria-label="关闭">×</button></div>}
      {toastText && <div className="toast" role="status">{toastText}</div>}
    </div>
  );
}

function placeholderFor(d: Drama, loc: Loc) {
  if (loc.kind === 'episode') {
    return ({
      script: '说“你来写”，或“剧本用爆款短剧工厂”',
      cast: '说“出图用 zy 电影感”，或“删掉角色7”',
      segments: '说“改第 3 段，台词再狠一点”',
      shoot: '说“全部出预览”或“视频换成 Wan 3”',
      post: '说“下一集”继续',
    } as Record<string, string>)[loc.stage] || '对美林说';
  }
  if (!d.brief) return '说一句你想拍的故事，例如：被抛弃的新娘反手收购了前夫公司';
  return ({ brief: '回答上面的问题，或者说“确认”', bible: '说“换成霓虹黑帮”或“用我上传的图做画风”', assets: '说“角色7 改名叫 Ivy”或“删掉道具3”', episodes: '说“打开第 1 集”或“写第 2 集”', memory: '说“记住：每集结尾都停在反转上”' } as Record<string, string>)[loc.kind === 'drama' ? loc.view : ''] || '对美林说';
}
