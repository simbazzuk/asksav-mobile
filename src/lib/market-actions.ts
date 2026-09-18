// AskSAV Mobile v4.1.0 - configurable Market Action destinations
export type MarketAction={
  id:"sell"|"buy"|"recycle";
  title:string;
  subtitle:string;
  icon:string;
  url:string;
};

const encode=(v:string)=>encodeURIComponent(v.trim());
const isElectrical=(category:string,item:string)=>/electr|computer|laptop|phone|tablet|camera|audio|headphone|mouse|keyboard|console|appliance|device|charger/i.test(category+" "+item);

/*
 * Partner routing is intentionally isolated in this file.
 * Replace destination templates with approved affiliate/deep-link templates
 * once AskSAV has partner IDs. Do not place affiliate credentials in the app.
 */
export function getMarketActions(itemName:string,category:string):MarketAction[]{
 const item=itemName||category||"pre-owned item";
 const q=encode(item);
 const electrical=isElectrical(category||"",item);
 return [
  {id:"sell",title:"Sell this item",subtitle:"Explore a marketplace for comparable listings",icon:"pricetag-outline",url:"https://www.ebay.co.uk/sch/i.html?_nkw="+q},
  {id:"buy",title:"Buy similar",subtitle:"See similar items and current asking prices",icon:"bag-handle-outline",url:"https://www.ebay.co.uk/sch/i.html?_nkw="+q},
  {id:"recycle",title:electrical?"Recycle / trade in":"Reuse / recycle",subtitle:electrical?"Find an electrical reuse or recycling route":"Find responsible reuse and recycling options",icon:"leaf-outline",url:electrical?"https://www.recycleyourelectricals.org.uk/":"https://www.google.com/search?q="+encode("UK donate recycle "+item)}
 ];
}
