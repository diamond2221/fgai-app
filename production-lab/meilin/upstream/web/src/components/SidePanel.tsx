import { useEffect, useRef, useState } from 'react';
import { useDirector } from '../lib/ctx';
import type { Memory } from '../api';

const ago = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return '刚刚';
  if (s < 3600) return `${Math.floor(s / 60)} 分钟前`;
  if (s < 86400) return `${Math.floor(s / 3600)} 小时前`;
  return new Date(iso).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
};

const KIND_NAME = { rule: '制片规则', fact: '你的要求', decision: '决定' } as const;
const RANK = (k?: string) => (k === 'rule' ? 0 : k === 'fact' ? 1 : 2);

// One memory line: click to edit in place; rules can be edited but not forgotten.
function SideMem({ m }: { m: Memory }) {
  const { run, busy } = useDirector();
  const [edit, setEdit] = useState(false);
  const [text, setText] = useState(m.text);
  const save = () => { const t = text.trim(); if (t && t !== m.text) run('memory.update', { id: m.id, text: t, quiet: true }); setEdit(false); };
  return (
    <div className={`mem ${m.kind}`}>
      {edit ? (
        <form className="mem-inline" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <label htmlFor={`sm-${m.id}`} className="sr-only">修改这条记忆</label>
          <textarea id={`sm-${m.id}`} autoFocus rows={3} value={text} maxLength={400} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save(); } if (e.key === 'Escape') { e.stopPropagation(); setText(m.text); setEdit(false); } }} />
          <div className="row"><button className="btn tiny primary" disabled={busy || !text.trim()}>保存</button><button type="button" className="btn tiny ghost" onClick={() => { setText(m.text); setEdit(false); }}>取消</button></div>
        </form>
      ) : (
        <button className="mem-body" onClick={() => setEdit(true)} title="点一下修改">
          <p>{m.text}</p>
          <small>{KIND_NAME[m.kind] || '决定'}{m.edited ? ' · 已修改' : ''} · {ago(m.at)}</small>
        </button>
      )}
      {!edit && m.kind !== 'rule' && (
        <button className="icon-btn" disabled={busy} onClick={() => run('memory.remove', { id: m.id, quiet: true })} aria-label={`忘掉：${m.text}`} title="忘掉这条">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      )}
    </div>
  );
}

// This drama's own agent: the full conversation, plus the memory it carries from 立项 to the last episode.
export default function SidePanel({ tab, onTab, onClose }: { tab: 'chat' | 'memory'; onTab: (t: 'chat' | 'memory') => void; onClose: () => void }) {
  const { drama, run, busy, go } = useDirector();
  const end = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');
  const memory = drama.memory || [];
  useEffect(() => { if (tab === 'chat') end.current?.scrollIntoView({ block: 'end' }); }, [tab, drama.messages.length]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <aside className="side" aria-label="美林的对话与记忆">
      <header className="side-head">
        <div className="seg-tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'chat'} className={tab === 'chat' ? 'on' : ''} onClick={() => onTab('chat')}>对话<small>{drama.messages.length}</small></button>
          <button role="tab" aria-selected={tab === 'memory'} className={tab === 'memory' ? 'on' : ''} onClick={() => onTab('memory')}>记忆<small>{memory.length}</small></button>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="收起">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </header>
      {tab === 'chat' ? (
        <div className="side-list">
          {drama.messages.map((m) => (
            <div key={m.id} className={`msg ${m.role}`}>
              <span className="who">{m.role === 'agent' ? '美林' : '我'}</span>
              <p>{m.text}</p>
            </div>
          ))}
          <div ref={end} />
        </div>
      ) : (
        <>
          <div className="side-list">
            <p className="mem-intro">这部剧的导演记得的事，每次回答、写剧本、出图前都会先读一遍。点任意一条直接修改。黑色是制片规则，蓝色是流程里定下的决定，橙色是你要求记住的。<button className="linkish" onClick={() => go({ view: 'memory' })}>打开完整记忆页</button></p>
            {!memory.length && <p className="mem-intro">还没有记忆。锁定立项后会开始记录；也可以直接说“记住：女主始终穿白色”。</p>}
            {[...memory].reverse().sort((a, b) => RANK(a.kind) - RANK(b.kind)).map((m) => <SideMem key={m.id} m={m} />)}
          </div>
          <form className="side-form" onSubmit={(e) => { e.preventDefault(); const t = text.trim(); if (t) { run('memory.add', { text: t }); setText(''); } }}>
            <label htmlFor="mem-add" className="sr-only">加一条记忆</label>
            <input id="mem-add" value={text} onChange={(e) => setText(e.target.value)} placeholder="记住：每集结尾都停在反转上" />
            <button className="btn small primary" disabled={!text.trim() || busy}>记住</button>
          </form>
        </>
      )}
    </aside>
  );
}
