// AskSAV Mobile v4.2.0 - My Collection
import { useCallback, useState } from "react";
import { Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";

const KEY="asksav.mobile.collection.v1";
type Item={id:string;savedAt:string;name?:string;category?:string;condition?:string;confidence?:string;imageUri?:string;analysis?:any;market?:any};

function marketValue(item:Item){
 const m=item.market||{};
 const currency=m.currency==="USD"?"$":m.currency==="EUR"?"\u20AC":"\u00A3";
 const v=m.suggested;
 return typeof v==="number"?currency+Math.round(v).toLocaleString("en-GB"):"";
}

export default function CollectionScreen(){
 const [items,setItems]=useState<Item[]>([]);
 const router=useRouter();
 const load=useCallback(()=>{AsyncStorage.getItem(KEY).then(raw=>setItems(raw?JSON.parse(raw):[])).catch(()=>setItems([]));},[]);
 useFocusEffect(load);

 async function remove(id:string){
  const next=items.filter(x=>x.id!==id);
  await AsyncStorage.setItem(KEY,JSON.stringify(next));
  setItems(next);
 }
 function confirmRemove(item:Item){
  Alert.alert("Remove from Collection","Remove "+(item.name||"this item")+" from My Collection?",[
   {text:"Cancel",style:"cancel"},
   {text:"Remove",style:"destructive",onPress:()=>remove(item.id)}
  ]);
 }

 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
  <View style={s.brandRow}><View style={s.logo}><Text style={s.logoText}>SAV</Text></View><View><Text style={s.brand}>My Collection</Text><Text style={s.brandSub}>Items you have chosen to keep</Text></View></View>
  <View style={s.summary}><View><Text style={s.summaryLabel}>SAVED ITEMS</Text><Text style={s.summaryValue}>{items.length}</Text></View><Ionicons name="albums-outline" size={30} color="#087f72"/></View>
  {items.length===0?<View style={s.empty}>
   <View style={s.emptyIcon}><Ionicons name="bookmark-outline" size={34} color="#087f72"/></View>
   <Text style={s.emptyTitle}>Your collection is empty</Text>
   <Text style={s.emptyCopy}>Analyse an item and choose Save to My Collection to keep it here.</Text>
   <TouchableOpacity style={s.primary} onPress={()=>router.push("/")}><Ionicons name="camera-outline" size={19} color="#fff"/><Text style={s.primaryText}>Analyse an item</Text></TouchableOpacity>
  </View>:items.map(item=><View key={item.id} style={s.card}>
   {item.imageUri?<Image source={{uri:item.imageUri}} style={s.image}/>:<View style={[s.image,s.placeholder]}><Ionicons name="image-outline" size={28} color="#789097"/></View>}
   <View style={s.body}>
    <Text style={s.name} numberOfLines={2}>{item.name||"Saved item"}</Text>
    {item.category?<Text style={s.category}>{item.category}</Text>:null}
    <View style={s.meta}>
     {item.condition?<View style={s.pill}><Text style={s.pillText}>{item.condition}</Text></View>:null}
     {marketValue(item)?<Text style={s.value}>{marketValue(item)}</Text>:null}
    </View>
    <Text style={s.date}>Saved {new Date(item.savedAt).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</Text>
   </View>
   <TouchableOpacity style={s.remove} onPress={()=>confirmRemove(item)} accessibilityLabel="Remove from Collection"><Ionicons name="trash-outline" size={18} color="#8a4933"/></TouchableOpacity>
  </View>)}
  <Text style={s.note}>My Collection is stored on this device in v4.2.0. Removing the app may remove locally saved collection data.</Text>
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:"#f4fbf9"},page:{paddingHorizontal:20,paddingTop:16,paddingBottom:36},
 brandRow:{flexDirection:"row",alignItems:"center",gap:11},logo:{width:48,height:48,borderRadius:15,backgroundColor:"#13b8aa",alignItems:"center",justifyContent:"center"},logoText:{color:"#fff",fontWeight:"900",fontSize:16},brand:{color:"#082f49",fontSize:24,fontWeight:"900"},brandSub:{color:"#66858d",fontSize:11},
 summary:{backgroundColor:"#e8f7f4",borderWidth:1,borderColor:"#b9ddd5",borderRadius:20,padding:18,marginTop:24,marginBottom:14,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},summaryLabel:{color:"#087f72",fontSize:11,fontWeight:"900",letterSpacing:.8},summaryValue:{color:"#062f4f",fontSize:30,fontWeight:"900",marginTop:2},
 card:{backgroundColor:"#fff",borderWidth:1,borderColor:"#d9ebe7",borderRadius:18,padding:11,marginBottom:10,flexDirection:"row",gap:12,alignItems:"center"},image:{width:76,height:76,borderRadius:13,backgroundColor:"#eef6f4"},placeholder:{alignItems:"center",justifyContent:"center"},body:{flex:1},name:{color:"#062f4f",fontSize:15,fontWeight:"900"},category:{color:"#66858d",fontSize:11,marginTop:3},meta:{flexDirection:"row",alignItems:"center",gap:8,marginTop:7},pill:{backgroundColor:"#e8f7f4",borderRadius:99,paddingHorizontal:8,paddingVertical:4},pillText:{color:"#087f72",fontSize:10,fontWeight:"800"},value:{color:"#062f4f",fontSize:14,fontWeight:"900"},date:{color:"#789097",fontSize:10,marginTop:6},remove:{padding:8},
 empty:{backgroundColor:"#fff",borderWidth:1,borderColor:"#d9ebe7",borderRadius:24,padding:24,alignItems:"center",marginTop:18},emptyIcon:{width:68,height:68,borderRadius:34,backgroundColor:"#e8f7f4",alignItems:"center",justifyContent:"center"},emptyTitle:{color:"#062f4f",fontSize:21,fontWeight:"900",marginTop:15},emptyCopy:{color:"#66858d",fontSize:13,lineHeight:20,textAlign:"center",marginTop:6},primary:{minHeight:52,borderRadius:15,backgroundColor:"#0aaf86",flexDirection:"row",gap:8,alignItems:"center",justifyContent:"center",paddingHorizontal:22,marginTop:18},primaryText:{color:"#fff",fontSize:14,fontWeight:"900"},note:{color:"#789097",fontSize:10,lineHeight:15,textAlign:"center",marginTop:14}
});
