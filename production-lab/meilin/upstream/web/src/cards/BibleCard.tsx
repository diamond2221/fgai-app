import { useEffect, useState } from 'react';
import { useDirector } from '../lib/ctx';
import { api, Inspiration } from '../api';
import { extractPalette } from '../lib/files';
import { Card, copyText, Go, Locked, UploadButton } from './Card';
import PlanningEditor from './PlanningEditor';

type Tab = 'overseas' | 'fg-library' | 'inspiration' | 'upload';

export default function BibleCard() {
  const { drama: d, config, run, busy, toast, upload } = useDirector();
  const [tab, setTab] = useState<Tab>('overseas');
  const [showSpec, setShowSpec] = useState(false);
  const [note, setNote] = useState('');
  const b = d.bible;
  if (!b) return <Card title="剧集圣经" sub="锁定立项后，美林会起草剧集圣经。"><p className="muted">还没有立项。</p></Card>;
  const st = b.style;

  return (
    <Card
      wide
      kicker="剧集圣经"
      title={b.titleZh}
      sub="全剧唯一的事实来源：画风、面孔、语言、表演。之后每一张资产图、每一段提示词都从这里取值。"
      footer={b.confirmed ? <Locked>圣经已锁定 · {st.title}</Locked> : <Go disabled={busy} onGo={(el) => run('bible.confirm', {}, { from: el })}>用「{st.title}」锁定圣经</Go>}
    >
      <PlanningEditor kind="bible" />
      <div className="bible-head">
        <h3 className="film-title">{b.title}</h3>
        <p className="logline">{b.loglineZh}</p>
      </div>

      <section className="style-now glow">
        <div className="style-now-img tilt" style={st.image ? { backgroundImage: `url(${st.image})` } : undefined}>
          <span className="sheen" aria-hidden="true" />
          {st.simulated && <span className="badge">模拟解析</span>}
        </div>
        <div className="style-now-body">
          <span className="card-kicker">当前画风 · {{ overseas: '海外预设', 'fg-library': 'FG 风格库', upload: '上传参考', inspiration: '灵感库' }[st.source] || st.source}</span>
          <h4>{st.title}</h4>
          <p className="muted">{st.description}</p>
          {st.palette?.length > 0 && (
            <div className="swatches" aria-label="色板">{st.palette.map((c) => <i key={c} style={{ background: c }} title={c} />)}</div>
          )}
          {st.film && <p className="small muted">胶片 / 影像：{st.film}</p>}
          <div className="row">
            <button className="btn ghost small" onClick={() => setShowSpec((v) => !v)} aria-expanded={showSpec}>{showSpec ? '收起画风规范' : '查看画风规范'}</button>
            <button className="btn ghost small" onClick={async () => { if (await copyText(st.prompt)) toast('画风规范已复制'); }}>复制</button>
          </div>
          <form className="inline-note" onSubmit={(e) => { e.preventDefault(); if (note.trim()) { run('style.note', { note: note.trim() }); setNote(''); } }}>
            <label htmlFor="style-note" className="sr-only">补充一句</label>
            <input id="style-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="补一句，例如：整体再冷一点，肤色保持暖" />
            <button className="btn small" disabled={!note.trim() || busy}>写进规范</button>
          </form>
        </div>
        {showSpec && <pre className="spec-text">{st.prompt}</pre>}
      </section>

      <div className="tabs" role="tablist" aria-label="画风来源">
        {([['overseas', '海外预设'], ['fg-library', 'FG 风格库'], ['inspiration', '灵感库'], ['upload', '上传参考图']] as [Tab, string][]).map(([id, name]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{name}</button>
        ))}
      </div>

      {(tab === 'overseas' || tab === 'fg-library') && (
        <>
          {tab === 'fg-library' && <p className="note small">FG 画布的项目画风库（国内向）。选它时，面孔与地域规则由本剧方向覆盖。</p>}
          <div className="style-grid">
            {config.styles.filter((s) => s.source === tab).map((s, i) => (
              <button key={s.id} className={`style-tile tilt ${st.id === s.id ? 'on' : ''}`} disabled={busy} onClick={() => run('style.preset', { id: s.id })} style={{ animationDelay: `${i * 35}ms` }}>
                <span className="style-img" style={{ backgroundImage: `url(${s.image})` }} />
                <span className="sheen" aria-hidden="true" />
                <span className="style-cap"><b>{s.title}</b><small>{s.film || s.category}</small></span>
              </button>
            ))}
          </div>
          <p className="small muted">示例画面取自 FG 画布风格库。</p>
        </>
      )}

      {tab === 'inspiration' && <InspirationPicker />}

      {tab === 'upload' && <StyleUpload upload={upload} />}

      <h4 className="sub-h">演员 <small>{b.faces}</small></h4>
      <ul className="cast">
        {b.cast.map((c) => (
          <li key={c.code}>
            <span className="cast-key">{c.key}</span>
            <span className="cast-name">{c.name}<small>{c.zh} · {c.age}</small></span>
            <span className="cast-look">{c.look}</span>
            <span className="cast-role">{c.role}</span>
          </li>
        ))}
      </ul>
      <p className="small muted">代号 C 留给摄影机，提示词里人物用 A、B、D… 指代。</p>
      <h4 className="sub-h">表演与红线</h4>
      <p>{b.performance}</p>
      <ul className="rules">{b.rules.map((r) => <li key={r}>{r}</li>)}</ul>
    </Card>
  );
}

