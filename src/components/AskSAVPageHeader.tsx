import { Image, StyleSheet, Text, View, DynamicColorIOS } from "react-native";

type Props={title:string;description:string};

export default function AskSAVPageHeader({title,description}:Props){
 return <View style={s.wrap}>
  <Image source={require("../../assets/images/asksav-brand-green.png")} style={s.logo} resizeMode="contain"/>
  <View style={s.copy}>
   <Text style={s.eyebrow}>YOUR ASKSAV</Text>
   <Text style={s.title}>{title}</Text>
   <Text style={s.description}>{description}</Text>
  </View>
 </View>;
}
const s=StyleSheet.create({
 wrap:{flexDirection:"row",alignItems:"flex-start",gap:13,marginTop:16,marginBottom:22},
 logo:{width:52,height:52,borderRadius:14,marginTop:2},
 copy:{flex:1},
 eyebrow:{color:"#0a9b80",fontSize:12,fontWeight:"900",letterSpacing:1.1},
 title:{color:DynamicColorIOS({light:"#062f4f",dark:"#eefbf8"}),fontSize:26,fontWeight:"900",lineHeight:31,marginTop:2},
 description:{color:DynamicColorIOS({light:"#66858d",dark:"#9db7b9"}),fontSize:14,lineHeight:20,marginTop:5}
});
