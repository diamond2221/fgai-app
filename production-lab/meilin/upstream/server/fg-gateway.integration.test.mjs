import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {initializeMeilin,meilinInternalRoute,meilinHeaders} from '../../../yingce/gateway/fg-meilin.mjs';

process.env.MEILIN_INTERNAL_SECRET='test-gateway-only-32-byte-secret';
const actor=randomUUID(),stranger=randomUUID(),drama=randomUUID(),model='claude-sonnet-5-5-t3a',pg=new PGlite();
await pg.exec(`CREATE TABLE users(id varchar(36) PRIMARY KEY,display_name text,status text);
 CREATE TABLE fg_accounts(user_id varchar(36),email text,platform_role text);
 CREATE TABLE projects(id varchar(36) PRIMARY KEY);
 CREATE TABLE tasks(id varchar(36) PRIMARY KEY,user_id text,project_id text,input_json text,status text,result_json text);
 CREATE TABLE fg_meilin_dramas(id uuid PRIMARY KEY,owner_id text,deleted_at timestamptz);
 CREATE TABLE fg_meilin_members(drama_id uuid,user_id text,role text);
 CREATE TABLE fg_model_prices(model text,snapshot jsonb);
 CREATE TABLE channel_models(channel_id text,model_key text,enabled boolean,deleted_at timestamptz,protocol text);
 CREATE TABLE model_channels(id text,name text,enabled boolean,deleted_at timestamptz,api_format text);
 CREATE TABLE fg_company_settings(key text,value jsonb);
 CREATE TABLE fg_user_budgets(user_id text,monthly_cny numeric);
 CREATE TABLE canvas_projects(id text,project_id text,title text);
 CREATE TABLE fg_budget_reservations(id uuid,user_id text,project_id text,task_id text,reserved_cny numeric,created_at timestamptz);
 CREATE TABLE api_call_logs(id text,task_id text,user_id text,channel_id text,billable boolean,model text,capability text,status text,input_tokens bigint,output_tokens bigint,cached_tokens bigint,usage_available boolean,media_count integer,video_seconds numeric,request_body text,response_body text,cost_available boolean,estimated_cost_micros bigint,currency text,fg_fee_reference_id text,provider_request_id text,fg_budget_reservation_id text,created_at timestamptz,error_code text);
 CREATE TABLE fg_fee_matches(reference_id text,call_id text);
 CREATE TABLE fg_provider_fees(reference_id text,usd numeric,fx numeric);
 CREATE TABLE fg_request_decisions(call_id text);
 INSERT INTO fg_company_settings VALUES('usdCnyRate','7');
 INSERT INTO model_channels VALUES('channel','WeToken Test',true,NULL,'openai');`);
