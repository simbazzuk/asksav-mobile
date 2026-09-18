// AskSAV Mobile v0.4
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../lib/firebase";
import { analyseAskSAVImage } from "../lib/asksav-api";

function text(value:any):string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join(", ");
  if (typeof value === "object") return text(value.name || value.label || value.value || value.summary || value.description);
  return "";
}
function first(...values:any[]) { return values.map(text).find(Boolean) || ""; }
function money(value:any):string {
  if (value == null || value === "") return "";
  if (typeof value === "number") return `Â£${Math.round(value).toLocaleString("en-GB")}`;
  const s=String(value);
  return /^[0-9,.]+$/.test(s) ? `Â£${s}` : s;
}
function ResultRow({icon,label,value}:{icon:any,label:string,value:string}) {
  if (!value) return null;
  return <View style={s.resultRow}><View style={s.resultIcon}><Ionicons name={icon} size={18} color="#087f72"/></View><View style={s.resultBody}><Text style={s.resultLabel}>{label}</Text><Text style={s.resultValue}>{value}</Text></View></View>;
}

export default function HomeScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [user,setUser]=useState<User|null>(auth.currentUser);
  const [analysing,setAnalysing]=useState(false);
  const [analysis,setAnalysis]=useState<any>(null);
  useEffect(()=>onAuthStateChanged(auth,setUser),[]);

  async function usePhoto() {
    if (!imageUri) return;
    if (!user) { Alert.alert("Sign in required","Open Account and sign in before analysing an item."); return; }
    if (!user.emailVerified) { Alert.alert("Verify your email","Verify your AskSAV email address before analysing an item."); return; }
    try {
      setAnalysing(true); setAnalysis(null);
      const result=await analyseAskSAVImage(user,imageUri);
      setAnalysis(result);
    } catch(e:any) {
      Alert.alert("Analysis failed",e?.message||"AskSAV could not analyse this photo.");
    } finally { setAnalysing(false); }
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) { Alert.alert("Camera permission needed","Allow AskSAV to use your camera so you can photograph an item."); return; }
    const result = await ImagePicker.launchCameraAsync({mediaTypes:["images"],allowsEditing:false,quality:0.9});
    if (!result.canceled && result.assets[0]?.uri) { setImageUri(result.assets[0].uri); setAnalysis(null); }
  }

  async function choosePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert("Photos permission needed","Allow AskSAV to access your photos so you can choose an item."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({mediaTypes:["images"],allowsEditing:false,quality:0.9});
    if (!result.canceled && result.assets[0]?.uri) { setImageUri(result.assets[0].uri); setAnalysis(null); }
  }

  const itemName=first(analysis?.identification?.name,analysis?.identification?.title,analysis?.name,"Analysis complete");
  const description=first(analysis?.identification?.description,analysis?.summary);
  const confidence=first(analysis?.verification?.confidence,analysis?.identification?.confidence,analysis?.confidence);
  const verification=first(analysis?.verification?.status,analysis?.verification?.summary,analysis?.verification?.result);
  const condition=first(analysis?.condition?.grade,analysis?.condition?.rating,analysis?.condition?.condition,analysis?.condition?.summary,analysis?.condition);
  const conditionNotes=first(analysis?.condition?.description,analysis?.condition?.notes);
  const estimate=first(
    analysis?.valuation?.estimatedValue,analysis?.valuation?.estimated_value,analysis?.valuation?.value,
    analysis?.value?.estimated,analysis?.value?.value,analysis?.estimatedValue
  );
  const low=first(analysis?.valuation?.low,analysis?.value?.low);
  const high=first(analysis?.valuation?.high,analysis?.value?.high);
  const valueText=estimate ? money(estimate) : (low || high) ? `${money(low) || "?"} - ${money(high) || "?"}` : "";
  const category=first(analysis?.identification?.category,analysis?.category);

  if (imageUri) {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.previewPage}>
          <View style={s.brandRow}><View style={s.logo}><Text style={s.logoText}>SAV</Text></View><View><Text style={s.brand}>AskSAV</Text><Text style={s.brandSub}>Visual Intelligence</Text></View></View>

          {!analysis ? <>
            <Text style={s.eyebrow}>PHOTO READY</Text>
            <Text style={s.previewTitle}>Use this photo?</Text>
            <Text style={s.previewCopy}>Make sure the item is clear and fills enough of the frame for AskSAV to understand it.</Text>
          </> : <>
            <Text style={s.eyebrow}>ASKSAV RESULT</Text>
            <Text style={s.previewTitle}>{itemName}</Text>
            {description ? <Text style={s.previewCopy}>{description}</Text> : null}
          </>}

          <View style={[s.imageFrame,analysis && s.imageFrameResult]}><Image source={{uri:imageUri}} style={s.image} resizeMode="contain"/></View>

          {!analysis ? <TouchableOpacity style={s.primary} onPress={usePhoto} disabled={analysing}>
            {analysing ? <ActivityIndicator color="#fff"/> : <Ionicons name="sparkles" size={20} color="#fff"/>}
            <Text style={s.primaryText}>{analysing ? "Analysing..." : "Use this photo"}</Text>
          </TouchableOpacity> : <>
            <View style={s.resultCard}>
              <Text style={s.sectionTitle}>What AskSAV sees</Text>
              <ResultRow icon="pricetag-outline" label="Identification" value={itemName}/>
              <ResultRow icon="grid-outline" label="Category" value={category}/>
              <ResultRow icon="shield-checkmark-outline" label="Verification" value={verification}/>
              <ResultRow icon="analytics-outline" label="Confidence" value={confidence}/>
            </View>
            <View style={s.resultCard}>
              <Text style={s.sectionTitle}>Visible condition</Text>
              <ResultRow icon="search-outline" label="Condition" value={condition}/>
              {conditionNotes ? <Text style={s.detailText}>{conditionNotes}</Text> : null}
            </View>
            {valueText ? <View style={s.valueCard}>
              <View><Text style={s.valueLabel}>INDICATIVE VALUE</Text><Text style={s.valueAmount}>{valueText}</Text></View>
              <Ionicons name="cash-outline" size={30} color="#087f72"/>
              <Text style={s.valueNote}>Based on the visual analysis available for this item. Market evidence can refine the picture.</Text>
            </View> : null}
            <TouchableOpacity style={s.marketButton} onPress={()=>Alert.alert("Market Intelligence","Optional Market Intelligence will be connected in the next mobile build.")}>
              <View style={s.marketIcon}><Ionicons name="globe-outline" size={22} color="#fff"/></View>
              <View style={{flex:1}}><Text style={s.marketTitle}>Market Intelligence</Text><Text style={s.marketCopy}>Optional deeper market evidence and pricing context</Text></View>
              <Ionicons name="chevron-forward" size={20} color="#087f72"/>
            </TouchableOpacity>
            <TouchableOpacity style={s.primary} onPress={()=>{setImageUri(null);setAnalysis(null);}}>
              <Ionicons name="camera-outline" size={20} color="#fff"/><Text style={s.primaryText}>Analyse another item</Text>
            </TouchableOpacity>
          </>}

          {!analysis ? <View style={s.actionRow}>
            <TouchableOpacity style={s.halfButton} onPress={takePhoto}><Ionicons name="camera-outline" size={19} color="#087f72"/><Text style={s.secondaryText}>Retake</Text></TouchableOpacity>
            <TouchableOpacity style={s.halfButton} onPress={choosePhoto}><Ionicons name="images-outline" size={19} color="#087f72"/><Text style={s.secondaryText}>Choose another</Text></TouchableOpacity>
          </View> : null}
          {!analysis ? <TouchableOpacity onPress={()=>setImageUri(null)}><Text style={s.cancel}>Cancel</Text></TouchableOpacity> : null}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
    <View style={s.brandRow}><View style={s.logo}><Text style={s.logoText}>SAV</Text></View><View><Text style={s.brand}>AskSAV</Text><Text style={s.brandSub}>Visual Intelligence</Text></View></View>
    <View style={s.hero}><Text style={s.eyebrow}>SEE IT. KNOW IT. VALUE IT.</Text><Text style={s.title}>What have you got?</Text><Text style={s.subtitle}>Take a photo of almost anything. AskSAV helps identify it, assess visible condition and understand its value.</Text></View>
    <View style={s.card}><View style={s.camera}><Ionicons name="camera-outline" size={42} color="#087f72"/></View><Text style={s.cardTitle}>Analyse an item</Text><Text style={s.copy}>Start with a clear photo of the item you want to understand.</Text>
      <TouchableOpacity style={s.primary} onPress={takePhoto}><Ionicons name="camera" size={20} color="#fff"/><Text style={s.primaryText}>Take a photo</Text></TouchableOpacity>
      <TouchableOpacity style={s.secondary} onPress={choosePhoto}><Ionicons name="images-outline" size={20} color="#087f72"/><Text style={s.secondaryText}>Choose from photos</Text></TouchableOpacity>
    </View>
  </ScrollView></SafeAreaView>;
}

