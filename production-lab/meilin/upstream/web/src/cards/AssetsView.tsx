import { useState } from 'react';
import { useDirector } from '../lib/ctx';
import AssetGrid from './AssetGrid';
import { Card, Empty } from './Card';

// 全剧资产库: every character, scene and prop extracted from any episode's script.
// Later episodes reuse what is here instead of generating again.
export default function AssetsView() {
  const { drama: d, go, model, config } = useDirector();
  const [ep, setEp] = useState<number | 0>(0);
  const all = d.assets.items;
  const eps = d.episodes.filter((e) => e.castCodes.length);
  const items = ep ? all.filter((a) => d.episodes.find((e) => e.n === ep)?.castCodes.includes(a.code)) : all;
  const approved = all.filter((a) => a.status === 'approved').length;
  const reused = all.filter((a) => d.episodes.filter((e) => e.castCodes.includes(a.code)).length > 1).length;
  const skill = config.skills.find((s) => s.stage === 'render' && s.id === d.settings.skills.render)?.label || '原样出图';
  return (
    <Card
      wide
      kicker="全剧资产库"
      title="角色 · 场景 · 道具"
      sub={<>每集定稿剧本后，美林从剧本里抽出资产；已在库里的直接复用，只给新出现的出图。提示词由短剧资产提示词写，出图时可选风格技能（当前 {model(d.settings.imageModel)?.label} + {skill}）。<span className="tally">{approved}/{all.length} 已通过 · {reused} 个跨集复用</span></>}
      footer={eps.length ? <button className="btn small" onClick={() => go({ episode: eps.at(-1)!.n, stage: 'cast' })}>回到第 {eps.at(-1)!.n} 集资产</button> : undefined}
    >
      {!all.length ? (
        <Empty action={<button className="btn primary" onClick={() => go({ episode: 1, stage: 'script' })}>去写第 1 集剧本</button>}>
          资产库还是空的。先定第 1 集剧本，美林会按剧本抽出这一集用到的角色、场景和道具。
        </Empty>
      ) : (
        <>
          {eps.length > 1 && (
            <div className="chips" style={{ marginBottom: 14 }} role="radiogroup" aria-label="按集筛选">
              <button role="radio" aria-checked={!ep} className={`chip small ${!ep ? 'on' : ''}`} onClick={() => setEp(0)}>全剧</button>
              {eps.map((e) => <button key={e.n} role="radio" aria-checked={ep === e.n} className={`chip small ${ep === e.n ? 'on' : ''}`} onClick={() => setEp(e.n)}>第 {e.n} 集 · {e.castCodes.length}</button>)}
            </div>
          )}
          <AssetGrid items={items} label={ep ? `第 ${ep} 集` : '全剧资产'} />
        </>
      )}
    </Card>
  );
}
