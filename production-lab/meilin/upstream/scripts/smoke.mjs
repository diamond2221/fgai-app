// End-to-end check of the simulated drama → episode flow against a running server.
if(!process.env.FG_DIRECTOR_URL)throw Error('请显式指定隔离 mock 测试服务地址');
const B = process.env.FG_DIRECTOR_URL + '/api';
const j = async (u, o) => { const r = await fetch(B + u, { method: o ? 'POST' : 'GET', headers: { 'content-type': 'application/json' }, body: o ? JSON.stringify(o) : undefined }); const t = await r.json(); if (!r.ok) throw new Error(JSON.stringify(t)); return t; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
if((await j('/config')).mode!=='mock')throw Error('smoke 只允许模拟模式，不运行付费验收');
let d = await j('/dramas', { direction: 'overseas-drama' });
const id = d.id;
try {
let ctx = {};
const follow = (r) => { if (r.nav?.episode) ctx = { episode: r.nav.episode }; else if (r.nav?.view) ctx = {}; };
const A = async (type, payload = {}) => { const r = await j(`/dramas/${id}/action`, { type, payload, ctx }); console.log(' ·', type, '→', (r.reply || '').slice(0, 64)); follow(r); return r.project; };
const T = async (text) => { const r = await j(`/dramas/${id}/turn`, { text, ctx }); console.log(' »', text, '→', (r.reply || '').slice(0, 72)); follow(r); return r.project; };
await T('被抛弃的新娘反手收购了前夫的公司');
await A('brief.spec', { episodes: 42, episodeSeconds: 75 });
await A('brief.answer', { id: 'tone', text: '先装傻示弱，第三集起连环反杀' });
await T('确认');
await T('画风换成霓虹黑帮');
await T('记住 Ava 全剧不穿红色');
await T('出图模型换成 Seedream 5 Pro');
await T('出图用 zy 电影感');
d = await T('好');
console.log('   stage', d.stage, 'episodes', d.episodes.map((e) => e.n).join(','), 'assets', d.assets.items.length);
await T('打开第1集');
await T('你来写');
d = await T('确认');
const e1 = d.episodes[0];
console.log('   cast', e1.castCodes.length, 'new', e1.newCodes.length);
await T('确认'); await sleep(3600);
d = await T('Ava 用 GPT Image 2 重新生成'); await sleep(3600);
console.log('   ava versions', d.assets.items.find((a) => a.code === '@角色1').versions.map((v) => `${v.model}/${v.skill}`).join(' '));
await T('确认');
d = await T('确认');
const plan = d.episodes[0].segments;
console.log('   segment seconds', plan.map((x) => x.seconds).join('/'), '| refs s1', (plan[0].refs || []).join(' '));
d = await A('segments.refs', { n: 1, refs: [...plan[0].refs.filter((c) => c !== '@道具1'), '@角色5'] });
console.log('   s1 refs edited', d.episodes[0].segments[0].refs.join(' '));
d = await T('确认');
console.log('   s1 prompt binds @角色5', /@角色5（Daniel Brooks）|@角色5/.test(d.episodes[0].segments[0].prompt || ''), '| no BGM line', /不生成背景音乐/.test(d.episodes[0].segments[0].prompt || ''));
await A('action.confirm', { n: 5 });
{ const r = await j(`/dramas/${id}/action`, { type: 'settings.model', payload: { model: 'doubao-seedance-2-0-filter-off' }, ctx });
  console.log('   SD2 refit', r.project.episodes[0].segments.map((x) => x.seconds).join('/'), '| trace', r.trace.map((x) => x.t).join(' · '), '| next', r.next.map((x) => x.label).join(' / '));
  await j(`/dramas/${id}/action`, { type: 'settings.model', payload: { model: 'dreamina-seedance-2-5-filter-off' }, ctx }); }
await T('确认');
await T('全部出预览'); await sleep(1200);
await T('确认');
d = await T('确认');
d = await T('写第2集');
d = await T('确认');
const e2 = d.episodes[1];
console.log('   ep2 cast', e2.castCodes.join(' '), '| new', e2.newCodes.join(' '));
{ const r = await j(`/dramas/${id}/turn`, { text: '出图', ctx }); console.log('   focus', r.focus.join(' '), '| trace', r.trace.map((x) => `${x.k}:${x.t}`).join(' · ')); }
d = await A('assets.rename', { code: '@道具4', name: '董事会表决书' });
console.log('   renamed', d.assets.items.find((a) => a.code === '@道具4').name);
d = await A('assets.remove', { code: '@场景3' });
console.log('   removed @场景3', !d.assets.items.some((a) => a.code === '@场景3'), !d.episodes[1].castCodes.includes('@场景3'));
const mm = d.memory.find((m) => m.text.startsWith('Ava'));
d = await A('memory.update', { id: mm.id, text: 'Ava 全剧不穿红色，婚礼戏除外', quiet: true });
console.log('   memory edited', d.memory.find((m) => m.id === mm.id).text, d.memory.find((m) => m.id === mm.id).kind);
console.log('   brief', d.brief.episodes, d.brief.episodeSeconds, '| tone', d.brief.questions.find((q) => q.id === 'tone').options.at(-1));
console.log('   memory', d.memory.length); for (const m of d.memory) console.log('     -', m.kind, m.text.slice(0, 60));
console.log('   image params', JSON.stringify(d.settings.imageParams), 'render', d.settings.skills.render);

// episode management: insert, delete, add, change total
const ok = (c, msg) => { if (!c) throw new Error('smoke: ' + msg); console.log('   ✓', msg); };
ctx = {};
const t2 = d.episodes.find((e) => e.n === 2).title;
d = await T('第 1 集后面加一集');
ok(d.brief.episodes === 43 && d.episodes.find((e) => e.n === 3)?.title === t2 && !d.episodes.find((e) => e.n === 2)?.chosen, 'insert after 1 shifts ep2 → ep3');
ok(d.memory.some((m) => /第 3 集剧本/.test(m.text)) && !d.memory.some((m) => /第 2 集剧本/.test(m.text)), 'memory renumbered on insert');
d = await A('episodes.remove', { episode: 2 });
ok(d.brief.episodes === 42 && d.episodes.find((e) => e.n === 2)?.title === t2, 'delete blank ep2 shifts back');
d = await T('加一集');
ok(d.brief.episodes === 43, 'append one');
d = await T('全剧改成 40 集');
ok(d.brief.episodes === 40, 'total → 40');
d = await T('改成 1 集');
ok(d.brief.episodes === 40, 'cannot drop below started episodes');
d = await T('删掉第二集');
ok(d.brief.episodes === 39 && !d.episodes.some((e) => e.title === t2) && !d.memory.some((m) => /第 2 集剧本/.test(m.text)), 'delete started ep2 removes its content and memory');

// clean up the test drama so it doesn't pile up on the shelf (keep it with SMOKE_KEEP=1)
} finally { const r=await fetch(`${B}/dramas/${id}`, {method:'DELETE'});if(!r.ok)throw Error('测试剧清理失败');console.log('   cleaned up test drama',id); }
