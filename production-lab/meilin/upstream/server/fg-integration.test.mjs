import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {createServer} from 'node:http';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';

process.env.MEILIN_MODE='fg';process.env.MEILIN_NO_LISTEN='1';process.env.MEILIN_INTERNAL_SECRET='test-only-local-identity-secret';
const temp=await mkdtemp(join(tmpdir(),'meilin-fg-test-'));process.env.MEILIN_FILES_DIR=temp;
const {capabilities}=await import('./fg/fg-model-capabilities.mjs');
const {runContext}=await import('./fg-context.mjs');
const contract=await import('./fg-contract.mjs');
const store=await import('./fg-store.mjs');
const brain=await import('./brain.mjs');
const production=await import('./fg-production.mjs');
const {createMeilinServer}=await import('./fg-server.mjs');
const actor={id:'72f7e666-928a-4b00-8b01-a49fbf07683b',name:'甲'},other={id:'82f7e666-928a-4b00-8b01-a49fbf07683b',name:'乙'};
const image='dola-seedream-5-0-pro-260628';
const models=[{id:'claude-sonnet-5-5-t3a',label:'Text',capability:'text',default:true,cap:capabilities({id:'claude-sonnet-5-5-t3a',capability:'text',protocol:'openai'})},{id:image,label:'Image',capability:'image',default:true,cap:capabilities({id:image,capability:'image',protocol:'ark'})},{id:'dreamina-seedance-2-5-filter-off',label:'Video',capability:'video',default:true,cap:capabilities({id:'dreamina-seedance-2-5-filter-off',capability:'video',protocol:'ark'})}];
const memory=new PGlite();await memory.exec('CREATE TABLE users(id varchar(36) PRIMARY KEY);');await memory.query('INSERT INTO users VALUES($1),($2)',[actor.id,other.id]);
const pool={query:async(sql,values)=>{if(!values&&sql.includes(';')){await memory.exec(sql);return {rows:[],rowCount:0};}const r=await memory.query(sql,values);return {...r,rowCount:r.affectedRows??r.rows.length};},connect:async()=>({...pool,release(){}})};
await store.initialize(pool);
let submissions=0,polls=0,unavailable=false;
const tasks=new Map();
const upstream=createServer(async(req,res)=>{const chunks=[];for await(const c of req)chunks.push(c);const input=JSON.parse(Buffer.concat(chunks).toString()||'{}'),action=req.url.split('/').at(-1);contract.readIdentity(req.headers,req.method,req.url,process.env.MEILIN_INTERNAL_SECRET);
 let data;if(action==='catalog')data={models,budget:{monthlyCny:10,usedCny:0,remainingCny:10,unknown:0}};
 if(action==='quote')data={estimatedCny:.2,lines:['¥0.2'],notes:['待核销'],budget:{monthlyCny:10,remainingCny:10}};
 if(action==='submit'){if(unavailable){res.writeHead(503,{'content-type':'application/json'});res.end(JSON.stringify({error:'等待恢复'}));return;}let task=tasks.get(input.operationId);if(!task){submissions++;task={taskId:randomUUID(),status:'running'};tasks.set(input.operationId,task);}data=task;}
 if(action==='task'){polls++;data={taskId:input.taskId,status:'succeeded',result:{resourceId:'resource-test',url:'/api/fg/meilin/dramas/test/media/test',text:'测试文本'}};}
 if(action==='costs')data={calls:[],budget:{monthlyCny:10,remainingCny:10}};
 res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(data));});