await pg.query("INSERT INTO users VALUES($1,'甲','active'),($2,'乙','active')",[actor,stranger]);await pg.query("INSERT INTO fg_accounts VALUES($1,'one@example.invalid','user'),($2,'two@example.invalid','user')",[actor,stranger]);await pg.query('INSERT INTO fg_meilin_dramas VALUES($1,$2,NULL)',[drama,actor]);
await pg.query("INSERT INTO channel_models VALUES('channel',$1,true,NULL,'openai')",[model]);await pg.query('INSERT INTO fg_model_prices VALUES($1,$2)',[model,{enabled:true,discount:1,pricing_rules:{currency:'USD',input_price:1,output_price:2}}]);
const pool={query:async(sql,args)=>{if(!args&&sql.includes(';')){await pg.exec(sql);return {rows:[],rowCount:0};}const r=await pg.query(sql,args);return {...r,rowCount:r.affectedRows??r.rows.length};},connect:async()=>({...pool,release(){}})};await initializeMeilin(pool);
let attempts=0,mode='normal';
const native=createServer(async(req,res)=>{
 const chunks=[];for await(const chunk of req)chunks.push(chunk);const input=JSON.parse(Buffer.concat(chunks).toString()||'{}'),owner=req.headers.cookie;
 const send=(status,data)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify({code:status===200?0:status,data,msg:status===200?'':'test rejection'}));};
 if(req.url==='/api/features')return send(200,{features:{meilinEnabled:true}});
 if(req.url==='/api/projects'){const id=randomUUID();await pg.query('INSERT INTO projects VALUES($1)',[id]);return send(200,{project:{id}});}
 if(req.url==='/api/tasks'&&req.method==='POST'){
  attempts++;if(mode==='reject')return send(402,null);
  const id=randomUUID();await pg.query('INSERT INTO tasks VALUES($1,$2,$3,$4,$5,$6)',[id,owner,input.projectId,JSON.stringify(input.input),'succeeded',JSON.stringify({text:'测试文本'})]);
  if(mode==='lost')return send(503,null);return send(200,{id});
 }
 const m=/^\/api\/tasks\/(.+)$/.exec(req.url);if(m){const t=(await pg.query('SELECT * FROM tasks WHERE id=$1',[m[1]])).rows[0];return send(200,{task:{id:t.id,status:t.status,resultJson:t.result_json}});}
 return send(404,null);
});await new Promise(r=>native.listen(0,'127.0.0.1',r));
const context={pool,web:new URL(`http://127.0.0.1:${native.address().port}`),publicOrigin:'http://127.0.0.1',canvasSession:async a=>a.id};
const gateway=createServer(async(req,res)=>{if(!await meilinInternalRoute(req,res,{...context,path:new URL(req.url,'http://local')})){res.writeHead(404);res.end();}});await new Promise(r=>gateway.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${gateway.address().port}`,call=async(action,payload={},who=actor,signed=true)=>{const path=`/internal/meilin/${who}/${drama}/${action}`,r=await fetch(base+path,{method:'POST',headers:{...(signed?meilinHeaders({id:who},'POST',path):{}),'content-type':'application/json'},body:JSON.stringify(payload)});return {status:r.status,body:await r.json()};};
const request=()=>({operationId:randomUUID(),kind:'text',model,payload:{messages:[{role:'user',content:'写剧本'}],max_tokens:100},metadata:{episodeId:'episode-1'}});
test.after(async()=>{await Promise.all([native,gateway].map(s=>new Promise(r=>s.close(r))));await pg.close();});

test('unsigned and foreign actors are rejected before native task submission',async()=>{const n=attempts;assert.equal((await call('submit',request(),actor,false)).status,400);assert.equal((await call('submit',request(),stranger)).status,400);assert.equal(attempts,n);});
test('native task admission is idempotent and mutated replays fail closed',async()=>{mode='normal';const input=request(),n=attempts,a=await call('submit',input),b=await call('submit',input);assert.equal(a.status,200);assert.equal(b.body.taskId,a.body.taskId);assert.equal(attempts,n+1);assert.equal((await call('submit',{...input,payload:{...input.payload,max_tokens:200}})).status,400);const task=await call('task',{taskId:a.body.taskId});assert.equal(task.body.result.text,'测试文本');});
test('lost admission response recovers the original FG task by stable metadata',async()=>{mode='lost';const input=request(),n=attempts;assert.equal((await call('submit',input)).status,400);mode='normal';const recovered=await call('submit',input);assert.equal(recovered.status,200);assert.ok(recovered.body.taskId);assert.equal(attempts,n+1);});
test('definite budget rejection releases only the unsent operation for a later retry',async()=>{mode='reject';const input=request(),n=attempts;assert.equal((await call('submit',input)).status,400);assert.equal((await pg.query('SELECT * FROM fg_meilin_calls WHERE operation_id=$1',[input.operationId])).rows.length,0);mode='normal';assert.equal((await call('submit',input)).status,200);assert.equal(attempts,n+2);});
test('dynamic model disabling prevents admission and cost SQL handles an empty ledger',async()=>{await pg.query('UPDATE channel_models SET enabled=false');const n=attempts;assert.equal((await call('submit',request())).status,400);assert.equal(attempts,n);await pg.query('UPDATE channel_models SET enabled=true');const costs=await call('costs');assert.equal(costs.status,200);assert.deepEqual(costs.body.calls,[]);});
test('costs match FG receipt settlement and never return raw provider payloads',async()=>{
 const task=(await pg.query('SELECT task_id FROM fg_meilin_calls WHERE task_id IS NOT NULL LIMIT 1')).rows[0].task_id;
 await pg.query(`INSERT INTO api_call_logs(id,task_id,user_id,channel_id,billable,model,capability,status,input_tokens,output_tokens,cached_tokens,usage_available,request_body,response_body,created_at) VALUES('call-one',$1,$2,'channel',true,$3,'text','succeeded',10,20,0,true,$4,'{}',now())`,[task,actor,model,'{"private":"not-a-real-secret-test-marker"}']);
 let data=(await call('costs')).body;assert.equal(data.calls.length,1);assert.equal(data.calls[0].settledCny,null);assert.ok(data.calls[0].estimatedCny>0);assert.equal(JSON.stringify(data).includes('not-a-real-secret-test-marker'),false);
 await pg.exec("INSERT INTO fg_provider_fees VALUES('receipt-one',0.1,7);INSERT INTO fg_fee_matches VALUES('receipt-one','call-one');");
 data=(await call('costs')).body;assert.equal(data.calls[0].settledCny,.7);
 await pg.exec("DELETE FROM fg_fee_matches;INSERT INTO fg_request_decisions VALUES('call-one');");data=(await call('costs')).body;assert.equal(data.calls[0].settledCny,0);
});
