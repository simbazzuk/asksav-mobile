// AskSAV Mobile - Root Layout
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { initialiseAskSAVAppearance } from "../lib/appearance";

export default function RootLayout(){
  const scheme=useColorScheme();
  const dark=scheme==="dark";

  useEffect(()=>{
    void initialiseAskSAVAppearance();
  },[]);

  return (
    <Tabs
      initialRouteName="index"
      backBehavior="history"
      screenOptions={{
        headerShown:false,
        tabBarActiveTintColor:"#08b58c",
        tabBarInactiveTintColor:dark?"#8ca7aa":"#78909c",
        tabBarStyle:{
          height:78,
          paddingTop:8,
          paddingBottom:12,
          borderTopColor:dark?"#24464c":"#dce9e7",
          backgroundColor:dark?"#07191d":"#fff"
        },
        tabBarLabelStyle:{fontSize:12,fontWeight:"700"}
      }}
    >
      <Tabs.Screen name="index" options={{title:"Home",tabBarIcon:({color,size})=><Ionicons name="home-outline" color={color} size={size}/>}}/>
      <Tabs.Screen name="history" options={{title:"History",tabBarIcon:({color,size})=><Ionicons name="time-outline" color={color} size={size}/>}}/>
      <Tabs.Screen name="collection" options={{title:"Collection",tabBarIcon:({color,size})=><Ionicons name="albums-outline" color={color} size={size}/>}}/>
      <Tabs.Screen name="account" options={{title:"Account",tabBarIcon:({color,size})=><Ionicons name="person-outline" color={color} size={size}/>}}/>
      <Tabs.Screen name="history-detail" options={{href:null}}/>
      <Tabs.Screen name="collection-detail" options={{href:null}}/>
      <Tabs.Screen name="plans" options={{href:null}}/>
      <Tabs.Screen name="appearance" options={{href:null}}/>
    </Tabs>
  );
}