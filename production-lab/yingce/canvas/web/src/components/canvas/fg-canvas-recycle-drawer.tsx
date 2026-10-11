import {useState} from "react";
import {useQuery,useQueryClient} from "@tanstack/react-query";
import {App,Alert,Button,Drawer,Table} from "antd";
import {RotateCcw} from "lucide-react";
import dayjs from "dayjs";
import {http} from "@/services/api/request";
import {useUserStore} from "@/stores/use-user-store";
type RecycledCanvas={id:string;title:string;userId:string;deletedAt:string};
export function FGCanvasRecycleDrawer({open,onClose}:{open:boolean;onClose:()=>void}){
 const {message}=App.useApp();const cache=useQueryClient();const [restoring,setRestoring]=useState<string[]>([]);
 const userId=useUserStore(s=>s.user?.id);const isAdmin=useUserStore(s=>s.user?.role==="admin");
 const query=useQuery({queryKey:["fg-canvas-recycle",userId],queryFn:()=>http.get<{projects:RecycledCanvas[]}>("/canvas-projects/recycle"),enabled:open&&Boolean(userId)});
 const owners=useQuery({queryKey:["fg-canvas-owners",userId],queryFn:()=>http.get<{owners:{id:string;name:string}[]}>("/fg/canvas/owners"),enabled:open&&isAdmin});
 async function restore(id:string){setRestoring(values=>[...values,id]);try{await http.post("/canvas-projects/"+encodeURIComponent(id)+"/restore");await Promise.all([query.refetch(),cache.invalidateQueries({queryKey:["canvas-library"]}),cache.invalidateQueries({queryKey:["fg-canvas-owners"]})]);void message.success("画布已恢复，原分享链接保持失效");}catch(error){void message.error(error instanceof Error?error.message:"恢复失败");}finally{setRestoring(values=>values.filter(value=>value!==id));}}
 return <Drawer title="画布回收站" open={open} onClose={onClose} size="large" destroyOnHidden>
  <p className="text-sm text-muted-foreground mb-6">移入回收站的画布保留节点、连线、历史和原素材引用，可以在这里恢复。这里保存的是画布记录，与 NAS 的 #recycle 文件回收站分开。</p>
  {query.isError&&<Alert type="error" showIcon title={query.error.message} action={<Button onClick={()=>void query.refetch()}>重试</Button>}/>}
  <Table<RecycledCanvas> rowKey="id" size="middle" loading={query.isFetching} dataSource={query.data?.projects||[]} pagination={{pageSize:20,showSizeChanger:false}} scroll={{x:580}} locale={{emptyText:"回收站是空的"}} columns={[
   {title:"画布",dataIndex:"title",ellipsis:true},
   {title:"所属用户",width:150,render:(_,row)=>row.userId===userId?"我":owners.data?.owners.find(owner=>owner.id===row.userId)?.name||"普通用户"},
   {title:"删除时间",width:155,render:(_,row)=>dayjs(row.deletedAt).format("MM/DD HH:mm")},
   {title:"",width:95,render:(_,row)=><Button size="small" icon={<RotateCcw size={13}/>} loading={restoring.includes(row.id)} onClick={()=>void restore(row.id)}>恢复</Button>}
  ]}/>
 </Drawer>;
}
