// Local-only acceptance fixture: the real FG application with ephemeral Postgres
// and fixed, free company-service responses. Never included in runtime images.
import {PGlite} from '@electric-sql/pglite';
import {createServer,request} from 'node:http';
import {pipeline} from 'node:stream';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
process.env.MEILIN_MODE='fg';process.env.MEILIN_NO_LISTEN='1';process.env.MEILIN_INTERNAL_SECRET='only-local-free-preview-secret';
const temp=await mkdtemp(join(tmpdir(),'meilin-preview-'));process.env.MEILIN_FILES_DIR=temp;
const {MODELS}=await import('../server/models.mjs'),{runContext}=await import('../server/fg-context.mjs'),{signIdentity,readIdentity}=await import('../server/fg-contract.mjs'),db=await import('../server/fg-store.mjs'),brain=await import('../server/brain.mjs'),production=await import('../server/fg-production.mjs'),{createMeilinServer,recover}=await import('../server/fg-server.mjs');
const actor={id:'72f7e666-928a-4b00-8b01-a49fbf07683b',name:'免费验收成员'},pg=new PGlite();await pg.exec('CREATE TABLE users(id varchar(36) PRIMARY KEY);');await pg.query('INSERT INTO users VALUES($1)',[actor.id]);
const pool={query:async(sql,args)=>{if(!args&&sql.includes(';')){await pg.exec(sql);return {rows:[],rowCount:0};}const r=await pg.query(sql,args);return {...r,rowCount:r.affectedRows??r.rows.length};},connect:async()=>({...pool,release(){}})};await db.initialize(pool);
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64'),tasks=new Map();let submits=0;
const company=createServer(async(req,res)=>{const chunks=[];for await(const c of req)chunks.push(c);const input=JSON.parse(Buffer.concat(chunks).toString()||'{}');readIdentity(req.headers,req.method,req.url,process.env.MEILIN_INTERNAL_SECRET);const action=req.url.split('/').at(-1);let data;
 if(action==='catalog')data={models:MODELS,budget:{monthlyCny:100,usedCny:0,remainingCny:100,unknown:0}};
 if(action==='quote')data={estimatedCny:.2251,lines:['测试报价 ¥0.2251 / 张'],notes:['免费验收替身，不扣费。正式环境以 FG 账本核销。'],budget:{monthlyCny:100,remainingCny:100}};
 if(action==='submit'){submits++;const id=tasks.get(input.operationId)||randomUUID();tasks.set(input.operationId,id);data={taskId:id,status:'queued'};}
 if(action==='task')data={taskId:input.taskId,status:'succeeded',result:{resourceId:'test',url:'/api/fg/meilin/dramas/'+req.url.split('/')[4]+'/media/'+input.taskId}};
 if(action==='costs')data={calls:[],budget:{monthlyCny:100,usedCny:0,remainingCny:100,unknown:0}};
 res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(data));});await new Promise(r=>company.listen(0,'127.0.0.1',r));process.env.MEILIN_GATEWAY_URL=`http://127.0.0.1:${company.address().port}`;
await runContext({actor,models:MODELS},async()=>{const d=brain.createDrama();d.title='美林接入免费验收项目';d.titleZh=d.title;d.stage='ready';d.brief={episodes:3,episodeSeconds:60,premiseZh:'隔离的免费验收示例',confirmed:true};d.bible={title:d.title,titleZh:d.title,cast:[],confirmed:true,style:{title:'电影写实',prompt:'自然光，保留材质细节',palette:['#8799a1','#e1cdb0'],references:[]}};brain.ep(d,1);
 d.assets.items=[{code:'@场景1',kind:'scene',name:'酒店宴会厅',prompt:'无人宴会厅，暖色吊灯，真实大理石材质',status:'rendering',realPending:true,current:'v1',versions:[{id:'v1',model:'dola-seedream-5-0-pro-260628',prompt:'无人宴会厅，暖色吊灯，真实大理石材质。全剧画风：电影写实。',url:null}],scope:'drama',palette:['#e1cdb0','#8799a1']}];await db.save(d);
 await runContext({actor,models:MODELS,dramaId:d.id},()=>production.prepare(d,[{type:'image',code:'@场景1',version:'v1',model:'dola-seedream-5-0-pro-260628',params:{size:'2048x2048'},prompt:d.assets.items[0].prompt}]));await db.save(d);
});
const app=createMeilinServer();await new Promise(r=>app.listen(0,'127.0.0.1',r));
const front=createServer((req,res)=>{
 if(req.url==='/__proof'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({paidCalls:0,fixtureSubmissions:submits}));return;}
 if(req.url.includes('/media/')){res.writeHead(200,{'content-type':'image/png'});res.end(png);return;}
 const path=req.url.startsWith('/fg-six/api/fg/meilin/')?req.url.replace('/fg-six/api/fg/meilin','/api'):req.url.replace(/^\/fg-six\/meilin-app/,'')||'/';
 const headers={...signIdentity(actor,req.method,path,process.env.MEILIN_INTERNAL_SECRET)};for(const key of ['content-type','content-length','x-fg-operation-id','range'])if(req.headers[key])headers[key]=req.headers[key];
 const remote=request(`http://127.0.0.1:${app.address().port}${path}`,{method:req.method,headers},r=>{res.writeHead(r.statusCode,r.headers);pipeline(r,res,()=>{});});remote.on('error',()=>{res.writeHead(502);res.end();});pipeline(req,remote,()=>{});
});await new Promise(r=>front.listen(5431,'127.0.0.1',r));const interval=setInterval(()=>recover().catch(e=>console.error(e.message)),1500);
console.log('FREE fixture http://127.0.0.1:5431/fg-six/meilin-app/');
const close=async()=>{clearInterval(interval);await Promise.all([front,app,company].map(s=>new Promise(r=>s.close(r))));await pg.close();await rm(temp,{recursive:true,force:true});process.exit(0);};process.on('SIGINT',close);process.on('SIGTERM',close);
