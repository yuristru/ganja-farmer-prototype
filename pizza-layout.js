export const ROOM = {w:8,h:7};
export const TOOL_TYPES = ['table','chair','oven','bar','plant'];
export const DEFAULT_LAYOUT = [
  {type:'table',x:2,y:3,r:0},
  {type:'chair',x:1,y:3,r:0},
  {type:'chair',x:4,y:3,r:2},
  {type:'table',x:4,y:5,r:0},
  {type:'chair',x:3,y:5,r:0},
  {type:'chair',x:6,y:5,r:2},
  {type:'plant',x:0,y:4,r:0}
];

export function dimensions(item){
  if(item.type==='table') return {w:2,h:2};
  if(item.type==='bar') return item.r%2?{w:1,h:2}:{w:2,h:1};
  return {w:1,h:1};
}

export function occupiedCells(item){
  const {w,h}=dimensions(item),cells=[];
  for(let dx=0;dx<w;dx++) for(let dy=0;dy<h;dy++) cells.push(`${item.x+dx},${item.y+dy}`);
  return cells;
}

export function placementIssue(item,layout=[]){
  if(!item||!TOOL_TYPES.includes(item.type)||![item.x,item.y,item.r].every(Number.isInteger)||item.r<0||item.r>3) return 'Ungültige Einrichtung.';
  const cells=occupiedCells(item);
  for(const cell of cells){
    const [x,y]=cell.split(',').map(Number);
    if(x<0||y<0||x>=ROOM.w||y>=ROOM.h) return 'Das Möbelstück passt hier nicht in den Raum.';
    if(y<2) return 'Die feste Küche bleibt frei.';
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
  return layout.map(({type,x,y,r})=>({type,x,y,r}));
}
