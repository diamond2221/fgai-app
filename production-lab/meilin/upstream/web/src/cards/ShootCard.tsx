import { useState } from 'react';
import { useDirector } from '../lib/ctx';
import { Card, Go } from './Card';
import SphereGallery, { SphereItem } from '../components/SphereGallery';

export default function ShootCard() {
  const { drama: d, config, episode, run, busy, model, go } = useDirector();
  const e = d.episodes.find((x) => x.n === episode)!;
  const [sel, setSel] = useState<number[]>([]);
  const [view, setView] = useState<'grid' | 'sphere'>('grid');
  const [scope, setScope] = useState<'ep' | 'all'>('ep');
  const [vm, setVm] = useState(d.settings.videoModel);
  const style = d.bible?.style;
  const pal = style?.palette?.length ? style.palette : ['#1b1f3a', '#3d3a7a', '#8b7cff', '#6fe3ff'];
  if (!e.segments.length || e.segments.some((s) => s.status !== 'confirmed')) {
    return <Card title="拍摄" sub="分段提示词锁定后开始出片。"><p className="muted">分段提示词还没锁定。</p></Card>;
  }
  const cap = model(vm)?.cap.video;
  const lower = cap?.resolutions.map((r) => r.toLowerCase()) || [];
  const vp = vm === d.settings.videoModel || !cap ? d.settings.videoParams
    : { preview: cap.resolutions[lower.indexOf('480p')] || cap.resolutions[0], final: cap.resolutions[lower.indexOf('720p')] || cap.resolutions[Math.min(1, cap.resolutions.length - 1)] };
  const toggle = (n: number) => setSel((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]));
  const anyDone = e.segments.some((s) => s.takes?.length);
  const sphereItems: SphereItem[] = (scope === 'ep' ? [e] : d.episodes).flatMap((x) => x.segments.filter((s) => s.takes?.length).map((s) => ({
    key: `${x.n}-${s.n}`, title: s.title, sub: `第 ${x.n} 集 · 第 ${s.n} 段 · ${s.takes!.at(-1)!.res}`, palette: [pal[1], pal[0], pal[2], pal[3] || pal[0]], badge: config.media==='fg-tasks'?'已生成':'模拟', ratio: 0.5625,
  })));

  return (
    <Card
      wide
      kicker={`第 ${e.n} 集`}
      title="拍摄"
      sub={config.media==='fg-tasks'?'随片只生成音效、对白和旁白，不带背景音乐和字幕。提交前核对人民币报价，确认后在后台生成。':'模拟模式不调用视频模型、不扣费。'}
      footer={(
        <>
          <button className="btn ghost" disabled={busy} onClick={() => run('shoot.submit', { res: 'preview', model: vm })}>全部出 {vp.preview}</button>
          <button className="btn ghost" disabled={busy || !sel.length} onClick={() => { run('shoot.submit', { res: 'final', ns: sel, model: vm }); setSel([]); }}>选中的出 {vp.final} · {sel.length}</button>
          <Go disabled={busy || !anyDone} onGo={(el) => run('post.open', {}, { from: el })}>进入后期</Go>
        </>
      )}
    >
      <div className="viewbar">
        <label className="msel">
          <span>这次用</span>
          <select value={vm} onChange={(ev) => setVm(ev.target.value)}>
            {config.models.filter((m) => m.capability === 'video').map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>
        <span className="small muted">{cap ? `${cap.duration.values[0]}–${cap.duration.values.at(-1)} 秒 · ${cap.resolutions.join('/')}${cap.generateAudio.supported ? ' · 随片音效/对白/旁白，无 BGM 无字幕' : ' · 这个模型不生成音频，声音全部后期配'}` : ''}</span>
        <span className="toolbar-gap" />
        <div className="seg-tabs" role="tablist" aria-label="查看方式">
          <button role="tab" aria-selected={view === 'grid'} className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')}>网格</button>
          <button role="tab" aria-selected={view === 'sphere'} className={view === 'sphere' ? 'on' : ''} onClick={() => setView('sphere')}>星球</button>
        </div>
      </div>

      {view === 'sphere' && (
        <>
          <div className="seg-tabs sub" role="tablist" aria-label="范围">
            <button role="tab" aria-selected={scope === 'ep'} className={scope === 'ep' ? 'on' : ''} onClick={() => setScope('ep')}>本集</button>
            <button role="tab" aria-selected={scope === 'all'} className={scope === 'all' ? 'on' : ''} onClick={() => setScope('all')}>全剧</button>
          </div>
          <SphereGallery label={scope === 'ep' ? `第 ${e.n} 集成片` : '全剧成片'} items={sphereItems} minTiles={48}
            onPick={(key) => { const [en, sn] = key.split('-').map(Number); if (en !== e.n) go({ episode: en, stage: 'shoot' }); else { setView('grid'); setSel([sn]); } }} />
        </>
      )}

      {view === 'grid' && (
        <div className="reels">
          {e.segments.map((s, i) => {
            const jobs = e.jobs.filter((j) => j.seg === s.n);
            const live = jobs.find((j) => !['done','failed','cancelled'].includes(j.status));
            const last = s.takes?.at(-1);
            return (
              <div key={s.n} data-focus={`seg-${s.n}`} className={`reel ${sel.includes(s.n) ? 'sel' : ''}`} style={{ animationDelay: `${i * 50}ms` }}>
                <div className="reel-frame tilt" style={{ ['--a' as any]: pal[0], ['--b' as any]: pal[1], ['--c' as any]: pal[2], ['--x' as any]: `${15 + ((s.n * 37) % 70)}%`, ['--y' as any]: `${18 + ((s.n * 23) % 40)}%` }}>
                  <label className="check" title="选中">
                    <input type="checkbox" checked={sel.includes(s.n)} onChange={() => toggle(s.n)} />
                    <span className="sr-only">选中第 {s.n} 段</span>
                  </label>
                  {last && <div className="reel-take">{last.url?<video src={last.url} controls preload="metadata" playsInline className="reel-video"/>:<span className="reel-sweep" />}<span className="reel-mark">{last.simulated?'模拟成片':'已生成'} · {last.res}</span></div>}
                  {live && (
                    <div className="reel-progress">
                      <svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="16" className="track" /><circle cx="20" cy="20" r="16" className="bar" style={{ strokeDashoffset: 100.5 * (1 - live.progress) }} /></svg>
                      <span>{config.media==='fg-tasks'?({'awaiting_confirmation':'待确认报价','queued':'排队中','running':'生成中','recovering':'正在恢复原任务','archiving':'等待归档','confirmed':'已确认','submitted':'已提交'}[live.status]||live.status):live.status === 'queued' ? '排队中' : `${Math.round(live.progress * 100)}%`}</span>
                      <small>{model(live.model)?.label} · {live.res}</small>
                    </div>
                  )}
                  <span className="reel-n">{s.n}</span>
                  <span className="reel-title">{s.title}</span>
                  {!last && !live && <span className="reel-idle">未拍摄</span>}
                </div>
                <div className="reel-foot">
                  <button className="btn tiny" disabled={busy || !!live} onClick={() => run('shoot.submit', { res: 'preview', ns: [s.n], model: vm })}>{vp.preview}</button>
                  <button className="btn tiny" disabled={busy || !!live} onClick={() => run('shoot.submit', { res: 'final', ns: [s.n], model: vm })}>{vp.final}</button>
                </div>
                {s.takes && s.takes.length > 0 && (
                  <div className="takes" role="radiogroup" aria-label={`第 ${s.n} 段的版本`}>
                    {s.takes.map((t, k) => (
                      <button key={t.id} role="radio" aria-checked={s.picked === t.id} className={`chip small ${s.picked === t.id ? 'on' : ''}`} onClick={() => run('shoot.pick', { n: s.n, take: t.id })} title={model(t.model)?.label}>
                        v{k + 1} · {t.res}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
