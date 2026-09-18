// AskSAV Mobile v0.2
import { useState } from "react";
import { Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

export default function HomeScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Camera permission needed", "Allow AskSAV to use your camera so you can photograph an item.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]?.uri) setImageUri(result.assets[0].uri);
  }

  async function choosePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photos permission needed", "Allow AskSAV to access your photos so you can choose an item.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]?.uri) setImageUri(result.assets[0].uri);
  }

  if (imageUri) {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.previewPage}>
          <View style={s.brandRow}>
            <View style={s.logo}><Text style={s.logoText}>SAV</Text></View>
            <View><Text style={s.brand}>AskSAV</Text><Text style={s.brandSub}>Visual Intelligence</Text></View>
          </View>
          <Text style={s.eyebrow}>PHOTO READY</Text>
          <Text style={s.previewTitle}>Use this photo?</Text>
          <Text style={s.previewCopy}>Make sure the item is clear and fills enough of the frame for AskSAV to understand it.</Text>
          <View style={s.imageFrame}><Image source={{ uri: imageUri }} style={s.image} resizeMode="contain" /></View>
          <TouchableOpacity style={s.primary} onPress={() => Alert.alert("Ready for analysis", "AskSAV AI analysis will be connected in Mobile v0.3.")}>
            <Ionicons name="sparkles" size={20} color="#fff" />
            <Text style={s.primaryText}>Use this photo</Text>
          </TouchableOpacity>
          <View style={s.actionRow}>
            <TouchableOpacity style={s.halfButton} onPress={takePhoto}><Ionicons name="camera-outline" size={19} color="#087f72"/><Text style={s.secondaryText}>Retake</Text></TouchableOpacity>
            <TouchableOpacity style={s.halfButton} onPress={choosePhoto}><Ionicons name="images-outline" size={19} color="#087f72"/><Text style={s.secondaryText}>Choose another</Text></TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setImageUri(null)}><Text style={s.cancel}>Cancel</Text></TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.page}>
        <View style={s.brandRow}>
          <View style={s.logo}><Text style={s.logoText}>SAV</Text></View>
          <View><Text style={s.brand}>AskSAV</Text><Text style={s.brandSub}>Visual Intelligence</Text></View>
        </View>
        <View style={s.hero}><Text style={s.eyebrow}>SEE IT. KNOW IT. VALUE IT.</Text><Text style={s.title}>What have you got?</Text><Text style={s.subtitle}>Take a photo of almost anything. AskSAV helps identify it, assess visible condition and understand its value.</Text></View>
        <View style={s.card}>
          <View style={s.camera}><Ionicons name="camera-outline" size={42} color="#087f72"/></View>
          <Text style={s.cardTitle}>Analyse an item</Text>
          <Text style={s.copy}>Start with a clear photo of the item you want to understand.</Text>
          <TouchableOpacity style={s.primary} onPress={takePhoto}><Ionicons name="camera" size={20} color="#fff"/><Text style={s.primaryText}>Take a photo</Text></TouchableOpacity>
          <TouchableOpacity style={s.secondary} onPress={choosePhoto}><Ionicons name="images-outline" size={20} color="#087f72"/><Text style={s.secondaryText}>Choose from photos</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:"#f4fbf9"},page:{paddingHorizontal:22,paddingTop:16,paddingBottom:28},previewPage:{paddingHorizontal:22,paddingTop:16,paddingBottom:32},
 brandRow:{flexDirection:"row",alignItems:"center",gap:11},logo:{width:48,height:48,borderRadius:15,backgroundColor:"#13b8aa",alignItems:"center",justifyContent:"center"},logoText:{color:"#fff",fontWeight:"900",fontSize:16},brand:{color:"#082f49",fontSize:24,fontWeight:"900"},brandSub:{color:"#66858d",fontSize:11},
 hero:{marginTop:38},eyebrow:{color:"#0a9b80",fontSize:12,fontWeight:"900",letterSpacing:1.2,marginTop:30},title:{color:"#062f4f",fontSize:38,lineHeight:43,fontWeight:"900",marginTop:8},subtitle:{color:"#4f6f7b",fontSize:16,lineHeight:24,marginTop:12},
 card:{backgroundColor:"#fff",borderRadius:26,padding:24,marginTop:30,borderWidth:1,borderColor:"#d9ebe7",shadowColor:"#000",shadowOpacity:.06,shadowRadius:18,shadowOffset:{width:0,height:8},elevation:3},
 camera:{width:78,height:78,borderRadius:39,backgroundColor:"#e7f8f4",alignItems:"center",justifyContent:"center",alignSelf:"center"},cardTitle:{color:"#062f4f",fontSize:25,fontWeight:"900",textAlign:"center",marginTop:18},copy:{color:"#67818a",fontSize:14,lineHeight:21,textAlign:"center",marginTop:7,marginBottom:22},
 primary:{minHeight:56,borderRadius:16,backgroundColor:"#0aaf86",flexDirection:"row",gap:9,alignItems:"center",justifyContent:"center"},primaryText:{color:"#fff",fontSize:16,fontWeight:"900"},
 secondary:{minHeight:54,borderRadius:16,marginTop:11,borderWidth:1,borderColor:"#b9ddd5",flexDirection:"row",gap:9,alignItems:"center",justifyContent:"center"},secondaryText:{color:"#087f72",fontSize:14,fontWeight:"800"},
 previewTitle:{color:"#062f4f",fontSize:34,fontWeight:"900",marginTop:7},previewCopy:{color:"#5f7c86",fontSize:15,lineHeight:22,marginTop:8},imageFrame:{height:390,backgroundColor:"#fff",borderRadius:24,borderWidth:1,borderColor:"#d9ebe7",overflow:"hidden",marginTop:22,marginBottom:18},image:{width:"100%",height:"100%"},
 actionRow:{flexDirection:"row",gap:10,marginTop:10},halfButton:{flex:1,minHeight:52,borderRadius:15,borderWidth:1,borderColor:"#b9ddd5",flexDirection:"row",gap:7,alignItems:"center",justifyContent:"center",backgroundColor:"#fff"},
 cancel:{color:"#647b83",fontSize:14,fontWeight:"800",textAlign:"center",paddingVertical:18}
});