import {product,itemPrice} from './pizza-catalog.js?v=20261010m';
export const ROOM = {w:12,h:10};
export const KITCHEN = {x:8,y:0,w:4,h:4};
export const KITCHEN_DOOR = {x:9,y:4};
export const ENTRANCE = {x:ROOM.w-1,y:ROOM.h-1};
export function kitchenCell(x,y){return x>=KITCHEN.x&&x<KITCHEN.x+KITCHEN.w&&y>=KITCHEN.y&&y<KITCHEN.y+KITCHEN.h;}
export function passageCell(x,y){return x===KITCHEN_DOOR.x&&y===KITCHEN_DOOR.y;}
export const FIXED_DECOR = [{type:"wine",x:0,y:0,r:0},{type:"jukebox",x:0,y:1,r:0}];
export function decorCell(x,y){return FIXED_DECOR.some(item=>occupiedCells(item).includes(`${x},${y}`));}
export function guestCell(x,y){return x>=0&&y>=0&&x<ROOM.w&&y<ROOM.h&&!kitchenCell(x,y)&&!decorCell(x,y);}
export const GRID = {width:64,height:32};

export function project(x,y){return {x:(x-y)*GRID.width/2,y:(x+y)*GRID.height/2};}
export function gridCell(point){return {x:Math.floor(point.x/GRID.width+point.y/GRID.height+.5),y:Math.floor(point.y/GRID.height-point.x/GRID.width+.5)};}
export const TOOL_TYPES = ['table','oven','bar','plant','jukebox','arcade'];
export const TABLE_SEATS = [2,4,6,8];
export const TABLE_SIZES = {2:{w:2,h:2},4:{w:2,h:2},6:{w:3,h:2},8:{w:4,h:2}};
export const DEFAULT_LAYOUT = [
  {type:'table',seats:4,x:2,y:3,r:0},
  {type:'table',seats:4,x:4,y:5,r:0},
  {type:'plant',x:0,y:4,r:0},
  {type:'table',seats:4,x:0,y:7,r:0},
  {type:'table',seats:6,x:5,y:7,r:0},
  {type:'table',seats:2,x:9,y:6,r:0}
];

export function dimensions(item){
  if(item.type==='table'){
    const {w,h}=TABLE_SIZES[item.seats]||TABLE_SIZES[4];
    return item.r%2?{w:h,h:w}:{w,h};
  }
  if(['bar','wine','prep'].includes(item.type)) return item.r%2?{w:1,h:2}:{w:2,h:1};
  return {w:1,h:1};
}

export function occupiedCells(item){
  const {w,h}=dimensions(item),cells=[];
  for(let dx=0;dx<w;dx++) for(let dy=0;dy<h;dy++) cells.push(`${item.x+dx},${item.y+dy}`);
  return cells;
}

export function placementIssue(item,layout=[]){
  if(!item||!TOOL_TYPES.includes(item.type)||![item.x,item.y,item.r].every(Number.isInteger)||item.r<0||item.r>3) return 'Ungültige Einrichtung.';
  if(item.type==='table'&&!TABLE_SEATS.includes(item.seats))return 'Bitte einen Tisch für 2, 4, 6 oder 8 Personen wählen.';
  if(item.variant!==undefined&&!product(item))return 'Ungültige Möbelvariante.';
  if(item.paid!==undefined&&(!Number.isInteger(item.paid)||item.paid!==itemPrice(item)))return 'Ungültiger Kaufpreis.';
  const cells=occupiedCells(item);
  for(const cell of cells){
    const [x,y]=cell.split(',').map(Number);
    if(x<0||y<0||x>=ROOM.w||y>=ROOM.h) return 'Das Möbelstück passt hier nicht in den Raum.';
    if(decorCell(x,y)) return 'Die feste Wanddekoration bleibt frei.';
    if(kitchenCell(x,y)) return 'Die separate Küche bleibt frei.';
    if(passageCell(x,y)) return 'Bitte den Küchendurchgang frei lassen.';
    if(x===ROOM.w-1&&y===ROOM.h-1) return 'Bitte den Eingang frei lassen.';
  }
  const used=new Set(layout.flatMap(occupiedCells));
  if(cells.some(cell=>used.has(cell))) return 'Hier steht bereits ein Möbelstück.';
  return null;
}

// Reject an invalid save as a whole instead of restoring a partially broken room.
export function validLayout(value){
  if(!Array.isArray(value)||value.length>ROOM.w*ROOM.h) return false;
  const accepted=[];
  for(const item of value){
    if(placementIssue(item,accepted)) return false;
    accepted.push(item);
  }
  return true;
}

export function copyLayout(layout=DEFAULT_LAYOUT){
  return layout.map(({type,seats,x,y,r,variant,paid})=>({...((type==='table')?{type,seats,x,y,r}:{type,x,y,r}),...(variant!==undefined?{variant}:{}),...(paid!==undefined?{paid}:{})}));
}

export function upgradeLayout(value,version){
  if(!Array.isArray(value)||![1,2,3,4].includes(version))return null;
  const items=version===1?value.filter(item=>item?.type!=='chair').map(item=>item?.type==='table'?{...item,seats:4}:item):value;
  return validLayout(items)?copyLayout(items):null;
}
