import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance, ColorSchemeName } from "react-native";

export type AskSAVAppearance="system"|"light"|"dark";
const KEY="asksav.mobile.appearance.v1";

export async function loadAskSAVAppearance():Promise<AskSAVAppearance>{
 const raw=await AsyncStorage.getItem(KEY);
 return raw==="light"||raw==="dark"||raw==="system"?raw:"system";
}
export async function applyAskSAVAppearance(value:AskSAVAppearance){
 await AsyncStorage.setItem(KEY,value);
 Appearance.setColorScheme(value==="system"?null:value);
}
export async function initialiseAskSAVAppearance(){
 const value=await loadAskSAVAppearance();
 Appearance.setColorScheme(value==="system"?null:value);
 return value;
}
export function effectiveScheme(value:AskSAVAppearance,system:ColorSchemeName){
 return value==="system"?(system||"light"):value;
}
