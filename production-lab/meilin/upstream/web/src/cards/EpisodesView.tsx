import { useEffect, useRef, useState } from 'react';
import { useDirector } from '../lib/ctx';
import { countUp } from '../lib/fx';
import { currentVersion, Episode } from '../api';
import { AssetArt } from '../components/Art';

const ORDER = ['script', 'cast', 'segments', 'shoot', 'post'];
const NAME: Record<string, string> = { script: '写剧本', cast: '本集资产', segments: '分段提示词', shoot: '拍摄', post: '后期' };
const started = (e?: Episode) => Boolean(e && (e.chosen || e.segments.length || e.done || Object.values(e.scripts).some(Boolean)));

export default function EpisodesView() {
  const { drama, run, busy, go } = useDirector();
  const planned = Math.max(drama.brief?.episodes || 0, ...drama.episodes.map((e) => e.n), 1);
  const seconds = drama.brief?.episodeSeconds || 75;
  const done = drama.episodes.filter((e) => e.done).length;
  const active = drama.episodes.filter((e) => !e.done && started(e)).length;
  const refs = [useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null)];
  useEffect(() => { countUp(refs[0].current, done); countUp(refs[1].current, active); countUp(refs[2].current, planned); }, [done, active, planned]);
  const cast = drama.assets.items.filter((a) => a.kind === 'character' && a.scope === 'drama');
  const style = drama.bible?.style;
  const [menu, setMenu] = useState<number | null>(null);

  useEffect(() => {
    if (menu === null) return;
    const close = (e: Event) => { if (!(e.target as Element).closest?.('.ep-menu, .ep-more')) setMenu(null); };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(null);
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('keydown', esc); };
  }, [menu]);

  const open = (n: number) => {
    const e = drama.episodes.find((x) => x.n === n);
    if (e) go({ episode: n, stage: e.stage });
    else run('episode.open', { episode: n });
  };

  return (
    <div className="episodes">
      <header className="ep-hero glow">
        {style?.image && <span className="ep-hero-img" style={{ backgroundImage: `url(${style.image})` }} aria-hidden="true" />}
        <div className="ep-hero-text">
          <span className="card-kicker">{drama.titleZh}</span>
          <h2 className="ep-title">{drama.title}</h2>
          <p>{drama.bible?.loglineZh}</p>
          <div className="ep-cast" aria-label="主演">
            {cast.map((a) => {
              const v = currentVersion(a);
              return (
                <span key={a.code} className="ep-face" title={`${a.code} ${a.name}`}>
                  {v?.url ? <img src={v.url} alt="" /> : <AssetArt asset={a} />}
                </span>
              );
            })}
            {style && <button className="ep-style" onClick={() => go({ view: 'bible' })}>{style.title}</button>}
          </div>
        </div>
        <dl className="ep-stats">
          <div><dt>已完成</dt><dd><span ref={refs[0]}>0</span></dd></div>
          <div><dt>进行中</dt><dd><span ref={refs[1]}>0</span></dd></div>
          <div><dt>全剧</dt><dd><span ref={refs[2]}>0</span><small>集</small></dd></div>
        </dl>
      </header>

      <Plan planned={planned} seconds={seconds} />

      <div className="ep-grid" role="list">
        {Array.from({ length: planned }, (_, i) => i + 1).map((n) => {
          const e = drama.episodes.find((x) => x.n === n);
          const idx = e ? (e.done ? 5 : ORDER.indexOf(e.stage)) : -1;
          const segs = e?.segments.length || 0;
          const takes = e?.segments.filter((s) => s.takes?.length).length || 0;
          const live = started(e);
          return (
            <div key={n} role="listitem" className={`ep-cell ${menu === n ? 'menu-open' : ''}`} style={{ animationDelay: `${Math.min(n, 24) * 22}ms` }}>
              <button className={`ep-tile glow ${e ? (e.done ? 'done' : live ? 'active' : 'blank') : 'blank'}`} disabled={busy} onClick={() => open(n)}>
                <span className="ep-n">{String(n).padStart(2, '0')}</span>
                <span className="ep-name">{e?.title || (live ? '未命名' : '待开拍')}</span>
                <span className="ep-pips" aria-hidden="true">{ORDER.map((s, i) => <i key={s} className={i < idx ? 'on' : i === idx ? 'now' : ''} />)}</span>
                <span className="ep-state">{live ? (e!.done ? '已完成' : NAME[e!.stage]) : '点开开始'}{segs ? ` · ${takes}/${segs} 段成片` : ''}</span>
              </button>
              <button className="ep-more" aria-label={`第 ${n} 集的更多操作`} aria-expanded={menu === n} disabled={busy} onClick={() => setMenu(menu === n ? null : n)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="18" cy="12" r="1.6" /></svg>
              </button>
              {menu === n && <TileMenu n={n} live={live} planned={planned} onDone={() => setMenu(null)} />}
            </div>
          );
        })}
        <button role="listitem" className="ep-add" disabled={busy || planned >= 300} onClick={() => run('episodes.add', {})}>
          <span aria-hidden="true">+</span>加一集
        </button>
      </div>
    </div>
  );
}

