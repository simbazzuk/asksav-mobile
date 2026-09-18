// AskSAV Mobile v4.9.3.11.1 - History Detail explicit appearance theme
import { useEffect,useMemo,useState } from "react";
import { Image,SafeAreaView,ScrollView,StyleSheet,Text,TouchableOpacity,View,useColorScheme } from "react-native";
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
function first(...values:any[]){return values.find(v=>v!==undefined&&v!==null&&String(v).trim()!=="");}
function usefulTitle(x:any){
 const a=x?.analysis||{}; const saved=cleanText(x?.name);
 const generic=!saved||saved.toLowerCase()==="item identified"||saved.toLowerCase()==="identified item";
 if(!generic)return saved;
 const i=a?.identification||{};
 return cleanText(first(i?.name,i?.title,i?.item,i?.object,i?.product,i?.productName,i?.itemName,i?.label,i?.best_match,i?.bestMatch,a?.itemName,a?.objectName,a?.grounding?.identification?.name,a?.result?.identification?.name))||"Saved item";
}
export default function HistoryDetail(){
 const {id}=useLocalSearchParams<{id:string}>(); const [x,setX]=useState<any>();
 const dark=useColorScheme()==="dark"; const s=useMemo(()=>makeStyles(dark),[dark]);
 useEffect(()=>{AsyncStorage.getItem("asksav.mobile.history.v1").then(r=>setX((r?JSON.parse(r):[]).find((v:any)=>v.id===id)||null))},[id]);
 if(!x)return <SafeAreaView style={s.safe}><View style={s.page}><TouchableOpacity style={s.backRow} onPress={()=>router.back()}><Text style={s.backIcon}>{"\u2039"}</Text><Text style={s.back}>History</Text></TouchableOpacity><Text style={s.title}>{x===null?"Item unavailable":"Loading..."}</Text></View></SafeAreaView>;
 const m=x.market;
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
  <TouchableOpacity style={s.backRow} onPress={()=>router.back()}><Text style={s.backIcon}>{"\u2039"}</Text><Text style={s.back}>History</Text></TouchableOpacity>
  <Text style={s.label}>SAVED ANALYSIS</Text><Text style={s.title}>{usefulTitle(x)}</Text>
  {x.imageUri?<View style={s.imageFrame}><Image source={{uri:x.imageUri}} style={s.image} resizeMode="contain"/></View>:null}
  <View style={s.card}><Text style={s.h}>What AskSAV saw</Text><Text style={s.k}>CATEGORY</Text><Text style={s.v}>{cleanText(x.category)||"-"}</Text><Text style={s.k}>CONDITION</Text><Text style={s.v}>{cleanText(x.condition)||"-"}</Text></View>
  {m?<View style={s.market}><Text style={s.label}>MARKET INTELLIGENCE</Text><Text style={s.h}>{m.low!=null&&m.high!=null?cleanText(`\u00A3${m.low} - \u00A3${m.high}`):"Saved market evidence"}</Text>{m.suggested!=null?<Text style={s.v}>Suggested: {cleanText(`\u00A3${m.suggested}`)}</Text>:null}{m.evidence_summary?<Text style={s.copy}>{cleanText(m.evidence_summary)}</Text>:null}</View>:<View style={s.card}><Text style={s.h}>No saved Market Intelligence</Text><Text style={s.copy}>Market evidence was not generated for this analysis.</Text></View>}
 </ScrollView></SafeAreaView>;
}
function makeStyles(dark:boolean){
 const c=dark?{bg:"#07191d",surface:"#10282d",market:"#17383d",border:"#24464c",marketBorder:"#2f5b60",title:"#f5fffd",text:"#eefbf8",muted:"#9db7b9",copy:"#c7d9da",accent:"#42d7bd"}:{bg:"#f4fbf9",surface:"#ffffff",market:"#effaf6",border:"#cfe8e2",marketBorder:"#b9ddd5",title:"#062f4f",text:"#173f51",muted:"#789097",copy:"#557681",accent:"#087f72"};
 return StyleSheet.create({safe:{flex:1,backgroundColor:c.bg},page:{padding:22,paddingBottom:40},backRow:{flexDirection:"row",alignItems:"center",marginTop:12,marginBottom:20},backIcon:{color:c.accent,fontSize:27,fontWeight:"700",lineHeight:27,marginRight:5},back:{color:c.accent,fontSize:15,fontWeight:"900"},label:{color:c.accent,fontSize:11,fontWeight:"900",letterSpacing:1},title:{color:c.title,fontSize:28,lineHeight:33,fontWeight:"900",marginTop:5,marginBottom:16},imageFrame:{width:"100%",height:230,backgroundColor:c.surface,borderRadius:20,borderWidth:1,borderColor:c.border,marginBottom:12,overflow:"hidden"},image:{width:"100%",height:"100%"},card:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:20,padding:18,marginBottom:12},market:{backgroundColor:c.market,borderWidth:1,borderColor:c.marketBorder,borderRadius:20,padding:18},h:{color:c.title,fontSize:18,fontWeight:"900",marginBottom:10},k:{color:c.muted,fontSize:11,fontWeight:"900",marginTop:8},v:{color:c.text,fontSize:16,fontWeight:"900",marginTop:3},copy:{color:c.copy,fontSize:14,lineHeight:21,marginTop:8}});
}
