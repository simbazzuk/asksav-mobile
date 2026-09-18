// AskSAV Mobile v4.6.0.3 - Cloud Sync Diagnostics
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, deleteDoc, doc, getDocs, getFirestore, setDoc } from "firebase/firestore";
import { auth } from "./firebase";

export const COLLECTION_KEY="asksav.mobile.collection.v1";
export type CollectionSyncState="local"|"syncing"|"synced"|"offline"|"failed";

function diag(message:string,extra?:unknown){if(extra===undefined)console.log("[AskSAV Collection] "+message);else console.log("[AskSAV Collection] "+message,extra);}
function errText(e:unknown){if(e&&typeof e==="object"){const x=e as any;return {code:x.code||"",message:x.message||String(e)};}return {code:"",message:String(e)};}

function clean(value:any){return JSON.parse(JSON.stringify(value));}
function stamp(item:any){return String(item?.updatedAt||item?.marketUpdatedAt||item?.savedAt||"");}

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
 diag("User signed in; uid suffix: ..."+user.uid.slice(-6));
 try{
  diag("Firestore read started");
  const db=getFirestore(auth.app);
  const ref=collection(db,"users",user.uid,"asksavCollection");
  const snap=await getDocs(ref);
  const cloud=snap.docs.map(x=>x.data());
  diag("Firestore read success; cloud items: "+cloud.length);
  const merged=new Map();
  for(const x of [...cloud,...local]){
   if(!x?.id)continue;
   const prev=merged.get(x.id);
   if(!prev||stamp(x)>=stamp(prev))merged.set(x.id,x);
  }
  const items=[...merged.values()].sort((a,b)=>String(b.savedAt||"").localeCompare(String(a.savedAt||"")));
  await Promise.all(items.map(x=>{
   const updatedAt=x.updatedAt||x.marketUpdatedAt||x.savedAt||new Date().toISOString();
   return setDoc(doc(ref,x.id),clean({...x,updatedAt}),{merge:true});
  }));
  await writeLocalCollection(items);
  diag("Firestore sync success; merged items: "+items.length);
  return {items,state:"synced"};
 }catch(e){
  const info=errText(e);
  console.error("[AskSAV Collection] Firestore sync failed",info);
  return {items:local,state:"failed"};
 }
}
export async function saveCollectionSnapshot(items:any[]){
 await writeLocalCollection(items);
 const user=auth.currentUser;
 if(!user)return;
 try{
  const db=getFirestore(auth.app);
  const ref=collection(db,"users",user.uid,"asksavCollection");
  await Promise.all(items.map(x=>{
   const updatedAt=new Date().toISOString();
   return setDoc(doc(ref,x.id),clean({...x,updatedAt}),{merge:true});
  }));
 }catch{}
}
export async function saveCollectionItem(item:any){
 const user=auth.currentUser;
 if(!user){diag("Save skipped: no signed-in user");return;}
 diag("Firestore item write started: "+String(item?.id||"unknown"));
 try{
  const db=getFirestore(auth.app);
  await setDoc(doc(db,"users",user.uid,"asksavCollection",item.id),clean({...item,updatedAt:new Date().toISOString()}),{merge:true});
  diag("Firestore item write success: "+String(item?.id||"unknown"));
 }catch(e){const info=errText(e);console.error("[AskSAV Collection] Firestore item write failed",info);throw e;}
}
export async function removeCloudCollectionItem(id:string){
 const user=auth.currentUser;
 if(!user){diag("Delete skipped: no signed-in user");return;}
 diag("Firestore delete started: "+id);
 try{
  const db=getFirestore(auth.app);
  await deleteDoc(doc(db,"users",user.uid,"asksavCollection",id));
  diag("Firestore delete success: "+id);
 }catch(e){const info=errText(e);console.error("[AskSAV Collection] Firestore delete failed",info);throw e;}
}