function StyleUpload({ upload }: { upload: (f: File, b: Record<string, unknown>) => Promise<any> }) {
  const { drama: d, run, busy } = useDirector();
  const refs = d.uploads.filter((u) => u.purpose === 'style');
  const [picked, setPicked] = useState<string[]>(refs.map((r) => r.id));
  const [note, setNote] = useState('');
  useEffect(() => { setPicked((p) => [...new Set([...p, ...refs.map((r) => r.id).filter((id) => !p.includes(id))])]); }, [refs.length]);
  const onFiles = async (files: File[]) => { for (const f of files.slice(0, 6)) await upload(f, { purpose: 'style' }); };
  const palette = refs.filter((r) => picked.includes(r.id)).flatMap((r) => r.palette).slice(0, 5);
  return (
    <div className="upload-zone">
      <Drop onFiles={onFiles} accept="image/*" text="把 1–6 张参考图拖到这里：剧照、海报、调色参考都行" />
      {refs.length > 0 && (
        <>
          <div className="ref-row">
            {refs.map((r) => (
              <label key={r.id} className={`ref ${picked.includes(r.id) ? 'on' : ''}`}>
                <input type="checkbox" checked={picked.includes(r.id)} onChange={() => setPicked((p) => (p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id]))} />
                <img src={r.url} alt={r.name} />
                <span className="ref-sw">{r.palette.slice(0, 4).map((c) => <i key={c} style={{ background: c }} />)}</span>
              </label>
            ))}
          </div>
          <div className="inline-note">
            <label htmlFor="decode-note" className="sr-only">补充说明</label>
            <input id="decode-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="补充：只要它的光线和色调，不要它的年代感" />
            <button className="btn primary small beam" disabled={!picked.length || busy} onClick={() => run('style.decode', { refs: picked, palette, note })}>解析为全剧画风</button>
          </div>
          <p className="small muted">解析技能：ZY 造梦师 Dream Decode。参考图只提供画风与色彩，不继承里面的人物、文字和品牌。</p>
        </>
      )}
    </div>
  );
}

export function Drop({ onFiles, accept, text }: { onFiles: (f: File[]) => void; accept: string; text: string }) {
  const [over, setOver] = useState(false);
  return (
    <div
      className={`drop ${over ? 'over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const f = [...e.dataTransfer.files].filter((x) => accept === '*' || accept.split(',').some((a) => (a.endsWith('/*') ? x.type.startsWith(a.slice(0, -1)) : x.name.toLowerCase().endsWith(a.trim())))); if (f.length) onFiles(f); }}
    >
      <span className="drop-ring" aria-hidden="true" />
      <p>{text}</p>
      <UploadButton accept={accept} multiple onFiles={onFiles} className="btn small">选择文件</UploadButton>
    </div>
  );
}

function InspirationPicker() {
  const { config, run, busy } = useDirector();
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Inspiration[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!config.inspirations) return;
    const t = window.setTimeout(() => {
      setLoading(true);
      api.inspirations(q, 'image').then((r) => { setItems(r.items); setTotal(r.total); }).finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(t);
  }, [q, config.inspirations]);
  if (!config.inspirations) {
    return <p className="note">这台电脑上没找到 FG 画布的灵感库。把 FG 项目放在 D:\FG.AI\fg-studio，或在 .env 里设置 FG_CANVAS_PUBLIC 指向画布的 web/public 文件夹，就能直接在这里挑。</p>;
  }
  return (
    <div className="insp">
      <div className="inline-note">
        <label htmlFor="insp-q" className="sr-only">搜索灵感</label>
        <input id="insp-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索 FG 灵感库：电影感、霓虹、婚礼、黑白…" />
        <span className="small muted">{loading ? '搜索中' : `${total} 条`}</span>
      </div>
      <div className="insp-grid">
        {items.map((it) => (
          <button key={it.id} className="insp-tile tilt" disabled={busy} title={it.description} onClick={async () => run('style.inspiration', { item: it, palette: await extractPalette(it.image) })}>
            <img src={it.image} alt="" loading="lazy" />
            <span className="sheen" aria-hidden="true" />
            <span className="insp-cap">{it.title}<small>{it.source}</small></span>
          </button>
        ))}
      </div>
    </div>
  );
}
