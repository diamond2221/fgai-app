import {mkdtemp,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,relative} from 'node:path';
const dir=await mkdtemp(join(tmpdir(),'meilin-smoke-'));
process.env.MEILIN_MODE='mock';process.env.FG_DIRECTOR_PORT='0';
process.env.FG_DIRECTOR_DATA=join(dir,'dramas');process.env.MEILIN_FILES_DIR=join(dir,'files');
const {server}=await import('../server/index.mjs');
try{
 if(!server.listening)await new Promise(r=>server.once('listening',r));
 process.env.FG_DIRECTOR_URL=`http://127.0.0.1:${server.address().port}`;
 await import('./smoke.mjs');
 if((await readdir(process.env.FG_DIRECTOR_DATA)).some(f=>f.endsWith('.json')))throw Error('测试项目未清空');
}finally{
 await new Promise(r=>server.close(r));
 const rel=relative(resolve(tmpdir()),resolve(dir));if(rel.startsWith('..')||!rel.startsWith('meilin-smoke-'))throw Error('测试目录边界无效');
 await rm(dir,{recursive:true,force:true});
}
