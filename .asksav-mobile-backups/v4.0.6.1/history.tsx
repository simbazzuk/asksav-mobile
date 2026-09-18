// AskSAV Mobile v4.0.3.1
import { useCallback, useState } from "react";
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
type HistoryItem={id:string;createdAt:string;name:string;category?:string;condition?:string;imageUri?:string};
export default function HistoryScreen(){
 const [items,setItems]=useState<HistoryItem[]>([]);
 const load=useCallback(()=>{AsyncStorage.getItem("asksav.mobile.history.v1").then(v=>setItems(v?JSON.parse(v):[])).catch(()=>setItems([]));},[]);
 useFocusEffect(load);
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
  <Text style={s.eyebrow}>YOUR ASKSAV</Text><Text style={s.title}>History</Text><Text style={s.copy}>Recent items analysed on this device.</Text>
  {!items.length?<View style={s.empty}><Ionicons name="time-outline" size={38} color="#0a9b80"/><Text style={s.emptyTitle}>No analyses yet</Text><Text style={s.emptyCopy}>Items you analyse will appear here.</Text></View>:
  items.map(item=><TouchableOpacity key={item.id} style={s.card} onPress={()=>router.push({pathname:"/history-detail",params:{id:item.id}})}>
   {item.imageUri?<Image source={{uri:item.imageUri}} style={s.thumb}/>:<View style={s.thumbFallback}><Ionicons name="image-outline" size={24} color="#789097"/></View>}
   <View style={s.body}><Text style={s.name}>{item.name||"Item identified"}</Text><Text style={s.meta}>{[item.category,item.condition].filter(Boolean).join("  |  ")}</Text><Text style={s.date}>{new Date(item.createdAt).toLocaleString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</Text></View>
   <Ionicons name="chevron-forward" size={20} color="#789097"/>
  </TouchableOpacity>)}
 </ScrollView></SafeAreaView>
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:"#f4fbf9"},page:{padding:22,paddingBottom:36},eyebrow:{color:"#0a9b80",fontSize:12,fontWeight:"900",letterSpacing:1.1,marginTop:18},title:{color:"#062f4f",fontSize:38,fontWeight:"900",marginTop:5},copy:{color:"#5f7c86",fontSize:15,marginTop:5,marginBottom:20},empty:{backgroundColor:"#fff",borderWidth:1,borderColor:"#cfe8e2",borderRadius:22,padding:28,alignItems:"center",marginTop:14},emptyTitle:{color:"#062f4f",fontSize:20,fontWeight:"900",marginTop:12},emptyCopy:{color:"#66858d",fontSize:14,marginTop:5},card:{backgroundColor:"#fff",borderWidth:1,borderColor:"#cfe8e2",borderRadius:18,padding:11,marginBottom:11,flexDirection:"row",gap:13,alignItems:"center"},thumb:{width:76,height:76,borderRadius:13,backgroundColor:"#edf4f2"},thumbFallback:{width:76,height:76,borderRadius:13,backgroundColor:"#edf4f2",alignItems:"center",justifyContent:"center"},body:{flex:1,justifyContent:"center"},name:{color:"#062f4f",fontSize:16,fontWeight:"900"},meta:{color:"#087f72",fontSize:12,fontWeight:"800",marginTop:5},date:{color:"#789097",fontSize:11,marginTop:5}});