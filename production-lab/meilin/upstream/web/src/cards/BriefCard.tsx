import { useEffect, useState } from 'react';
import { useDirector } from '../lib/ctx';
import { Card, Go, Locked } from './Card';

const SPARKS = [
  ['婚礼当场被抛弃的新娘，反手亮出收购书', '豪门逆袭'],
  ['被赶出狼群的少女，原来是失踪的狼王继承人', '狼人奇幻'],
  ['重生回到被背叛前一天的女律师', '重生复仇'],
];

function fmt(sec: number) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return m ? `${m} 分${s ? ` ${s} 秒` : ''}` : `${s} 秒`;
}

// Episode count and length are free numbers, not a fixed menu.
function SpecRow({ episodes, seconds, locked }: { episodes: number; seconds: number; locked?: boolean }) {
  const { run, busy } = useDirector();
  const [eps, setEps] = useState(String(episodes));
  const [sec, setSec] = useState(String(seconds));
  useEffect(() => { setEps(String(episodes)); setSec(String(seconds)); }, [episodes, seconds]);
  const e = Math.round(Number(eps)), s = Math.round(Number(sec));
  const valid = e >= 1 && e <= 300 && s >= 15 && s <= 600;
  const dirty = valid && (e !== episodes || s !== seconds);
  return (
    <form className="spec-row" onSubmit={(ev) => { ev.preventDefault(); if (dirty) run('brief.spec', { episodes: e, episodeSeconds: s }); }}>
      <label>集数
        <span className="spec-input"><input type="number" inputMode="numeric" min={1} max={300} value={eps} disabled={locked} onChange={(x) => setEps(x.target.value)} aria-label="集数" /><span>集</span></span>
      </label>
      <label>单集时长
        <span className="spec-input"><input type="number" inputMode="numeric" min={15} max={600} step={5} value={sec} disabled={locked} onChange={(x) => setSec(x.target.value)} aria-label="单集时长（秒）" /><span>秒</span></span>
      </label>
      {!locked && <button className="btn small" disabled={!dirty || busy}>{valid ? '更新体量' : '集数 1–300，时长 15–600 秒'}</button>}
      <span className="spec-total">全剧时长<b>{valid ? fmt(e * s) : '—'}</b></span>
    </form>
  );
}

function Question({ q }: { q: { id: string; q: string; options: string[]; pick: number; custom?: boolean } }) {
  const { run, busy } = useDirector();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  return (
    <div className="question">
      <p>{q.q}</p>
      <div className="chips" role="radiogroup" aria-label={q.q}>
        {q.options.map((o, i) => (
          <button key={o} role="radio" aria-checked={q.pick === i} className={`chip ${q.pick === i ? 'on' : ''}`} onClick={() => run('brief.answer', { id: q.id, pick: i })}>{o}</button>
        ))}
        <button className={`chip ${open ? 'custom-on' : ''}`} aria-expanded={open} onClick={() => setOpen((v) => !v)}>自己写</button>
      </div>
      {open && (
        <form className="custom" onSubmit={(e) => { e.preventDefault(); const t = text.trim(); if (t) { run('brief.answer', { id: q.id, text: t }); setText(''); setOpen(false); } }}>
          <label htmlFor={`q-${q.id}`} className="sr-only">{q.q}</label>
          <input id={`q-${q.id}`} className="field" autoFocus value={text} maxLength={120} onChange={(e) => setText(e.target.value)} placeholder="写你想要的答案，例如：当众放出前夫转移资产的录音" />
          <button className="btn small primary" disabled={!text.trim() || busy}>用这个</button>
        </form>
      )}
    </div>
  );
}

export default function BriefCard() {
  const { drama: d, run, send, busy } = useDirector();
  const b = d.brief;
  if (!b) {
    return (
      <Card kicker="立项" title="说一句你想拍的故事" sub="在下方对美林说，或者用麦克风。没想好就挑一个，美林按北美爆款结构帮你展开。">
        <div className="sparks">
          {SPARKS.map(([s, tag], i) => (
            <button key={s} className="spark-card glow" disabled={busy} onClick={() => send(s)} style={{ animationDelay: `${i * 80}ms` }}>
              <span className="spark-tag">{tag}</span>
              <span className="spark-text">{s}</span>
            </button>
          ))}
        </div>
      </Card>
    );
  }
  const questions = (b.questions || []).filter((q) => q.id !== 'length');
  return (
    <Card
      kicker="立项"
      title="立项卡"
      sub={b.sample ? '模拟模式：用示例剧演示整条流程。配置 WeToken 后按你的想法实时生成。' : '只问会改变结构的问题，其余用方向默认值。每个问题都可以自己写答案。'}
      footer={b.confirmed ? <Locked>立项已锁定</Locked> : <Go disabled={busy} onGo={(el) => run('brief.confirm', {}, { from: el })}>锁定立项，起草剧集圣经</Go>}
    >
      <p className="premise-zh">{b.premiseZh}</p>
      <p className="premise-en">{b.premise}</p>
      <dl className="facts">
        <div><dt>题材</dt><dd>{b.genre}</dd></div>
        <div><dt>市场</dt><dd>{b.market}</dd></div>
        <div><dt>台词</dt><dd>{b.language}</dd></div>
        <div className="span-all"><dt>主角</dt><dd>{b.protagonist}</dd></div>
      </dl>
      <SpecRow episodes={b.episodes} seconds={b.episodeSeconds} />
      {!b.confirmed && questions.length > 0 && (
        <div className="questions">
          {questions.map((q) => <Question key={q.id} q={q} />)}
        </div>
      )}
    </Card>
  );
}
