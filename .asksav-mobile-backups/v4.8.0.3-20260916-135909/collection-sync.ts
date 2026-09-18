// AskSAV Mobile v4.8.0 - Server-authoritative Collection API
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetch } from "expo/fetch";
import { auth } from "./firebase";

export const COLLECTION_KEY="asksav.mobile.collection.v1";
export type CollectionSyncState="local"|"syncing"|"synced"|"offline"|"failed";

const API_BASE=(process.env.EXPO_PUBLIC_ASKSAV_API_BASE||"https://asksav.ai").replace(/\/+$/,"");

function diag(message:string,extra?:unknown){if(extra===undefined)console.log("[AskSAV Collection] "+message);else console.log("[AskSAV Collection] "+message,extra);}
function errText(e:unknown){if(e&&typeof e==="object"){const x=e as any;return {code:x.code||"",message:x.message||String(e)};}return {code:"",message:String(e)};}
function stamp(item:any){return String(item?.updatedAt||item?.marketUpdatedAt||item?.savedAt||"");}

async function request(path:string,init:any={}){
 const user=auth.currentUser;
 if(!user)throw Object.assign(new Error("Sign in is required."),{code:"AUTH_REQUIRED"});
 const token=await user.getIdToken();
 const response=await fetch(API_BASE+path,{...init,headers:{...(init.headers||{}),Authorization:"Bearer "+token}});
 const payload=await response.json().catch(()=>({}));
 if(!response.ok){
  const error:any=new Error(payload?.message||payload?.error||("AskSAV Collection request failed ("+response.status+")."));
  error.code=payload?.code;
  error.plan=payload?.plan;
  error.limit=payload?.limit;
  error.savedCount=payload?.savedCount;
  throw error;
 }
 return payload;
}

export async function readLocalCollection():Promise<any[]>{
 const raw=await AsyncStorage.getItem(COLLECTION_KEY);
 try{return raw?JSON.parse(raw):[];}catch{return [];}
}
export async function writeLocalCollection(items:any[]){
 await AsyncStorage.setItem(COLLECTION_KEY,JSON.stringify(items));
}

export async function syncCollection():Promise<{items:any[];state:CollectionSyncState}>{
 const local=await readLocalCollection();
 const user=auth.currentUser;
 diag("Sync started");
 diag("Local items: "+local.length);
 if(!user){diag("No signed-in user; using device collection only");return {items:local,state:"local"};}
 try{
  diag("AskSAV Collection API read started");
  const payload=await request("/api/v20/collection",{method:"GET"});
  const cloud=Array.isArray(payload?.items)?payload.items:[];
  diag("AskSAV Collection API read success; cloud items: "+cloud.length);
  if(local.length===0&&cloud.length>0)diag("Cloud restore detected: empty device collection; restoring "+cloud.length+" item(s)");

  const merged=new Map<string,any>();
  for(const x of [...cloud,...local]){
   if(!x?.id)continue;
   const prev=merged.get(x.id);
   if(!prev||stamp(x)>=stamp(prev))merged.set(x.id,x);
  }
  const candidates=[...merged.values()].sort((a,b)=>String(b.savedAt||"").localeCompare(String(a.savedAt||"")));

  let limitHit=false;
  for(const item of candidates){
   const cloudItem=cloud.find((x:any)=>x?.id===item?.id);
   if(cloudItem&&stamp(cloudItem)>=stamp(item))continue;
   try{await saveCollectionItem(item);}
   catch(e:any){
    if(e?.code==="COLLECTION_LIMIT_REACHED"){limitHit=true;diag("Server saved-item limit reached; keeping remaining legacy item(s) on this device");break;}
    throw e;
   }
  }

  const refreshed=await request("/api/v20/collection",{method:"GET"});
  const serverItems=Array.isArray(refreshed?.items)?refreshed.items:[];
  const finalMap=new Map<string,any>();
  for(const x of [...serverItems,...(limitHit?local:[])]){
   if(!x?.id)continue;
   const prev=finalMap.get(x.id);
   if(!prev||stamp(x)>=stamp(prev))finalMap.set(x.id,x);
  }
  const items=[...finalMap.values()].sort((a,b)=>String(b.savedAt||"").localeCompare(String(a.savedAt||"")));
  await writeLocalCollection(items);
  if(local.length===0&&serverItems.length>0)diag("Cloud restore completed; local cache now has "+items.length+" item(s)");
  diag("AskSAV Collection sync success; server items: "+serverItems.length);
  return {items,state:"synced"};
 }catch(e){
  const info=errText(e);
  console.error("[AskSAV Collection] API sync failed",info);
  return {items:local,state:"failed"};
 }
}

export async function saveCollectionSnapshot(items:any[]){
 await writeLocalCollection(items);
 for(const item of items)await saveCollectionItem(item);
}

export async function saveCollectionItem(item:any){
 const user=auth.currentUser;
 if(!user){diag("Save skipped: no signed-in user");return;}
 diag("AskSAV Collection API item write started: "+String(item?.id||"unknown"));
 await request("/api/v20/collection",{
  method:"PUT",
  headers:{"Content-Type":"application/json"},
  body:JSON.stringify({item})
 });
 diag("AskSAV Collection API item write success: "+String(item?.id||"unknown"));
}

export async function removeCloudCollectionItem(id:string){
 const user=auth.currentUser;
 if(!user){diag("Delete skipped: no signed-in user");return;}
 diag("AskSAV Collection API delete started: "+id);
 await request("/api/v20/collection?id="+encodeURIComponent(id),{method:"DELETE"});
 diag("AskSAV Collection API delete success: "+id);
}
