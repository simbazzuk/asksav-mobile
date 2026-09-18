// AskSAV Mobile v4.6.0.5 - Cloud Restore Readiness
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, DynamicColorIOS } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { removeCloudCollectionItem, saveCollectionItem, syncCollection, type CollectionSyncState } from "../lib/collection-sync";
import { useFocusEffect, useRouter } from "expo-router";
import { auth } from "../lib/firebase";
import { assertAskSAVFeature } from "../lib/entitlement-guard";
import { marketAskSAVAnalysis } from "../lib/asksav-api";

const KEY="asksav.mobile.collection.v1";
type ValuePoint={value:number;currency?:string;checkedAt:string};
type Item={id:string;savedAt:string;name?:string;category?:string;condition?:string;confidence?:string;imageUri?:string;analysis?:any;market?:any;marketUpdatedAt?:string;valueHistory?:ValuePoint[]};

function marketNumber(item:Item){
 const v=item.market?.suggested;
 return typeof v==="number"&&Number.isFinite(v)?v:null;
}
function currencySymbol(item:Item){
 return item.market?.currency==="USD"?"$":item.market?.currency==="EUR"?"\u20AC":"\u00A3";
}
function marketValue(item:Item){
 const v=marketNumber(item);
 return v===null?"":currencySymbol(item)+Math.round(v).toLocaleString("en-GB");
}
function historyFor(item:Item):ValuePoint[]{
 const existing=Array.isArray(item.valueHistory)?item.valueHistory.filter(p=>p&&typeof p.value==="number"&&p.checkedAt):[];
 if(existing.length)return existing;
 const v=marketNumber(item);
 if(v===null)return [];
 return [{value:v,currency:item.market?.currency||"GBP",checkedAt:item.marketUpdatedAt||item.savedAt}];
}
function pointMoney(p:ValuePoint){
 const symbol=p.currency==="USD"?"$":p.currency==="EUR"?"\u20AC":"\u00A3";
 return symbol+Math.round(p.value).toLocaleString("en-GB");
}
function changeText(history:ValuePoint[]){
 if(history.length<2)return "";
 const previous=history[history.length-2], latest=history[history.length-1];
 if(previous.currency!==latest.currency)return "";
 const delta=latest.value-previous.value;
 if(delta===0)return "No change";
 const pct=previous.value?Math.abs(delta/previous.value*100):0;
 return (delta>0?"Up ":"Down ")+pointMoney({...latest,value:Math.abs(delta)})+(pct?" ("+pct.toFixed(1)+"%)":"");
}
function valuedDate(item:Item){
 const raw=item.marketUpdatedAt||item.savedAt;
 return raw?new Date(raw).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"";
}

