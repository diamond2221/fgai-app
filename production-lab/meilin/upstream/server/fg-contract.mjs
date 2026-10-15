import {createHmac,createHash,timingSafeEqual} from 'node:crypto';
export const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const mac=(secret,value)=>createHmac('sha256',secret).update(value).digest('hex');
export function signIdentity(actor,method,path,secret,now=Date.now()) {
 if(!secret||!uuid.test(actor?.id))throw Error('美林内部身份未配置');
 const encoded=Buffer.from(JSON.stringify(actor)).toString('base64url'),time=String(now);
 return {'x-fg-meilin-actor':encoded,'x-fg-meilin-time':time,'x-fg-meilin-signature':mac(secret,[encoded,time,method,path].join('\n'))};
}
export function readIdentity(headers,method,path,secret,now=Date.now()) {
 const encoded=headers['x-fg-meilin-actor'],time=headers['x-fg-meilin-time'],given=headers['x-fg-meilin-signature'];
 if(!secret||typeof encoded!=='string'||!/^\d+$/.test(time||'')||Math.abs(now-Number(time))>60000||!/^[a-f0-9]{64}$/.test(given||''))throw Error('请通过 FG 登录入口访问美林');
 const expected=mac(secret,[encoded,time,method,path].join('\n'));
 if(!timingSafeEqual(Buffer.from(given),Buffer.from(expected)))throw Error('美林内部身份无效');
 const actor=JSON.parse(Buffer.from(encoded,'base64url').toString());
 if(!uuid.test(actor.id))throw Error('美林账号无效');
 return actor;
}
const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
export const operationDigest = value=>createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
export function validateMedia(model,request) {
 if(!model||model.capability!==request.kind)throw Error('模型未启用或类型不匹配');
 const p=model.cap[request.kind],refs=request.references||[],o=request.params||{};
 for(const [kind,key] of [['image','maxImages'],['video','maxVideos'],['audio','maxAudios']])if(refs.filter(r=>r.kind===kind).length>(p.references?.[key]||0))throw Error('参考素材数量超过模型上限');
 if(refs.some(r=>!['image','video','audio'].includes(r.kind)))throw Error('参考素材类型无效');
 if(request.kind==='video'&&(!p.duration.values.includes(Number(o.duration))||!p.ratios.includes(o.ratio)||!p.resolutions.some(r=>r.toLowerCase()===String(o.resolution).toLowerCase())))throw Error('模型不支持当前时长、画幅或分辨率');
 if(request.kind==='image'&&(!p.size.values.includes(o.size)&&!p.size.allowCustom))throw Error('模型不支持当前图片尺寸');
}
export function validateRelativeFile(file) {
 if(!/^[a-f0-9-]{36}\.(?:png|jpe?g|webp|gif|mp4|mov|mp3|wav|m4a|ogg|flac|txt|md|docx|srt|fountain)$/i.test(file))throw Error('文件标识无效');
 return file;
}
