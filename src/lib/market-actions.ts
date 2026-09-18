// AskSAV Mobile v4.9.4.1 - multi-source Market Action destinations
export type MarketAction={
  id:"sell"|"buy"|"google-shopping"|"amazon"|"etsy"|"recycle";
  title:string;
  subtitle:string;
  icon:string;
  url:string;
};

export type MarketActionIdentity={
  name?:string;
  category?:string;
  brand?:string;
  manufacturer?:string;
  make?:string;
  model?:string;
  modelNumber?:string;
  model_number?:string;
  mpn?:string;
  productCode?:string;
  product_code?:string;
};

const encode=(v:string)=>encodeURIComponent(v.trim());
const clean=(v:any)=>typeof v==="string"?v.replace(/\s+/g," ").trim():"";
const isElectrical=(category:string,item:string)=>/electr|computer|laptop|phone|tablet|camera|audio|headphone|mouse|keyboard|console|appliance|device|charger|remote|television|\btv\b/i.test(category+" "+item);

function addUnique(parts:string[],value:any){
  const next=clean(value);
  if(!next)return;
  const lower=next.toLowerCase();
  if(/^(item|item identified|unknown|unidentified|product|object|remote)$/i.test(next))return;
  if(parts.some(p=>p.toLowerCase()===lower))return;
  if(parts.some(p=>p.toLowerCase().includes(lower)&&lower.length>2))return;
  parts.push(next);
}

export function buildMarketSearchQuery(itemName:string,category:string,identity?:MarketActionIdentity){
  const parts:string[]=[];
  const source=identity||{};
  addUnique(parts,source.brand||source.manufacturer||source.make);
  addUnique(parts,source.name||itemName);
  addUnique(parts,source.model||source.modelNumber||source.model_number||source.mpn||source.productCode||source.product_code);
  if(parts.length<2)addUnique(parts,category);
  if(!parts.length)addUnique(parts,itemName||category||"pre-owned item");
  return parts.join(" ");
}

/*
 * Partner routing is intentionally isolated in this file.
 * External searches are discovery destinations, not evidence that AskSAV has
 * incorporated those listings into its server-side Market Intelligence valuation.
 */
export function getMarketActions(itemName:string,category:string,identity?:MarketActionIdentity):MarketAction[]{
  const item=buildMarketSearchQuery(itemName,category,identity);
  const q=encode(item);
  const electrical=isElectrical(category||"",item);
  return [
    {id:"sell",title:"Sell this item",subtitle:"Search eBay UK using this product identity",icon:"pricetag-outline",url:"https://www.ebay.co.uk/sch/i.html?_nkw="+q},
    {id:"buy",title:"Buy similar",subtitle:"See closely matched items on eBay UK",icon:"bag-handle-outline",url:"https://www.ebay.co.uk/sch/i.html?_nkw="+q},
    {id:"google-shopping",title:"Google Shopping",subtitle:"Compare products and retailers across the wider market",icon:"search-outline",url:"https://www.google.com/search?tbm=shop&q="+q},
    {id:"amazon",title:"Amazon UK",subtitle:"Search Amazon UK for matching or comparable products",icon:"storefront-outline",url:"https://www.amazon.co.uk/s?k="+q},
    {id:"etsy",title:"Etsy UK",subtitle:"Compare vintage, handmade and collectable listings",icon:"pricetag-outline",url:"https://www.etsy.com/uk/search?q="+q},
    {id:"recycle",title:electrical?"Recycle / trade in":"Reuse / recycle",subtitle:electrical?"Find an electrical reuse or recycling route":"Find responsible reuse and recycling options",icon:"leaf-outline",url:electrical?"https://www.recycleyourelectricals.org.uk/":"https://www.google.com/search?q="+encode("UK donate recycle "+item)}
  ];
}
