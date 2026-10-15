import { useEffect, useState } from 'react';
import { useDirector } from '../lib/ctx';
import { ActionCard, Asset, Segment } from '../api';
import { Card, Chips, copyText, Go, Locked } from './Card';
import { AssetImage, KIND } from './AssetGrid';

const range = (vals?: number[]) => { const max = Math.min(25, Math.max(...(vals || [25]))); return { min: Math.min(max, Math.max(10, Math.min(...(vals || [10])))), max }; };

// The reference images this segment uploads with the video request; the prompt @-mentions exactly these.
function Refs({ s, compact }: { s: Segment; compact?: boolean }) {
  const { drama: d, run, busy, model } = useDirector();
  const [pick, setPick] = useState(false);
  const cap = model(d.settings.videoModel)?.cap.video?.references.maxImages ?? 9;
  const refs = (s.refs || []).map((c) => d.assets.items.find((a) => a.code === c)).filter(Boolean) as Asset[];
  const others = d.assets.items.filter((a) => !(s.refs || []).includes(a.code));
  const set = (codes: string[]) => run('segments.refs', { n: s.n, refs: codes, quiet: true });
  if (compact) {
    return (
      <span className="ref-stack" aria-label={`参考图 ${refs.map((a) => a.code).join(' ')}`}>
        {refs.slice(0, 6).map((a) => <span key={a.code} className="ref-dot" title={`${a.code} ${a.name}`}><AssetImage a={a} /></span>)}
        {refs.length > 6 && <span className="ref-more">+{refs.length - 6}</span>}
      </span>
    );
  }
  return (
    <div className="refs" data-focus={`refs-${s.n}`}>
      <p className="refs-h">本段参考图 <small>{refs.length}/{cap} 张 · 按顺序上传，提示词里用 @代号 引用{refs.length > cap ? `，超出的 ${refs.length - cap} 张不会上传` : ''}</small></p>
      <ol className="ref-list">
        {refs.map((a, i) => (
          <li key={a.code} className={`ref-chip ${i >= cap ? 'over' : ''} k-${a.kind}`}>
            <span className="ref-thumb"><AssetImage a={a} /></span>
            <span className="ref-txt"><b>{a.code}</b><small>{a.name}</small></span>
            <span className="ref-ops">
              <button className="ref-op" disabled={busy || i === 0} onClick={() => { const c = refs.map((x) => x.code); [c[i - 1], c[i]] = [c[i], c[i - 1]]; set(c); }} aria-label={`把 ${a.code} 往前移`}>↑</button>
              <button className="ref-op" disabled={busy} onClick={() => set(refs.filter((x) => x !== a).map((x) => x.code))} aria-label={`不挂 ${a.code}`}>×</button>
            </span>
          </li>
        ))}
        <li>
          <button className="ref-add" aria-expanded={pick} onClick={() => setPick((v) => !v)}>+ 挂一张</button>
        </li>
      </ol>
      {pick && (
        <div className="ref-picker" role="listbox" aria-label="从资产库挑参考图">
          {others.length ? others.map((a) => (
            <button key={a.code} role="option" aria-selected={false} className="ref-opt" disabled={busy} onClick={() => { set([...refs.map((x) => x.code), a.code]); setPick(false); }}>
              <span className="ref-thumb"><AssetImage a={a} /></span>
              <span className="ref-txt"><b>{a.code}</b><small>{KIND[a.kind]} · {a.name}</small></span>
            </button>
          )) : <p className="muted small">资产库里的都已经挂上了。</p>}
        </div>
      )}
    </div>
  );
}

const LOCK_LABEL: [keyof NonNullable<Segment['lock']>, string][] = [['present', '在场'], ['gaze', '视线'], ['props', '道具'], ['env', '环境'], ['mood', '情绪落点'], ['lastShot', '末镜']];

function ActionPanel({ n, card }: { n: number; card: ActionCard }) {
  const { run, busy } = useDirector();
  return (
    <div className="action-card">
      <header>
        <h4>武戏方向卡 · 第 {n} 段</h4>
        <p>打戏最怕写完才发现方向不对。先确认这几项，确认后按 wuxi 规则写动作，外层仍是 FG 标准格式。</p>
      </header>
      <dl>
        {card.items.map((it) => (
          <div key={it.k} className="ac-row">
            <dt>{it.k}</dt>
            <dd>
              {it.options && <Chips label={it.k} options={it.options} pick={it.pick ?? 0} onPick={(i) => run('action.update', { n, k: it.k, pick: i })} />}
              <p>{it.v}</p>
            </dd>
          </div>
        ))}
        <div className="ac-row"><dt>时长</dt><dd><p>{card.beats}</p></dd></div>
      </dl>
      <Go disabled={busy} onGo={(el) => run('action.confirm', { n }, { from: el })}>确认方向，写第 {n} 段</Go>
    </div>
  );
}

