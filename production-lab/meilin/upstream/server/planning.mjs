import {parseJson} from './llm.mjs';
const text=(v,max=12000)=>typeof v==='string'?v.trim().slice(0,max):'';
export const planningPrompts={
  brief:'请作为短剧立项编辑，根据下面的想法整理立项卡。管理说明用中文，英文台词要求保留。只返回 JSON：{"premise":"英文一句话","premiseZh":"中文一句话","genre":"中文题材","market":"目标市场","language":"台词语言及字幕要求","episodes":30,"episodeSeconds":90,"protagonist":"中文主角设定","questions":[]}。不要代替我确认立项。我的想法：',
  bible:'请根据下面立项起草剧集圣经。除英文片名 title、角色原名 name 和字母代号 key 外，说明全部用中文。不要改变目标市场或英文对白要求。只返回 JSON：{"title":"英文片名","titleZh":"中文片名","loglineZh":"中文故事主线","faces":"选角与身份规则（中文）","performance":"表演方式（中文）","rules":["中文红线"],"cast":[{"code":"@角色1","key":"A","name":"原名","zh":"中文名","age":"年龄","look":"中文外貌服装","role":"中文剧情定位"}]}。A、B、D…是人物，C留给摄影机。立项：'
};
export function planningInput(payload){
  const result=payload.text?parseJson(payload.text):payload.value;
  if(!result||typeof result!=='object'||Array.isArray(result))throw Error('请提供一个完整的立项或圣经对象');
  return result;
}
export function editBrief(d,value){
  const episodes=Math.round(Number(value.episodes??d.brief?.episodes??30)),seconds=Math.round(Number(value.episodeSeconds??d.brief?.episodeSeconds??90));
  if(!(episodes>=1&&episodes<=300&&seconds>=15&&seconds<=600))throw Error('集数须为1–300，单集时长须为15–600秒');
  const last=Math.max(0,...d.episodes.filter(e=>e.scripts?.sonnet||e.scripts?.aistudio||e.scripts?.upload||e.segments?.length||e.done).map(e=>e.n));
  if(episodes<last)throw Error(`第${last}集已经开始制作，请先处理后续剧集再减少集数`);
  const next={...d.brief};
  for(const key of ['premise','premiseZh','genre','market','language','protagonist'])if(value[key]!==undefined)next[key]=text(value[key]);
  if(!next.premiseZh)throw Error('请填写中文故事概念');
  next.idea=text(value.idea)||next.premiseZh;
  next.questions=Array.isArray(value.questions)?value.questions.slice(0,3).map((q,i)=>({id:text(q.id,40)||`q${i+1}`,q:text(q.q,500),options:(Array.isArray(q.options)?q.options:[]).slice(0,8).map(v=>text(v,500)),pick:Math.max(0,Math.round(Number(q.pick)||0))})):next.questions||[];
  return {...next,episodes,episodeSeconds:seconds,confirmed:false,sample:false};
}
export function editBible(d,value){
  const next={...d.bible};
  for(const key of ['title','titleZh','logline','loglineZh','faces','performance'])if(value[key]!==undefined)next[key]=text(value[key]);
  if(!next.titleZh||!next.loglineZh)throw Error('请填写中文片名和故事主线');
  if(value.rules!==undefined){if(!Array.isArray(value.rules))throw Error('红线须为列表');next.rules=value.rules.slice(0,30).map(v=>text(v,1200)).filter(Boolean);}
  if(value.cast!==undefined){
    if(!Array.isArray(value.cast)||value.cast.length>20)throw Error('主要角色最多20个');
    const used=new Set();
    next.cast=value.cast.map((c,i)=>{
      const old=d.bible?.cast?.find(v=>v.code===c.code),code=old?.code||text(c.code,40)||`@角色${i+1}`,key=old?.key||'ABDEFGHIJKLMNOPQRSTUVWXYZ'[i];
      if(used.has(code))throw Error('角色代号不能重复');used.add(code);
      const out={code,key};for(const field of ['name','zh','age','look','role'])out[field]=text(field==='age'&&typeof c[field]==='number'?String(c[field]):c[field],3000);
      if(!out.name&&!out.zh)throw Error('请填写角色姓名');return out;
    });
  }
  next.cast ||= [];next.rules ||= [];
  if(value.stylePrompt!==undefined){if(!text(value.stylePrompt))throw Error('画风规范不能为空');next.style={...next.style,prompt:text(value.stylePrompt,20000),source:'manual'};}
  return {...next,confirmed:false};
}
