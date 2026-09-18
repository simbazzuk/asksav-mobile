// AskSAV Mobile v4.6.0 - Cloud Collection Sync
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, deleteDoc, doc, getDocs, getFirestore, setDoc } from "firebase/firestore";
import { auth } from "./firebase";

export const COLLECTION_KEY="asksav.mobile.collection.v1";
export type CollectionSyncState="local"|"syncing"|"synced"|"offline";

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
 if(!user)return {items:local,state:"local"};
 try{
  const db=getFirestore(auth.app);
  const ref=collection(db,"users",user.uid,"asksavCollection");
  const snap=await getDocs(ref);
  const cloud=snap.docs.map(x=>x.data());
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
  return {items,state:"synced"};
 }catch{
  return {items:local,state:"offline"};
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
 if(!user)return;
 try{
  const db=getFirestore(auth.app);
  await setDoc(doc(db,"users",user.uid,"asksavCollection",item.id),clean({...item,updatedAt:new Date().toISOString()}),{merge:true});
 }catch{}
}
export async function removeCloudCollectionItem(id:string){
 const user=auth.currentUser;
 if(!user)return;
 try{
  const db=getFirestore(auth.app);
  await deleteDoc(doc(db,"users",user.uid,"asksavCollection",id));
 }catch{}
}