await new Promise(r=>upstream.listen(0,'127.0.0.1',r));process.env.MEILIN_GATEWAY_URL=`http://127.0.0.1:${upstream.address().port}`;
const app=createMeilinServer();await new Promise(r=>app.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.address().port}`;
test.after(async()=>{await Promise.all([new Promise(r=>app.close(r)),new Promise(r=>upstream.close(r))]);await memory.close();await rm(temp,{recursive:true,force:true});});
const scoped=(who,fn,id)=>runContext({actor:who,models,dramaId:id||randomUUID()},fn);

test('Postgres enforces ownership, sharing roles, revisions and soft deletion',async()=>{
 let d;await scoped(actor,async()=>{d=brain.createDrama();await store.save(d);});
 await scoped(other,async()=>{assert.equal(await store.get(d.id),null);assert.equal((await store.list()).length,0);assert.equal(await store.fileAccess('missing.png'),false);});
 await scoped(actor,()=>store.members(d.id,{userId:other.id,role:'viewer'}));
 await scoped(other,async()=>{assert.ok(await store.get(d.id));await assert.rejects(store.get(d.id,true),/编辑权限/);await assert.rejects(store.remove(d.id),/所有者/);});
 await scoped(actor,()=>store.members(d.id,{userId:other.id,role:'editor'}));
 await scoped(other,async()=>{const a=await store.get(d.id,true),b=await store.get(d.id,true);a.title='协作';await store.save(a);await assert.rejects(store.save(b),/更新/);});
 await scoped(actor,async()=>{await store.remove(d.id);assert.equal(await store.get(d.id),null);});
});
test('quote cancellation creates no task, expiry and tampering cannot confirm',async()=>{
 await scoped(actor,async()=>{const d=brain.createDrama();d.assets.items=[{code:'@场景1',versions:[{id:'v'}],current:'v',status:'rendering'}];
 await production.prepare(d,[{type:'image',code:'@场景1',version:'v',model:image,params:{size:'2048x2048'},prompt:'房间'}]);
 const op=d.production[0],before=submissions;
 await assert.rejects(production.confirm(d,[op.id],{[op.id]:'bad'}),/变化/);
 const old=op.quotedAt;op.quotedAt=0;await assert.rejects(production.confirm(d,[op.id],{[op.id]:op.digest}),/过期/);op.quotedAt=old;
 production.cancel(d,[op.id]);await production.refresh(d);assert.equal(submissions,before);assert.equal(d.assets.items[0].status,'draft');
 });
});
test('confirmed operations survive document reload, reuse task ID and update only their target version',async()=>{
 let d;await scoped(actor,async()=>{d=brain.createDrama();d.assets.items=[{code:'@场景1',versions:[{id:'v1'},{id:'v2'}],current:'v2',status:'draft'}];
 await production.prepare(d,[{type:'image',code:'@场景1',version:'v1',model:image,params:{size:'2048x2048'},prompt:'房间'}]);const op=d.production[0];await production.confirm(d,[op.id],{[op.id]:op.digest});await store.save(d);
 });
 await scoped(actor,async()=>{const loaded=await store.get(d.id),before=submissions;await production.refresh(loaded);assert.equal(submissions,before+1);assert.ok(loaded.production[0].taskId);await production.refresh(loaded);assert.equal(submissions,before+1);assert.equal(loaded.assets.items[0].current,'v2');assert.ok(loaded.assets.items[0].versions[0].url);assert.equal(loaded.assets.items[0].status,'draft');},d.id);
});
test('HTTP denies unsigned reads and media, signed configuration contains no credentials',async()=>{
 assert.equal((await fetch(base+'/api/dramas')).status,403);assert.equal((await fetch(base+'/files/test.png')).status,403);
 const path='/api/config',r=await fetch(base+path,{headers:contract.signIdentity(actor,'GET',path,process.env.MEILIN_INTERNAL_SECRET)});assert.equal(r.status,200);const c=await r.json();assert.equal(c.media,'fg-tasks');assert.equal(c.models.length,3);assert.equal(JSON.stringify(c).includes(process.env.MEILIN_INTERNAL_SECRET),false);
});
test('creation replay uses the same project ID and another account cannot read it',async()=>{
 const id=randomUUID(),headers={...contract.signIdentity(actor,'POST','/api/dramas',process.env.MEILIN_INTERNAL_SECRET),'x-fg-operation-id':id,'content-type':'application/json'};
 const a=await fetch(base+'/api/dramas',{method:'POST',headers,body:'{}'});assert.equal(a.status,200);assert.equal((await a.json()).id,id);
 const b=await fetch(base+'/api/dramas',{method:'POST',headers,body:'{}'});assert.equal(b.status,200);assert.equal((await b.json()).id,id);
 const path='/api/dramas/'+id;assert.equal((await fetch(base+path,{headers:contract.signIdentity(other,'GET',path,process.env.MEILIN_INTERNAL_SECRET)})).status,404);
});
