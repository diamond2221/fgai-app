import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';

function brokerMove(name,operation,action='archive',record){
 const script=`const input=JSON.parse(await new Promise(resolve=>{let s='';process.stdin.on('data',x=>s+=x);process.stdin.on('end',()=>resolve(s));}));const r=await fetch('http://fg-gateway:3010/internal/creator/'+process.env.FG_CREATOR_ACTOR+'/archive',{method:'POST',headers:{authorization:'Bearer '+process.env.FG_CREATOR_CAPABILITY,'content-type':'application/json'},body:JSON.stringify(input),signal:AbortSignal.timeout(120000)});const result=await r.json();if(!r.ok||result.operation!==input.operation)throw Error('NAS 工程归档未完成');process.stdout.write(result.operation);`;
 const result=execFileSync(process.execPath,['--input-type=module','-e',script],{input:JSON.stringify({name,operation,action,record}),encoding:'utf8',timeout:125000,stdio:['pipe','pipe','pipe'],maxBuffer:16384});
 if(result!==operation)throw Error('NAS 工程归档尚未确认');
}
export function restoreDirectory(source,destination){
 if(process.env.FG_CREATOR_ACTOR&&process.env.FG_CREATOR_CAPABILITY)brokerMove(path.basename(source),path.basename(destination),'restore');
 else fs.cpSync(destination,source,{recursive:true,dereference:false,verbatimSymlinks:true});
}

function inventory(root){
 const result=[];
 function visit(folder){for(const name of fs.readdirSync(folder).sort()){
  const file=path.join(folder,name),stat=fs.lstatSync(file),relative=path.relative(root,file);
  if(stat.isSymbolicLink())result.push([relative,'link',fs.readlinkSync(file)]);
  else if(stat.isDirectory()){result.push([relative,'dir']);visit(file);}
  else if(stat.isFile()){
   const hash=createHash('sha256'),fd=fs.openSync(file,'r'),buffer=Buffer.alloc(1024*1024);
   try{let count;while((count=fs.readSync(fd,buffer))>0)hash.update(buffer.subarray(0,count));}finally{fs.closeSync(fd);}
   result.push([relative,'file',hash.digest('hex')]);
  }else throw Error('工程包含不能归档的特殊文件');
 }}visit(root);return JSON.stringify(result);
}
export function archiveDirectory(folder,recycle='/fg-recycle',record){
 if(fs.lstatSync(recycle).isSymbolicLink()||!fs.lstatSync(recycle).isDirectory()||fs.readFileSync(path.join(recycle,'.fg-recycle-ready'),'utf8')!=='FG actor recycle v1\n')throw Error('NAS recycle/opencreator 未就绪，原工程仍保留');
 if(process.env.FG_CREATOR_ACTOR&&process.env.FG_CREATOR_CAPABILITY){const operation=randomUUID().replaceAll('-','');brokerMove(path.basename(folder),operation,'archive',record);return path.join(recycle,operation);}
 const name=path.basename(folder)+'-'+randomUUID(),temporary=path.join(recycle,'.pending-'+name),destination=path.join(recycle,name),before=inventory(folder);
 // Separate bind mounts cannot be renamed across. Verify the copy before
 // removing the actor-owned source directory; never follow archived links.
 fs.cpSync(folder,temporary,{recursive:true,dereference:false,verbatimSymlinks:true,errorOnExist:true,force:false});
 if(inventory(temporary)!==before||inventory(folder)!==before)throw Error('NAS 工程归档校验失败，原工程仍保留');
 if(record)fs.writeFileSync(path.join(temporary,'.fg-project-record.json'),JSON.stringify(record),{flag:'wx',mode:0o600});
 fs.renameSync(temporary,destination);
 try{fs.rmSync(folder,{recursive:true,force:false});}catch(error){fs.cpSync(destination,folder,{recursive:true,dereference:false,verbatimSymlinks:true});throw error;}
 return destination;
}