export default function CollectionScreen(){
 const [items,setItems]=useState<Item[]>([]);
 const [valuingId,setValuingId]=useState<string|null>(null);
 const [syncState,setSyncState]=useState<CollectionSyncState>("local");
 const [collectionSearch,setCollectionSearch]=useState("");
 const [collectionFilter,setCollectionFilter]=useState<"ALL"|"VALUED"|"NOT_VALUED">("ALL");
 const [collectionSort,setCollectionSort]=useState<"NEWEST"|"OLDEST"|"HIGH_VALUE"|"LOW_VALUE">("NEWEST");
 const router=useRouter();
 const load=useCallback(()=>{AsyncStorage.getItem(KEY).then(raw=>setItems(raw?JSON.parse(raw):[])).catch(()=>setItems([]));},[]);
 useFocusEffect(load);
 useFocusEffect(useCallback(()=>{
  let active=true;
  setSyncState(auth.currentUser?"syncing":"local");
  syncCollection().then(result=>{if(active){setItems(result.items);setSyncState(result.state);}});
  return()=>{active=false;};
 },[]));

 const valued=items.filter(x=>marketNumber(x)!==null);
 const unvalued=items.length-valued.length;
 const currencies=[...new Set(valued.map(currencySymbol))];
 const total=currencies.length===1?valued.reduce((sum,x)=>sum+(marketNumber(x)||0),0):null;
 const totalText=total===null?(valued.length?"Multiple currencies":"\u00A30"):((currencies[0]||"\u00A3")+Math.round(total).toLocaleString("en-GB"));

 const filteredItems=useMemo(()=>{
  const q=collectionSearch.trim().toLowerCase();
  const next=items.filter(item=>{
   const value=marketNumber(item);
   if(collectionFilter==="VALUED"&&value===null)return false;
   if(collectionFilter==="NOT_VALUED"&&value!==null)return false;
   if(!q)return true;
   return [item.name,item.category,item.condition].some(v=>String(v||"").toLowerCase().includes(q));
  });
  return next.sort((a,b)=>{
   if(collectionSort==="OLDEST")return String(a.savedAt||"").localeCompare(String(b.savedAt||""));
   if(collectionSort==="HIGH_VALUE")return (marketNumber(b)??-Infinity)-(marketNumber(a)??-Infinity);
   if(collectionSort==="LOW_VALUE")return (marketNumber(a)??Infinity)-(marketNumber(b)??Infinity);
   return String(b.savedAt||"").localeCompare(String(a.savedAt||""));
  });
 },[items,collectionSearch,collectionFilter,collectionSort]);

 async function persist(next:Item[]){
  await AsyncStorage.setItem(KEY,JSON.stringify(next));
  setItems(next);
 }
 async function remove(id:string){const next=items.filter(x=>x.id!==id);await persist(next);await removeCloudCollectionItem(id);}
 function confirmRemove(item:Item){
  Alert.alert("Remove from Collection","Remove "+(item.name||"this item")+" from My Collection?",[
   {text:"Cancel",style:"cancel"},
   {text:"Remove",style:"destructive",onPress:()=>remove(item.id)}
  ]);
 }

 async function refreshMarketValue(item:Item){
  const user=auth.currentUser;
  if(!user){Alert.alert("Sign in required","Open Account and sign in before checking Market Intelligence.");return;}
  if(!user.emailVerified){Alert.alert("Verify your email","Verify your AskSAV email address before checking Market Intelligence.");return;}
  if(!item.analysis){Alert.alert("Analysis unavailable","This saved item does not contain the analysis required for Market Intelligence.");return;}
  try{
   await assertAskSAVFeature(user,"MARKET_INTELLIGENCE");
    if(historyFor(item).length>0) await assertAskSAVFeature(user,"VALUE_HISTORY");
    setValuingId(item.id);
   const market=await marketAskSAVAnalysis(user,item.analysis);
   const now=new Date().toISOString();
   const suggested=typeof market?.suggested==="number"&&Number.isFinite(market.suggested)?market.suggested:null;
   const next=items.map(x=>{
    if(x.id!==item.id)return x;
    const previous=historyFor(x);
    const valueHistory=suggested===null?previous:[...previous,{value:suggested,currency:market?.currency||"GBP",checkedAt:now}].slice(-24);
    return {...x,market,marketUpdatedAt:now,valueHistory};
   });
   await persist(next);
   const changed=next.find(x=>x.id===item.id);if(changed)await saveCollectionItem(changed);
  }catch(e){
   const message=e&&typeof e==="object"&&"message" in e?String(e.message):"Market Intelligence is unavailable.";
   Alert.alert("Market Intelligence failed",message);
  }finally{setValuingId(null);}
 }

 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
  <View style={s.brandRow}><View style={s.logo}><Text style={s.logoText}>SAV</Text></View><View><Text style={s.brand}>My Collection</Text><Text style={s.brandSub}>Understand what your saved items may be worth</Text>
   <View style={s.syncRow}><Ionicons name={syncState==="synced"?"cloud-done-outline":syncState==="failed"||syncState==="offline"?"cloud-offline-outline":syncState==="syncing"?"sync-outline":"phone-portrait-outline"} size={13} color=DynamicColorIOS({light:"#66858d",dark:"#9db7b9"})/><Text style={s.syncText}>{syncState==="synced"?"Synced to your AskSAV account":syncState==="synced"?"Synced to AskSAV Cloud":syncState==="failed"?"Cloud sync unavailable - saved on this device":syncState==="offline"?"Cloud sync unavailable - saved on this device":syncState==="syncing"?"Syncing with AskSAV Cloud...":"On this device - sign in to sync"}</Text></View>
  </View></View>

  <View style={s.collectionTools}>
   <View style={s.searchBox}><Ionicons name="search-outline" size={18} color=DynamicColorIOS({light:"#66858d",dark:"#9db7b9"})/><TextInput style={s.searchInput} value={collectionSearch} onChangeText={setCollectionSearch} placeholder="Search your Collection" placeholderTextColor=DynamicColorIOS({light:"#789097",dark:"#9db7b9"}) returnKeyType="search"/>{collectionSearch?<TouchableOpacity onPress={()=>setCollectionSearch("")}><Ionicons name="close-circle" size={18} color=DynamicColorIOS({light:"#789097",dark:"#9db7b9"})/></TouchableOpacity>:null}</View>
   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
    {([["ALL","All"],["VALUED","Valued"],["NOT_VALUED","Not valued"]] as const).map(([key,label])=><TouchableOpacity key={key} style={[s.filterChip,collectionFilter===key&&s.filterChipActive]} onPress={()=>setCollectionFilter(key)}><Text style={[s.filterChipText,collectionFilter===key&&s.filterChipTextActive]}>{label}</Text></TouchableOpacity>)}
   </ScrollView>
   <View style={s.sortRow}><Text style={s.sortLabel}>SORT</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sortChoices}>
    {([["NEWEST","Newest"],["OLDEST","Oldest"],["HIGH_VALUE","Highest value"],["LOW_VALUE","Lowest value"]] as const).map(([key,label])=><TouchableOpacity key={key} style={[s.sortChip,collectionSort===key&&s.sortChipActive]} onPress={()=>setCollectionSort(key)}><Text style={[s.sortChipText,collectionSort===key&&s.sortChipTextActive]}>{label}</Text></TouchableOpacity>)}
   </ScrollView></View>
   <Text style={s.resultCount}>{filteredItems.length===items.length?items.length+" saved item"+(items.length===1?"":"s"):filteredItems.length+" of "+items.length+" items shown"}</Text>
  </View>

  <View style={s.valueDashboard}>
   <Text style={s.dashboardEyebrow}>ESTIMATED COLLECTION VALUE</Text>
   <Text style={s.dashboardValue}>{totalText}</Text>
   <Text style={s.dashboardNote}>{currencies.length>1?"Items use more than one currency, so AskSAV does not combine them into a misleading total.":"Based on current suggested Market Intelligence values."}</Text>
   <View style={s.statsRow}>
    <View style={s.stat}><Text style={s.statValue}>{items.length}</Text><Text style={s.statLabel}>Saved</Text></View>
    <View style={s.stat}><Text style={s.statValue}>{valued.length}</Text><Text style={s.statLabel}>Valued</Text></View>
    <View style={s.stat}><Text style={s.statValue}>{unvalued}</Text><Text style={s.statLabel}>Need value</Text></View>
   </View>
  </View>

  {items.length===0?<View style={s.empty}>
   <View style={s.emptyIcon}><Ionicons name="bookmark-outline" size={34} color="#087f72"/></View>
   <Text style={s.emptyTitle}>Your collection is empty</Text>
   <Text style={s.emptyCopy}>Analyse an item and choose Save to My Collection to keep it here.</Text>
   <TouchableOpacity style={s.primary} onPress={()=>router.push("/")}><Ionicons name="camera-outline" size={19} color=DynamicColorIOS({light:"#fff",dark:"#10282d"})/><Text style={s.primaryText}>Analyse an item</Text></TouchableOpacity>
  </View>:filteredItems.length===0?<View style={s.empty}>
   <View style={s.emptyIcon}><Ionicons name="search-outline" size={34} color="#087f72"/></View>
   <Text style={s.emptyTitle}>No matching items</Text>
   <Text style={s.emptyCopy}>Try another search or change the Collection filter.</Text>
   <TouchableOpacity style={s.clearFilters} onPress={()=>{setCollectionSearch("");setCollectionFilter("ALL");setCollectionSort("NEWEST");}}><Text style={s.clearFiltersText}>Clear search and filters</Text></TouchableOpacity>
  </View>:filteredItems.map(item=>{
   const hasValue=marketNumber(item)!==null;
   const loading=valuingId===item.id;
   return <TouchableOpacity key={item.id} style={s.card} activeOpacity={0.82} onPress={()=>router.push({pathname:"/collection-detail",params:{id:item.id}})}>

    <View style={s.cardTop}>
     {item.imageUri?<Image source={{uri:item.imageUri}} style={s.image}/>:<View style={[s.image,s.placeholder]}><Ionicons name="image-outline" size={28} color=DynamicColorIOS({light:"#789097",dark:"#9db7b9"})/></View>}
     <View style={s.body}>
      <Text style={s.name} numberOfLines={2}>{item.name||"Saved item"}</Text>
      {item.category?<Text style={s.category}>{item.category}</Text>:null}
      <View style={s.meta}>
       {item.condition?<View style={s.pill}><Text style={s.pillText}>{item.condition}</Text></View>:null}
       <View style={[s.statusPill,hasValue?s.statusValued:s.statusMissing]}><Text style={[s.statusText,hasValue?s.statusTextValued:s.statusTextMissing]}>{hasValue?"VALUED":"NOT VALUED"}</Text></View>
      </View>
     </View>
     <TouchableOpacity style={s.remove} onPress={()=>confirmRemove(item)} accessibilityLabel="Remove from Collection"><Ionicons name="trash-outline" size={18} color="#8a4933"/></TouchableOpacity>
    </View>
    <View style={s.valueRow}>
     <View><Text style={s.valueLabel}>{hasValue?"SUGGESTED VALUE":"MARKET VALUE"}</Text><Text style={hasValue?s.value:s.noValue}>{hasValue?marketValue(item):"Not checked yet"}</Text>{hasValue?<Text style={s.date}>Last valued {valuedDate(item)}</Text>:<Text style={s.date}>Saved {valuedDate(item)}</Text>}</View>
     <TouchableOpacity style={s.refreshButton} onPress={()=>refreshMarketValue(item)} disabled={loading||valuingId!==null}>
      {loading?<ActivityIndicator color="#087f72"/>:<Ionicons name={hasValue?"refresh-outline":"globe-outline"} size={17} color="#087f72"/>}
      <Text style={s.refreshText}>{loading?"Checking...":hasValue?"Refresh value":"Get value"}</Text>
     </TouchableOpacity>
    </View>
    {hasValue?(()=>{
     const history=historyFor(item);
     const change=changeText(history);
     return <View style={s.historyBox}>
      <View style={s.historyHeader}><View><Text style={s.historyEyebrow}>VALUE HISTORY</Text><Text style={s.historyTitle}>{history.length>1?"Recent valuations":"First valuation recorded"}</Text></View>{change?<View style={[s.changePill,change.startsWith("Up")?s.changeUp:change.startsWith("Down")?s.changeDown:s.changeFlat]}><Text style={s.changeText}>{change}</Text></View>:null}</View>
      {history.slice(-3).reverse().map((p,i)=><View key={p.checkedAt+"-"+i} style={s.historyRow}><View style={s.timeline}><View style={[s.dot,i===0&&s.dotLatest]}/>{i<history.slice(-3).length-1?<View style={s.line}/>:null}</View><View style={s.historyBody}><Text style={s.historyMoney}>{pointMoney(p)}</Text><Text style={s.historyDate}>{new Date(p.checkedAt).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</Text></View>{i===0?<Text style={s.latest}>LATEST</Text>:null}</View>)}
      {history.length===1?<Text style={s.historyHint}>Refresh the market value later to start seeing how this item's indicative value changes over time.</Text>:null}
     </View>;
    })():null}
    <View style={s.openDetail}><Text style={s.openDetailText}>View item details</Text><Ionicons name="chevron-forward" size={16} color="#087f72"/></View>
   </TouchableOpacity>
  })}
  <View style={s.disclaimer}><Ionicons name="information-circle-outline" size={16} color=DynamicColorIOS({light:"#66858d",dark:"#9db7b9"})/><Text style={s.disclaimerText}>Collection values are indicative Market Intelligence, not formal valuations or guaranteed sale prices.</Text></View>
  <Text style={s.note}>Your Collection is synced with your AskSAV account and can be restored after you sign in on another installation.</Text>
 </ScrollView></SafeAreaView>;
}

const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:DynamicColorIOS({light:"#f4fbf9",dark:"#07191d"})},page:{paddingHorizontal:20,paddingTop:16,paddingBottom:36},
 brandRow:{flexDirection:"row",alignItems:"center",gap:11},syncRow:{flexDirection:"row",alignItems:"center",gap:4,marginTop:4},syncText:{color:DynamicColorIOS({light:"#66858d",dark:"#9db7b9"}),fontSize:9,fontWeight:"700"},logo:{width:48,height:48,borderRadius:15,backgroundColor:"#13b8aa",alignItems:"center",justifyContent:"center"},logoText:{color:DynamicColorIOS({light:"#fff",dark:"#10282d"}),fontWeight:"900",fontSize:16},brand:{color:"#082f49",fontSize:24,fontWeight:"900"},brandSub:{color:DynamicColorIOS({light:"#66858d",dark:"#9db7b9"}),fontSize:11},
 collectionTools:{marginTop:20,marginBottom:4},searchBox:{minHeight:48,borderRadius:15,borderWidth:1,borderColor:DynamicColorIOS({light:"#cfe8e2",dark:"#24464c"}),backgroundColor:DynamicColorIOS({light:"#fff",dark:"#10282d"}),paddingHorizontal:13,flexDirection:"row",alignItems:"center",gap:8},searchInput:{flex:1,color:DynamicColorIOS({light:"#173f51",dark:"#eefbf8"}),fontSize:14,paddingVertical:10},filterRow:{gap:7,paddingVertical:10},filterChip:{borderRadius:99,borderWidth:1,borderColor:DynamicColorIOS({light:"#cfe8e2",dark:"#24464c"}),backgroundColor:DynamicColorIOS({light:"#fff",dark:"#10282d"}),paddingHorizontal:12,paddingVertical:7},filterChipActive:{backgroundColor:"#087f72",borderColor:"#087f72"},filterChipText:{color:"#557681",fontSize:11,fontWeight:"800"},filterChipTextActive:{color:DynamicColorIOS({light:"#fff",dark:"#10282d"})},sortRow:{flexDirection:"row",alignItems:"center",gap:8},sortLabel:{color:DynamicColorIOS({light:"#789097",dark:"#9db7b9"}),fontSize:9,fontWeight:"900",letterSpacing:.7},sortChoices:{gap:6},sortChip:{borderRadius:10,backgroundColor:"#eef6f4",paddingHorizontal:9,paddingVertical:6},sortChipActive:{backgroundColor:"#d8f1eb"},sortChipText:{color:DynamicColorIOS({light:"#66858d",dark:"#9db7b9"}),fontSize:10,fontWeight:"800"},sortChipTextActive:{color:"#087f72"},resultCount:{color:DynamicColorIOS({light:"#789097",dark:"#9db7b9"}),fontSize:10,fontWeight:"700",marginTop:9},clearFilters:{marginTop:14,paddingHorizontal:15,paddingVertical:10,borderRadius:12,backgroundColor:DynamicColorIOS({light:"#e8f7f4",dark:"#17383d"})},clearFiltersText:{color:"#087f72",fontSize:11,fontWeight:"900"},
 valueDashboard:{backgroundColor:DynamicColorIOS({light:"#e8f7f4",dark:"#17383d"}),borderWidth:1,borderColor:"#b9ddd5",borderRadius:22,padding:19,marginTop:24,marginBottom:14},dashboardEyebrow:{color:"#087f72",fontSize:10,fontWeight:"900",letterSpacing:.8},dashboardValue:{color:DynamicColorIOS({light:"#062f4f",dark:"#eefbf8"}),fontSize:36,fontWeight:"900",marginTop:4},dashboardNote:{color:DynamicColorIOS({light:"#5f7c86",dark:"#9db7b9"}),fontSize:11,lineHeight:16,marginTop:4},statsRow:{flexDirection:"row",gap:8,marginTop:16},stat:{flex:1,backgroundColor:"rgba(255,255,255,0.72)",borderRadius:13,paddingVertical:10,alignItems:"center"},statValue:{color:DynamicColorIOS({light:"#062f4f",dark:"#eefbf8"}),fontSize:18,fontWeight:"900"},statLabel:{color:DynamicColorIOS({light:"#66858d",dark:"#9db7b9"}),fontSize:10,fontWeight:"800",marginTop:2},
 card:{backgroundColor:DynamicColorIOS({light:"#fff",dark:"#10282d"}),borderWidth:1,borderColor:"#d9ebe7",borderRadius:18,padding:12,marginBottom:10},cardTop:{flexDirection:"row",gap:12,alignItems:"center"},image:{width:76,height:76,borderRadius:13,backgroundColor:"#eef6f4"},placeholder:{alignItems:"center",justifyContent:"center"},body:{flex:1},name:{color:DynamicColorIOS({light:"#062f4f",dark:"#eefbf8"}),fontSize:15,fontWeight:"900"},category:{color:DynamicColorIOS({light:"#66858d",dark:"#9db7b9"}),fontSize:11,marginTop:3},meta:{flexDirection:"row",alignItems:"center",gap:6,marginTop:7,flexWrap:"wrap"},pill:{backgroundColor:DynamicColorIOS({light:"#e8f7f4",dark:"#17383d"}),borderRadius:99,paddingHorizontal:8,paddingVertical:4},pillText:{color:"#087f72",fontSize:10,fontWeight:"800"},statusPill:{borderRadius:99,paddingHorizontal:7,paddingVertical:4},statusValued:{backgroundColor:DynamicColorIOS({light:"#e8f7f4",dark:"#17383d"})},statusMissing:{backgroundColor:"#fff5e8"},statusText:{fontSize:9,fontWeight:"900"},statusTextValued:{color:"#087f72"},statusTextMissing:{color:"#9a6418"},remove:{padding:8},
 valueRow:{borderTopWidth:1,borderTopColor:DynamicColorIOS({light:"#edf4f2",dark:"#24464c"}),marginTop:11,paddingTop:11,flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:10},valueLabel:{color:DynamicColorIOS({light:"#789097",dark:"#9db7b9"}),fontSize:9,fontWeight:"900",letterSpacing:.6},value:{color:DynamicColorIOS({light:"#062f4f",dark:"#eefbf8"}),fontSize:22,fontWeight:"900",marginTop:2},noValue:{color:DynamicColorIOS({light:"#66858d",dark:"#9db7b9"}),fontSize:14,fontWeight:"800",marginTop:3},date:{color:DynamicColorIOS({light:"#789097",dark:"#9db7b9"}),fontSize:9,marginTop:3},refreshButton:{minHeight:38,borderRadius:12,borderWidth:1,borderColor:"#b9ddd5",backgroundColor:DynamicColorIOS({light:"#f4fbf9",dark:"#07191d"}),paddingHorizontal:11,flexDirection:"row",gap:6,alignItems:"center",justifyContent:"center"},refreshText:{color:"#087f72",fontSize:11,fontWeight:"900"},
 empty:{backgroundColor:DynamicColorIOS({light:"#fff",dark:"#10282d"}),borderWidth:1,borderColor:"#d9ebe7",borderRadius:24,padding:24,alignItems:"center",marginTop:8},emptyIcon:{width:68,height:68,borderRadius:34,backgroundColor:DynamicColorIOS({light:"#e8f7f4",dark:"#17383d"}),alignItems:"center",justifyContent:"center"},emptyTitle:{color:DynamicColorIOS({light:"#062f4f",dark:"#eefbf8"}),fontSize:21,fontWeight:"900",marginTop:15},emptyCopy:{color:DynamicColorIOS({light:"#66858d",dark:"#9db7b9"}),fontSize:13,lineHeight:20,textAlign:"center",marginTop:6},primary:{minHeight:52,borderRadius:15,backgroundColor:"#0aaf86",flexDirection:"row",gap:8,alignItems:"center",justifyContent:"center",paddingHorizontal:22,marginTop:18},primaryText:{color:DynamicColorIOS({light:"#fff",dark:"#10282d"}),fontSize:14,fontWeight:"900"},
 historyBox:{borderTopWidth:1,borderTopColor:DynamicColorIOS({light:"#edf4f2",dark:"#24464c"}),marginTop:11,paddingTop:11},historyHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:7},historyEyebrow:{color:"#087f72",fontSize:9,fontWeight:"900",letterSpacing:.7},historyTitle:{color:DynamicColorIOS({light:"#062f4f",dark:"#eefbf8"}),fontSize:12,fontWeight:"800",marginTop:2},changePill:{borderRadius:99,paddingHorizontal:8,paddingVertical:5},changeUp:{backgroundColor:DynamicColorIOS({light:"#e8f7f4",dark:"#17383d"})},changeDown:{backgroundColor:"#fff1ed"},changeFlat:{backgroundColor:"#f0f4f4"},changeText:{color:"#315d63",fontSize:9,fontWeight:"900"},historyRow:{minHeight:40,flexDirection:"row",alignItems:"stretch"},timeline:{width:18,alignItems:"center"},dot:{width:8,height:8,borderRadius:4,backgroundColor:"#a8c7c1",marginTop:7},dotLatest:{backgroundColor:"#0a9b80"},line:{width:1,flex:1,backgroundColor:"#d5e8e4",marginVertical:2},historyBody:{flex:1,paddingBottom:8},historyMoney:{color:DynamicColorIOS({light:"#173f51",dark:"#eefbf8"}),fontSize:13,fontWeight:"900"},historyDate:{color:DynamicColorIOS({light:"#789097",dark:"#9db7b9"}),fontSize:9,marginTop:1},latest:{color:"#087f72",fontSize:8,fontWeight:"900",letterSpacing:.5,marginTop:4},historyHint:{color:DynamicColorIOS({light:"#66858d",dark:"#9db7b9"}),fontSize:10,lineHeight:15,backgroundColor:DynamicColorIOS({light:"#f4fbf9",dark:"#07191d"}),borderRadius:10,padding:9,marginTop:2},
 openDetail:{borderTopWidth:1,borderTopColor:DynamicColorIOS({light:"#edf4f2",dark:"#24464c"}),marginTop:10,paddingTop:10,flexDirection:"row",alignItems:"center",justifyContent:"flex-end",gap:4},openDetailText:{color:"#087f72",fontSize:10,fontWeight:"900"},
  disclaimer:{flexDirection:"row",gap:7,backgroundColor:"#f0f6f5",borderRadius:13,padding:11,marginTop:5},disclaimerText:{flex:1,color:DynamicColorIOS({light:"#66858d",dark:"#9db7b9"}),fontSize:10,lineHeight:15},note:{color:DynamicColorIOS({light:"#789097",dark:"#9db7b9"}),fontSize:10,lineHeight:15,textAlign:"center",marginTop:12}
});
