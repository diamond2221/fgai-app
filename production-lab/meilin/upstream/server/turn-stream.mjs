// Only expose the conversational reply while JSON actions remain uncommitted.
export function visibleReply(text) {
 const match=/"reply"\s*:\s*"/.exec(text);
 if(!match)return /^[\s]*[\[{`]/.test(text)?'':text;
 let out='';const start=match.index+match[0].length;
 for(let i=start;i<text.length;i++){
  const ch=text[i];if(ch==='"')break;
  if(ch!=='\\'){out+=ch;continue;}
  const next=text[++i];if(next===undefined)break;
  if(next==='u'){const hex=text.slice(i+1,i+5);if(!/^[a-f0-9]{4}$/i.test(hex))break;out+=String.fromCharCode(parseInt(hex,16));i+=4;}
  else out+=({n:'\n',r:'\r',t:'\t',b:'\b',f:'\f'}[next]??next);
 }
 return out;
}
