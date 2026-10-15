import { useEffect, useRef } from 'react';
import { useDirector } from '../lib/ctx';
import type { Model, Skill } from '../api';

const STAGE_NAME: Record<Skill['stage'], string> = { script: '剧本', style: '画风解析', asset: '资产提示词', render: '出图风格（生图时套用）', segment: '分段导演', action: '打戏', boost: '增强（可多选）' };
const STAGE_NOTE: Partial<Record<Skill['stage'], string>> = { asset: '所有角色、场景、道具的提示词都由它来写', render: '出图前把资产提示词按所选技能重写成生图模型的原生写法；每个资产出图时还能单独换' };

export default function SettingsDrawer({ tab, onClose, onTab }: { tab: string | null; onClose: () => void; onTab: (t: string) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (tab && !d.open) d.showModal();
    if (!tab && d.open) d.close();
  }, [tab]);
  return (
    <dialog ref={ref} className="drawer" onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }} aria-label="全局设定">
      <div className="drawer-in">
        <header className="drawer-head">
          <h2>全局设定</h2>
          <div className="seg-tabs" role="tablist">
            {[['models', '模型'], ['skills', '技能'], ['spec', '规格']].map(([id, name]) => (
              <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => onTab(id)}>{name}</button>
            ))}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="关闭">×</button>
        </header>
        <div className="drawer-body">
          {tab === 'models' && <Models />}
          {tab === 'skills' && <Skills />}
          {tab === 'spec' && <Spec />}
        </div>
      </div>
    </dialog>
  );
}

function ModelList({ cap, value }: { cap: Model['capability']; value: string }) {
  const { config, run, busy } = useDirector();
  return (
    <div className="model-list" role="radiogroup">
      {config.models.filter((m) => m.capability === cap).map((m) => (
        <button key={m.id} role="radio" aria-checked={value === m.id} disabled={busy} className={`model-card glow ${value === m.id ? 'on' : ''}`} onClick={() => value !== m.id && run('settings.model', { model: m.id })}>
          <span className="model-name">{m.label}{m.default && <small>默认</small>}</span>
          <span className="model-sum">{m.summary}</span>
        </button>
      ))}
    </div>
  );
}

