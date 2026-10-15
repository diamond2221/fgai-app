import { useState } from 'react';
import { useDirector } from '../lib/ctx';
import type { Memory } from '../api';
import { Card } from './Card';

const GROUPS: { id: string; name: string; note: string; test: (m: Memory) => boolean }[] = [
  { id: 'rule', name: '制片规则', note: '每部剧都带着的硬规则', test: (m) => m.kind === 'rule' },
  { id: 'fact', name: '你的要求', note: '你让美林记住的', test: (m) => m.kind === 'fact' },
  { id: 'brief', name: '立项', note: '体量、市场、结构问题的答案', test: (m) => /^(立项|体量|目标市场|女主|男主|主角|圣经)/.test(m.text) || /？|\?/.test(m.text.split('：')[0]) },
  { id: 'look', name: '画风与技能', note: '画风、各阶段技能', test: (m) => /^(画风|.*技能)/.test(m.text) },
  { id: 'model', name: '模型', note: '主脑、出图、出片', test: (m) => /^(主脑|出图模型|出片模型)/.test(m.text) },
  { id: 'eps', name: '每集决定', note: '剧本版本、入库资产、段落修改', test: (m) => /^第\s*\d+\s*集/.test(m.text) },
];

function groupOf(m: Memory) {
  return (GROUPS.find((g) => g.test(m)) || { id: 'other' }).id;
}

function Item({ m }: { m: Memory }) {
  const { run, busy } = useDirector();
  const [edit, setEdit] = useState(false);
  const [text, setText] = useState(m.text);
  const [sure, setSure] = useState(false);
  const save = () => { const t = text.trim(); if (t && t !== m.text) run('memory.update', { id: m.id, text: t, quiet: true }); setEdit(false); };
  return (
    <li className={`mem ${m.kind}`} data-focus={m.id}>
      {edit ? (
        <form className="mem-edit" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <label htmlFor={`m-${m.id}`} className="sr-only">修改这条记忆</label>
          <textarea id={`m-${m.id}`} className="field" autoFocus rows={2} value={text} maxLength={400} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save(); } if (e.key === 'Escape') { setText(m.text); setEdit(false); } }} />
          <div className="row">
            <button className="btn small primary" disabled={busy || !text.trim()}>保存</button>
            <button type="button" className="btn small ghost" onClick={() => { setText(m.text); setEdit(false); }}>取消</button>
          </div>
        </form>
      ) : (
        <button className="mem-text" onClick={() => setEdit(true)} title="点一下修改">
          <span>{m.text}</span>
          <small>{m.kind === 'rule' ? '制片规则' : m.kind === 'fact' ? '你的要求' : '流程决定'}{m.edited ? ' · 已修改' : ''} · {new Date(m.at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</small>
        </button>
      )}
      {!edit && (
        <div className="mem-acts">
          <button className="btn tiny ghost" onClick={() => setEdit(true)}>修改</button>
          {m.kind !== 'rule' && (sure
            ? <button className="btn tiny danger" disabled={busy} onClick={() => run('memory.remove', { id: m.id, quiet: true })} onBlur={() => setSure(false)}>确认忘掉</button>
            : <button className="btn tiny ghost" onClick={() => { setSure(true); window.setTimeout(() => setSure(false), 3000); }}>忘掉</button>)}
        </div>
      )}
    </li>
  );
}

export default function MemoryView() {
  const { drama: d, run, busy } = useDirector();
  const [text, setText] = useState('');
  const memory = d.memory || [];
  const groups = [...GROUPS, { id: 'other', name: '其他', note: '', test: () => true }]
    .map((g) => ({ ...g, items: memory.filter((m) => groupOf(m) === g.id) }))
    .filter((g) => g.items.length);
  return (
    <Card
      wide
      kicker="长期记忆"
      title={`${d.titleZh || '这部剧'}的导演记忆`}
      sub="美林每次回答、写剧本、出图、写分段之前都会先读这里。点任意一条直接改；过时的可以忘掉。对话里说“记住……”“以后……”也会记到这里。"
    >
      <form className="mem-add" onSubmit={(e) => { e.preventDefault(); const t = text.trim(); if (t) { run('memory.add', { text: t }); setText(''); } }}>
        <label htmlFor="mem-new" className="sr-only">让美林记住</label>
        <input id="mem-new" className="field" value={text} maxLength={400} onChange={(e) => setText(e.target.value)} placeholder="让美林记住一件事，例如：每集结尾都停在反转上" />
        <button className="btn primary" disabled={!text.trim() || busy}>记住</button>
      </form>
      <div className="mem-groups">
        {groups.map((g) => (
          <section key={g.id} className={`mem-group g-${g.id}`}>
            <h3 className="sub-h">{g.name}<small>{g.items.length} 条{g.note ? ` · ${g.note}` : ''}</small></h3>
            <ul className="mem-list">{[...g.items].reverse().map((m) => <Item key={m.id} m={m} />)}</ul>
          </section>
        ))}
      </div>
    </Card>
  );
}
