import { useEffect, useState } from "react";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View, useColorScheme, DynamicColorIOS } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { applyAskSAVAppearance, effectiveScheme, loadAskSAVAppearance, type AskSAVAppearance } from "../lib/appearance";

const OPTIONS:[AskSAVAppearance,string,string,any][]=[
 ["system","System","Follow your iPhone appearance","phone-portrait-outline"],
 ["light","Light","Always use the light AskSAV theme","sunny-outline"],
 ["dark","Dark","Always use the dark AskSAV theme","moon-outline"],
];

export default function AppearanceScreen(){
 const router=useRouter();
 const system=useColorScheme();
 const [value,setValue]=useState<AskSAVAppearance>("system");
 useEffect(()=>{loadAskSAVAppearance().then(setValue);},[]);
 const dark=effectiveScheme(value,system)==="dark";
 async function choose(next:AskSAVAppearance){setValue(next);await applyAskSAVAppearance(next);}
 return <SafeAreaView style={[s.safe,dark&&s.safeDark]}>
  <View style={s.page}>
   <TouchableOpacity style={s.back} onPress={()=>router.back()}><Ionicons name="chevron-back" size={22} color={dark?"#d9f5ef":"#087f72"}/><Text style={[s.backText,dark&&s.textLight]}>Account</Text></TouchableOpacity>
   <Text style={[s.title,dark&&s.textLight]}>Appearance</Text>
   <Text style={[s.copy,dark&&s.mutedDark]}>Choose how AskSAV looks on this device.</Text>
   <View style={[s.card,dark&&s.cardDark]}>
    {OPTIONS.map(([key,label,copy,icon],i)=><TouchableOpacity key={key} style={[s.option,i>0&&s.border,dark&&i>0&&s.borderDark]} onPress={()=>choose(key)}>
     <View style={[s.icon,dark&&s.iconDark]}><Ionicons name={icon} size={21} color="#0aaf86"/></View>
     <View style={{flex:1}}><Text style={[s.label,dark&&s.textLight]}>{label}</Text><Text style={[s.optionCopy,dark&&s.mutedDark]}>{copy}</Text></View>
     {value===key?<Ionicons name="checkmark-circle" size={24} color="#0aaf86"/>:<View style={s.circle}/>}
    </TouchableOpacity>)}
   </View>
   <Text style={[s.note,dark&&s.mutedDark]}>System is recommended. AskSAV will automatically follow your iPhone Light or Dark appearance.</Text>
  </View>
 </SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:DynamicColorIOS({light:"#f4fbf9",dark:"#07191d"})},safeDark:{backgroundColor:"#07191d"},page:{padding:22},
 back:{flexDirection:"row",alignItems:"center",gap:3,marginTop:8,marginBottom:22},backText:{color:"#087f72",fontWeight:"800"},
 title:{color:DynamicColorIOS({light:"#062f4f",dark:"#eefbf8"}),fontSize:26,lineHeight:34,fontWeight:"900"},copy:{color:DynamicColorIOS({light:"#66858d",dark:"#9db7b9"}),fontSize:14,marginTop:5,marginBottom:22},
 card:{backgroundColor:DynamicColorIOS({light:"#fff",dark:"#10282d"}),borderWidth:1,borderColor:DynamicColorIOS({light:"#cfe8e2",dark:"#24464c"}),borderRadius:20,overflow:"hidden"},cardDark:{backgroundColor:"#10282d",borderColor:"#24464c"},
 option:{minHeight:78,flexDirection:"row",alignItems:"center",gap:12,paddingHorizontal:16},border:{borderTopWidth:1,borderTopColor:DynamicColorIOS({light:"#edf4f2",dark:"#24464c"})},borderDark:{borderTopColor:"#24464c"},
 icon:{width:42,height:42,borderRadius:13,backgroundColor:DynamicColorIOS({light:"#e8f7f4",dark:"#17383d"}),alignItems:"center",justifyContent:"center"},iconDark:{backgroundColor:"#17383d"},
 label:{color:DynamicColorIOS({light:"#062f4f",dark:"#eefbf8"}),fontSize:16,fontWeight:"900"},optionCopy:{color:DynamicColorIOS({light:"#66858d",dark:"#9db7b9"}),fontSize:11,marginTop:3},circle:{width:22,height:22,borderRadius:11,borderWidth:2,borderColor:"#a9c3c5"},
 note:{color:DynamicColorIOS({light:"#789097",dark:"#9db7b9"}),fontSize:11,lineHeight:17,textAlign:"center",marginTop:18},textLight:{color:"#eefbf8"},mutedDark:{color:"#9db7b9"}
});
