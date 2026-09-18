// AskSAV Mobile v4.0.8.3 - restored Firebase email/password sign-in
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, User } from "firebase/auth";
import { auth } from "../lib/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [authBusy,setAuthBusy]=useState(false);
 const [authError,setAuthError]=useState("");

 async function signIn(){
   const e=email.trim();
   if(!e||!password){setAuthError("Enter your email address and password.");return;}
   try{setAuthBusy(true);setAuthError("");await signInWithEmailAndPassword(auth,e,password);}
   catch(err:any){setAuthError(authMessage(err));}
   finally{setAuthBusy(false);}
 }
 async function createAccount(){
   const e=email.trim();
   if(!e||!password){setAuthError("Enter an email address and password first.");return;}
   if(password.length<6){setAuthError("Password must be at least 6 characters.");return;}
   try{
     setAuthBusy(true);setAuthError("");
     const cred=await createUserWithEmailAndPassword(auth,e,password);
     Alert.alert("Account created",cred.user.emailVerified?"Your AskSAV account is ready.":"Your account is ready. Verify your email before analysing items.");
   }catch(err:any){setAuthError(authMessage(err));}
   finally{setAuthBusy(false);}
 }
 async function resetPassword(){
   const e=email.trim();
   if(!e){setAuthError("Enter your email address first.");return;}
   try{setAuthBusy(true);setAuthError("");await sendPasswordResetEmail(auth,e);Alert.alert("Reset email sent","Check your inbox for the password reset link.");}
   catch(err:any){setAuthError(authMessage(err));}
   finally{setAuthBusy(false);}
 }

 useEffect(()=>onAuthStateChanged(auth,u=>{setUser(u);setState(null);}),[]);
 useEffect(()=>{
   let live=true;
   if(!user){setLoading(false);return;}
   setLoading(true);setError("");
   getAskSAVEntitlements(user).then(v=>{if(live)setState(v);}).catch((e:any)=>{if(live)setError(e?.message||"Unable to load account.");}).finally(()=>{if(live)setLoading(false);});
   return()=>{live=false};
 },[user]);

 if(!user) return <SafeAreaView style={s.safe}>
   <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==="ios"?"padding":undefined}>
    <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
     <Text style={s.eyebrow}>YOUR ASKSAV</Text><Text style={s.title}>Account</Text>
     <View style={s.card}>
      <Ionicons name="person-circle-outline" size={48} color="#0a9b80"/>
      <Text style={s.cardTitle}>Sign in to AskSAV</Text>
      <Text style={s.copy}>Sign in to analyse items, use your plan and keep your AskSAV experience connected.</Text>
      <Text style={s.inputLabel}>Email</Text>
      <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#789097" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" editable={!authBusy}/>
      <Text style={s.inputLabel}>Password</Text>
      <TextInput style={s.input} value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor="#789097" secureTextEntry textContentType="password" editable={!authBusy} onSubmitEditing={signIn}/>
      {authError?<View style={s.authError}><Text style={s.authErrorText}>{authError}</Text></View>:null}
      <TouchableOpacity style={[s.signin,authBusy&&s.disabled]} onPress={signIn} disabled={authBusy}>
       {authBusy?<ActivityIndicator color="#fff"/>:<><Ionicons name="log-in-outline" size={19} color="#fff"/><Text style={s.signinText}>Sign in</Text></>}
      </TouchableOpacity>
      <TouchableOpacity style={s.textButton} onPress={resetPassword} disabled={authBusy}><Text style={s.textButtonText}>Forgot password?</Text></TouchableOpacity>
      <View style={s.divider}/>
      <Text style={s.newHere}>New to AskSAV?</Text>
      <TouchableOpacity style={s.createButton} onPress={createAccount} disabled={authBusy}><Text style={s.createText}>Create account</Text></TouchableOpacity>
     </View>
    </ScrollView>
   </KeyboardAvoidingView>
  </SafeAreaView>;

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
       <View>
         <Text style={s.planLabel}>CURRENT PLAN</Text>
         <Text style={s.planName}>{plan.name}</Text>
       </View>
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
       {__DEV__?<View style={s.devRestore}>
      <Text style={s.devEyebrow}>DEVELOPMENT ONLY</Text>
      <Text style={s.devTitle}>Cloud restore test</Text>
      <Text style={s.devCopy}>Clears only the My Collection cache on this device. Firestore, History and your account are not changed.</Text>
      <TouchableOpacity style={s.devButton} onPress={()=>{
        Alert.alert(
          "Test Cloud Restore",
          "This clears only the Collection stored on this device. Your Firestore Collection will not be deleted.",
          [
            {text:"Cancel",style:"cancel"},
            {text:"Clear local Collection",style:"destructive",onPress:async()=>{
              try{
                await AsyncStorage.removeItem("asksav.mobile.collection.v1");
                console.log("[AskSAV DEV] Local Collection cleared. Firestore was NOT changed.");
                Alert.alert("Local Collection cleared","Now open Collection. AskSAV should restore your cloud items from Firestore.");
              }catch(e){
                console.error("[AskSAV DEV] Failed to clear local Collection",e);
                Alert.alert("Could not clear Collection","Check Metro for the error.");
              }
            }}
          ]
        );
      }}><Text style={s.devButtonText}>DEV: Test Cloud Restore</Text></TouchableOpacity>
    </View>:null}
