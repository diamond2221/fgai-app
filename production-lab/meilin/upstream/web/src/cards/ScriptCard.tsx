import { useState } from 'react';
import { useDirector } from '../lib/ctx';
import { Card, copyText, Go, Locked } from './Card';
import { Drop } from './BibleCard';

function stats(text: string) {
  const lines = text.split('\n');
  const dialogue = lines.filter((l) => /^[A-Za-z][A-Za-z .'-]*(（OS）|\(V\.O\.\))?\s*[：:]/.test(l.trim()) || /^[A-Z]{2,}( \(V\.O\.\))?:/.test(l.trim()));
  const words = dialogue.map((l) => l.replace(/^[^：:]+[：:]/, '').replace(/[（(][^）)]*[)）]/g, '')).join(' ').split(/\s+/).filter(Boolean).length;
  const actions = lines.filter((l) => /^[（(](动作|Action)/.test(l.trim())).length;
  const seconds = Math.round(words / 2.5 + actions * 4);
  return {
    seconds,
    lines: dialogue.length,
    hook: /【(本集钩子|Hook)】/.test(text),
    cliff: /【(结尾悬念|Cliffhanger)】/.test(text),
  };
}

function ScriptView({ text }: { text: string }) {
  return (
    <div className="script">
      {text.split('\n').map((raw, i) => {
        const l = raw.trim();
        if (!l) return null;
        if (l.startsWith('## ')) return <h5 key={i} className="s-ep">{l.slice(3)}</h5>;
        if (l.startsWith('# ')) return <h4 key={i} className="s-title">{l.slice(2)}</h4>;
        const tag = l.match(/^【(.+?)】(.*)$/);
        if (tag) return <p key={i} className="s-tag"><span>{tag[1]}</span>{tag[2]}</p>;
        if (/^[（(](动作|Action)/.test(l)) return <p key={i} className="s-action">{l.replace(/^[（(](动作|Action)[）)]\s*/, '')}</p>;
        if (/^(场|Scene)\s*\d/.test(l)) return <p key={i} className="s-scene">{l}</p>;
        const d = l.match(/^([^：:]{1,28}?)\s*[：:]\s*(.+)$/);
        if (d && !/[｜|]/.test(l)) {
          const zh = d[2].match(/^(.*?)[（(]([^）)]*)[)）]\s*$/);
          return (
            <p key={i} className="s-line">
              <span className="who">{d[1]}</span>
              <span className="en">{zh ? zh[1] : d[2]}</span>
              {zh && <span className="zh">{zh[2]}</span>}
            </p>
          );
        }
        return <p key={i} className="s-plain">{l}</p>;
      })}
    </div>
  );
}

function Stat({ text }: { text: string }) {
  const s = stats(text);
  return (
    <p className="script-stats">
      <span>约 {s.seconds} 秒</span>
      <span>{s.lines} 句台词</span>
      <span className={s.hook ? 'ok' : 'warn'}>{s.hook ? '有开场钩子' : '缺开场钩子'}</span>
      <span className={s.cliff ? 'ok' : 'warn'}>{s.cliff ? '有结尾悬念' : '缺结尾悬念'}</span>
    </p>
  );
}

type Lane = 'aistudio' | 'sonnet' | 'upload';

export default function ScriptCard() {
  const { drama: d, config, episode, run, busy, toast, upload, openSettings, model } = useDirector();
  const e = d.episodes.find((x) => x.n === episode)!;
  const n = e.n;
  const [paste, setPaste] = useState('');
  const [guide, setGuide] = useState(!e.scripts.aistudio);
  const [mobileLane, setMobileLane] = useState<Lane>(e.chosen || 'sonnet');
  const skill = config.skills.find((s) => s.stage === 'script' && s.id === d.settings.skills.script);
  const fill = (t: string) => t
    .replace(/\{一句话想法\}/g, d.brief?.premise || '')
    .replace(/\{题材[^}]*\}/g, d.brief?.genre || 'revenge romance')
    .replace(/\{90\}/g, String(d.settings.episodeSeconds || 90))
    .replace(/\{N\}/g, String(n));
  const choose = (channel: Lane) => (el: HTMLButtonElement | null) => run('script.choose', { channel }, { from: el });

  return (
    <Card
      wide
      kicker={`第 ${n} 集`}
      title="剧本"
      sub="默认由爆款短剧工厂写作；也可以粘贴或上传已有剧本。AI Studio 作为可选来源。"
      footer={e.chosen ? (
        <>
          <Locked>第 {n} 集采用{{ sonnet: '美林直写', aistudio: ' AI Studio ', upload: '上传' }[e.chosen]}版</Locked>
          <button className="btn ghost" disabled={busy} onClick={() => run('episode.open', { episode: n + 1 })}>去第 {n + 1} 集</button>
        </>
      ) : undefined}
    >
      <div className="lane-tabs seg-tabs" role="tablist" aria-label="剧本来源">
        {([['sonnet', '美林写剧本'], ['upload', '已有剧本'], ['aistudio', 'AI Studio（可选）']] as [Lane, string][]).map(([id, name]) => (
          <button key={id} role="tab" aria-selected={mobileLane === id} className={mobileLane === id ? 'on' : ''} onClick={() => setMobileLane(id)}>{name}{e.scripts[id] ? ' ·' : ''}</button>
        ))}
      </div>
      <div className="compare" data-lane={mobileLane}>
        <section className={`lane glow ${e.chosen === 'aistudio' ? 'chosen' : ''}`} data-id="aistudio" aria-label="Google AI Studio 版">
          <header className="lane-head"><h3>Google AI Studio</h3><span className="lane-model">Gemini Flash · 你来操作</span></header>
          <button className="disclose" aria-expanded={guide} onClick={() => setGuide(!guide)}>{guide ? '收起操作指引' : '展开操作指引'}</button>
          {guide && (
            <div className="guide">
              <ol>{config.aiStudio.steps.map((s, i) => <li key={i} dangerouslySetInnerHTML={{ __html: s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/灵犀/g, '美林') }} />)}</ol>
              <div className="prompt-list">
                {config.aiStudio.prompts.map((pr) => (
                  <button key={pr.name} className="prompt-copy glow" onClick={async () => { if (await copyText(fill(pr.text))) toast(`已复制 ${pr.name}`); }}>
                    <span>{pr.name}</span><small>复制</small>
                  </button>
                ))}
              </div>
              <a className="ext" href="https://aistudio.google.com/" target="_blank" rel="noreferrer">打开 Google AI Studio</a>
            </div>
          )}
          {e.scripts.aistudio ? (
            <>
              <Stat text={e.scripts.aistudio} />
              <ScriptView text={e.scripts.aistudio} />
              <div className="lane-foot">
                <button className="btn ghost small" onClick={() => run('script.paste', { text: '' })}>清空重贴</button>
                <Go disabled={busy} onGo={choose('aistudio')}>采用这一版</Go>
              </div>
            </>
          ) : (
            <div className="paste">
              <label htmlFor="paste">把 AI Studio 写好的整集粘贴到这里</label>
              <textarea id="paste" rows={6} value={paste} onChange={(ev) => setPaste(ev.target.value)} placeholder="全选 AI Studio 的回复 → 复制 → 粘贴" />
              <div className="lane-foot">
                {d.mode === 'mock' && n === 1 && <button className="btn ghost small" onClick={() => run('script.samplePaste')}>填入示例输出</button>}
                <button className="btn" disabled={!paste.trim() || busy} onClick={() => { run('script.paste', { text: paste }); setPaste(''); }}>放进对照</button>
              </div>
            </div>
          )}
        </section>

        <section className={`lane glow ${e.chosen === 'sonnet' ? 'chosen' : ''}`} data-id="sonnet" aria-label="美林直写版">
          <header className="lane-head">
            <h3>美林直写</h3>
            <button className="lane-model linkish" onClick={() => openSettings('skills')} title="换剧本技能">{model(d.settings.textModel)?.label} · {skill?.label}</button>
          </header>
          {e.scripts.sonnet ? (
            <>
              <Stat text={e.scripts.sonnet} />
              <ScriptView text={e.scripts.sonnet} />
              <div className="lane-foot">
                <button className="btn ghost small" disabled={busy} onClick={() => run('script.sonnet')}>重写一版</button>
                <Go disabled={busy} onGo={choose('sonnet')}>采用这一版</Go>
              </div>
            </>
          ) : (
            <div className="lane-empty">
              <p>按圣经{n > 1 ? `和第 ${n - 1} 集的结尾悬念` : ''}，写约 {d.settings.episodeSeconds} 秒的第 {n} 集。</p>
              <Go disabled={busy} onGo={() => run('script.sonnet')}>写第 {n} 集</Go>
            </div>
          )}
        </section>

        <section className={`lane glow ${e.chosen === 'upload' ? 'chosen' : ''}`} data-id="upload" aria-label="上传版">
          <header className="lane-head"><h3>上传剧本</h3><span className="lane-model">{e.uploadName || '.docx / .txt / .md / .srt'}</span></header>
          {e.scripts.upload ? (
            <>
              <Stat text={e.scripts.upload} />
              <ScriptView text={e.scripts.upload} />
              <div className="lane-foot">
                <button className="btn ghost small" onClick={() => run('script.upload', { text: '' })}>换一份</button>
                <Go disabled={busy} onGo={choose('upload')}>采用这一版</Go>
              </div>
            </>
          ) : (
            <><label>粘贴剧本<textarea className="field" rows={10} value={paste} onChange={ev=>setPaste(ev.target.value)} placeholder="直接粘贴本集原稿"/></label><button className="btn" disabled={busy||!paste.trim()} onClick={async()=>{if(await run('script.upload',{text:paste,name:'粘贴剧本'}))setPaste('');}}>保存原稿</button><Drop accept=".docx,.txt,.md,.srt,.fountain" text="或上传编剧给的文件；支持 Word" onFiles={(f) => upload(f[0], { purpose: 'script' })} /></>
          )}
        </section>
      </div>
    </Card>
  );
}
