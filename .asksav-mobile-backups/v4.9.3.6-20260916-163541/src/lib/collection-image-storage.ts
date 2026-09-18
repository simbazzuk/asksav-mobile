// AskSAV Mobile v4.9.3 - durable Collection images
import { File } from "expo-file-system";
import { deleteObject, getStorage, ref } from "firebase/storage";
import { auth } from "./firebase";

export type CloudCollectionImage={
  cloudImageUrl:string;
  cloudImagePath:string;
};

function safeId(value:string){
  return value.replace(/[^A-Za-z0-9._-]/g,"_");
}

export async function uploadCollectionImage(itemId:string,localUri:string):Promise<CloudCollectionImage>{
  const user=auth.currentUser;
  if(!user) throw new Error("Sign in is required before uploading a Collection image.");
  if(!localUri) throw new Error("Collection image is missing.");

  // If the image is already durable, retain it rather than re-uploading.
  if(/^https?:\/\//i.test(localUri)){
    return {cloudImageUrl:localUri,cloudImagePath:""};
  }

  const file=new File(localUri);
  if(!file.exists) throw new Error("The selected image is no longer available on this device.");

  const base64=await file.base64();
  if(!base64) throw new Error("The selected image is empty.");

  const bucket=process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if(!bucket) throw new Error("Firebase Storage bucket is not configured.");

  const cloudImagePath="users/"+user.uid+"/asksavCollectionImages/"+safeId(itemId)+".jpg";
  const idToken=await user.getIdToken();

  // React Native's Firebase JS Storage upload paths can require Blob/ArrayBuffer
  // support that is not available here. Send the Base64 JPEG directly to the
  // Firebase Storage HTTP endpoint instead.
  const uploadUrl=
    "https://firebasestorage.googleapis.com/v0/b/"+
    encodeURIComponent(bucket)+
    "/o?uploadType=media&name="+
    encodeURIComponent(cloudImagePath);

  const uploadResponse=await fetch(uploadUrl,{
    method:"POST",
    headers:{
      "Authorization":"Firebase "+idToken,
      "Content-Type":"image/jpeg",
      "Content-Transfer-Encoding":"base64"
    },
    body:base64
  });

  const responseText=await uploadResponse.text();
  let metadata:any={};
  try{
    metadata=responseText?JSON.parse(responseText):{};
  }catch{
    metadata={};
  }

  if(!uploadResponse.ok){
    const message=
      metadata?.error?.message||
      metadata?.error||
      responseText||
      ("HTTP "+uploadResponse.status);
    throw new Error("Collection image upload failed: "+String(message));
  }

  const downloadTokens=String(metadata?.downloadTokens||metadata?.metadata?.firebaseStorageDownloadTokens||"");
  const downloadToken=downloadTokens.split(",").map((v:string)=>v.trim()).find(Boolean)||"";

  if(!downloadToken){
    throw new Error("Collection image uploaded but Firebase did not return a download token.");
  }

  const cloudImageUrl=
    "https://firebasestorage.googleapis.com/v0/b/"+
    encodeURIComponent(bucket)+
    "/o/"+
    encodeURIComponent(cloudImagePath)+
    "?alt=media&token="+
    encodeURIComponent(downloadToken);

  return {cloudImageUrl,cloudImagePath};
}

export async function deleteCollectionImage(cloudImagePath:string){
  const user=auth.currentUser;
  if(!user || !cloudImagePath) return;
  const expectedPrefix="users/"+user.uid+"/asksavCollectionImages/";
  if(!cloudImagePath.startsWith(expectedPrefix)) return;
  try{
    await deleteObject(ref(getStorage(auth.app),cloudImagePath));
  }catch(e:any){
    // Missing Storage objects must not prevent deletion of the Collection record.
    if(e?.code!=="storage/object-not-found"){
      console.warn("[AskSAV Collection] Cloud image delete failed",e?.code||e?.message||e);
    }
  }
}
