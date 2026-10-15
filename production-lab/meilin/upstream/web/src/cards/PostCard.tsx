import { useDirector } from '../lib/ctx';
import { Card, copyText, Go } from './Card';
import {apiURL} from '../api';

export default function PostCard() {
  const { drama: p, episode, run, busy, toast } = useDirector();
  const n = episode || 1;
  const cues = [
    { name: '主题配乐', text: p.music.main },
    { name: '反转重音', text: p.music.sting },
  ];
  return (
    <Card
      wide
      kicker={`第 ${n} 集`}
      title="后期"
      sub="台词已经随视频生成。剩下两件事：压字幕、铺音乐。"
      footer={(
        <>
          <a className="btn ghost" href={apiURL(`/api/dramas/${p.id}/prompts?episode=${n}`)}>下载本集提示词</a>
          <Go disabled={busy} onGo={(el) => run('episode.done', {}, { from: el })}>本集完成，开第 {n + 1} 集</Go>
        </>
      )}
    >
      <div className="post-grid">
        <section className="post-block">
          <h3>字幕</h3>
          <p>按每段台词的说话时机生成，英文一行、中文意思一行；投放时可只保留英文。</p>
          <a className="btn" href={apiURL(`/api/dramas/${p.id}/srt?episode=${n}`)}>下载 SRT 字幕</a>
        </section>

        <section className="post-block">
          <h3>音乐 · Suno</h3>
          <ol className="steps">
            <li>打开 suno.com，用公司 Gmail 登录；出现验证码请自己完成。</li>
            <li>点 Create，切到 Custom，打开 Instrumental（纯音乐）。</li>
            <li>把下面的风格描述粘进 Style of Music，生成两版，挑一版下载。</li>
            <li>主题配乐铺全集，反转重音放在反转台词之后。</li>
          </ol>
          <div className="cues">
            {cues.map((c) => (
              <div key={c.name} className="cue">
                <p className="cue-name">{c.name}</p>
                <p className="cue-text">{c.text}</p>
                <button className="btn ghost small" onClick={async () => { if (await copyText(c.text)) toast(`已复制${c.name}`); }}>复制</button>
              </div>
            ))}
          </div>
          <a className="ext" href="https://suno.com/" target="_blank" rel="noreferrer">打开 Suno</a>
        </section>

        <section className="post-block span2">
          <h3>剪辑清单</h3>
          <ol className="steps">
            <li>按段号拼接每段选中的版本；没有选的默认用最新一版。</li>
            <li>转场缓冲段保留开头 2–3 秒的空镜或特写，不要剪掉，它负责衔接。</li>
            <li>音乐压在台词下方约 −18 dB，反转台词前 0.5 秒收音乐、台词后起重音。</li>
            <li>导入 SRT，字幕放在画面下三分之一以上，避开平台按钮区。</li>
            <li>导出 9:16 竖屏，片头 3 秒内必须看到钩子。</li>
          </ol>
        </section>
      </div>
    </Card>
  );
}
