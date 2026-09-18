// AskSAV Mobile v4.9.3 - durable Collection images
import { File } from "expo-file-system";
import { deleteObject, getDownloadURL, getStorage, ref, uploadString } from "firebase/storage";
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

  const storage=getStorage(auth.app);
  const cloudImagePath="users/"+user.uid+"/asksavCollectionImages/"+safeId(itemId)+".jpg";
  const objectRef=ref(storage,cloudImagePath);
  await uploadString(objectRef,base64,"base64",{contentType:"image/jpeg",customMetadata:{asksavItemId:itemId}});
  const cloudImageUrl=await getDownloadURL(objectRef);
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
