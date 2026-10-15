import { useEffect, useRef, useState } from 'react';
import { useDirector } from '../lib/ctx';
import { Asset, currentVersion } from '../api';
import { AssetArt } from '../components/Art';
import { copyText, UploadButton } from './Card';
import SphereGallery from '../components/SphereGallery';

export const KIND = { character: '角色', scene: '场景', prop: '道具' } as const;
const STATUS: Record<Asset['status'], string> = { draft: '待出图', rendering: '出图中', ready: '待你确认', approved: '已通过' };

export function AssetImage({ a }: { a: Asset; big?: boolean }) {
  const v = currentVersion(a);
  if (v?.url) return <img className="art" src={v.url} alt={a.name} />;
  if (a.status === 'draft' && !v) return <span className="asset-blank"><i>{KIND[a.kind]}</i></span>;
  return <AssetArt asset={a} />;
}

export function ModelSelect({ value, onChange, label = '出图模型', compact }: { value: string; onChange: (v: string) => void; label?: string; compact?: boolean }) {
  const { config } = useDirector();
  return (
    <label className={`msel ${compact ? 'compact' : ''}`}>
      <span className={compact ? 'sr-only' : ''}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {config.models.filter((m) => m.capability === 'image').map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
      </select>
    </label>
  );
}

// The style layer applied at generation time (prompts are always written by 短剧资产提示词).
export function RenderSkillSelect({ value, onChange, label = '风格技能', compact }: { value: string; onChange: (v: string) => void; label?: string; compact?: boolean }) {
  const { config } = useDirector();
  const list = config.skills.filter((s) => s.stage === 'render');
  return (
    <label className={`msel ${compact ? 'compact' : ''}`} title={list.find((s) => s.id === value)?.note}>
      <span className={compact ? 'sr-only' : ''}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {list.map((s) => <option key={s.key} value={s.id} disabled={!s.installed}>{s.label}{s.installed ? '' : '（未安装）'}</option>)}
      </select>
    </label>
  );
}

function episodesUsing(code: string, eps: { n: number; castCodes: string[] }[]) {
  return eps.filter((e) => e.castCodes.includes(code)).map((e) => e.n);
}

export function Detail({ a, onClose }: { a: Asset; onClose: () => void }) {
  const { run, toast, busy, drama, upload, model, config } = useDirector();
  const [note, setNote] = useState('');
  const [m, setM] = useState(a.model || drama.settings.imageModel);
  const [sk, setSk] = useState(a.renderSkill || drama.settings.skills.render || 'plain');
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState(a.name);
  const [zh, setZh] = useState(a.zh || '');
  const [sure, setSure] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  const saveName = () => { if (name.trim() && (name.trim() !== a.name || zh.trim() !== (a.zh || ''))) run('assets.rename', { code: a.code, name: name.trim(), zh: zh.trim() }); setNaming(false); };
  useEffect(() => { ref.current?.showModal(); }, []);
  const v = currentVersion(a);
  const used = episodesUsing(a.code, drama.episodes);
  const skillLabel = (id?: string) => config.skills.find((s) => s.stage === 'render' && s.id === id)?.label;
  return (
    <dialog ref={ref} className="sheet" onClose={onClose} onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }} aria-label={`${a.code} ${a.name}`}>
      <div className={`sheet-art ${a.status}`}>
        <AssetImage a={a} big />
        {a.status === 'rendering' && <span className="scan" aria-hidden="true" />}
        {v && !v.url && <span className="badge">示意</span>}
      </div>
      <div className="sheet-body">
        <p className="sheet-code">{a.code} · {KIND[a.kind]} · {used.length ? `用于第 ${used.join('、')} 集` : a.episode ? `第 ${a.episode} 集新增` : '全剧资产'}</p>
        {naming ? (
          <form className="rename" onSubmit={(e) => { e.preventDefault(); saveName(); }}>
            <label htmlFor="asset-name" className="sr-only">名字</label>
            <input id="asset-name" className="field" autoFocus value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="名字（提示词里用）" />
            <label htmlFor="asset-zh" className="sr-only">中文名</label>
            <input id="asset-zh" className="field zh" value={zh} maxLength={30} onChange={(e) => setZh(e.target.value)} placeholder="中文名（可选）" />
            <button className="btn small primary" disabled={!name.trim() || busy}>保存</button>
            <button type="button" className="btn small ghost" onClick={() => { setName(a.name); setZh(a.zh || ''); setNaming(false); }}>取消</button>
          </form>
        ) : (
          <h3>
            <button className="name-edit" onClick={() => setNaming(true)} title="改名字">{a.name}{a.zh ? <small>{a.zh}</small> : null}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" /></svg></button>
          </h3>
        )}
        {a.versions.length > 0 && (
          <div className="versions" role="radiogroup" aria-label="版本">
            {a.versions.map((x, i) => (
              <button key={x.id} role="radio" aria-checked={a.current === x.id} className={`ver ${a.current === x.id ? 'on' : ''}`} onClick={() => run('assets.pick', { code: a.code, version: x.id })} title={x.skill && x.skill !== 'plain' ? skillLabel(x.skill) : undefined}>
                {x.url ? <img src={x.url} alt="" /> : <AssetArt asset={a} />}
                <small>{x.uploaded ? '上传' : `v${i + 1} · ${model(x.model)?.label || x.model}`}</small>
              </button>
            ))}
          </div>
        )}
        <p className="prompt-text">{a.prompt || '还没有描述。写一句或上传一张参考图。'}</p>
        {v?.prompt&&<details><summary>本版本实际生图提示词</summary><p className="prompt-text">{v.prompt}</p><button className="btn ghost small" onClick={async()=>{if(await copyText(v.prompt!))toast('实际提示词已复制');}}>复制本版本提示词</button></details>}
        <div className="row">
          <button className="btn ghost small" onClick={async () => { if (await copyText(a.prompt)) toast('提示词已复制'); }}>复制提示词</button>
          <UploadButton accept="image/*" onFiles={(f) => upload(f[0], { purpose: 'asset', code: a.code })}>上传替换</UploadButton>
          <span className="toolbar-gap" />
          {sure
            ? <button className="btn ghost small danger" disabled={busy} onClick={() => { run('assets.remove', { code: a.code }); ref.current?.close(); }}>确认删除 {a.code}</button>
            : <button className="btn ghost small" onClick={() => { setSure(true); window.setTimeout(() => setSure(false), 3500); }}>删除</button>}
        </div>
        {sure && <p className="small muted">删除后，各集的资产列表和分段参考图里也会一起摘掉。再点一次确认。</p>}
        <form className="inline-note" onSubmit={(e) => { e.preventDefault(); if (note.trim()) { run('assets.note', { code: a.code, note: note.trim() }); setNote(''); } }}>
          <label htmlFor="asset-note" className="sr-only">改一句</label>
          <input id="asset-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="改一句，例如：头发换成金色大波浪" />
          <button className="btn small" disabled={!note.trim() || busy}>写进提示词</button>
        </form>
        <div className="sheet-foot">
          <ModelSelect value={m} onChange={setM} />
          <RenderSkillSelect value={sk} onChange={setSk} />
          <div className="sheet-acts">
            <button className="btn" disabled={busy || a.status === 'rendering'} onClick={() => run('assets.render', { code: a.code, model: m, skill: sk })}>{a.versions.length ? '重新出图' : '出图'}</button>
            <button className="btn primary" disabled={busy || a.status !== 'ready'} onClick={(e) => { run('assets.approve', { code: a.code }, { from: e.currentTarget }); ref.current?.close(); }}>通过</button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

export default function AssetGrid({ items: all, fresh = [], episode, label }: { items: Asset[]; fresh?: string[]; episode?: number; label?: string }) {
  const { run, busy, drama, upload, model } = useDirector();
  const [open, setOpen] = useState<string | null>(null);
  const [kind, setKind] = useState<'all' | Asset['kind']>('all');
  const [view, setView] = useState<'grid' | 'sphere'>(() => { try { return (localStorage.getItem('meilin.assetView') as 'grid' | 'sphere') || 'grid'; } catch { return 'grid'; } });
  const setViewSaved = (v: 'grid' | 'sphere') => { setView(v); try { localStorage.setItem('meilin.assetView', v); } catch { /* optional */ } };
  const items = kind === 'all' ? all : all.filter((x) => x.kind === kind);
  const [addKind, setAddKind] = useState<Asset['kind']>('character');
  const [m, setM] = useState(drama.settings.imageModel);
  const [sk, setSk] = useState(drama.settings.skills.render || 'plain');
  useEffect(() => setM(drama.settings.imageModel), [drama.settings.imageModel]);
  useEffect(() => setSk(drama.settings.skills.render || 'plain'), [drama.settings.skills.render]);
  const drafts = items.filter((x) => x.status === 'draft');
  const ready = items.filter((x) => x.status === 'ready');
  const current = all.find((x) => x.code === open);
  const counts = { all: all.length, character: all.filter((x) => x.kind === 'character').length, scene: all.filter((x) => x.kind === 'scene').length, prop: all.filter((x) => x.kind === 'prop').length };
  return (
    <>
      <div className="viewbar">
        <div className="seg-tabs" role="tablist" aria-label="分类">
          {(['all', 'character', 'scene', 'prop'] as const).map((k) => (
            <button key={k} role="tab" aria-selected={kind === k} className={kind === k ? 'on' : ''} disabled={!counts[k]} onClick={() => setKind(k)}>{k === 'all' ? '全部' : KIND[k]}<small>{counts[k]}</small></button>
          ))}
        </div>
        <span className="toolbar-gap" />
        <div className="seg-tabs" role="tablist" aria-label="查看方式">
          <button role="tab" aria-selected={view === 'grid'} className={view === 'grid' ? 'on' : ''} onClick={() => setViewSaved('grid')}>网格</button>
          <button role="tab" aria-selected={view === 'sphere'} className={view === 'sphere' ? 'on' : ''} onClick={() => setViewSaved('sphere')}>星球</button>
        </div>
      </div>
      <div className="toolbar">
        <ModelSelect value={m} onChange={setM} label="用" />
        <RenderSkillSelect value={sk} onChange={setSk} label="+" />
        <button className="btn small primary" disabled={busy || !drafts.length} onClick={() => run('assets.render', { codes: drafts.map((x) => x.code), model: m, skill: sk })}>全部出图 · {drafts.length}</button>
        <button className="btn ghost small" disabled={busy || !ready.length} onClick={(e) => run('assets.approve', { codes: ready.map((x) => x.code) }, { from: e.currentTarget })}>全部通过 · {ready.length}</button>
        <span className="toolbar-gap" />
        <select className="mini-select" value={addKind} onChange={(e) => setAddKind(e.target.value as Asset['kind'])} aria-label="资产类型">
          <option value="character">角色</option><option value="scene">场景</option><option value="prop">道具</option>
        </select>
        <UploadButton accept="image/*" multiple onFiles={async (fs) => { for (const f of fs) await upload(f, { purpose: 'asset', kind: addKind, assetName: f.name.replace(/\.[^.]+$/, ''), ...(episode ? { episode } : {}) }); }}>上传{KIND[addKind]}</UploadButton>
        <button className="btn ghost small" disabled={busy} onClick={() => run('assets.add', { kind: addKind, ...(episode ? { episode } : {}) })}>新建{KIND[addKind]}</button>
      </div>
      {view === 'sphere' && (
        <SphereGallery
          label={kind === 'all' ? label || '全部资产' : KIND[kind]}
          items={items.map((x) => { const v = currentVersion(x); return { key: x.code, title: x.name, sub: `${x.code} · ${STATUS[x.status]}`, url: v?.url || null, palette: x.palette, badge: v?.url ? undefined : '示意', ratio: 16 / 9 }; })}
          onPick={setOpen}
        />
      )}
      {view === 'grid' && (['character', 'scene', 'prop'] as const).map((k) => {
        const group = items.filter((x) => x.kind === k);
        if (!group.length) return null;
        return (
          <section key={k} className="asset-group">
            <h4 className="sub-h">{KIND[k]}<small>{group.length}</small></h4>
            <div className={`assets ${k}`}>
              {group.map((x, i) => {
                const v = currentVersion(x);
                const used = episode ? [] : episodesUsing(x.code, drama.episodes);
                return (
                  <button key={x.code} data-focus={x.code} className={`asset tilt ${x.status} ${fresh.includes(x.code) ? 'fresh' : ''}`} onClick={() => setOpen(x.code)} style={{ animationDelay: `${Math.min(i, 16) * 35}ms` }}>
                    <span className="asset-art">
                      <AssetImage a={x} />
                      <span className="sheen" aria-hidden="true" />
                      {x.status === 'rendering' && <span className="scan" aria-hidden="true" />}
                      {v && !v.url && <span className="badge">示意</span>}
                      {fresh.includes(x.code) && <span className="badge new">本集新增</span>}
                      {x.status === 'approved' && <span className="tick" aria-hidden="true" />}
                    </span>
                    <span className="asset-meta"><span className="asset-code">{x.code}</span><span className="asset-name">{x.name}</span></span>
                    <span className={`asset-status s-${x.status}`}>{STATUS[x.status]}<em>{v ? (v.uploaded ? '上传' : model(v.model)?.label) : model(x.model || drama.settings.imageModel)?.label}</em></span>
                    {used.length > 0 && <span className="asset-eps">第 {used.length > 4 ? `${used.slice(0, 4).join('、')}… ` : used.join('、')} 集</span>}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
      {current && <Detail key={current.code} a={current} onClose={() => setOpen(null)} />}
    </>
  );
}