function Models() {
  const { drama, model, run } = useDirector();
  const s = drama.settings;
  const im = model(s.imageModel)?.cap.image;
  const vm = model(s.videoModel)?.cap.video;
  const ratioOf = (v: string) => { const m = v.match(/^(\d+)x(\d+)$/); if (!m) return ''; const r = Number(m[1]) / Number(m[2]); return Math.abs(r - 16 / 9) < 0.02 ? '16:9' : Math.abs(r - 9 / 16) < 0.02 ? '9:16' : Math.abs(r - 1) < 0.02 ? '1:1' : Math.abs(r - 1.5) < 0.02 ? '3:2' : Math.abs(r - 2 / 3) < 0.02 ? '2:3' : Math.abs(r - 4 / 3) < 0.02 ? '4:3' : Math.abs(r - 0.75) < 0.02 ? '3:4' : ''; };
  const sizes = im?.size.presets?.length ? im.size.presets.map((p) => ({ v: p.size, l: `${p.ratio} · ${p.tier} · ${p.size}` })) : im?.size.values.map((v) => ({ v, l: ratioOf(v) ? `${ratioOf(v)} · ${v}` : v })) || [];
  return (
    <>
      <section className="set-sec">
        <h3>主脑 <small>理解对话、写剧本与导演提示词</small></h3>
        <ModelList cap="text" value={s.textModel} />
      </section>
      <section className="set-sec">
        <h3>出图 <small>资产默认 16:9 横版，按所选模型自己的尺寸表；每个资产还可以单独换模型和风格技能</small></h3>
        <ModelList cap="image" value={s.imageModel} />
        {im && (
          <div className="params">
            <label>{im.size.parameter === 'aspect_ratio' ? '比例' : '尺寸'}
              <select value={s.imageParams.size} onChange={(e) => run('settings.params', { imageParams: { size: e.target.value } })}>
                {sizes.map((x) => <option key={x.v} value={x.v}>{x.l}</option>)}
              </select>
            </label>
            {im.quality.supported && (
              <label>质量
                <select value={s.imageParams.quality} onChange={(e) => run('settings.params', { imageParams: { quality: e.target.value } })}>
                  {im.quality.values.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
            )}
          </div>
        )}
      </section>
      <section className="set-sec">
        <h3>出片 <small>音效、对白、旁白随视频一起生成；BGM 与字幕后期加</small></h3>
        <ModelList cap="video" value={s.videoModel} />
        {vm && (
          <div className="params">
            <label>预览分辨率
              <select value={s.videoParams.preview} onChange={(e) => run('settings.params', { videoParams: { preview: e.target.value } })}>{vm.resolutions.map((r) => <option key={r}>{r}</option>)}</select>
            </label>
            <label>正式分辨率
              <select value={s.videoParams.final} onChange={(e) => run('settings.params', { videoParams: { final: e.target.value } })}>{vm.resolutions.map((r) => <option key={r}>{r}</option>)}</select>
            </label>
            <label>画幅
              <select value={s.videoParams.ratio} onChange={(e) => run('settings.params', { videoParams: { ratio: e.target.value } })}>{vm.ratios.map((r) => <option key={r}>{r}</option>)}</select>
            </label>
            <p className="param-note">分段时长按剧情定：每段 {Math.min(10, Math.min(25, Math.max(...vm.duration.values)))}–{Math.min(25, Math.max(...vm.duration.values))} 秒（这个模型最长 {Math.max(...vm.duration.values)} 秒）· 每段最多挂 {vm.references.maxImages} 张参考图 · 随片只生成音效、对白、旁白，不带 BGM 和字幕</p>
          </div>
        )}
      </section>
    </>
  );
}

function Skills() {
  const { config, drama, run, busy } = useDirector();
  const sk = drama.settings.skills;
  const stages: Skill['stage'][] = ['script', 'style', 'asset', 'render', 'segment', 'action', 'boost'];
  return (
    <>
      {config.mode === 'mock' && <p className="note">模拟模式只记录技能选择；配置 WeToken 后，所选技能会在对应阶段装进主脑的提示词里。技能直接读取这台电脑上安装的 Claude 技能，不复制进项目。</p>}
      {stages.map((st) => (
        <section key={st} className="set-sec">
          <h3>{STAGE_NAME[st]}{STAGE_NOTE[st] && <small>{STAGE_NOTE[st]}</small>}</h3>
          <div className="skill-list">
            {config.skills.filter((s) => s.stage === st).map((s) => {
              const on = st === 'boost' ? sk.boost.includes(s.id) : (sk as any)[st] === s.id;
              return (
                <button key={s.key} aria-pressed={on} disabled={!s.installed || busy} className={`skill-card glow ${on ? 'on' : ''}`}
                  onClick={() => (st === 'boost' ? run('settings.skill', { stage: st, id: s.id }) : !on && run('settings.skill', { stage: st, id: s.id }))}>
                  <span className="skill-name">{s.label}{s.local && <small>FG</small>}</span>
                  <span className="skill-note">{s.note}</span>
                  {s.license && <span className="skill-lic">{s.license}</span>}
                  {!s.installed && <span className="skill-lic warn">这台电脑没装</span>}
                </button>
              );
            })}
          </div>
        </section>
      ))}
      <p className="note small">ZY 造梦师采用 CC BY-NC 4.0 许可，用于商业项目前需取得作者授权。</p>
    </>
  );
}

function Spec() {
  const { drama } = useDirector();
  const s = drama.settings;
  return (
    <section className="set-sec">
      <h3>本剧规格</h3>
      <dl className="spec">
        <div><dt>画幅</dt><dd>{s.aspect} 竖屏 · {s.fps}fps</dd></div>
        <div><dt>台词</dt><dd>{s.language}</dd></div>
        <div><dt>单集</dt><dd>约 {s.episodeSeconds} 秒</dd></div>
        <div><dt>单段</dt><dd>按剧情 10–25 秒</dd></div>
        <div><dt>集数</dt><dd>{drama.brief?.episodes || '—'} 集</dd></div>
      </dl>
      <p className="note small">规格来自立项卡；想改就直接跟美林说，比如“改成 50 集，每集 60 秒”。</p>
    </section>
  );
}
