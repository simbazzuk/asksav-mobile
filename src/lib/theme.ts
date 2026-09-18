import { useColorScheme } from "react-native";

export function useAskSAVTheme(){
 const scheme=useColorScheme();
 const dark=scheme==="dark";
 return {
  dark,
  colors: dark ? {
   background:"#07191d",surface:"#10282d",surfaceAlt:"#17383d",
   text:"#eefbf8",heading:"#eefbf8",muted:"#9db7b9",
   border:"#24464c",accent:"#0aaf86",accentSoft:"#17383d",
   danger:"#ffb49b",dangerBg:"#351d19"
  } : {
   background:"#f4fbf9",surface:"#ffffff",surfaceAlt:"#effaf6",
   text:"#173f51",heading:"#062f4f",muted:"#66858d",
   border:"#cfe8e2",accent:"#0aaf86",accentSoft:"#e8f7f4",
   danger:"#8a4933",dangerBg:"#fff8f5"
  }
 };
}