function Plan({ planned, seconds }: { planned: number; seconds: number }) {
  const { drama, run, busy } = useDirector();
  const [edit, setEdit] = useState(false);
  const [eps, setEps] = useState(String(planned));
  const [sec, setSec] = useState(String(seconds));
  useEffect(() => { if (!edit) { setEps(String(planned)); setSec(String(seconds)); } }, [planned, seconds, edit]);
  const last = Math.max(0, ...drama.episodes.filter(started).map((e) => e.n));
  const n = Number(eps), s = Number(sec);
  const bad = !(n >= Math.max(1, last) && n <= 300) ? `集数填 ${Math.max(1, last)}–300${last > 1 ? `（第 ${last} 集已经开始做了）` : ''}` : !(s >= 15 && s <= 600) ? '单集时长填 15–600 秒' : '';
  const save = async () => {
    if (bad) return;
    if (n !== planned || s !== seconds) await run('brief.spec', { episodes: n, episodeSeconds: s });
    setEdit(false);
  };

  if (!edit) {
    return (
      <div className="ep-plan">
        <p><b>全剧 {planned} 集</b>，每集约 {seconds} 秒。点任意一集右上角的 ⋯ 可以在它后面插一集或删掉它。</p>
        <button className="btn small" disabled={busy} onClick={() => setEdit(true)}>改集数和时长</button>
      </div>
    );
  }
  return (
    <form className="ep-plan editing" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <label>全剧<input className="field" type="number" inputMode="numeric" min={Math.max(1, last)} max={300} value={eps} onChange={(e) => setEps(e.target.value)} autoFocus />集</label>
      <label>每集约<input className="field" type="number" inputMode="numeric" min={15} max={600} step={5} value={sec} onChange={(e) => setSec(e.target.value)} />秒</label>
      <span className={`ep-plan-note ${bad ? 'bad' : ''}`} role={bad ? 'alert' : undefined}>
        {bad || (n < planned ? `会去掉第 ${n + 1}–${planned} 集（都还没开始）` : n > planned ? `会在最后加 ${n - planned} 集` : s !== seconds ? '之后写的剧本按新时长，已写好的不动' : '')}
      </span>
      <span className="ep-plan-acts">
        <button type="button" className="btn small ghost" onClick={() => setEdit(false)}>取消</button>
        <button type="submit" className="btn small primary" disabled={busy || Boolean(bad)}>保存</button>
      </span>
    </form>
  );
}

function TileMenu({ n, live, planned, onDone }: { n: number; live: boolean; planned: number; onDone: () => void }) {
  const { run, busy } = useDirector();
  const [sure, setSure] = useState(false);
  return (
    <div className="ep-menu" role="menu" aria-label={`第 ${n} 集`}>
      <button role="menuitem" disabled={busy || planned >= 300} onClick={async () => { onDone(); await run('episodes.add', { after: n }); }}>在后面插入一集</button>
      {planned > 1 && (
        sure ? (
          <button role="menuitem" className="danger" disabled={busy} onClick={async () => { onDone(); await run('episodes.remove', { episode: n }); }}>
            确认删除第 {n} 集{live ? <small>剧本、分段和成片记录会一起删掉，后面的集往前补位</small> : <small>后面的集往前补位</small>}
          </button>
        ) : (
          <button role="menuitem" className="danger" onClick={() => setSure(true)}>删除这一集</button>
        )
      )}
    </div>
  );
}
