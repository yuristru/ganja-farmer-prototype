export const START_MONEY=243560;
export const CATEGORIES=[{id:'oven',name:'Ofen'},{id:'bar',name:'Theke'},{id:'decor',name:'Deko'},{id:'table',name:'Tische'},{id:'finish',name:'Ausbau'}];
export const PRODUCTS=[
  {id:'electric',type:'oven',category:'oven',name:'Elektroofen',price:900},
  {id:'brick',type:'oven',category:'oven',name:'Steinofen',price:2400},
  {id:'professional',type:'oven',category:'oven',name:'Profi-Ofen',price:5800},
  {id:'rustic',type:'bar',category:'bar',name:'Holztheke',price:650},
  {id:'tiled',type:'bar',category:'bar',name:'Fliesentheke',price:1100},
  {id:'marble',type:'bar',category:'bar',name:'Marmortheke',price:2200},
  {id:'olive',type:'plant',category:'decor',name:'Olivenbaum',price:180},
  {id:'fern',type:'plant',category:'decor',name:'Farn',price:90},
  {id:'palm',type:'plant',category:'decor',name:'Palme',price:260},
  {id:'vintage',type:'jukebox',category:'decor',name:'Jukebox',price:1600},
  {id:'stereo',type:'jukebox',category:'decor',name:'Musikautomat',price:950},
  {id:'retro',type:'arcade',category:'decor',name:'Spielautomat',price:2800},
  {id:'deluxe',type:'arcade',category:'decor',name:'Arcade Deluxe',price:4500},
  {id:'plastic',type:'table',category:'table',name:'Plastikstühle',base:120,chair:35},
  {id:'wood',type:'table',category:'table',name:'Holzstühle',base:240,chair:90},
  {id:'premium',type:'table',category:'table',name:'Polsterstühle',base:600,chair:220}
];
export const DEFAULT_VARIANTS={oven:'brick',bar:'rustic',plant:'olive',jukebox:'vintage',arcade:'retro',table:'wood'};
export function product(item){return PRODUCTS.find(p=>p.type===item.type&&p.id===(item.variant||DEFAULT_VARIANTS[item.type]));}
export function itemPrice(item){const p=product(item);return p?(p.type==='table'?p.base+(item.seats||4)*p.chair+Math.max(0,(item.seats||4)-4)*40:p.price):0;}
export function money(value){return value.toLocaleString('de-DE')+' DM';}

export const ROOM_PRODUCTS=[
  {id:'terracotta',type:'floor',category:'finish',name:'Terrakotta',price:1800,colors:[0xb56d47,0xc77c50]},
  {id:'stone',type:'floor',category:'finish',name:'Naturstein',price:3200,colors:[0x9e9987,0xbab4a1]},
  {id:'checker',type:'floor',category:'finish',name:'Schachbrett',price:4200,colors:[0x414843,0xe0d8bd]},
  {id:'parquet',type:'floor',category:'finish',name:'Parkett',price:5600,colors:[0x8a582f,0xaa7444]},
  {id:'paint',type:'renovation',category:'finish',name:'1: Anstrich',price:1200,level:1,colors:[0xe4d3ac,0xccb88e,0x8a5b3d,0x774b36]},
  {id:'renovate',type:'renovation',category:'finish',name:'2: Renovieren',price:3600,level:2,colors:[0xb5c09c,0x929f7f,0x805238,0x66422e]},
  {id:'restore',type:'renovation',category:'finish',name:'3: Sanieren',price:8500,level:3,colors:[0xf0e2c3,0xd9c8a5,0x633f2c,0x503225]}
];
export function roomProduct(item){return ROOM_PRODUCTS.find(p=>p.type===item.type&&p.id===item.variant);}
export function defaultFinishes(){return {floor:'terracotta',renovation:0};}
export function restoreFinishes(value){return {floor:ROOM_PRODUCTS.some(p=>p.type==='floor'&&p.id===value?.floor)?value.floor:'terracotta',renovation:Number.isInteger(value?.renovation)&&value.renovation>=0&&value.renovation<=3?value.renovation:0};}
export function roomPurchaseIssue(p,finishes,balance){
  if(!p||!ROOM_PRODUCTS.includes(p))return 'Ungültiger Ausbau.';
  if(p.type==='floor'&&finishes.floor===p.id)return 'Dieser Boden ist bereits verlegt.';
  if(p.type==='renovation'&&p.level<=finishes.renovation)return 'Diese Stufe ist bereits abgeschlossen.';
  if(p.type==='renovation'&&p.level!==finishes.renovation+1)return 'Zuerst die vorherige Renovierungsstufe kaufen.';
  return balance<p.price?'Nicht genügend Geld.':null;
}
