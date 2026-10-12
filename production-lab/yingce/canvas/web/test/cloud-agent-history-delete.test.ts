import { beforeEach, afterEach, expect, test } from 'bun:test';
import localforage from 'localforage';
import { deleteCloudAgentConversation, loadCloudAgentConversations, saveCloudAgentConversations, type CloudAgentConversation } from '@/services/cloud-agent-conversations';
const old = { get:localforage.getItem, set:localforage.setItem, remove:localforage.removeItem };
let windowDescriptor: PropertyDescriptor | undefined;
let actor='history-delete-user';
const item=(id:string):CloudAgentConversation=>({id,title:id,messages:[{id:'prompt',role:'user',text:'test'}],run:null,permissionMode:'request_approval',createdAt:'2026-10-13',updatedAt:'2026-10-13'});
beforeEach(()=>{
    windowDescriptor=Object.getOwnPropertyDescriptor(globalThis,'window');
    const data=new Map<string,unknown>();
    localforage.getItem=(async(key:string)=>data.get(key)??null) as typeof old.get;
    localforage.setItem=(async(key:string,value:unknown)=>{data.set(key,value);return value;}) as typeof old.set;
    localforage.removeItem=async(key:string)=>{data.delete(key);};
    Object.defineProperty(globalThis,'window',{configurable:true,value:{localStorage:{getItem:()=>actor}}});
});
afterEach(()=>{
    localforage.getItem=old.get;localforage.setItem=old.set;localforage.removeItem=old.remove;
    actor='history-delete-user';
    if(windowDescriptor)Object.defineProperty(globalThis,'window',windowDescriptor);else delete(globalThis as {window?:unknown}).window;
});
test('deleted active history stays absent after reload and a delayed stale autosave',async()=>{
    const canvas='history-race',rows=[item('deleted'),item('kept')];
    await saveCloudAgentConversations(canvas,'deleted',rows);
    await deleteCloudAgentConversation(canvas,'deleted','deleted',rows);
    await saveCloudAgentConversations(canvas,'deleted',rows);
    const doc=await loadCloudAgentConversations(canvas);
    expect(doc.activeId).toBeNull();expect(doc.conversations.map(row=>row.id)).toEqual(['kept']);
});
test('delete failure retains the original history and permits retry',async()=>{
    const canvas='history-failure',rows=[item('failure')];
    await saveCloudAgentConversations(canvas,'failure',rows);
    const actual=localforage.setItem;
    localforage.setItem=async()=>{throw Error('disk unavailable');};
    await expect(deleteCloudAgentConversation(canvas,'failure','failure',rows)).rejects.toThrow('disk unavailable');
    localforage.setItem=actual;
    expect((await loadCloudAgentConversations(canvas)).conversations).toHaveLength(1);
    await deleteCloudAgentConversation(canvas,'failure','failure',rows);
    expect((await loadCloudAgentConversations(canvas)).conversations).toHaveLength(0);
});
test('history deletion is isolated by account and canvas',async()=>{
    await saveCloudAgentConversations('one','shared',[item('shared')]);
    await saveCloudAgentConversations('two','shared',[item('shared')]);
    actor='another-user';await saveCloudAgentConversations('one','shared',[item('shared')]);
    actor='history-delete-user';await deleteCloudAgentConversation('one','shared','shared',[item('shared')]);
    expect((await loadCloudAgentConversations('two')).conversations).toHaveLength(1);
    actor='another-user';expect((await loadCloudAgentConversations('one')).conversations).toHaveLength(1);
});
