// AskSAV Mobile v4.0.7
import { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "../lib/firebase";
import { getAskSAVEntitlements } from "../lib/asksav-api";

function normalisePlan(value:any){
 const p=String(value||"FREE").toUpperCase();
 if(p==="ASKSAV_PRO"||p==="VIC_PRO") return {key:"PRO",name:"AskSAV Pro"};
 if(p==="ASKSAV_PLUS"||p==="VIC_PLUS") return {key:"PLUS",name:"AskSAV Plus"};
 return {key:"FREE",name:"AskSAV Free"};
}
function first(...v:any[]){return v.find(x=>x!==undefined&&x!==null&&x!=="");}

export default function AccountScreen(){
 const [user,setUser]=useState<User|null>(auth.currentUser);
 const [state,setState]=useState<any>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");

 useEffect(()=>onAuthStateChanged(auth,u=>{setUser(u);setState(null);}),[]);
 useEffect(()=>{
   let live=true;
   if(!user){setLoading(false);return;}
   setLoading(true);setError("");
   getAskSAVEntitlements(user).then(v=>{if(live)setState(v);}).catch((e:any)=>{if(live)setError(e?.message||"Unable to load account.");}).finally(()=>{if(live)setLoading(false);});
   return()=>{live=false};
 },[user]);

 if(!user) return <SafeAreaView style={s.safe}><View style={s.page}><Text style={s.eyebrow}>YOUR ASKSAV</Text><Text style={s.title}>Account</Text><View style={s.card}><Ionicons name="person-circle-outline" size={48} color="#0a9b80"/><Text style={s.cardTitle}>Sign in to AskSAV</Text><Text style={s.copy}>Sign in to analyse items, use your plan and keep your AskSAV experience connected.</Text><Text style={s.hint}>Use the existing AskSAV sign-in flow configured for this mobile build.</Text></View></View></SafeAreaView>;

 const plan=normalisePlan(state?.plan);
 const ent=state?.entitlements||{};
 const usage=state?.usage||{};
 const used=first(usage?.analysesUsed,usage?.analysisUsed,usage?.used,usage?.analyses);
 const limit=first(usage?.analysisLimit,usage?.analysesLimit,ent?.analysisLimit,ent?.analysesPerMonth);
 const remaining=first(usage?.analysesRemaining,usage?.analysisRemaining,usage?.remaining);
 const savedLimit=first(ent?.savedItemsLimit,ent?.savedLimit);
 const market=ent?.fullMarketEvidence===true;
 const history=ent?.valueHistory===true;
 const alerts=ent?.alerts===true;

 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
   <Text style={s.eyebrow}>YOUR ASKSAV</Text><Text style={s.title}>Account</Text>
   <Text style={s.email}>{user.email}</Text>
   {loading?<View style={s.loading}><ActivityIndicator color="#087f72"/><Text style={s.copy}>Loading your plan...</Text></View>:null}
   {error?<View style={s.error}><Text style={s.errorText}>{error}</Text></View>:null}
   {!loading&&!error?<>
     <View style={[s.planCard,plan.key==="PLUS"&&s.plusCard,plan.key==="PRO"&&s.proCard]}>
       <View><Text style={s.planLabel}>CURRENT PLAN</Text><Text style={s.planName}>{plan.name}</Text></View>
       <Ionicons name={plan.key==="PRO"?"diamond-outline":plan.key==="PLUS"?"sparkles-outline":"leaf-outline"} size={30} color="#087f72"/>
     </View>
     <View style={s.card}>
       <Text style={s.sectionTitle}>Usage & access</Text>
       {used!==undefined?<Row icon="analytics-outline" label="Analyses used" value={limit!==undefined?String(used)+" of "+String(limit):String(used)}/>:null}
       {remaining!==undefined?<Row icon="speedometer-outline" label="Remaining" value={String(remaining)}/>:null}
       {savedLimit!==undefined?<Row icon="bookmark-outline" label="Saved items" value={String(savedLimit)}/>:null}
       <Row icon="globe-outline" label="Market Intelligence" value={market?"Included":"Upgrade required"}/>
       <Row icon="trending-up-outline" label="Value history" value={history?"Included":"Not included"}/>
       <Row icon="notifications-outline" label="Value alerts" value={alerts?"Included":"Not included"}/>
     </View>
     {!market?<View style={s.upgrade}><Text style={s.upgradeTitle}>Unlock deeper market evidence</Text><Text style={s.copy}>AskSAV Plus and Pro include full Market Intelligence.</Text></View>:null}
   </>:null}
   {!loading&&!error?<TouchableOpacity style={s.plansButton} onPress={()=>router.push({pathname:"/plans",params:{plan:String(state?.plan||"FREE")}})}>
     <View style={s.plansIcon}><Ionicons name="layers-outline" size={21} color="#087f72"/></View>
     <View style={{flex:1}}><Text style={s.plansTitle}>View plans</Text><Text style={s.plansCopy}>Compare AskSAV Free, Plus and Pro</Text></View>
     <Ionicons name="chevron-forward" size={20} color="#087f72"/>
   </TouchableOpacity>:null}
   <TouchableOpacity style={s.signout} onPress={()=>signOut(auth)}><Ionicons name="log-out-outline" size={19} color="#8a4933"/><Text style={s.signoutText}>Sign out</Text></TouchableOpacity>
 </ScrollView></SafeAreaView>
}
function Row({icon,label,value}:{icon:any,label:string,value:string}){
 return <View style={s.row}><View style={s.rowIcon}><Ionicons name={icon} size={18} color="#087f72"/></View><View style={{flex:1}}><Text style={s.rowLabel}>{label}</Text></View><Text style={s.rowValue}>{value}</Text></View>
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:"#f4fbf9"},page:{padding:22,paddingBottom:38},eyebrow:{color:"#0a9b80",fontSize:12,fontWeight:"900",letterSpacing:1.1,marginTop:18},
 title:{color:"#062f4f",fontSize:38,fontWeight:"900",marginTop:5},email:{color:"#66858d",fontSize:14,marginTop:4,marginBottom:18},
 loading:{backgroundColor:"#fff",borderRadius:20,padding:22,alignItems:"center",gap:10,borderWidth:1,borderColor:"#cfe8e2"},
 planCard:{backgroundColor:"#effaf6",borderRadius:20,padding:19,borderWidth:2,borderColor:"#63c7ad",flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:12},
 plusCard:{borderColor:"#8f7bd8",backgroundColor:"#f7f5ff"},proCard:{borderColor:"#315a86",backgroundColor:"#f2f6fb"},
 planLabel:{color:"#087f72",fontSize:11,fontWeight:"900",letterSpacing:.8},planName:{color:"#062f4f",fontSize:27,fontWeight:"900",marginTop:4},
 card:{backgroundColor:"#fff",borderRadius:20,padding:18,borderWidth:1,borderColor:"#cfe8e2",marginBottom:12},cardTitle:{color:"#062f4f",fontSize:21,fontWeight:"900",marginTop:10},
 sectionTitle:{color:"#062f4f",fontSize:20,fontWeight:"900",marginBottom:4},copy:{color:"#5f7c86",fontSize:14,lineHeight:21,marginTop:5},hint:{color:"#789097",fontSize:12,lineHeight:18,marginTop:12},
 row:{flexDirection:"row",alignItems:"center",gap:10,paddingVertical:12,borderTopWidth:1,borderTopColor:"#edf4f2"},rowIcon:{width:34,height:34,borderRadius:10,backgroundColor:"#e8f7f4",alignItems:"center",justifyContent:"center"},
 rowLabel:{color:"#4f6f7b",fontSize:14,fontWeight:"700"},rowValue:{color:"#173f51",fontSize:13,fontWeight:"900",maxWidth:"45%",textAlign:"right"},
 upgrade:{backgroundColor:"#eef9ff",borderWidth:1,borderColor:"#bedce9",borderRadius:20,padding:18,marginBottom:12},upgradeTitle:{color:"#062f4f",fontSize:17,fontWeight:"900"},
 plansButton:{backgroundColor:"#fff",borderWidth:1.5,borderColor:"#8fd4c8",borderRadius:18,padding:14,marginBottom:12,flexDirection:"row",alignItems:"center",gap:11},plansIcon:{width:40,height:40,borderRadius:12,backgroundColor:"#e8f7f4",alignItems:"center",justifyContent:"center"},plansTitle:{color:"#062f4f",fontSize:16,fontWeight:"900"},plansCopy:{color:"#66858d",fontSize:12,marginTop:2},
 signout:{minHeight:52,borderRadius:16,borderWidth:1,borderColor:"#efcabb",backgroundColor:"#fff8f5",flexDirection:"row",gap:8,alignItems:"center",justifyContent:"center",marginTop:4},signoutText:{color:"#8a4933",fontWeight:"900"},
 error:{backgroundColor:"#fff7f3",borderWidth:1,borderColor:"#f0c9b8",borderRadius:16,padding:14,marginBottom:12},errorText:{color:"#8a4933",fontSize:13,fontWeight:"700"}
});