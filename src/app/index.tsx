// AskSAV Mobile v4.2.0 - My Collection
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Share, DynamicColorIOS } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../lib/firebase";
import { analyseAskSAVImage, marketAskSAVAnalysis } from "../lib/asksav-api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking } from "react-native";
import { getMarketActions, MarketAction } from "../lib/market-actions";
import { saveCollectionItem } from "../lib/collection-sync";
import AskSAVPageHeader from "../components/AskSAVPageHeader";
import { uploadCollectionImage } from "../lib/collection-image-storage";

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
function ProgressPanel({title,stage,progress}:{title:string;stage:string;progress:number}) {
  return <View style={s.progressCard}>
    <View style={s.progressTop}><Text style={s.progressTitle}>{title}</Text><Text style={s.progressPct}>{Math.round(progress)}%</Text></View>
    <View style={s.progressTrack}><View style={[s.progressFill,{width:(Math.max(3,Math.min(100,progress))+"%") as any}]}/></View>
    <Text style={s.progressStage}>{stage}</Text>
  </View>;
}
function ResultRow({icon,label,value}:{icon:any,label:string,value:string}) {
  if (!value) return null;
  return <View style={s.resultRow}><View style={s.resultIcon}><Ionicons name={icon} size={18} color="#087f72"/></View><View style={s.resultBody}><Text style={s.resultLabel}>{label}</Text><Text style={s.resultValue}>{value}</Text></View></View>;
}

// AskSAV Mobile v4.0.1.1 image optimisation
async function optimiseAskSAVImage(uri:string,width?:number,height?:number) {
  const maxDimension=1600;
  let resize:any=null;
  if(width && height && Math.max(width,height)>maxDimension) {
    resize=width>=height ? {width:maxDimension} : {height:maxDimension};
  }
  const context=ImageManipulator.manipulate(uri);
  if(resize) context.resize(resize);
  const rendered=await context.renderAsync();
  const saved=await rendered.saveAsync({
    compress:0.8,
    format:SaveFormat.JPEG
  });
  return saved.uri;
}

