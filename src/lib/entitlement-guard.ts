// AskSAV Mobile v4.7.0.2 - current server entitlement guard
import type { User } from "firebase/auth";
import { getAskSAVEntitlements } from "./asksav-api";

export type AskSAVFeature="MARKET_INTELLIGENCE"|"VALUE_HISTORY";

export async function assertAskSAVFeature(user:User,feature:AskSAVFeature){
  const state:any=await getAskSAVEntitlements(user);
  const ent=state?.entitlements||{};
  if(feature==="MARKET_INTELLIGENCE"&&ent.fullMarketEvidence!==true){
    const e:any=new Error("Full Market Intelligence is available on AskSAV Plus and Pro.");
    e.code="MARKET_INTELLIGENCE_NOT_INCLUDED";throw e;
  }
  if(feature==="VALUE_HISTORY"&&ent.valueHistory!==true){
    const e:any=new Error("Value History is available on AskSAV Plus and Pro.");
    e.code="VALUE_HISTORY_NOT_INCLUDED";throw e;
  }
  return state;
}
