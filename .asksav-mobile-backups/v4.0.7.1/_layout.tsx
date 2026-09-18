// AskSAV Mobile v4.0.7
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
export default function RootLayout() {
  return (
    <Tabs screenOptions={{headerShown:false,tabBarActiveTintColor:"#087f72",tabBarInactiveTintColor:"#78909c",tabBarStyle:{height:78,paddingTop:8,paddingBottom:12,borderTopColor:"#dce9e7",backgroundColor:"#fff"},tabBarLabelStyle:{fontSize:12,fontWeight:"700"}}}>
      <Tabs.Screen name="history-detail" options={{href:null}} />
      <Tabs.Screen name="plans" options={{href:null}} />
      <Tabs.Screen name="index" options={{title:"Home",tabBarIcon:({color,size})=><Ionicons name="home-outline" color={color} size={size}/>}}/>
      <Tabs.Screen name="history" options={{title:"History",tabBarIcon:({color,size})=><Ionicons name="time-outline" color={color} size={size}/>}}/>
      <Tabs.Screen name="account" options={{title:"Account",tabBarIcon:({color,size})=><Ionicons name="person-outline" color={color} size={size}/>}}/>
    </Tabs>
  );
}