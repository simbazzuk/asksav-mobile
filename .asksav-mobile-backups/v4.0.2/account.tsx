// AskSAV Mobile v0.3
import { useEffect, useState } from "react";
import { Alert, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from "firebase/auth";
import { auth, firebaseMobileConfigured } from "../lib/firebase";

export default function Account() {
  const [user,setUser]=useState<User|null>(auth.currentUser);
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [busy,setBusy]=useState(false);
  useEffect(()=>onAuthStateChanged(auth,setUser),[]);

  async function login(){
    if(!email.trim()||!password){Alert.alert("Enter your details","Enter your AskSAV email address and password.");return;}
    try{setBusy(true);await signInWithEmailAndPassword(auth,email.trim(),password);}
    catch(e:any){Alert.alert("Sign in failed",e?.message||"Please check your details and try again.");}
    finally{setBusy(false);}
  }

  return <SafeAreaView style={s.safe}><View style={s.page}>
    <Text style={s.eye}>ACCOUNT</Text><Text style={s.title}>Your AskSAV account</Text>
    {user ? <View style={s.card}>
      <Text style={s.status}>SIGNED IN</Text><Text style={s.h}>{user.email}</Text>
      <Text style={s.p}>Your mobile analyses use the same AskSAV account and server-side entitlements as asksav.ai.</Text>
      {!user.emailVerified?<Text style={s.warning}>Verify your email before analysing an item.</Text>:null}
      <TouchableOpacity style={s.outline} onPress={()=>signOut(auth)}><Text style={s.outlineText}>Sign out</Text></TouchableOpacity>
    </View> : <View style={s.card}>
      <Text style={s.h}>Sign in to AskSAV</Text><Text style={s.p}>Use the same account you use on asksav.ai.</Text>
      <TextInput style={s.input} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} placeholder="Email address" value={email} onChangeText={setEmail}/>
      <TextInput style={s.input} secureTextEntry placeholder="Password" value={password} onChangeText={setPassword}/>
      <TouchableOpacity style={s.primary} onPress={login} disabled={busy||!firebaseMobileConfigured}><Text style={s.primaryText}>{busy?"Signing in...":"Sign in"}</Text></TouchableOpacity>
      {!firebaseMobileConfigured?<Text style={s.warning}>Firebase mobile environment variables are not configured.</Text>:null}
    </View>}
  </View></SafeAreaView>
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:"#f4fbf9"},page:{flex:1,padding:24,paddingTop:34},eye:{color:"#0a9b80",fontSize:12,fontWeight:"900",letterSpacing:1.2},title:{color:"#062f4f",fontSize:34,lineHeight:40,fontWeight:"900",marginTop:8},card:{marginTop:28,backgroundColor:"#fff",borderRadius:24,padding:24,borderWidth:1,borderColor:"#d9ebe7"},status:{color:"#0a9b80",fontSize:11,fontWeight:"900",letterSpacing:1},h:{color:"#062f4f",fontSize:21,fontWeight:"900",marginTop:8},p:{color:"#67818a",fontSize:14,lineHeight:21,marginTop:8,marginBottom:16},input:{height:54,borderWidth:1,borderColor:"#cfe1dd",borderRadius:14,paddingHorizontal:15,fontSize:15,backgroundColor:"#fff",marginTop:10},primary:{height:54,borderRadius:14,backgroundColor:"#0aaf86",alignItems:"center",justifyContent:"center",marginTop:14},primaryText:{color:"#fff",fontWeight:"900",fontSize:16},outline:{height:52,borderRadius:14,borderWidth:1,borderColor:"#b9ddd5",alignItems:"center",justifyContent:"center",marginTop:12},outlineText:{color:"#087f72",fontWeight:"900"},warning:{color:"#a15c16",fontSize:13,lineHeight:19,marginTop:10}});
