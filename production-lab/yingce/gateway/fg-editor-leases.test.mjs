import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {guardEditorWrite} from './fg-editor-leases.mjs';

function fixture({ownerRole='user',managerRole='superadmin',actorID='admin'}={}){
 const queries=[];let released=0;
 const client={release(){released++;},async query(sql,args){queries.push(sql);
  if(sql.includes('SELECT * FROM fg_editor_leases'))return {rows:[{resource_key:'canvas:document',actor_id:'member',expires_at:new Date(Date.now()+45000)}]};
  if(sql.includes('JOIN fg_accounts owner'))return {rows:['user','member'].includes(ownerRole)&&managerRole==='superadmin'?[{id:'document'}]:[]};
  return {rows:[]};
 }};
 const pool={async connect(){return client;},async query(){return {rows:[{display_name:'普通成员'}]};}};
 const res=new EventEmitter();res.statusCode=200;res.writeHead=(status)=>{res.statusCode=status;};res.end=()=>{};
 return {queries,pool,res,actor:{id:actorID,reviewer:true},path:new URL('https://fg.test/api/canvas-projects/document'),get released(){return released;}};
}
const request={method:'DELETE',headers:{}};
test('administrator deletes member canvas despite a live member editor, then revokes lease',async()=>{
 const f=fixture();assert.equal(await guardEditorWrite(request,f.res,f),true);f.res.emit('finish');
 await new Promise(resolve=>setImmediate(resolve));
 assert(f.queries.some(q=>q.startsWith('DELETE FROM fg_editor_leases')));assert(f.queries.includes('COMMIT'));assert.equal(f.released,1);
 f.res.emit('close');assert.equal(f.released,1);
});
test('another administrator private canvas remains protected by its live editor',async()=>{
 const f=fixture({ownerRole:'superadmin'});assert.equal(await guardEditorWrite(request,f.res,f),false);assert.equal(f.res.statusCode,409);assert(f.queries.includes('ROLLBACK'));assert.equal(f.released,1);
});
test('revoked administrator role cannot bypass a live lease with a stale reviewer flag',async()=>{
 const f=fixture({managerRole:'user'});assert.equal(await guardEditorWrite(request,f.res,f),false);assert.equal(f.res.statusCode,409);
});
test('failed backend deletion retains the original editor lease',async()=>{
 const f=fixture();assert.equal(await guardEditorWrite(request,f.res,f),true);f.res.statusCode=500;f.res.emit('finish');await new Promise(resolve=>setImmediate(resolve));assert(f.queries.includes('ROLLBACK'));assert(!f.queries.includes('COMMIT'));assert(!f.queries.some(q=>q.startsWith('DELETE FROM fg_editor_leases')));
});