export default function HomeScreen() {

  const [imageUri, setImageUri] = useState<string | null>(null);
  // AskSAV Mobile v4.0.6 - optional user context is an unverified clue.
  const [itemContext,setItemContext]=useState("");
  // AskSAV Mobile v4.1.0 - Market Actions - trust and sharing
  const [confidenceOpen,setConfidenceOpen]=useState(false);
  const [user,setUser]=useState<User|null>(auth.currentUser);
  const [analysing,setAnalysing]=useState(false);
  // AskSAV Mobile v4.0.4 progress
  const [analysisProgress,setAnalysisProgress]=useState(0);
  const [analysisStage,setAnalysisStage]=useState("");
  const [marketProgress,setMarketProgress]=useState(0);
  const [marketStage,setMarketStage]=useState("");
  const [analysis,setAnalysis]=useState<any>(null);
  // AskSAV Mobile v0.3.1 market intelligence
  const [marketLoading,setMarketLoading]=useState(false);
  const [marketData,setMarketData]=useState<any>(null);
  const [marketError,setMarketError]=useState<string|null>(null);
  const [collectionSaved,setCollectionSaved]=useState(false);
  useEffect(()=>onAuthStateChanged(auth,setUser),[]);
  useEffect(()=>{
    if(!analysing){setAnalysisProgress(0);setAnalysisStage("");return;}
    setAnalysisProgress(12);setAnalysisStage("Preparing image");
    const steps=[
      [700,28,"Uploading securely"],
      [1800,48,"Identifying item"],
      [3500,67,"Assessing visible condition"],
      [6000,82,"Finalising result"],
      [10000,92,"Still working"]
    ] as const;
    const timers=steps.map(([ms,p,label])=>setTimeout(()=>{setAnalysisProgress(p);setAnalysisStage(label)},ms));
    return()=>timers.forEach(clearTimeout);
  },[analysing]);
  useEffect(()=>{
    if(!marketLoading){setMarketProgress(0);setMarketStage("");return;}
    setMarketProgress(10);setMarketStage("Preparing market search");
    const steps=[
      [1200,28,"Researching the market"],
      [5000,50,"Comparing evidence"],
      [12000,70,"Building valuation"],
      [25000,86,"Checking market evidence"],
      [40000,94,"Finalising Market Intelligence"]
    ] as const;
    const timers=steps.map(([ms,p,label])=>setTimeout(()=>{setMarketProgress(p);setMarketStage(label)},ms));
    return()=>timers.forEach(clearTimeout);
  },[marketLoading]);

  async function usePhoto() {
    if (!imageUri) return;
    if (!user) { Alert.alert("Sign in required","Open Account and sign in before analysing an item."); return; }
    if (!user.emailVerified) { Alert.alert("Verify your email","Verify your AskSAV email address before analysing an item."); return; }
    try {
      setAnalysing(true); setAnalysis(null);
      const result=await analyseAskSAVImage(user,imageUri,itemContext);
      // AskSAV Mobile v0.3.2 diagnostic: temporary payload logging.
      // Do not log Firebase tokens or credentials.
      console.log("[AskSAV mobile analysis]", JSON.stringify(result, null, 2));
      setAnalysisProgress(100);
      setAnalysisStage("Analysis complete");
      setAnalysis(result);
      // AskSAV Mobile v4.0.1 - lightweight on-device History.
      try {
        const raw=await AsyncStorage.getItem("asksav.mobile.history.v1");
        const previous=raw ? JSON.parse(raw) : [];
        const identification=result?.identification ?? {};
        const savedName=first(
          identification?.name,identification?.title,identification?.item,
          identification?.object,identification?.product,identification?.productName,
          identification?.itemName,identification?.label,identification?.best_match,
          result?.name,"Item identified"
        );
        const entry={
          id:String(Date.now()),
          createdAt:new Date().toISOString(),
          name:savedName,
          category:first(identification?.category,result?.category),
          condition:first(result?.condition?.grade,result?.condition?.rating,result?.condition?.condition,result?.condition?.summary),
          imageUri,
          analysis:result
        };
        await AsyncStorage.setItem("asksav.mobile.history.v1",JSON.stringify([entry,...previous].slice(0,50)));
      } catch(e) { console.warn("[AskSAV mobile] History save failed",e); }
    } catch(e:any) {
      const message=e?.message||"AskSAV could not analyse this photo.";
      Alert.alert("Analysis failed",message.includes("(413)") ? "This image is still too large to upload. Try retaking the photo or choosing a smaller image." : message);
    } finally { setAnalysing(false); }
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) { Alert.alert("Camera permission needed","Allow AskSAV to use your camera so you can photograph an item."); return; }
    const result = await ImagePicker.launchCameraAsync({mediaTypes:["images"],allowsEditing:false,quality:0.9});
    if (!result.canceled && result.assets[0]?.uri) {
      try {
        const asset=result.assets[0];
        const optimisedUri=await optimiseAskSAVImage(asset.uri,asset.width,asset.height);
        setImageUri(optimisedUri);
      } catch(e) {
        console.warn("[AskSAV mobile] Image optimisation failed; using original image.",e);
        setImageUri(result.assets[0].uri);
      }
      setAnalysis(null); setMarketData(null); setMarketError(null); setCollectionSaved(false); }
  }

  async function choosePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert("Photos permission needed","Allow AskSAV to access your photos so you can choose an item."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({mediaTypes:["images"],allowsEditing:false,quality:0.9});
    if (!result.canceled && result.assets[0]?.uri) {
      try {
        const asset=result.assets[0];
        const optimisedUri=await optimiseAskSAVImage(asset.uri,asset.width,asset.height);
        setImageUri(optimisedUri);
      } catch(e) {
        console.warn("[AskSAV mobile] Image optimisation failed; using original image.",e);
        setImageUri(result.assets[0].uri);
      }
      setAnalysis(null); setMarketData(null); setMarketError(null); }
  }

  const itemName=first(
    analysis?.identification?.name,
    analysis?.identification?.title,
    analysis?.identification?.item,
    analysis?.identification?.object,
    analysis?.identification?.product,
    analysis?.identification?.productName,
    analysis?.identification?.itemName,
    analysis?.identification?.label,
    analysis?.identification?.best_match,
    analysis?.identification?.bestMatch,
    analysis?.grounding?.identification?.name,
    analysis?.result?.identification?.name,
    analysis?.name,
    "Item identified"
  );
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


  async function shareResult(){
    if(!analysis)return;
    const name=bestIdentification(analysis,itemName);
    const parts=["AskSAV Result",name];
    if(category)parts.push("Category: "+category);
    if(condition)parts.push("Condition: "+condition);
    if(confidence)parts.push("Confidence: "+confidence);
    if(valueText)parts.push("Indicative value: "+valueText);
    if(marketRange)parts.push("Market range: "+marketRange);
    parts.push("Generated with AskSAV");
    try{await Share.share({message:parts.join("\n")});}catch(e){console.warn("[AskSAV mobile] Share failed",e);}
  }

  async function saveToCollection() {
    if(!analysis || !imageUri || collectionSaved) return;
    if(!user){Alert.alert("Sign in required","Open Account and sign in before saving to My Collection.");return;}
    if(!user.emailVerified){Alert.alert("Verify your email","Verify your AskSAV email address before saving to My Collection.");return;}
    try {
      const key="asksav.mobile.collection.v1";
      const raw=await AsyncStorage.getItem(key);
      const previous=raw?JSON.parse(raw):[];
      const itemId=String(Date.now());
      const cloudImage=await uploadCollectionImage(itemId,imageUri);
      const entry={
        id:itemId,
        savedAt:new Date().toISOString(),
        name:bestIdentification(analysis,itemName),
        category,
        condition,
        confidence,
        imageUri:cloudImage.cloudImageUrl,
        cloudImageUrl:cloudImage.cloudImageUrl,
        cloudImagePath:cloudImage.cloudImagePath,
        analysis,
        market:marketData||null
      };
      await saveCollectionItem(entry);
      await AsyncStorage.setItem(key,JSON.stringify([entry,...previous].slice(0,100)));
      setCollectionSaved(true);
      Alert.alert("Saved to My Collection","This item is saved to your AskSAV account.");
    } catch(e:any) {
      console.warn("[AskSAV mobile] Collection save failed",e);
      if(e?.code==="COLLECTION_LIMIT_REACHED"){
        const limit=typeof e?.limit==="number" ? String(e.limit) : "your";
        Alert.alert("Collection limit reached","Your current AskSAV plan allows "+limit+" saved items. Remove an item or change plan before saving another.");
      }else{
        Alert.alert("Could not save item",e?.message||"AskSAV could not save this item to My Collection.");
      }
    }
  }

  async function loadMarketIntelligence() {
    if (!analysis || !user || marketLoading) return;
    try {
      setMarketLoading(true);
      setMarketError(null);
      const market = await marketAskSAVAnalysis(user, analysis);
      setMarketProgress(100);
      setMarketStage("Market Intelligence ready");
      setMarketData(market);
      try { const raw=await AsyncStorage.getItem("asksav.mobile.history.v1"); const entries=raw?JSON.parse(raw):[]; const updated=entries.map((e:any,index:number)=>index===0&&e?.imageUri===imageUri?{...e,market}:e); await AsyncStorage.setItem("asksav.mobile.history.v1",JSON.stringify(updated)); } catch(e){console.warn("[AskSAV mobile] Market history save failed",e);}
    } catch (e:any) {
      setMarketError(e?.message || "Market Intelligence is unavailable.");
    } finally {
      setMarketLoading(false);
    }
  }

  const marketCurrency=first(marketData?.currency,"GBP");
  const marketSymbol=marketCurrency==="GBP" ? "\u00A3" : marketCurrency==="USD" ? "$" : marketCurrency==="EUR" ? "\u20AC" : "";
  const marketMoney=(v:any)=>typeof v==="number" ? marketSymbol+Math.round(v).toLocaleString("en-GB") : first(v);
  const marketRange=marketData ? [marketMoney(marketData?.low),marketMoney(marketData?.high)].filter(Boolean).join(" - ") : "";

  if (imageUri) {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.previewPage}>
          <View style={{flexDirection:"row",alignItems:"center",marginBottom:24}}>
            <Image
              source={require("../../assets/images/asksav-brand-green.png")}
              style={{width:52,height:52,borderRadius:14,marginRight:13}}
              resizeMode="contain"
            />
            <View style={{flex:1,justifyContent:"center"}}>
              <Text
                style={{
                  fontSize:26,
                  lineHeight:30,
                  fontWeight:"800",
                  letterSpacing:-0.8,
                  color:DynamicColorIOS({light:"#123f63",dark:"#f4fbfb"})
                }}
              >
                AskSAV
              </Text>
              <Text
                style={{
                  marginTop:2,
                  fontSize:14,
                  lineHeight:19,
                  fontWeight:"600",
                  color:DynamicColorIOS({light:"#6f8792",dark:"#b9cccf"})
                }}
              >
                Visual Intelligence
              </Text>
            </View>
          </View>

          {!analysis ? <>
            <Text style={s.eyebrow}>PHOTO READY</Text>
            <Text style={s.previewTitle}>Use this photo?</Text>
            <Text style={s.previewCopy}>Make sure the item is clear and fills enough of the frame for AskSAV to understand it.</Text>
          </> : <>
            <Text style={s.eyebrow}>ASKSAV RESULT</Text>
            <Text style={s.previewTitle}>{bestIdentification(analysis, itemName)}</Text>
            {description ? <Text style={s.previewCopy}>{description}</Text> : null}
          </>}

          <View style={[s.imageFrame,analysis && s.imageFrameResult]}>
            <Image source={{uri:imageUri}} style={s.image} resizeMode="contain"/>
            {!analysis ? <View pointerEvents="none" style={s.frameGuide}><View style={s.frameGuideBox}/><View style={s.frameTip}><Ionicons name="scan-outline" size={15} color="#087f72"/><Text style={s.frameTipText}>Centre the item and avoid glare</Text></View></View> : null}
          </View>
          {!analysis ? <View style={s.contextCard}>
            <View style={s.contextHeader}>
              <View style={s.contextHeading}><Ionicons name="information-circle-outline" size={18} color="#087f72"/><Text style={s.contextTitle}>Add context</Text></View>
              <View style={s.optionalPill}><Text style={s.optionalText}>Optional</Text></View>
            </View>
            <TextInput
              style={s.contextInput}
              value={itemContext}
              onChangeText={(value)=>setItemContext(value.slice(0,400))}
              placeholder="Anything useful? e.g. inherited, brand unknown, bought abroad..."
              placeholderTextColor={DynamicColorIOS({light:"#789097",dark:"#c7d9da"})}
              multiline
              maxLength={400}
              editable={!analysing}
              textAlignVertical="top"
            />
            <Text style={s.contextCount}>{itemContext.length} / 400</Text>
          </View> : null}

          {!analysis ? <>
          {analysing ? <ProgressPanel title="Analysing your item" stage={analysisStage} progress={analysisProgress}/> : null}
          <TouchableOpacity style={s.primary} onPress={usePhoto} disabled={analysing}>
            {analysing ? <ActivityIndicator color={DynamicColorIOS({light:"#fff",dark:"#10282d"})}/> : <Ionicons name="sparkles" size={20} color={DynamicColorIOS({light:"#fff",dark:"#10282d"})}/>}
            <Text style={s.primaryText}>{analysing ? "Analysing..." : "Use this photo"}</Text>
          </TouchableOpacity></> : <>
            <View style={s.resultCard}>
              <Text style={s.sectionTitle}>What AskSAV sees</Text>
              <ResultRow icon="pricetag-outline" label="Identification" value={bestIdentification(analysis, itemName)}/>
              <ResultRow icon="grid-outline" label="Category" value={category}/>
              <ResultRow icon="shield-checkmark-outline" label="Verification" value={verification}/>
              <ResultRow icon="analytics-outline" label="Confidence" value={confidence}/>
              {confidence ? <TouchableOpacity style={s.confidenceToggle} onPress={()=>setConfidenceOpen(v=>!v)}>
                <View style={s.confidenceToggleLeft}><Ionicons name="information-circle-outline" size={18} color="#087f72"/><Text style={s.confidenceToggleText}>What does confidence mean?</Text></View>
                <Ionicons name={confidenceOpen?"chevron-up":"chevron-down"} size={17} color="#087f72"/>
              </TouchableOpacity> : null}
              {confidence&&confidenceOpen ? <View style={s.confidenceInfo}><Text style={s.confidenceInfoText}>Confidence shows how strongly the visible evidence supports this result. Clear labels, distinctive features and a well-framed photo can improve certainty. It is not a guarantee of identity or authenticity.</Text></View> : null}
            </View>
            <View style={s.resultCard}>
              <View style={s.sectionHeadingRow}><Text style={s.sectionTitle}>Visible condition</Text>
                <TouchableOpacity style={s.shareMini} onPress={shareResult}><Ionicons name="share-outline" size={17} color="#087f72"/><Text style={s.shareMiniText}>Share</Text></TouchableOpacity>
              </View>
              <ResultRow icon="search-outline" label="Condition" value={condition}/>
              {conditionNotes ? <Text style={s.detailText}>{conditionNotes}</Text> : null}
            </View>
            {valueText ? <View style={s.valueCard}>
              <View><Text style={s.valueLabel}>INDICATIVE VALUE</Text><Text style={s.valueAmount}>{valueText}</Text></View>
              <Ionicons name="cash-outline" size={30} color="#087f72"/>
              <Text style={s.valueNote}>Based on the visual analysis available for this item. Market evidence can refine the picture.</Text>
            </View> : null}
            {marketLoading ? <ProgressPanel title="Market Intelligence" stage={marketStage} progress={marketProgress}/> : null}
            <TouchableOpacity style={s.marketButton} onPress={loadMarketIntelligence} disabled={marketLoading}>
              <View style={s.marketIcon}><Ionicons name="globe-outline" size={22} color={DynamicColorIOS({light:"#fff",dark:"#10282d"})}/></View>
              <View style={{flex:1}}><Text style={s.marketTitle}>{marketLoading ? "Checking the market..." : "Market Intelligence"}</Text><Text style={s.marketCopy}>Optional deeper market evidence and pricing context</Text></View>
              <Ionicons name="chevron-forward" size={20} color="#087f72"/>
            </TouchableOpacity>
            {marketError ? <View style={s.marketErrorCard}><Text style={s.marketErrorText}>{marketError}</Text></View> : null}
            {marketData ? <View style={s.marketResultCard}>
              <Text style={s.marketResultEyebrow}>MARKET INTELLIGENCE</Text>
              {marketRange ? <Text style={s.marketRange}>{marketRange}</Text> : null}
              {marketMoney(marketData?.suggested) ? <Text style={s.marketSuggested}>Suggested: {marketMoney(marketData?.suggested)}</Text> : null}
              {marketMoney(marketData?.quick_sale) ? <Text style={s.marketQuick}>Quick sale: {marketMoney(marketData?.quick_sale)}</Text> : null}
              {first(marketData?.evidence_summary) ? <><Text style={s.marketEvidenceLabel}>MARKET EVIDENCE</Text><Text style={s.marketEvidence}>{first(marketData?.evidence_summary)}</Text></> : null}
              {typeof marketData?.confidence==="number" ? <Text style={s.marketConfidence}>Market confidence: {Math.round(marketData.confidence*100)}%</Text> : null}
            </View> : null}
            {marketData ? <View style={s.marketActionsCard}>
              <Text style={s.marketActionsEyebrow}>WHAT WOULD YOU LIKE TO DO?</Text>
              <Text style={s.marketActionsTitle}>Take the next step</Text>
              <Text style={s.marketActionsCopy}>Explore places to sell this item, find similar items or choose a reuse and recycling route.</Text>
              <View style={s.marketActionsGrid}>
                {getMarketActions(bestIdentification(analysis,itemName),category).map((action:MarketAction)=><TouchableOpacity key={action.id} style={s.marketAction} onPress={async()=>{try{const ok=await Linking.canOpenURL(action.url);if(ok)await Linking.openURL(action.url);else Alert.alert("Link unavailable","This destination could not be opened.");}catch{Alert.alert("Link unavailable","This destination could not be opened.");}}}>
                  <View style={s.marketActionIcon}><Ionicons name={action.icon as any} size={20} color="#087f72"/></View>
                  <View style={{flex:1}}><Text style={s.marketActionTitle}>{action.title}</Text><Text style={s.marketActionCopy}>{action.subtitle}</Text></View>
                  <Ionicons name="open-outline" size={17} color={DynamicColorIOS({light:"#789097",dark:"#c7d9da"})}/>
                </TouchableOpacity>)}
              </View>
              <Text style={s.partnerNote}>External destinations may have their own terms, fees and eligibility. AskSAV does not guarantee availability or sale value.</Text>
            </View> : null}
            <TouchableOpacity style={[s.collectionButton,collectionSaved&&s.collectionButtonSaved]} onPress={saveToCollection} disabled={collectionSaved}>
              <Ionicons name={collectionSaved?"checkmark-circle":"bookmark-outline"} size={20} color={collectionSaved?"#087f72":DynamicColorIOS({light:"#fff",dark:"#10282d"})}/>
              <Text style={[s.collectionButtonText,collectionSaved&&s.collectionButtonTextSaved]}>{collectionSaved?"Saved to My Collection":"Save to My Collection"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.primary} onPress={()=>{setImageUri(null);setItemContext("");setAnalysis(null);setMarketData(null);setMarketError(null);setCollectionSaved(false);}}>
              <Ionicons name="camera-outline" size={20} color={DynamicColorIOS({light:"#fff",dark:"#10282d"})}/><Text style={s.primaryText}>Analyse another item</Text>
            </TouchableOpacity>
          </>}

          {!analysis ? <View style={s.actionRow}>
            <TouchableOpacity style={s.halfButton} onPress={takePhoto}><Ionicons name="camera-outline" size={19} color="#087f72"/><Text style={s.secondaryText}>Retake</Text></TouchableOpacity>
            <TouchableOpacity style={s.halfButton} onPress={choosePhoto}><Ionicons name="images-outline" size={19} color="#087f72"/><Text style={s.secondaryText}>Choose another</Text></TouchableOpacity>
          </View> : null}
          {!analysis ? <TouchableOpacity onPress={()=>{setImageUri(null);setItemContext("");}}><Text style={s.cancel}>Cancel</Text></TouchableOpacity> : null}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
    <AskSAVPageHeader title="Home" description="See it. Know it. Value it."/>
    <View style={s.hero}><Text style={s.title}>What have you got?</Text><Text style={s.subtitle}>Take a photo of almost anything. AskSAV helps identify it, assess visible condition and understand its value.</Text></View>
    <View style={s.card}><View style={s.camera}><Ionicons name="camera-outline" size={42} color="#087f72"/></View><Text style={s.cardTitle}>Analyse an item</Text><Text style={s.copy}>Start with a clear photo of the item you want to understand.</Text>
      <TouchableOpacity style={s.primary} onPress={takePhoto}><Ionicons name="camera" size={20} color={DynamicColorIOS({light:"#fff",dark:"#10282d"})}/><Text style={s.primaryText}>Take a photo</Text></TouchableOpacity>
      <TouchableOpacity style={s.secondary} onPress={choosePhoto}><Ionicons name="images-outline" size={20} color="#087f72"/><Text style={s.secondaryText}>Choose from photos</Text></TouchableOpacity>
    </View>
  </ScrollView></SafeAreaView>;
}


