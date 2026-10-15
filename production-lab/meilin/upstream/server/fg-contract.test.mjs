import test from 'node:test';
import assert from 'node:assert/strict';
import {signIdentity,readIdentity,operationDigest,validateMedia,validateRelativeFile} from './fg-contract.mjs';

const secret='test-only-secret-32-bytes-long-unused';
const actor={id:'72f7e666-928a-4b00-8b01-a49fbf07683b',name:'成员甲'};
test('internal identity rejects forged, expired and path-replayed requests',()=>{
 const headers=signIdentity(actor,'GET','/api/dramas',secret,100000);
 assert.deepEqual(readIdentity(headers,'GET','/api/dramas',secret,100001),actor);
 for(const [method,path,time] of [['POST','/api/dramas',100001],['GET','/api/config',100001],['GET','/api/dramas',200001]])assert.throws(()=>readIdentity(headers,method,path,secret,time));
 assert.throws(()=>readIdentity({...headers,'x-fg-meilin-actor':Buffer.from(JSON.stringify({...actor,id:'other'})).toString('base64url')},'GET','/api/dramas',secret,100001));
 assert.throws(()=>readIdentity(headers,'GET','/api/dramas','',100001));
});
test('confirmation digest binds ordered references, model, prompt, params and target version',()=>{
 const x={model:'a',prompt:'a',references:['r1','r2'],target:'version-1',params:{size:'16:9'}};
 assert.equal(operationDigest(x),operationDigest({...x}));
 for(const changes of [{model:'b'},{prompt:'b'},{references:['r2','r1']},{target:'version-2'},{params:{size:'9:16'}}])assert.notEqual(operationDigest(x),operationDigest({...x,...changes}));
});
test('model reference bounds, supported duration and declared ratios fail closed',()=>{
 const m={capability:'video',cap:{video:{references:{maxImages:30,maxVideos:0,maxAudios:0},duration:{values:[5,10,15]},ratios:['16:9'],resolutions:['720P']}}};
 assert.doesNotThrow(()=>validateMedia(m,{kind:'video',params:{duration:15,ratio:'16:9',resolution:'720p'},references:Array(30).fill({kind:'image'})}));
 for(const v of [{params:{duration:16,ratio:'16:9',resolution:'720p'}},{references:Array(31).fill({kind:'image'})},{references:[{kind:'audio'}]},{params:{duration:15,ratio:'9:16',resolution:'720p'}}])assert.throws(()=>validateMedia(m,{kind:'video',params:{duration:15,ratio:'16:9',resolution:'720p'},references:[],...v}));
 assert.throws(()=>validateMedia(undefined,{}));
});
test('uploaded file identifiers do not permit traversal or active content',()=>{
 assert.equal(validateRelativeFile('82b7e666-928a-4b00-8b01-a49fbf07683b.png'),'82b7e666-928a-4b00-8b01-a49fbf07683b.png');
 for(const p of ['../other/file.png','/etc/passwd','file.html','x.svg','x\\y.png','%2e%2e%2ffile.png'])assert.throws(()=>validateRelativeFile(p));
});
