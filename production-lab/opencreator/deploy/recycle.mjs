import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';

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