/* AskSAV Mobile v0.2.2.1 identification mapping
   Prefer the actual identified object/product returned by the API.
   Status text such as "Analysis complete" is never treated as an item name. */
function bestIdentification(analysis: any, current: string) {
  const identification = analysis?.identification ?? analysis?.result?.identification ?? analysis?.analysis?.identification ?? {};
  const candidates = [
    identification?.name,
    identification?.item,
    identification?.object,
    identification?.title,
    identification?.product,
    identification?.productName,
    identification?.itemName,
    identification?.label,
    analysis?.itemName,
    analysis?.objectName,
    analysis?.productName,
    analysis?.title,
    current,
  ];
  const weak = new Set(["analysis complete","complete","completed","success","successful"]);
  const value = candidates.find((v) => typeof v === "string" && v.trim() && !weak.has(v.trim().toLowerCase()));
  return value?.trim() || "Item identified";
}

const s=StyleSheet.create({
  brandLogo:{width:58,height:58,borderRadius:16},
  collectionButton:{minHeight:56,borderRadius:16,backgroundColor:"#087f72",flexDirection:"row",gap:9,alignItems:"center",justifyContent:"center",marginTop:12},
  collectionButtonSaved:{backgroundColor:DynamicColorIOS({light:"#e8f7f4",dark:"#17383d"}),borderWidth:1,borderColor:"#b9ddd5"},
  collectionButtonText:{color:DynamicColorIOS({light:"#fff",dark:"#10282d"}),fontSize:15,fontWeight:"900"},
  collectionButtonTextSaved:{color:"#087f72"},

  marketActionsCard:{backgroundColor:DynamicColorIOS({light:"#fff",dark:"#10282d"}),borderWidth:1,borderColor:DynamicColorIOS({light:"#cfe8e2",dark:"#24464c"}),borderRadius:20,padding:18,marginBottom:12},
  marketActionsEyebrow:{color:"#087f72",fontSize:10,fontWeight:"900",letterSpacing:.9},
  marketActionsTitle:{color:DynamicColorIOS({light:"#062f4f",dark:"#f5fffd"}),fontSize:20,fontWeight:"900",marginTop:4},
  marketActionsCopy:{color:DynamicColorIOS({light:"#5f7c86",dark:"#c7d9da"}),fontSize:13,lineHeight:19,marginTop:4,marginBottom:12},
  marketActionsGrid:{gap:8},
  marketAction:{minHeight:68,borderWidth:1,borderColor:"#d8ebe7",borderRadius:15,padding:11,flexDirection:"row",alignItems:"center",gap:10,backgroundColor:DynamicColorIOS({light:"#f8fcfb",dark:"#10282d"})},
  marketActionIcon:{width:40,height:40,borderRadius:12,backgroundColor:DynamicColorIOS({light:"#e8f7f4",dark:"#17383d"}),alignItems:"center",justifyContent:"center"},
  marketActionTitle:{color:DynamicColorIOS({light:"#062f4f",dark:"#f5fffd"}),fontSize:14,fontWeight:"900"},
  marketActionCopy:{color:DynamicColorIOS({light:"#66858d",dark:"#c7d9da"}),fontSize:11,lineHeight:16,marginTop:2},
  partnerNote:{color:DynamicColorIOS({light:"#789097",dark:"#c7d9da"}),fontSize:10,lineHeight:15,marginTop:12},
  frameGuide:{position:"absolute",top:0,right:0,bottom:0,left:0,alignItems:"center",justifyContent:"center"},
  frameGuideBox:{width:"78%",height:"70%",borderWidth:2,borderColor:"#0a9b80",borderRadius:22,backgroundColor:"transparent"},
  frameTip:{position:"absolute",bottom:14,flexDirection:"row",alignItems:"center",gap:6,backgroundColor:"rgba(255,255,255,0.94)",borderRadius:99,paddingHorizontal:11,paddingVertical:7,borderWidth:1,borderColor:DynamicColorIOS({light:"#cfe8e2",dark:"#24464c"})},
  frameTipText:{color:"#087f72",fontSize:11,fontWeight:"800"},
  confidenceToggle:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingVertical:10,borderTopWidth:1,borderTopColor:DynamicColorIOS({light:"#edf4f2",dark:"#24464c"})},
  confidenceToggleLeft:{flexDirection:"row",alignItems:"center",gap:7},confidenceToggleText:{color:"#087f72",fontSize:12,fontWeight:"800"},
  confidenceInfo:{backgroundColor:DynamicColorIOS({light:"#f0faf7",dark:"#17383d"}),borderRadius:12,padding:11,marginBottom:5},confidenceInfoText:{color:DynamicColorIOS({light:"#557681",dark:"#b8ced0"}),fontSize:12,lineHeight:18},
  sectionHeadingRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
  shareMini:{flexDirection:"row",alignItems:"center",gap:5,paddingHorizontal:9,paddingVertical:6,borderRadius:99,backgroundColor:DynamicColorIOS({light:"#e8f7f4",dark:"#17383d"})},
  shareMiniText:{color:"#087f72",fontSize:11,fontWeight:"900"},
  contextCard:{backgroundColor:DynamicColorIOS({light:"#f0faf7",dark:"#123137"}),borderWidth:1,borderColor:DynamicColorIOS({light:"#b9ddd5",dark:"#3a666a"}),borderRadius:18,padding:15,marginTop:12},
  contextHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:10},
  contextHeading:{flexDirection:"row",alignItems:"center",gap:7},
  contextTitle:{color:DynamicColorIOS({light:"#062f4f",dark:"#f5fffd"}),fontSize:15,fontWeight:"900"},
  optionalPill:{backgroundColor:DynamicColorIOS({light:"#dff3ed",dark:"#1b4448"}),borderRadius:99,paddingHorizontal:9,paddingVertical:4},
  optionalText:{color:"#087f72",fontSize:11,fontWeight:"800"},
  contextInput:{minHeight:78,backgroundColor:DynamicColorIOS({light:"#fff",dark:"#10282d"}),borderWidth:1,borderColor:DynamicColorIOS({light:"#cfe8e2",dark:"#24464c"}),borderRadius:14,paddingHorizontal:13,paddingVertical:11,color:DynamicColorIOS({light:"#173f51",dark:"#f5fffd"}),fontSize:14,lineHeight:20},
  contextCount:{color:DynamicColorIOS({light:"#789097",dark:"#c7d9da"}),fontSize:11,fontWeight:"700",textAlign:"right",marginTop:6},
 safe:{flex:1,backgroundColor:DynamicColorIOS({light:"#f4fbf9",dark:"#07191d"})},page:{paddingHorizontal:22,paddingTop:16,paddingBottom:28},previewPage:{paddingHorizontal:22,paddingTop:16,paddingBottom:38},
 brandRow:{flexDirection:"row",alignItems:"center",gap:11},logo:{width:48,height:48,borderRadius:15,backgroundColor:"#13b8aa",alignItems:"center",justifyContent:"center"},logoText:{color:DynamicColorIOS({light:"#fff",dark:"#10282d"}),fontWeight:"900",fontSize:16},brand:{color:"#082f49",fontSize:24,fontWeight:"900"},brandSub:{color:DynamicColorIOS({light:"#66858d",dark:"#c7d9da"}),fontSize:11},
 hero:{marginTop:26},eyebrow:{color:"#0a9b80",fontSize:12,fontWeight:"900",letterSpacing:1.2,marginTop:30},title:{color:DynamicColorIOS({light:"#062f4f",dark:"#f5fffd"}),fontSize:38,lineHeight:43,fontWeight:"900",marginTop:8},subtitle:{color:DynamicColorIOS({light:"#4f6f7b",dark:"#b8ced0"}),fontSize:16,lineHeight:24,marginTop:12},
 card:{backgroundColor:DynamicColorIOS({light:"#fff",dark:"#123137"}),borderRadius:26,padding:24,marginTop:30,borderWidth:1,borderColor:DynamicColorIOS({light:"#d9ebe7",dark:"#3a666a"}),shadowColor:"#000",shadowOpacity:.06,shadowRadius:18,shadowOffset:{width:0,height:8},elevation:3},camera:{width:78,height:78,borderRadius:39,backgroundColor:DynamicColorIOS({light:"#e7f8f4",dark:"#1b4448"}),alignItems:"center",justifyContent:"center",alignSelf:"center"},cardTitle:{color:DynamicColorIOS({light:"#062f4f",dark:"#f5fffd"}),fontSize:25,fontWeight:"900",textAlign:"center",marginTop:18},copy:{color:DynamicColorIOS({light:"#67818a",dark:"#b8ced0"}),fontSize:14,lineHeight:21,textAlign:"center",marginTop:7,marginBottom:22},
 primary:{minHeight:56,borderRadius:16,backgroundColor:"#0aaf86",flexDirection:"row",gap:9,alignItems:"center",justifyContent:"center",marginTop:12},primaryText:{color:DynamicColorIOS({light:"#fff",dark:"#10282d"}),fontSize:16,fontWeight:"900"},secondary:{minHeight:54,borderRadius:16,marginTop:11,borderWidth:1,borderColor:DynamicColorIOS({light:"#b9ddd5",dark:"#4a7778"}),flexDirection:"row",gap:9,alignItems:"center",justifyContent:"center"},secondaryText:{color:"#087f72",fontSize:14,fontWeight:"800"},
 previewTitle:{color:DynamicColorIOS({light:"#062f4f",dark:"#f5fffd"}),fontSize:28,lineHeight:33,fontWeight:"900",marginTop:7},previewCopy:{color:DynamicColorIOS({light:"#5f7c86",dark:"#c7d9da"}),fontSize:15,lineHeight:22,marginTop:8},imageFrame:{height:390,backgroundColor:DynamicColorIOS({light:"#fff",dark:"#10282d"}),borderRadius:24,borderWidth:1,borderColor:"#d9ebe7",overflow:"hidden",marginTop:22,marginBottom:10},imageFrameResult:{height:260},image:{width:"100%",height:"100%"},
 actionRow:{flexDirection:"row",gap:10,marginTop:10},halfButton:{flex:1,minHeight:52,borderRadius:15,borderWidth:1,borderColor:"#b9ddd5",flexDirection:"row",gap:7,alignItems:"center",justifyContent:"center",backgroundColor:DynamicColorIOS({light:"#fff",dark:"#10282d"})},
 resultCard:{backgroundColor:DynamicColorIOS({light:"#fff",dark:"#10282d"}),borderWidth:1,borderColor:DynamicColorIOS({light:"#cfe8e2",dark:"#24464c"}),borderRadius:20,padding:18,marginTop:12},sectionTitle:{color:DynamicColorIOS({light:"#062f4f",dark:"#f5fffd"}),fontSize:19,fontWeight:"900",marginBottom:5},resultRow:{flexDirection:"row",gap:12,paddingVertical:11,borderTopWidth:1,borderTopColor:DynamicColorIOS({light:"#edf4f2",dark:"#24464c"})},resultIcon:{width:34,height:34,borderRadius:10,backgroundColor:DynamicColorIOS({light:"#e8f7f4",dark:"#17383d"}),alignItems:"center",justifyContent:"center"},resultBody:{flex:1},resultLabel:{color:DynamicColorIOS({light:"#789097",dark:"#c7d9da"}),fontSize:11,fontWeight:"800",textTransform:"uppercase",letterSpacing:.5},resultValue:{color:DynamicColorIOS({light:"#173f51",dark:"#f5fffd"}),fontSize:15,lineHeight:21,fontWeight:"700",marginTop:2},detailText:{color:DynamicColorIOS({light:"#5f7c86",dark:"#c7d9da"}),fontSize:14,lineHeight:21,marginTop:8},
 valueCard:{backgroundColor:DynamicColorIOS({light:"#e8f7f4",dark:"#17383d"}),borderWidth:1,borderColor:"#b9ddd5",borderRadius:20,padding:18,marginTop:12,flexDirection:"row",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"},valueLabel:{color:"#087f72",fontSize:11,fontWeight:"900",letterSpacing:.8},valueAmount:{color:DynamicColorIOS({light:"#062f4f",dark:"#f5fffd"}),fontSize:30,fontWeight:"900",marginTop:3},valueNote:{width:"100%",color:DynamicColorIOS({light:"#5f7c86",dark:"#c7d9da"}),fontSize:12,lineHeight:18,marginTop:10},
 marketButton:{backgroundColor:DynamicColorIOS({light:"#fff",dark:"#10282d"}),borderWidth:1.5,borderColor:"#8fd4c8",borderRadius:20,padding:15,marginTop:12,flexDirection:"row",alignItems:"center",gap:12},marketIcon:{width:42,height:42,borderRadius:13,backgroundColor:"#087f72",alignItems:"center",justifyContent:"center"},marketTitle:{color:DynamicColorIOS({light:"#062f4f",dark:"#f5fffd"}),fontSize:16,fontWeight:"900"},marketCopy:{color:DynamicColorIOS({light:"#66858d",dark:"#c7d9da"}),fontSize:12,lineHeight:17,marginTop:2},
 cancel:{color:"#647b83",fontSize:14,fontWeight:"800",textAlign:"center",paddingVertical:18},
 marketResultCard:{backgroundColor:DynamicColorIOS({light:"#f0faf7",dark:"#123137"}),borderWidth:1,borderColor:DynamicColorIOS({light:"#b9ddd5",dark:"#3a666a"}),borderRadius:20,padding:18,marginTop:12},
 marketResultEyebrow:{color:"#087f72",fontSize:11,fontWeight:"900",letterSpacing:.8},
 marketRange:{color:DynamicColorIOS({light:"#062f4f",dark:"#f5fffd"}),fontSize:30,fontWeight:"900",marginTop:5},
 marketSuggested:{color:DynamicColorIOS({light:"#173f51",dark:"#f5fffd"}),fontSize:15,fontWeight:"800",marginTop:8},
 marketQuick:{color:DynamicColorIOS({light:"#5f7c86",dark:"#c7d9da"}),fontSize:14,fontWeight:"700",marginTop:3},
 marketEvidenceLabel:{color:"#087f72",fontSize:11,fontWeight:"900",letterSpacing:.7,marginTop:16},marketEvidence:{color:DynamicColorIOS({light:"#4f6f7b",dark:"#b8ced0"}),fontSize:14,lineHeight:21,marginTop:6},
 marketConfidence:{color:"#087f72",fontSize:12,fontWeight:"800",marginTop:10},
 marketErrorCard:{backgroundColor:DynamicColorIOS({light:"#fff7f3",dark:"#351d19"}),borderWidth:1,borderColor:"#f0c9b8",borderRadius:16,padding:14,marginTop:10},
 marketErrorText:{color:"#8a4933",fontSize:13,lineHeight:19,fontWeight:"700"},
 progressCard:{backgroundColor:DynamicColorIOS({light:"#ffffff",dark:"#10282d"}),borderWidth:1,borderColor:DynamicColorIOS({light:"#cfe8e2",dark:"#24464c"}),borderRadius:18,padding:15,marginBottom:12},
 progressTop:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
 progressTitle:{color:DynamicColorIOS({light:"#062f4f",dark:"#f5fffd"}),fontSize:15,fontWeight:"900"},
 progressPct:{color:"#087f72",fontSize:13,fontWeight:"900"},
 progressTrack:{height:8,backgroundColor:"#e4f2ef",borderRadius:99,overflow:"hidden",marginTop:11},
 progressFill:{height:"100%",backgroundColor:"#0a9b80",borderRadius:99},
 progressStage:{color:DynamicColorIOS({light:"#66858d",dark:"#c7d9da"}),fontSize:12,fontWeight:"700",marginTop:8}
});