function Row({ s, open, onToggle, card }: { s: Segment; open: boolean; onToggle: () => void; card?: ActionCard }) {
  const { run, busy, toast } = useDirector();
  const [note, setNote] = useState('');
  const waitingCard = s.action && card && !card.confirmed;
  return (
    <li id={`seg-${s.n}`} data-focus={`seg-${s.n}`} className={`seg ${open ? 'open' : ''} st-${s.status}`}>
      <button className="seg-head" onClick={onToggle} aria-expanded={open}>
        <span className="seg-n">{s.n}</span>
        <span className="seg-main">
          <span className="seg-title">{s.title}</span>
          <span className="seg-event">{s.event} → {s.ending}</span>
        </span>
        <span className="seg-tags">
          <Refs s={s} compact />
          <span className={`tag ${s.opening === '转场缓冲' ? 'tag-buffer' : ''}`}>{s.opening}</span>
          {s.action && <span className="tag tag-fight">打戏</span>}
          <span className="tag">{s.seconds} 秒</span>
          <span className={`tag tag-status ${waitingCard || s.stale ? 'warn' : s.prompt ? 'ok' : ''}`}>{waitingCard ? '待确认方向卡' : s.stale ? '需重写' : s.prompt ? '已写好' : '待写'}</span>
        </span>
      </button>
      {open && (
        <div className="seg-body">
          {waitingCard && <ActionPanel n={s.n} card={card!} />}
          <Refs s={s} />
          {s.continuity && (
            <ul className={`continuity ${s.continuity.ok ? 'ok' : 'warn'}`}>
              {s.continuity.notes.map((x) => <li key={x}>{x}</li>)}
            </ul>
          )}
          {s.beats && (
            <ol className="beats">
              {s.beats.map((b) => <li key={b.t}><span>{b.t} 秒</span>{b.task}</li>)}
            </ol>
          )}
          {s.prompt && (
            <>
              <div className="prompt-box">
                <button className="btn ghost small copy" onClick={async () => { if (await copyText(s.prompt!)) toast(`第 ${s.n} 段提示词已复制`); }}>复制提示词</button>
                <pre>{s.prompt}</pre>
              </div>
              {s.lock && (
                <div className="lock">
                  <p className="lock-h">衔接锁 · 第 {s.n} 段结束 <small>下一段从这里接</small></p>
                  <dl>{LOCK_LABEL.map(([k, l]) => <div key={k}><dt>{l}</dt><dd>{s.lock![k]}</dd></div>)}</dl>
                </div>
              )}
              {s.notes?.length ? <p className="muted small">已记录的修改意见：{s.notes.join('；')}</p> : null}
              <form className="note" onSubmit={(e) => { e.preventDefault(); if (note.trim()) { run('segments.revise', { n: s.n, note: note.trim() }); setNote(''); } }}>
                <label htmlFor={`rev-${s.n}`}>改这一段</label>
                <input id={`rev-${s.n}`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="例如：Ava 的台词再冷一点，镜头最后停在戒指上" />
                <button className="btn" disabled={!note.trim() || busy}>重写这一段</button>
              </form>
            </>
          )}
        </div>
      )}
    </li>
  );
}

function SkillBar() {
  const { drama: d, config, model, openSettings } = useDirector();
  const label = (stage: string, id: string) => config.skills.find((s) => s.stage === stage && s.id === id)?.label || id;
  const r = range(model(d.settings.videoModel)?.cap.video?.duration.values);
  return (
    <div className="skillbar">
      <span className="skillbar-k">导演</span>
      <button className="pill glow" onClick={() => openSettings('skills')}>{label('segment', d.settings.skills.segment)}</button>
      <button className="pill glow" onClick={() => openSettings('skills')}>打戏 · {label('action', d.settings.skills.action)}</button>
      {d.settings.skills.boost.map((b) => <button key={b} className="pill glow on" onClick={() => openSettings('skills')}>{label('boost', b)}</button>)}
      {!d.settings.skills.boost.length && <button className="pill glow dim" onClick={() => openSettings('skills')}>+ 电影感增强</button>}
      <span className="skillbar-k">出片</span>
      <button className="pill glow" onClick={() => openSettings('models')}>{model(d.settings.videoModel)?.label} · 每段 {r.min}–{r.max} 秒</button>
      <span className="pill dim" title="BGM 与字幕后期加">随片：音效 · 对白 · 旁白</span>
    </div>
  );
}

export default function SegmentsCard() {
  const { drama: d, episode, run, busy } = useDirector();
  const e = d.episodes.find((x) => x.n === episode)!;
  const [open, setOpen] = useState<number | null>(null);
  // the timeline at the bottom of the console opens a segment here
  useEffect(() => {
    const h = (ev: Event) => { const n = (ev as CustomEvent<number>).detail; setOpen(n); window.setTimeout(() => document.getElementById(`seg-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); };
    window.addEventListener('meilin:open-seg', h);
    return () => window.removeEventListener('meilin:open-seg', h);
  }, []);
  if (!e.castConfirmed) return <Card title="分段提示词" sub="本集资产就绪后开始分段。"><p className="muted">本集还有资产没确认。</p></Card>;
  if (!e.outline) {
    return (
      <Card kicker={`第 ${e.n} 集`} title="分段提示词" sub="按剧情转折切段，每段时长按剧情定（10–25 秒，不超过出片模型上限）；每段写成 FG 视频提示词格式，自动挂上要用的参考图，段与段之间用衔接锁保证站位和状态连续。">
        <SkillBar />
        <div className="lane-empty">
          <Go disabled={busy} onGo={() => run('segments.plan')}>生成分段大纲</Go>
        </div>
      </Card>
    );
  }
  const total = e.segments.reduce((t, s) => t + Number(s.seconds || 0), 0);
  const unwritten = e.segments.filter((s) => !s.prompt).length;
  const waiting = e.segments.filter((s) => s.action && e.actionCards[s.n] && !e.actionCards[s.n].confirmed);
  const allConfirmed = e.segments.every((s) => s.status === 'confirmed');
  const toggle = (n: number) => setOpen((o) => (o === n ? null : n));
  return (
    <Card
      wide
      kicker={`第 ${e.n} 集`}
      title="分段提示词"
      sub={`${e.segments.length} 段，共 ${total} 秒，每段长短按剧情定。右边的小头像是这一段会挂的参考图，点开一段可以增删、调顺序；想改内容直接说“改第 3 段……”。`}
      footer={allConfirmed ? (
        <><Locked>提示词已锁定</Locked><a className="btn ghost" href={`/api/dramas/${d.id}/prompts?episode=${e.n}`}>下载全部提示词</a></>
      ) : unwritten > waiting.length ? (
        <Go disabled={busy} onGo={() => run('segments.write')}>写全部提示词（{unwritten - waiting.length} 段）</Go>
      ) : waiting.length ? (
        <button className="btn primary" onClick={() => setOpen(waiting[0].n)}>先确认第 {waiting[0].n} 段的武戏方向卡</button>
      ) : (
        <>
          <a className="btn ghost" href={`/api/dramas/${d.id}/prompts?episode=${e.n}`}>下载全部提示词</a>
          <Go disabled={busy} onGo={(el) => run('segments.confirm', {}, { from: el })}>锁定提示词，去拍摄</Go>
        </>
      )}
    >
      <SkillBar />
      <div className="timeline" role="list" aria-label="分段时间轴">
        {e.segments.map((s) => (
          <button key={s.n} role="listitem" data-focus={`seg-${s.n}`} className={`tl ${s.prompt ? 'w' : ''} ${s.action ? 'fight' : ''} ${open === s.n ? 'on' : ''}`} style={{ flexGrow: Number(s.seconds) }} onClick={() => toggle(s.n)} title={`第 ${s.n} 段 ${s.title}`}>
            <span className="tl-n">{s.n}<small>{s.seconds}″</small></span>
            <span className="tl-t">{s.title}</span>
            {s.opening === '转场缓冲' && <span className="tl-buf" aria-label="转场缓冲" />}
          </button>
        ))}
      </div>
      <div className="tl-scale" aria-hidden="true"><span>0″</span><span>{Math.round(total / 2)}″</span><span>{total}″</span></div>
      <ol className="segs">
        {e.segments.map((s) => <Row key={s.n} s={s} open={open === s.n} onToggle={() => toggle(s.n)} card={e.actionCards[s.n]} />)}
      </ol>
    </Card>
  );
}
