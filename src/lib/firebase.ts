// AskSAV Mobile Firebase
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, initializeAuth } from "firebase/auth";
import * as FirebaseAuth from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseMobileConfigured=Boolean(
  config.apiKey&&config.authDomain&&config.projectId&&config.appId
);

const app=getApps().length?getApp():initializeApp(config);

export const auth=(()=>{
  try{
    return initializeAuth(app,{
      persistence:(FirebaseAuth as typeof FirebaseAuth & {
        getReactNativePersistence:(storage:typeof AsyncStorage)=>any
      }).getReactNativePersistence(AsyncStorage),
    });
  }catch(error:any){
    if(error?.code==="auth/already-initialized"){
      return getAuth(app);
    }
    throw error;
  }
})();