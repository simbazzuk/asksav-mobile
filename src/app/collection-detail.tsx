// AskSAV Mobile v4.6.0 - Cloud Collection Sync
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, DynamicColorIOS, Image, Linking, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { saveCollectionItem } from "../lib/collection-sync";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { auth } from "../lib/firebase";
import { assertAskSAVFeature } from "../lib/entitlement-guard";
import { marketAskSAVAnalysis } from "../lib/asksav-api";
import { getMarketActions, MarketAction } from "../lib/market-actions";

const KEY="asksav.mobile.collection.v1";
type ValuePoint={value:number;currency?:string;checkedAt:string};
type Item={id:string;savedAt:string;name?:string;category?:string;condition?:string;confidence?:string;imageUri?:string;analysis?:any;market?:any;marketUpdatedAt?:string;valueHistory?:ValuePoint[]};

function text(v:any):string{if(v==null)return"";if(typeof v==="string"||typeof v==="number")return String(v);if(Array.isArray(v))return v.map(text).filter(Boolean).join(", ");if(typeof v==="object")return text(v.name||v.label||v.value||v.summary||v.description);return"";}
function first(...v:any[]){return v.map(text).find(Boolean)||"";}
function symbol(currency?:string){return currency==="USD"?"$":currency==="EUR"?"\u20AC":"\u00A3";}
function marketNumber(item:Item){const v=item.market?.suggested;return typeof v==="number"&&Number.isFinite(v)?v:null;}
function marketMoney(item:Item){const v=marketNumber(item);return v===null?"":symbol(item.market?.currency)+Math.round(v).toLocaleString("en-GB");}
function historyFor(item:Item):ValuePoint[]{const h=Array.isArray(item.valueHistory)?item.valueHistory.filter(p=>p&&typeof p.value==="number"&&p.checkedAt):[];if(h.length)return h;const v=marketNumber(item);return v===null?[]:[{value:v,currency:item.market?.currency||"GBP",checkedAt:item.marketUpdatedAt||item.savedAt}];}
function pointMoney(p:ValuePoint){return symbol(p.currency)+Math.round(p.value).toLocaleString("en-GB");}

