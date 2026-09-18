// AskSAV Mobile v4.9.3.11 - History Detail Theme & Header Consistency
import { useEffect,useState } from "react";
import { Image,SafeAreaView,ScrollView,StyleSheet,Text,TouchableOpacity,View,DynamicColorIOS } from "react-native";
import { router,useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

function cleanText(value:any){
 if(value===undefined||value===null)return "";
 return String(value)
   .replace(/\u00C3\u201A\u00C2\u00A3/g,"\u00A3")
   .replace(/\u00C3\u201A\u00C2/g,"")
   .replace(/\u00C2\u00A3/g,"\u00A3")
   .replace(/\u00C2\u00B7/g,"\u00B7")
   .replace(/\u00C2/g,"");
}
function first(...values:any[]){
 return values.find(v=>v!==undefined&&v!==null&&String(v).trim()!=="");
}
function usefulTitle(x:any){
 const a=x?.analysis||{};
 const saved=cleanText(x?.name);
 const generic=!saved||saved.toLowerCase()==="item identified"||saved.toLowerCase()==="identified item";
 if(!generic)return saved;
 const i=a?.identification||{};
 return cleanText(first(
   i?.name,i?.title,i?.item,i?.object,i?.product,i?.productName,i?.itemName,i?.label,i?.best_match,i?.bestMatch,
   a?.itemName,a?.objectName,a?.grounding?.identification?.name,a?.result?.identification?.name
 ))||"Saved item";
}
export default function HistoryDetail(){
 const {id}=useLocalSearchParams<{id:string}>();
 const [x,setX]=useState<any>();
 useEffect(()=>{AsyncStorage.getItem("asksav.mobile.history.v1").then(r=>setX((r?JSON.parse(r):[]).find((v:any)=>v.id===id)||null))},[id]);
 if(!x)return <SafeAreaView style={s.safe}><View style={s.page}><TouchableOpacity style={s.backRow} onPress={()=>router.back()}><Text style={s.backIcon}>{"\u2039"}</Text><Text style={s.back}>History</Text></TouchableOpacity><Text style={s.title}>{x===null?"Item unavailable":"Loading..."}</Text></View></SafeAreaView>;
 const m=x.market;
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
  <TouchableOpacity style={s.backRow} onPress={()=>router.back()}><Text style={s.backIcon}>{"\u2039"}</Text><Text style={s.back}>History</Text></TouchableOpacity>
  <Text style={s.label}>SAVED ANALYSIS</Text>
  <Text style={s.title}>{usefulTitle(x)}</Text>
  {x.imageUri?<View style={s.imageFrame}><Image source={{uri:x.imageUri}} style={s.image} resizeMode="contain"/></View>:null}
  <View style={s.card}><Text style={s.h}>What AskSAV saw</Text><Text style={s.k}>CATEGORY</Text><Text style={s.v}>{cleanText(x.category)||"-"}</Text><Text style={s.k}>CONDITION</Text><Text style={s.v}>{cleanText(x.condition)||"-"}</Text></View>
  {m?<View style={s.market}><Text style={s.label}>MARKET INTELLIGENCE</Text><Text style={s.h}>{m.low!=null&&m.high!=null?cleanText(`\u00A3${m.low} - \u00A3${m.high}`):"Saved market evidence"}</Text>{m.suggested!=null?<Text style={s.v}>Suggested: {cleanText(`\u00A3${m.suggested}`)}</Text>:null}{m.evidence_summary?<Text style={s.copy}>{cleanText(m.evidence_summary)}</Text>:null}</View>:<View style={s.card}><Text style={s.h}>No saved Market Intelligence</Text><Text style={s.copy}>Market evidence was not generated for this analysis.</Text></View>}
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:DynamicColorIOS({light:"#f4fbf9",dark:"#07191d"})},
 page:{padding:22,paddingBottom:40},
 backRow:{flexDirection:"row",alignItems:"center",marginTop:12,marginBottom:20},
 backIcon:{color:DynamicColorIOS({light:"#087f72",dark:"#42d7bd"}),fontSize:29,fontWeight:"700",lineHeight:29,marginRight:5},
 back:{color:DynamicColorIOS({light:"#087f72",dark:"#42d7bd"}),fontSize:16,fontWeight:"900"},
 label:{color:DynamicColorIOS({light:"#087f72",dark:"#42d7bd"}),fontSize:11,fontWeight:"900",letterSpacing:1},
 title:{color:DynamicColorIOS({light:"#062f4f",dark:"#f5fffd"}),fontSize:30,lineHeight:35,fontWeight:"900",marginTop:5,marginBottom:16},
 imageFrame:{width:"100%",height:230,backgroundColor:DynamicColorIOS({light:"#fff",dark:"#10282d"}),borderRadius:20,borderWidth:1,borderColor:DynamicColorIOS({light:"#d9ebe7",dark:"#24464c"}),marginBottom:12,overflow:"hidden"},
 image:{width:"100%",height:"100%"},
 card:{backgroundColor:DynamicColorIOS({light:"#fff",dark:"#10282d"}),borderWidth:1,borderColor:DynamicColorIOS({light:"#cfe8e2",dark:"#24464c"}),borderRadius:20,padding:18,marginBottom:12},
 market:{backgroundColor:DynamicColorIOS({light:"#effaf6",dark:"#17383d"}),borderWidth:1,borderColor:DynamicColorIOS({light:"#b9ddd5",dark:"#2f5b60"}),borderRadius:20,padding:18},
 h:{color:DynamicColorIOS({light:"#062f4f",dark:"#f5fffd"}),fontSize:20,fontWeight:"900",marginBottom:10},
 k:{color:DynamicColorIOS({light:"#789097",dark:"#9db7b9"}),fontSize:11,fontWeight:"900",marginTop:8},
 v:{color:DynamicColorIOS({light:"#173f51",dark:"#eefbf8"}),fontSize:16,fontWeight:"900",marginTop:3},
 copy:{color:DynamicColorIOS({light:"#557681",dark:"#c7d9da"}),fontSize:14,lineHeight:21,marginTop:8}
});