<TouchableOpacity style={s.signout} onPress={()=>signOut(auth)}><Ionicons name="log-out-outline" size={19} color="#8a4933"/><Text style={s.signoutText}>Sign out</Text></TouchableOpacity>
 </ScrollView></SafeAreaView>
}
function authMessage(err:any){
 const code=String(err?.code||"");
 if(code.includes("invalid-credential")||code.includes("wrong-password")||code.includes("user-not-found")) return "Email or password is incorrect.";
 if(code.includes("invalid-email")) return "Enter a valid email address.";
 if(code.includes("email-already-in-use")) return "An account already exists for this email. Try signing in.";
 if(code.includes("weak-password")) return "Choose a stronger password.";
 if(code.includes("too-many-requests")) return "Too many attempts. Try again later.";
 if(code.includes("network-request-failed")) return "Unable to connect. Check your internet connection and try again.";
 return err?.message||"Authentication failed. Please try again.";
}
function Row({icon,label,value}:{icon:any,label:string,value:string}){
 return <View style={s.row}><View style={s.rowIcon}><Ionicons name={icon} size={18} color="#087f72"/></View><View style={{flex:1}}><Text style={s.rowLabel}>{label}</Text></View><Text style={s.rowValue}>{value}</Text></View>
}
const s=StyleSheet.create({
  devRestore:{backgroundColor:"#f7fbfa",borderWidth:1,borderColor:"#cfe8e2",borderRadius:18,padding:16,marginBottom:12},
  devEyebrow:{color:"#789097",fontSize:11,fontWeight:"900",letterSpacing:1},
  devTitle:{color:"#062f4f",fontSize:18,fontWeight:"900",marginTop:5},
  devCopy:{color:"#5f7c86",fontSize:13,lineHeight:19,marginTop:5,marginBottom:12},
  devButton:{alignSelf:"flex-start",paddingVertical:10,paddingHorizontal:14,borderWidth:1,borderColor:"#7DBAAF",borderRadius:12},
  devButtonText:{color:"#087f72",fontSize:13,fontWeight:"900"},

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
 inputLabel:{color:"#173f51",fontSize:13,fontWeight:"800",marginTop:15,marginBottom:6},
 input:{minHeight:52,borderWidth:1,borderColor:"#cfe8e2",borderRadius:14,backgroundColor:"#f8fcfb",paddingHorizontal:14,color:"#173f51",fontSize:15},
 signin:{minHeight:54,borderRadius:16,backgroundColor:"#0aaf86",flexDirection:"row",gap:8,alignItems:"center",justifyContent:"center",marginTop:18},signinText:{color:"#fff",fontSize:15,fontWeight:"900"},disabled:{opacity:.65},
 textButton:{alignItems:"center",paddingVertical:14},textButtonText:{color:"#087f72",fontSize:13,fontWeight:"800"},
 divider:{height:1,backgroundColor:"#edf4f2",marginVertical:6},newHere:{color:"#66858d",fontSize:13,textAlign:"center",marginTop:10},
 createButton:{minHeight:52,borderRadius:16,borderWidth:1.5,borderColor:"#8fd4c8",alignItems:"center",justifyContent:"center",marginTop:10},createText:{color:"#087f72",fontSize:14,fontWeight:"900"},
 authError:{backgroundColor:"#fff7f3",borderWidth:1,borderColor:"#f0c9b8",borderRadius:12,padding:11,marginTop:12},authErrorText:{color:"#8a4933",fontSize:12,lineHeight:18,fontWeight:"700"},
 error:{backgroundColor:"#fff7f3",borderWidth:1,borderColor:"#f0c9b8",borderRadius:16,padding:14,marginBottom:12},errorText:{color:"#8a4933",fontSize:13,fontWeight:"700"}
});