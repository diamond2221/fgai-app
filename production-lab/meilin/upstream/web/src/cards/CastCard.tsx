import { useDirector } from '../lib/ctx';
import AssetGrid from './AssetGrid';
import { Card, Go, Locked } from './Card';

export default function CastCard() {
  const { drama: d, episode, run, busy, go } = useDirector();
  const e = d.episodes.find((x) => x.n === episode);
  if (!e || !e.chosen) return <Card title="本集资产" sub="先采用一版剧本。"><p className="muted">本集剧本还没定。</p></Card>;
  const items = e.castCodes.map((c) => d.assets.items.find((a) => a.code === c)).filter(Boolean) as typeof d.assets.items;
  const pending = items.filter((a) => a.status !== 'approved').length;
  return (
    <Card
      wide
      kicker={`第 ${e.n} 集`}
      title="本集资产"
      sub={<>按本集剧本抽出 {items.length} 个资产：{items.length - e.newCodes.length} 个直接复用全剧资产库，{e.newCodes.length} 个是本集新出现的，出图后会自动进库。<span className="tally">{items.length - pending}/{items.length} 已通过</span></>}
      footer={<><button className="btn ghost small" onClick={() => go({ view: 'assets' })}>全剧资产库</button>{e.castConfirmed ? <Locked>本集资产已就绪</Locked> : <Go disabled={busy || pending > 0} onGo={(el) => run('cast.confirm', {}, { from: el })}>资产就绪，开始分段</Go>}</>}
    >
      <AssetGrid items={items} fresh={e.newCodes} episode={e.n} />
    </Card>
  );
}
