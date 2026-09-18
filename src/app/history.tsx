// AskSAV Mobile v4.0.9 - enhanced on-device History
import { useCallback,useState } from "react";
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, DynamicColorIOS } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router,useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AskSAVPageHeader from "../components/AskSAVPageHeader";

function txt(v:any){if(v===undefined||v===null)return "";return String(v).replace(/\u00C2\u00A3/g,"\u00A3").replace(/\u00C2/g,"");}
function first(...v:any[]){return v.find(x=>x!==undefined&&x!==null&&String(x).trim()!=="");}
function confidenceOf(e:any){const a=e?.analysis||{};const c=first(a?.verification?.confidence,a?.identification?.confidence,a?.confidence);if(c===undefined)return "";if(typeof c==="number")return c<=1?Math.round(c*100)+"%":Math.round(c)+"%";return txt(c);}
function valueOf(e:any){const m=e?.market;if(m?.suggested!=null)return "\u00A3"+Math.round(Number(m.suggested)).toLocaleString("en-GB");if(m?.low!=null&&m?.high!=null)return "\u00A3"+Math.round(Number(m.low)).toLocaleString("en-GB")+" - \u00A3"+Math.round(Number(m.high)).toLocaleString("en-GB");return "";}
function dateOf(v:any){try{return new Date(v).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"});}catch{return "";}}
export default function HistoryScreen(){
 const [items,setItems]=useState<any[]>([]);
 const [loaded,setLoaded]=useState(false);
 useFocusEffect(useCallback(()=>{let live=true;AsyncStorage.getItem("asksav.mobile.history.v1").then(r=>{if(live){try{setItems(r?JSON.parse(r):[])}catch{setItems([])}setLoaded(true)}});return()=>{live=false}},[]));
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
  <AskSAVPageHeader title="History" description="Your recent AskSAV analyses."/>
  {loaded&&items.length===0?<View style={s.empty}><View style={s.emptyIcon}><Ionicons name="time-outline" size={30} color="#087f72"/></View><Text style={s.emptyTitle}>Nothing here yet</Text><Text style={s.emptyCopy}>Analyse your first item and it will appear here for quick reference.</Text><TouchableOpacity style={s.primary} onPress={()=>router.push("/")}><Text style={s.primaryText}>Analyse an item</Text></TouchableOpacity></View>:null}
  {items.map(e=>{const value=valueOf(e),conf=confidenceOf(e);return <TouchableOpacity key={String(e.id)} style={s.card} onPress={()=>router.push({pathname:"/history-detail",params:{id:String(e.id)}})}>
    {e.imageUri?<Image source={{uri:e.imageUri}} style={s.thumb}/>:<View style={[s.thumb,s.thumbEmpty]}><Ionicons name="image-outline" size={24} color={DynamicColorIOS({light:"#789097",dark:"#c7d9da"})}/></View>}
    <View style={s.body}><Text style={s.name} numberOfLines={2}>{txt(e.name)||"Item identified"}</Text>
      <View style={s.badges}>{e.condition?<View style={s.badge}><Text style={s.badgeText}>{txt(e.condition)}</Text></View>:null}{conf?<View style={s.badge}><Text style={s.badgeText}>{conf} confidence</Text></View>:null}</View>
      <View style={s.meta}>{value?<Text style={s.value}>{value}</Text>:<Text style={s.date}>{dateOf(e.createdAt)}</Text>}{value?<Text style={s.date}>{dateOf(e.createdAt)}</Text>:null}</View>
    </View><Ionicons name="chevron-forward" size={19} color={DynamicColorIOS({light:"#789097",dark:"#c7d9da"})}/>
  </TouchableOpacity>})}
 </ScrollView></SafeAreaView>
}
const s=StyleSheet.create({
 pageHeader:{flexDirection:"row",alignItems:"center",gap:13,marginTop:16},headerLogo:{width:56,height:56,borderRadius:15},headerCopy:{flex:1},
 safe:{flex:1,backgroundColor:DynamicColorIOS({light:"#f4fbf9",dark:"#07191d"})},page:{padding:22,paddingBottom:40},eyebrow:{color:"#0a9b80",fontSize:12,fontWeight:"900",letterSpacing:1.1},title:{color:DynamicColorIOS({light:"#062f4f",dark:"#f5fffd"}),fontSize:38,fontWeight:"900",marginTop:2},sub:{color:DynamicColorIOS({light:"#66858d",dark:"#c7d9da"}),fontSize:14,lineHeight:20,marginTop:5,marginBottom:18},
 card:{backgroundColor:DynamicColorIOS({light:"#fff",dark:"#10282d"}),borderWidth:1,borderColor:DynamicColorIOS({light:"#cfe8e2",dark:"#24464c"}),borderRadius:18,padding:12,marginBottom:11,flexDirection:"row",alignItems:"center",gap:12},thumb:{width:72,height:72,borderRadius:14,backgroundColor:"#f0f6f5"},thumbEmpty:{alignItems:"center",justifyContent:"center"},body:{flex:1},name:{color:DynamicColorIOS({light:"#062f4f",dark:"#f5fffd"}),fontSize:16,fontWeight:"900",lineHeight:20},badges:{flexDirection:"row",flexWrap:"wrap",gap:5,marginTop:7},badge:{backgroundColor:DynamicColorIOS({light:"#e8f7f4",dark:"#17383d"}),borderRadius:99,paddingHorizontal:7,paddingVertical:4},badgeText:{color:"#087f72",fontSize:10,fontWeight:"800"},meta:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:8},value:{color:DynamicColorIOS({light:"#062f4f",dark:"#f5fffd"}),fontSize:15,fontWeight:"900"},date:{color:DynamicColorIOS({light:"#789097",dark:"#c7d9da"}),fontSize:11,fontWeight:"700"},
 empty:{backgroundColor:DynamicColorIOS({light:"#fff",dark:"#10282d"}),borderWidth:1,borderColor:DynamicColorIOS({light:"#cfe8e2",dark:"#24464c"}),borderRadius:22,padding:24,alignItems:"center",marginTop:8},emptyIcon:{width:62,height:62,borderRadius:31,backgroundColor:DynamicColorIOS({light:"#e8f7f4",dark:"#17383d"}),alignItems:"center",justifyContent:"center"},emptyTitle:{color:DynamicColorIOS({light:"#062f4f",dark:"#f5fffd"}),fontSize:21,fontWeight:"900",marginTop:14},emptyCopy:{color:DynamicColorIOS({light:"#66858d",dark:"#c7d9da"}),fontSize:14,lineHeight:21,textAlign:"center",marginTop:6},primary:{minHeight:50,borderRadius:15,backgroundColor:"#0aaf86",alignItems:"center",justifyContent:"center",alignSelf:"stretch",marginTop:18},primaryText:{color:DynamicColorIOS({light:"#fff",dark:"#10282d"}),fontSize:14,fontWeight:"900"}
});