import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, deleteDoc, doc, getDocs, getFirestore, setDoc, getDoc } from "firebase/firestore";
import { auth } from "./firebase";
import { deleteCollectionImage } from "./collection-image-storage";

const KEY="asksav.mobile.collection.v1";
const SUBCOLLECTION="asksavCollection";

export type CollectionSyncState="local"|"syncing"|"synced"|"offline"|"failed";

type CollectionItem={
 id:string;
 savedAt:string;
 marketUpdatedAt?:string;
 [key:string]:any;
};

function stamp(item:CollectionItem){
 const raw=item.marketUpdatedAt||item.savedAt||"";
 const n=Date.parse(raw);
 return Number.isFinite(n)?n:0;
}

function validItems(value:any):CollectionItem[]{
 return Array.isArray(value)?value.filter(x=>x&&typeof x==="object"&&typeof x.id==="string"&&x.id.trim()):[];
}

async function readLocal(){
 const raw=await AsyncStorage.getItem(KEY);
 if(!raw)return [] as CollectionItem[];
 try{return validItems(JSON.parse(raw));}
 catch{return [] as CollectionItem[];}
}

async function writeLocal(items:CollectionItem[]){
 await AsyncStorage.setItem(KEY,JSON.stringify(items));
}

function mergeItems(local:CollectionItem[],cloud:CollectionItem[]){
 const byId=new Map<string,CollectionItem>();
 for(const item of [...cloud,...local]){
  const previous=byId.get(item.id);
  if(!previous||stamp(item)>=stamp(previous))byId.set(item.id,item);
 }
 return [...byId.values()].sort((a,b)=>stamp(b)-stamp(a)).slice(0,100);
}

function userCollection(uid:string){
 return collection(getFirestore(), "users", uid, SUBCOLLECTION);
}

function userItem(uid:string,id:string){
 return doc(getFirestore(), "users", uid, SUBCOLLECTION, id);
}

function errText(e:any){
 return {
  code:typeof e?.code==="string"?e.code:"",
  message:typeof e?.message==="string"?e.message:String(e||"Unknown error"),
 };
}

export async function syncCollection():Promise<{items:CollectionItem[];state:CollectionSyncState}>{
 const local=await readLocal();
 console.log("[AskSAV Collection] Sync started");
 console.log("[AskSAV Collection] Local items:",local.length);

 const user=auth.currentUser;
 if(!user){
  console.log("[AskSAV Collection] No signed-in user; using local collection");
  return {items:local,state:"local"};
 }

 try{
  console.log("[AskSAV Collection] Firestore read started");
  const snap=await getDocs(userCollection(user.uid));
  const cloud=validItems(snap.docs.map(x=>x.data()));
  console.log("[AskSAV Collection] Firestore read success; cloud items:",cloud.length);

  const merged=mergeItems(local,cloud);
  console.log("[AskSAV Collection] Merged items:",merged.length);

  for(const item of merged){
   console.log("[AskSAV Collection] Firestore item write started:",item.id);
   await setDoc(userItem(user.uid,item.id),item,{merge:true});
  }

  await writeLocal(merged);
  console.log("[AskSAV Collection] Sync success");
  return {items:merged,state:"synced"};
 }catch(e){
  console.error("[AskSAV Collection] Firestore sync failed",errText(e));
  return {items:local,state:"failed"};
 }
}

export async function saveCollectionSnapshot(items:CollectionItem[]){
 const clean=validItems(items).slice(0,100);
 await writeLocal(clean);

 const user=auth.currentUser;
 if(!user)return;

 try{
  for(const item of clean){
   console.log("[AskSAV Collection] Firestore item write started:",item.id);
   await setDoc(userItem(user.uid,item.id),item,{merge:true});
  }
 }catch(e){
  console.error("[AskSAV Collection] Firestore snapshot write failed",errText(e));
  throw e;
 }
}

export async function saveCollectionItem(item:CollectionItem){
 if(!item||typeof item.id!=="string"||!item.id.trim())throw new Error("Collection item id is required.");

 const user=auth.currentUser;
 if(!user){
  console.log("[AskSAV Collection] No signed-in user; cloud item write skipped");
  return;
 }

 try{
  console.log("[AskSAV Collection] Firestore item write started:",item.id);
  await setDoc(userItem(user.uid,item.id),item,{merge:true});
  console.log("[AskSAV Collection] Firestore item write success:",item.id);
 }catch(e){
  console.error("[AskSAV Collection] Firestore item write failed",errText(e));
  throw e;
 }
}

export async function removeCloudCollectionItem(id:string){
 if(!id)return;

 const user=auth.currentUser;
 if(!user){
  console.log("[AskSAV Collection] No signed-in user; cloud delete skipped");
  return;
 }

 try{
  console.log("[AskSAV Collection] Firestore item delete started:",id);
  const itemRef=userItem(user.uid,id);
  const existing=await getDoc(itemRef);
  const cloudImagePath=String(existing.data()?.cloudImagePath||"");
  await deleteDoc(itemRef);
  await deleteCollectionImage(cloudImagePath);
  console.log("[AskSAV Collection] Firestore item delete success:",id);
 }catch(e){
  console.error("[AskSAV Collection] Firestore item delete failed",errText(e));
  throw e;
 }
}