export default function CollectionDetail(){
 const {id}=useLocalSearchParams<{id:string}>();
 const router=useRouter();
 const [item,setItem]=useState<Item|null>(null);
 const [loading,setLoading]=useState(true);
 const [valuing,setValuing]=useState(false);

 const load=useCallback(()=>{setLoading(true);AsyncStorage.getItem(KEY).then(raw=>{const items:Item[]=raw?JSON.parse(raw):[];setItem(items.find(x=>x.id===id)||null);}).catch(()=>setItem(null)).finally(()=>setLoading(false));},[id]);
 useFocusEffect(load);

 async function refreshValue(){
  if(!item)return;
  const user=auth.currentUser;
  if(!user){Alert.alert("Sign in required","Open Account and sign in before checking Market Intelligence.");return;}
  if(!user.emailVerified){Alert.alert("Verify your email","Verify your AskSAV email address before checking Market Intelligence.");return;}
  if(!item.analysis){Alert.alert("Analysis unavailable","This saved item does not contain the analysis required for Market Intelligence.");return;}
  try{
   await assertAskSAVFeature(user,"MARKET_INTELLIGENCE");
    if(historyFor(item).length>0) await assertAskSAVFeature(user,"VALUE_HISTORY");
    setValuing(true);
   const market=await marketAskSAVAnalysis(user,item.analysis);
   const now=new Date().toISOString();
   const raw=await AsyncStorage.getItem(KEY);const items:Item[]=raw?JSON.parse(raw):[];
   const suggested=typeof market?.suggested==="number"&&Number.isFinite(market.suggested)?market.suggested:null;
   const next=items.map(x=>{if(x.id!==item.id)return x;const previous=historyFor(x);const valueHistory=suggested===null?previous:[...previous,{value:suggested,currency:market?.currency||"GBP",checkedAt:now}].slice(-24);return {...x,market,marketUpdatedAt:now,valueHistory};});
   await AsyncStorage.setItem(KEY,JSON.stringify(next));const changed=next.find(x=>x.id===item.id)||null;setItem(changed);if(changed)await saveCollectionItem(changed);
  }catch(e){const m=e&&typeof e==="object"&&"message" in e?String(e.message):"Market Intelligence is unavailable.";Alert.alert("Market Intelligence failed",m);}
  finally{setValuing(false);}
 }

 if(loading)return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator color="#087f72"/><Text style={s.loading}>Loading item...</Text></View></SafeAreaView>;
 if(!item)return <SafeAreaView style={s.safe}><View style={s.center}><Ionicons name="alert-circle-outline" size={36} color="#789097"/><Text style={s.missingTitle}>Item unavailable</Text><TouchableOpacity style={s.backButton} onPress={()=>router.replace("/collection")}><Text style={s.backText}>Back to Collection</Text></TouchableOpacity></View></SafeAreaView>;

 const a=item.analysis||{}, market=item.market||{}, history=historyFor(item);
 const verification=first(a?.verification?.status,a?.verification?.summary,a?.verification?.result);
 const notes=first(a?.condition?.description,a?.condition?.notes);
 const evidence=first(market?.evidence_summary);
 const range=typeof market?.low==="number"||typeof market?.high==="number"?[typeof market?.low==="number"?symbol(market?.currency)+Math.round(market.low).toLocaleString("en-GB"):"",typeof market?.high==="number"?symbol(market?.currency)+Math.round(market.high).toLocaleString("en-GB"):""].filter(Boolean).join(" - "):"";
 const actions=getMarketActions(item.name||"item",item.category||"",item.analysis?.identification);

 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
  <TouchableOpacity style={s.back} onPress={()=>router.back()}><Ionicons name="chevron-back" size={19} color="#087f72"/><Text style={s.backLabel}>Collection</Text></TouchableOpacity>
  {item.imageUri?<Image source={{uri:item.imageUri}} style={s.heroImage} resizeMode="contain"/>:null}
  <Text style={s.eyebrow}>COLLECTION ITEM</Text><Text style={s.title}>{item.name||"Saved item"}</Text>{item.category?<Text style={s.category}>{item.category}</Text>:null}

  <View style={s.card}><Text style={s.sectionTitle}>Item details</Text>
   {item.condition?<Row label="Condition" value={item.condition}/>:null}{item.confidence?<Row label="Confidence" value={item.confidence}/>:null}{verification?<Row label="Verification" value={verification}/>:null}
   {notes?<Text style={s.notes}>{notes}</Text>:null}
  </View>

  <View style={s.valueCard}><Text style={s.valueEyebrow}>CURRENT MARKET VALUE</Text><Text style={s.value}>{marketMoney(item)||"Not valued yet"}</Text>{range?<Text style={s.range}>Market range {range}</Text>:null}
   <TouchableOpacity style={s.refresh} onPress={refreshValue} disabled={valuing}>{valuing?<ActivityIndicator color="#fff"/>:<Ionicons name={marketMoney(item)?"refresh-outline":"globe-outline"} size={18} color="#fff"/>}<Text style={s.refreshText}>{valuing?"Checking...":marketMoney(item)?"Refresh Market Value":"Get Market Value"}</Text></TouchableOpacity>
  </View>

  {history.length?<View style={s.card}><Text style={s.sectionTitle}>Value History</Text><Text style={s.sectionCopy}>Indicative suggested values recorded when Market Intelligence was checked.</Text>
   {history.slice().reverse().map((p,i)=><View key={p.checkedAt+"-"+i} style={s.historyRow}><View style={[s.dot,i===0&&s.dotLatest]}/><View style={{flex:1}}><Text style={s.historyMoney}>{pointMoney(p)}</Text><Text style={s.historyDate}>{new Date(p.checkedAt).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</Text></View>{i===0?<Text style={s.latest}>LATEST</Text>:null}</View>)}
  </View>:null}

  {marketMoney(item)?<View style={s.card}><Text style={s.sectionTitle}>Market Intelligence</Text>{evidence?<><Text style={s.marketLabel}>MARKET EVIDENCE</Text><Text style={s.evidence}>{evidence}</Text></>:null}{typeof market?.confidence==="number"?<Text style={s.marketConfidence}>Market confidence: {Math.round(market.confidence*100)}%</Text>:null}</View>:null}

  {marketMoney(item)?<View style={s.card}><Text style={s.sectionTitle}>Take the next step</Text><Text style={s.sectionCopy}>Explore external destinations for this item.</Text>{actions.map((action:MarketAction)=><TouchableOpacity key={action.id} style={s.action} onPress={async()=>{try{const ok=await Linking.canOpenURL(action.url);if(ok)await Linking.openURL(action.url);else Alert.alert("Link unavailable","This destination could not be opened.");}catch{Alert.alert("Link unavailable","This destination could not be opened.");}}}><View style={s.actionIcon}><Ionicons name={action.icon as any} size={19} color="#087f72"/></View><View style={{flex:1}}><Text style={s.actionTitle}>{action.title}</Text><Text style={s.actionCopy}>{action.subtitle}</Text></View><Ionicons name="open-outline" size={16} color="#789097"/></TouchableOpacity>)}</View>:null}
  <Text style={s.disclaimer}>Values are indicative Market Intelligence, not formal valuations or guaranteed sale prices.</Text>
 </ScrollView></SafeAreaView>;
}
function Row({label,value}:{label:string;value:string}){return <View style={s.row}><Text style={s.rowLabel}>{label}</Text><Text style={s.rowValue}>{value}</Text></View>;}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:DynamicColorIOS({light:"#f4fbf9",dark:"#07191d"})},page:{paddingHorizontal:20,paddingTop:10,paddingBottom:38},back:{flexDirection:"row",alignItems:"center",gap:2,paddingVertical:10,alignSelf:"flex-start"},backLabel:{color:DynamicColorIOS({light:"#087f72",dark:"#42d7bd"}),fontSize:14,fontWeight:"900"},heroImage:{width:"100%",height:250,backgroundColor:DynamicColorIOS({light:"#fff",dark:"#10282d"}),borderRadius:22,borderWidth:1,borderColor:DynamicColorIOS({light:"#d9ebe7",dark:"#24464c"}),marginTop:4},eyebrow:{color:DynamicColorIOS({light:"#087f72",dark:"#42d7bd"}),fontSize:10,fontWeight:"900",letterSpacing:.9,marginTop:18},title:{color:DynamicColorIOS({light:"#062f4f",dark:"#f5fffd"}),fontSize:30,lineHeight:35,fontWeight:"900",marginTop:4},category:{color:DynamicColorIOS({light:"#66858d",dark:"#9db7b9"}),fontSize:13,marginTop:4},
 card:{backgroundColor:DynamicColorIOS({light:"#fff",dark:"#10282d"}),borderWidth:1,borderColor:DynamicColorIOS({light:"#d9ebe7",dark:"#24464c"}),borderRadius:19,padding:16,marginTop:12},sectionTitle:{color:DynamicColorIOS({light:"#062f4f",dark:"#f5fffd"}),fontSize:18,fontWeight:"900"},sectionCopy:{color:DynamicColorIOS({light:"#66858d",dark:"#9db7b9"}),fontSize:11,lineHeight:17,marginTop:3,marginBottom:8},row:{flexDirection:"row",justifyContent:"space-between",gap:14,paddingVertical:10,borderTopWidth:1,borderTopColor:DynamicColorIOS({light:"#edf4f2",dark:"#24464c"})},rowLabel:{color:DynamicColorIOS({light:"#789097",dark:"#9db7b9"}),fontSize:11,fontWeight:"800"},rowValue:{flex:1,color:DynamicColorIOS({light:"#173f51",dark:"#eefbf8"}),fontSize:13,fontWeight:"800",textAlign:"right"},notes:{color:DynamicColorIOS({light:"#5f7c86",dark:"#c7d9da"}),fontSize:12,lineHeight:18,marginTop:8},
 valueCard:{backgroundColor:DynamicColorIOS({light:"#e8f7f4",dark:"#17383d"}),borderWidth:1,borderColor:DynamicColorIOS({light:"#b9ddd5",dark:"#2f5b60"}),borderRadius:20,padding:17,marginTop:12},valueEyebrow:{color:DynamicColorIOS({light:"#087f72",dark:"#42d7bd"}),fontSize:10,fontWeight:"900",letterSpacing:.7},value:{color:DynamicColorIOS({light:"#062f4f",dark:"#f5fffd"}),fontSize:32,fontWeight:"900",marginTop:3},range:{color:DynamicColorIOS({light:"#5f7c86",dark:"#c7d9da"}),fontSize:11,marginTop:3},refresh:{minHeight:48,borderRadius:14,backgroundColor:"#087f72",flexDirection:"row",gap:8,alignItems:"center",justifyContent:"center",marginTop:13},refreshText:{color:"#fff",fontSize:13,fontWeight:"900"},
 historyRow:{minHeight:48,flexDirection:"row",alignItems:"center",gap:10,borderTopWidth:1,borderTopColor:DynamicColorIOS({light:"#edf4f2",dark:"#24464c"})},dot:{width:9,height:9,borderRadius:5,backgroundColor:DynamicColorIOS({light:"#a8c7c1",dark:"#52777a"})},dotLatest:{backgroundColor:"#0a9b80"},historyMoney:{color:DynamicColorIOS({light:"#173f51",dark:"#eefbf8"}),fontSize:14,fontWeight:"900"},historyDate:{color:DynamicColorIOS({light:"#789097",dark:"#9db7b9"}),fontSize:9,marginTop:2},latest:{color:DynamicColorIOS({light:"#087f72",dark:"#42d7bd"}),fontSize:8,fontWeight:"900",letterSpacing:.5},
 marketLabel:{color:DynamicColorIOS({light:"#087f72",dark:"#42d7bd"}),fontSize:9,fontWeight:"900",letterSpacing:.7,marginTop:12},evidence:{color:DynamicColorIOS({light:"#4f6f7b",dark:"#b8ced0"}),fontSize:12,lineHeight:19,marginTop:5},marketConfidence:{color:DynamicColorIOS({light:"#087f72",dark:"#42d7bd"}),fontSize:11,fontWeight:"800",marginTop:9},
 action:{minHeight:62,borderTopWidth:1,borderTopColor:DynamicColorIOS({light:"#edf4f2",dark:"#24464c"}),flexDirection:"row",alignItems:"center",gap:10},actionIcon:{width:36,height:36,borderRadius:11,backgroundColor:DynamicColorIOS({light:"#e8f7f4",dark:"#17383d"}),alignItems:"center",justifyContent:"center"},actionTitle:{color:DynamicColorIOS({light:"#062f4f",dark:"#f5fffd"}),fontSize:13,fontWeight:"900"},actionCopy:{color:DynamicColorIOS({light:"#66858d",dark:"#9db7b9"}),fontSize:10,lineHeight:14,marginTop:2},disclaimer:{color:DynamicColorIOS({light:"#789097",dark:"#9db7b9"}),fontSize:10,lineHeight:15,textAlign:"center",marginTop:15},center:{flex:1,alignItems:"center",justifyContent:"center",padding:30},loading:{color:DynamicColorIOS({light:"#66858d",dark:"#9db7b9"}),fontSize:12,marginTop:10},missingTitle:{color:DynamicColorIOS({light:"#062f4f",dark:"#f5fffd"}),fontSize:20,fontWeight:"900",marginTop:10},backButton:{marginTop:15,padding:12},backText:{color:DynamicColorIOS({light:"#087f72",dark:"#42d7bd"}),fontWeight:"900"}
});