const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:"#f4fbf9"},page:{paddingHorizontal:22,paddingTop:16,paddingBottom:28},previewPage:{paddingHorizontal:22,paddingTop:16,paddingBottom:38},
 brandRow:{flexDirection:"row",alignItems:"center",gap:11},logo:{width:48,height:48,borderRadius:15,backgroundColor:"#13b8aa",alignItems:"center",justifyContent:"center"},logoText:{color:"#fff",fontWeight:"900",fontSize:16},brand:{color:"#082f49",fontSize:24,fontWeight:"900"},brandSub:{color:"#66858d",fontSize:11},
 hero:{marginTop:38},eyebrow:{color:"#0a9b80",fontSize:12,fontWeight:"900",letterSpacing:1.2,marginTop:30},title:{color:"#062f4f",fontSize:38,lineHeight:43,fontWeight:"900",marginTop:8},subtitle:{color:"#4f6f7b",fontSize:16,lineHeight:24,marginTop:12},
 card:{backgroundColor:"#fff",borderRadius:26,padding:24,marginTop:30,borderWidth:1,borderColor:"#d9ebe7",shadowColor:"#000",shadowOpacity:.06,shadowRadius:18,shadowOffset:{width:0,height:8},elevation:3},camera:{width:78,height:78,borderRadius:39,backgroundColor:"#e7f8f4",alignItems:"center",justifyContent:"center",alignSelf:"center"},cardTitle:{color:"#062f4f",fontSize:25,fontWeight:"900",textAlign:"center",marginTop:18},copy:{color:"#67818a",fontSize:14,lineHeight:21,textAlign:"center",marginTop:7,marginBottom:22},
 primary:{minHeight:56,borderRadius:16,backgroundColor:"#0aaf86",flexDirection:"row",gap:9,alignItems:"center",justifyContent:"center",marginTop:12},primaryText:{color:"#fff",fontSize:16,fontWeight:"900"},secondary:{minHeight:54,borderRadius:16,marginTop:11,borderWidth:1,borderColor:"#b9ddd5",flexDirection:"row",gap:9,alignItems:"center",justifyContent:"center"},secondaryText:{color:"#087f72",fontSize:14,fontWeight:"800"},
 previewTitle:{color:"#062f4f",fontSize:32,lineHeight:38,fontWeight:"900",marginTop:7},previewCopy:{color:"#5f7c86",fontSize:15,lineHeight:22,marginTop:8},imageFrame:{height:390,backgroundColor:"#fff",borderRadius:24,borderWidth:1,borderColor:"#d9ebe7",overflow:"hidden",marginTop:22,marginBottom:10},imageFrameResult:{height:260},image:{width:"100%",height:"100%"},
 actionRow:{flexDirection:"row",gap:10,marginTop:10},halfButton:{flex:1,minHeight:52,borderRadius:15,borderWidth:1,borderColor:"#b9ddd5",flexDirection:"row",gap:7,alignItems:"center",justifyContent:"center",backgroundColor:"#fff"},
 resultCard:{backgroundColor:"#fff",borderWidth:1,borderColor:"#cfe8e2",borderRadius:20,padding:18,marginTop:12},sectionTitle:{color:"#062f4f",fontSize:19,fontWeight:"900",marginBottom:5},resultRow:{flexDirection:"row",gap:12,paddingVertical:11,borderTopWidth:1,borderTopColor:"#edf4f2"},resultIcon:{width:34,height:34,borderRadius:10,backgroundColor:"#e8f7f4",alignItems:"center",justifyContent:"center"},resultBody:{flex:1},resultLabel:{color:"#789097",fontSize:11,fontWeight:"800",textTransform:"uppercase",letterSpacing:.5},resultValue:{color:"#173f51",fontSize:15,lineHeight:21,fontWeight:"700",marginTop:2},detailText:{color:"#5f7c86",fontSize:14,lineHeight:21,marginTop:8},
 valueCard:{backgroundColor:"#e8f7f4",borderWidth:1,borderColor:"#b9ddd5",borderRadius:20,padding:18,marginTop:12,flexDirection:"row",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"},valueLabel:{color:"#087f72",fontSize:11,fontWeight:"900",letterSpacing:.8},valueAmount:{color:"#062f4f",fontSize:30,fontWeight:"900",marginTop:3},valueNote:{width:"100%",color:"#5f7c86",fontSize:12,lineHeight:18,marginTop:10},
 marketButton:{backgroundColor:"#fff",borderWidth:1.5,borderColor:"#8fd4c8",borderRadius:20,padding:15,marginTop:12,flexDirection:"row",alignItems:"center",gap:12},marketIcon:{width:42,height:42,borderRadius:13,backgroundColor:"#087f72",alignItems:"center",justifyContent:"center"},marketTitle:{color:"#062f4f",fontSize:16,fontWeight:"900"},marketCopy:{color:"#66858d",fontSize:12,lineHeight:17,marginTop:2},
 cancel:{color:"#647b83",fontSize:14,fontWeight:"800",textAlign:"center",paddingVertical:18}
});
