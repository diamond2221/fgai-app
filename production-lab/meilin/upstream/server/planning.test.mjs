import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDirectorTurn} from './llm.mjs';
import {editBrief,editBible,planningInput} from './planning.mjs';
test('plain conversational proposal remains a successful reply without executing actions',()=>{
  assert.deepEqual(parseDirectorTurn('我建议把美杜莎放在现代纽约。你确认后再立项。'),{reply:'我建议把美杜莎放在现代纽约。你确认后再立项。',actions:[]});
  assert.equal(parseDirectorTurn('```json\n{"reply":"已收到","actions":[]}\n```').reply,'已收到');
  assert.throws(()=>parseDirectorTurn('{"actions":['));
});
test('planning imports are unconfirmed and protect existing episodes and character identity',()=>{
  const d={brief:{episodes:3,premiseZh:'原主线'},episodes:[{n:3,scripts:{upload:'剧本'}}],bible:{style:{prompt:'旧画风'},cast:[{code:'@角色1',key:'A',name:'Leo'}]}};
  assert.throws(()=>editBrief(d,{premiseZh:'修改',episodes:2}));
  assert.equal(editBrief(d,{premiseZh:'新主线',episodes:3,episodeSeconds:90}).confirmed,false);
  const b=editBible(d,{titleZh:'石化之眼',loglineZh:'男主获得石化能力',faces:'欧美面孔',cast:[{code:'@角色1',key:'C',name:'Leo',look:'棕色短发',role:'夜班保安'}],stylePrompt:'冷灰蓝电影感'});
  assert.equal(b.cast[0].key,'A');assert.equal(b.style.prompt,'冷灰蓝电影感');assert.equal(b.confirmed,false);
  assert.equal(planningInput({text:'```json\n{"premiseZh":"中文概念"}\n```'}).premiseZh,'中文概念');
});
