export const DEFAULT_CITY_SEED=94117;
export function districtOrder(seed=DEFAULT_CITY_SEED){
  const order=Array.from({length:9},(_,i)=>i);
  if(seed===DEFAULT_CITY_SEED)return order;
  let value=seed>>>0;
  const random=()=>{value=(value+0x6d2b79f5)>>>0;let n=value;n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);return((n^(n>>>14))>>>0)/4294967296;};
  for(let i=8;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
  return order;
}
export function nextCitySeed(current,entropy){
  let candidate=entropy>>>0;
  const previous=districtOrder(current).join(',');
  while(candidate===current||districtOrder(candidate).join(',')===previous)candidate=(candidate+1)>>>0;
  return candidate;
}
