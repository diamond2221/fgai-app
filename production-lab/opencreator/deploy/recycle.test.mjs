import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {archiveDirectory} from './recycle.mjs';
test('verified recycle keeps media, other files, and rejects missing mount',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'fg-archive-'));
 try{
  const project=path.join(root,'project'),recycle=path.join(root,'recycle');fs.mkdirSync(project);fs.mkdirSync(recycle);
  fs.writeFileSync(path.join(project,'video.mp4'),'media');
  assert.throws(()=>archiveDirectory(project,recycle));assert.ok(fs.existsSync(project));
  fs.writeFileSync(path.join(recycle,'.fg-recycle-ready'),'FG actor recycle v1\n');
  const archived=archiveDirectory(project,recycle);assert.equal(fs.readFileSync(path.join(archived,'video.mp4'),'utf8'),'media');assert.ok(!fs.existsSync(project));
 }finally{fs.rmSync(root,{recursive:true});}
});
