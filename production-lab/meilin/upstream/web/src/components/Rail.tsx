import { CSSProperties } from 'react';
import { useDirector } from '../lib/ctx';

type Loc = { kind: 'home' } | { kind: 'drama'; view: string } | { kind: 'episode'; n: number; stage: string };
const EP_ORDER = ['script', 'cast', 'segments', 'shoot', 'post'];

const ICON: Record<string, JSX.Element> = {
  costs: <path d="M4 5h16v14H4zM8 10h8M8 14h5" />,
  episodes: <path d="M4 6h16M4 12h16M4 18h10" />,
  brief: <path d="M6 4h9l3 3v13H6zM9 11h6M9 15h6" />,
  bible: <path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.9 1.2-1.8-.5-1-.1-2.2 1.2-2.2H17a4 4 0 0 0 4-4 9 9 0 0 0-9-10zM7.5 11.5h.01M10 7.5h.01M15 7.5h.01" />,
  assets: <path d="M4 5h7v7H4zM13 5h7v4h-7zM13 11h7v8h-7zM4 14h7v5H4z" />,
  script: <path d="M5 4h10l4 4v12H5zM8 10h8M8 14h5" />,
  cast: <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19c.5-3.5 3-5 6-5s5.5 1.5 6 5M16 5.5a3 3 0 0 1 0 5.5M18 14c1.8.6 2.8 2.3 3 5" />,
  segments: <path d="M3 7h18M3 12h18M3 17h18M8 4v16M16 4v16" />,
  shoot: <path d="M4 7h11v10H4zM15 10l5-3v10l-5-3" />,
  post: <path d="M5 19V5M5 12h7l2-3h5M12 12l2 3h5" />,
  back: <path d="M15 6l-6 6 6 6" />,
  memory: <path d="M12 4a5 5 0 0 0-5 5c-1.7.4-3 2-3 3.8A4 4 0 0 0 8 17h1v3h6v-3h1a4 4 0 0 0 4-4.2c0-1.8-1.3-3.4-3-3.8a5 5 0 0 0-5-5zM12 9v8" />,
};

function Item({ id, name, state, viewing, disabled, count, onClick }: { id: string; name: string; state: string; viewing: boolean; disabled?: boolean; count?: number | string; onClick: () => void }) {
  return (
    <li className={`rail-item ${state} ${viewing ? 'viewing' : ''}`}>
      <button disabled={disabled} onClick={onClick} aria-current={viewing ? 'step' : undefined}>
        <span className="rail-node"><svg viewBox="0 0 24 24" aria-hidden="true">{ICON[id]}</svg></span>
        <span className="rail-name">{name}</span>
        {count !== undefined && <span className="rail-count">{count}</span>}
      </button>
    </li>
  );
}

export default function Rail({ loc, onLoc }: { loc: Loc; onLoc: (l: Loc) => void }) {
  const { drama, config } = useDirector();
  const ready = drama.stage === 'ready';
  const planned = Math.max(drama.brief?.episodes || 0, drama.episodes.length, 1);
  const done = drama.episodes.filter((e) => e.done).length;
  const progress = { '--progress': `${Math.round((done / planned) * 100)}%` } as CSSProperties;

  if (loc.kind === 'episode') {
    const e = drama.episodes.find((x) => x.n === loc.n);
    const reached = e ? EP_ORDER.indexOf(e.stage) : 0;
    return (
      <nav className="rail" aria-label="本集流程">
        <button className="rail-back" onClick={() => onLoc({ kind: 'drama', view: 'episodes' })}>
          <svg viewBox="0 0 24 24" aria-hidden="true">{ICON.back}</svg><span>全部剧集</span>
        </button>
        <p className="rail-head"><b>第 {loc.n} 集</b><span>{e?.title || '未命名'} · {reached + 1}/{EP_ORDER.length}</span></p>
        <ol>
          {config.episodeStages.map((s, i) => (
            <Item key={s.id} id={s.id} name={s.name} state={e?.done || i < reached ? 'done' : i === reached ? 'current' : 'todo'} viewing={loc.stage === s.id} disabled={i > reached} onClick={() => onLoc({ kind: 'episode', n: loc.n, stage: s.id })} />
          ))}
        </ol>
        <p className="rail-sec">全剧</p>
        <ol>
          <Item id="assets" name="全剧资产" state="todo" viewing={false} count={drama.assets.items.length} onClick={() => onLoc({ kind: 'drama', view: 'assets' })} />
          <Item id="memory" name="长期记忆" state="todo" viewing={false} count={drama.memory?.length || 0} onClick={() => onLoc({ kind: 'drama', view: 'memory' })} />
          <Item id="costs" name="费用" state="todo" viewing={false} onClick={() => onLoc({ kind: 'drama', view: 'costs' })} />
        </ol>
        <EpisodeJump current={loc.n} onLoc={onLoc} />
      </nav>
    );
  }
  const view = loc.kind === 'drama' ? loc.view : '';
  const stageState = (id: string) => {
    if (id === 'brief') return drama.brief?.confirmed ? 'done' : 'current';
    if (id === 'bible') return drama.bible?.confirmed ? 'done' : drama.brief?.confirmed ? 'current' : 'todo';
    return ready ? 'current' : 'todo';
  };
  return (
    <nav className="rail" aria-label="剧集流程" style={progress}>
      <div className="rail-head">
        <b>{drama.titleZh || '新剧'}</b>
        <span>{drama.brief ? `${drama.brief.episodes} 集 × ${drama.brief.episodeSeconds} 秒 · 完成 ${done}` : '海外 AI 短剧'}</span>
        {ready && <span className="rail-meter" aria-hidden="true"><i /></span>}
      </div>
      <ol>
        <Item id="episodes" name="剧集" state={stageState('episodes')} viewing={view === 'episodes'} disabled={!ready} count={ready ? planned : undefined} onClick={() => onLoc({ kind: 'drama', view: 'episodes' })} />
        <Item id="assets" name="全剧资产" state={ready ? (drama.assets.items.length ? 'done' : 'todo') : 'todo'} viewing={view === 'assets'} disabled={!ready} count={ready ? drama.assets.items.length : undefined} onClick={() => onLoc({ kind: 'drama', view: 'assets' })} />
        <Item id="memory" name="长期记忆" state="todo" viewing={view === 'memory'} count={drama.memory?.length || 0} onClick={() => onLoc({ kind: 'drama', view: 'memory' })} />
        <Item id="costs" name="费用" state="todo" viewing={view === 'costs'} onClick={() => onLoc({ kind: 'drama', view: 'costs' })} />
      </ol>
      <p className="rail-sec">设定</p>
      <ol>
        {config.dramaStages.map((s) => (
          <Item key={s.id} id={s.id} name={s.name} state={stageState(s.id)} viewing={view === s.id} disabled={s.id === 'bible' && !drama.bible} onClick={() => onLoc({ kind: 'drama', view: s.id })} />
        ))}
      </ol>
    </nav>
  );
}

function EpisodeJump({ current, onLoc }: { current: number; onLoc: (l: Loc) => void }) {
  const { drama } = useDirector();
  if (drama.episodes.length < 2) return null;
  return (
    <div className="rail-jump" role="list" aria-label="切换集">
      {drama.episodes.map((e) => (
        <button key={e.n} role="listitem" className={`${e.n === current ? 'on' : ''} ${e.done ? 'done' : ''}`} onClick={() => onLoc({ kind: 'episode', n: e.n, stage: e.stage })} title={`第 ${e.n} 集`}>{e.n}</button>
      ))}
    </div>
  );
}
