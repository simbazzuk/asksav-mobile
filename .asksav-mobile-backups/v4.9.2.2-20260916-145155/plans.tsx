// AskSAV Mobile v4.0.7
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, DynamicColorIOS } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

type PlanKey="FREE"|"PLUS"|"PRO";

const plans:{key:PlanKey;name:string;strap:string;icon:any;features:string[]}[]=[
 {key:"FREE",name:"AskSAV Free",strap:"Explore AskSAV",icon:"leaf-outline",features:["5 analyses per month","5 saved items","Core item analysis"]},
 {key:"PLUS",name:"AskSAV Plus",strap:"For regular discovery",icon:"sparkles-outline",features:["50 analyses per month","100 saved items","Full Market Intelligence","Value history","Limited selling tools"]},
 {key:"PRO",name:"AskSAV Pro",strap:"For power users",icon:"diamond-outline",features:["Fair-use analyses","Unlimited saved items","Full Market Intelligence","Value history","Value alerts","Full selling tools"]},
];

export default function PlansScreen(){
 const params=useLocalSearchParams<{plan?:string}>();
 const current=normalise(params.plan);
 return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
   <TouchableOpacity style={s.back} onPress={()=>router.back()}><Ionicons name="chevron-back" size={21} color="#087f72"/><Text style={s.backText}>Account</Text></TouchableOpacity>
   <Text style={s.eyebrow}>ASKSAV PLANS</Text><Text style={s.title}>Choose how you use AskSAV</Text>
   <Text style={s.copy}>Your plan controls analysis allowance and access to deeper intelligence. Payments are not enabled in this release.</Text>
   {plans.map(p=>{
     const active=p.key===current;
     return <View key={p.key} style={[s.card,p.key==="FREE"&&s.free,p.key==="PLUS"&&s.plus,p.key==="PRO"&&s.pro]}>
       <View style={s.planTop}><View style={s.icon}><Ionicons name={p.icon} size={24} color="#087f72"/></View><View style={{flex:1}}><Text style={s.name}>{p.name}</Text><Text style={s.strap}>{p.strap}</Text></View>{active?<View style={s.current}><Text style={s.currentText}>CURRENT</Text></View>:null}</View>
       <View style={s.features}>{p.features.map(f=><View key={f} style={s.feature}><Ionicons name="checkmark-circle" size={18} color="#0a9b80"/><Text style={s.featureText}>{f}</Text></View>)}</View>
       {active?<View style={s.activeButton}><Text style={s.activeText}>Your current plan</Text></View>:
       <TouchableOpacity style={s.choose} onPress={()=>{}} disabled><Text style={s.chooseText}>{p.key==="FREE"?"Free plan":`Choose ${p.name.replace("AskSAV ","")}`}</Text><Text style={s.soon}>Coming with subscriptions</Text></TouchableOpacity>}
     </View>
   })}
   <View style={s.note}><Ionicons name="shield-checkmark-outline" size={22} color="#087f72"/><View style={{flex:1}}><Text style={s.noteTitle}>Server-controlled access</Text><Text style={s.noteText}>The app displays your account entitlements, but cannot assign itself a paid plan.</Text></View></View>
 </ScrollView></SafeAreaView>;
}
function normalise(v:any):PlanKey{const p=String(v||"FREE").toUpperCase();if(p==="ASKSAV_PRO"||p==="VIC_PRO"||p==="PRO")return"PRO";if(p==="ASKSAV_PLUS"||p==="VIC_PLUS"||p==="PLUS")return"PLUS";return"FREE";}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:DynamicColorIOS({light:"#f4fbf9",dark:"#07191d")},page:{padding:22,paddingBottom:40},back:{flexDirection:"row",alignItems:"center",alignSelf:"flex-start",marginTop:10,marginBottom:12},backText:{color:"#087f72",fontSize:14,fontWeight:"800"},
 eyebrow:{color:"#0a9b80",fontSize:12,fontWeight:"900",letterSpacing:1.1},title:{color:DynamicColorIOS({light:"#062f4f",dark:"#eefbf8"),fontSize:34,lineHeight:40,fontWeight:"900",marginTop:6},copy:{color:DynamicColorIOS({light:"#5f7c86",dark:"#9db7b9"),fontSize:14,lineHeight:21,marginTop:8,marginBottom:18},
 card:{backgroundColor:DynamicColorIOS({light:"#fff",dark:"#10282d"),borderRadius:22,padding:19,borderWidth:2,marginBottom:14},free:{borderColor:"#63c7ad"},plus:{borderColor:"#8f7bd8"},pro:{borderColor:"#315a86"},
 planTop:{flexDirection:"row",alignItems:"center",gap:11},icon:{width:44,height:44,borderRadius:13,backgroundColor:DynamicColorIOS({light:"#e8f7f4",dark:"#17383d"),alignItems:"center",justifyContent:"center"},name:{color:DynamicColorIOS({light:"#062f4f",dark:"#eefbf8"),fontSize:22,fontWeight:"900"},strap:{color:DynamicColorIOS({light:"#66858d",dark:"#9db7b9"),fontSize:12,marginTop:2},
 current:{backgroundColor:DynamicColorIOS({light:"#e8f7f4",dark:"#17383d"),borderRadius:99,paddingHorizontal:9,paddingVertical:6},currentText:{color:"#087f72",fontSize:10,fontWeight:"900",letterSpacing:.5},
 features:{marginTop:15,borderTopWidth:1,borderTopColor:DynamicColorIOS({light:"#edf4f2",dark:"#24464c"),paddingTop:10},feature:{flexDirection:"row",alignItems:"center",gap:8,paddingVertical:5},featureText:{color:"#385765",fontSize:14,fontWeight:"700"},
 choose:{backgroundColor:"#edf3f5",borderRadius:14,minHeight:55,alignItems:"center",justifyContent:"center",marginTop:13},chooseText:{color:"#49656f",fontSize:14,fontWeight:"900"},soon:{color:DynamicColorIOS({light:"#789097",dark:"#9db7b9"),fontSize:10,marginTop:2},
 activeButton:{backgroundColor:DynamicColorIOS({light:"#e8f7f4",dark:"#17383d"),borderRadius:14,minHeight:50,alignItems:"center",justifyContent:"center",marginTop:13},activeText:{color:"#087f72",fontSize:14,fontWeight:"900"},
 note:{backgroundColor:"#eef9ff",borderWidth:1,borderColor:"#bedce9",borderRadius:18,padding:15,flexDirection:"row",gap:11,marginTop:2},noteTitle:{color:DynamicColorIOS({light:"#062f4f",dark:"#eefbf8"),fontSize:14,fontWeight:"900"},noteText:{color:DynamicColorIOS({light:"#5f7c86",dark:"#9db7b9"),fontSize:12,lineHeight:18,marginTop:3}
});
