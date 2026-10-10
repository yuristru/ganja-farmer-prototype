export const START_MONEY=243560;
export const CATEGORIES=[{id:'oven',name:'Ofen'},{id:'bar',name:'Theke'},{id:'decor',name:'Deko'},{id:'table',name:'Tische'}];
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
