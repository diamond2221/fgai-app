import {useEffect,useRef,useState} from 'react';
import {Alert,Button,Input,Radio,Space,Typography} from 'antd';
import {AppModal} from '@/components/ui/product/app-modal';
import {createMusicJob,musicJob,musicJobAccess,type MusicJob} from '@/services/api/fg-speech';
import {resolveResourceAccessURL} from '@/services/api/resources';
import type {CanvasNodeMetadata} from '@/types/canvas';

export function FGCanvasMusic({prompt,jobId,onChange}:{prompt:string;jobId?:string;onChange:(patch:Partial<CanvasNodeMetadata>)=>void}){
 const [open,setOpen]=useState(false),[description,setDescription]=useState(prompt),[voice,setVoice]=useState('instrumental'),[job,setJob]=useState<MusicJob>(),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const operation=useRef(crypto.randomUUID());
 useEffect(()=>{if(!open||!jobId)return;let live=true;const update=async()=>{try{const data=await musicJob(jobId);if(live){setJob(data);setError('');}}catch(cause){if(live)setError(cause instanceof Error?cause.message:'音乐进度暂不可用');}};void update();const timer=setInterval(()=>void update(),15000);return()=>{live=false;clearInterval(timer);};},[open,jobId]);
 async function submit(){setBusy(true);setError('');try{const created=await createMusicJob({operationId:operation.current,model:'auto',mode:'inspiration',voice,description,title:'画布音乐'});setJob(created);onChange({fgMusicJobId:created.id});}catch(cause){setError(cause instanceof Error?cause.message:'音乐提交未完成，请查看原任务');}finally{setBusy(false);}}
 async function attach(){if(!job?.resourceId)return;setBusy(true);setError('');try{const access=await musicJobAccess(job.id);onChange({content:resolveResourceAccessURL(access.url),storageKey:'resource:'+job.resourceId,status:'success',mimeType:'audio/mpeg'});setOpen(false);}catch(cause){setError(cause instanceof Error?cause.message:'音乐暂不能添加');}finally{setBusy(false);}}
 return <><Button size="small" onClick={()=>{if(!jobId)setDescription(prompt);setOpen(true);}}>Suno 音乐{jobId?' · 进度':''}</Button>
 <AppModal open={open} onCancel={()=>setOpen(false)} title="画布音乐 · Suno" width={640} footer={job?.resourceId?<Button type="primary" loading={busy} onClick={()=>void attach()}>添加到此音频节点</Button>:jobId?<Button onClick={()=>setOpen(false)}>关闭，保留原任务</Button>:<Button type="primary" disabled={!description.trim()} loading={busy} onClick={()=>void submit()}>提交公司音乐制作</Button>}>
 <Space orientation="vertical" style={{width:'100%'}} size="middle"><Typography.Paragraph type="secondary">描述音乐风格、乐器、情绪与节奏。管理员在公司 Suno 账号完成验证码和制作，归档后可在这里添加到当前画布。</Typography.Paragraph>
 {error&&<Alert type="error" title={error}/>}
 {jobId?<Alert type={job?.status==='succeeded'?'success':'info'} title={job?.status==='succeeded'?'音乐已保存，可以添加到画布':job?.status==='importing'?'正在归档作品':job?.status==='processing'?'管理员正在处理原任务':'已提交，等待管理员制作'} description={`任务编号：${jobId}。关闭页面后仍会保留，请勿重复提交。`}/>:<><Radio.Group value={voice} onChange={event=>setVoice(event.target.value)} options={[{value:'instrumental',label:'纯音乐'},{value:'song',label:'带人声歌曲'}]}/><Input.TextArea aria-label="画布音乐描述" value={description} onChange={event=>setDescription(event.target.value)} maxLength={3000} showCount rows={6}/></>}
 {job&&<Typography.Paragraph style={{whiteSpace:'pre-wrap'}}>{job.brief.description}</Typography.Paragraph>}
 <Button href="/fg-six/fg-audio-tools?tab=music" target="_blank" rel="noopener noreferrer">打开音乐队列与歌词编辑</Button></Space>
 </AppModal></>;
}
