import {app,world,state,Container,Graphics,Rectangle,clearWorld,spriteFor,sceneUI,sceneViewport,rememberEdit,saveLayout,notify,hash} from './pizza-core.js?v=20261010b';
import {ROOM,dimensions,occupiedCells,placementIssue,copyLayout} from './pizza-layout.js?v=20261010b';

const RTW=62,RTH=31,WALL_HEIGHT=96;
const OBJECT_WIDTH={table:86,chair:31,oven:46,bar:43,plant:24,fridge:41,sink:44};
const TOOL_NAMES={table:'Tisch',chair:'Stuhl',oven:'Ofen',bar:'Theke',plant:'Pflanze'};
let roomLayer,objects,preview,hoverCell=null;
const riso=(x,y)=>({x:(x-y)*RTW/2,y:(x+y)*RTH/2});

function placed(item,interactive=true,ghost=false){
  const {w,h}=dimensions(item),point=riso(item.x+(w-1)/2,item.y+(h-1)/2),group=new Container();
  group.label=interactive?'placed-furniture':'fixed-furniture';group.zIndex=point.y+RTH/4;
  // The counter consists of two cabinets, matching its two occupied cells.
  const positions=item.type==='bar'?occupiedCells(item).map(cell=>cell.split(',').map(Number)):[[item.x+(w-1)/2,item.y+(h-1)/2]];
  for(const [x,y] of positions){
    const p=riso(x,y),sprite=spriteFor(item.type,item.r,OBJECT_WIDTH[item.type]);
    sprite.position.set(p.x,p.y+3);group.addChild(sprite);
  }
  if(ghost) group.alpha=.45;
  else if(interactive){group.eventMode='static';group.cursor='pointer';group.on('pointertap',()=>interact(item.x,item.y));}
  objects.addChild(group);return group;
}

function fixedKitchen(){
  [{type:'fridge',x:0,y:0,r:0},{type:'sink',x:1,y:0,r:0},{type:'oven',x:2,y:0,r:0},
    {type:'bar',x:4,y:0,r:0},{type:'plant',x:7,y:0,r:0},{type:'bar',x:4,y:1,r:0},{type:'bar',x:6,y:1,r:0}]
    .forEach(item=>placed(item,false));
}

function person(index){
  const group=new Container(),g=new Graphics();
  g.ellipse(0,2,5,2).fill({color:0,alpha:.22});g.rect(-3,-16,6,11).fill(index===0?0xf4eee3:[0xb34536,0x416f98,0x56804b][index-1]);
  g.rect(-2,-21,4,5).fill(0xc98f69);g.rect(-3,-8,6,3).fill(0x252326);g.rect(-3,-5,2,6).fill(0x252326);g.rect(1,-5,2,6).fill(0x252326);
  group.addChild(g);group.scale.set(2);group.eventMode='none';return group;
}

function walkableCells(){
  const used=new Set(state.restaurantState.flatMap(occupiedCells)),cells=[];
  for(let y=2;y<ROOM.h;y++) for(let x=0;x<ROOM.w;x++) if(!used.has(`${x},${y}`)) cells.push({x,y});
  return cells;
}

function pathTo(start,goal,free){
  const first=`${start.x},${start.y}`,last=`${goal.x},${goal.y}`,queue=[first],parents=new Map([[first,null]]);
  for(let i=0;i<queue.length;i++){
    const current=queue[i];if(current===last) break;
    const [x,y]=current.split(',').map(Number);
    for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){
      const next=`${x+dx},${y+dy}`;
      if(free.has(next)&&!parents.has(next)){parents.set(next,current);queue.push(next);}
    }
  }
  if(!parents.has(last)) return [];
  const path=[];let cell=last;
  while(cell!==first){const [x,y]=cell.split(',').map(Number);path.unshift({x,y});cell=parents.get(cell);}
  return path;
}

function nextRoute(mover,cells=walkableCells()){
  const free=new Set(cells.map(cell=>`${cell.x},${cell.y}`)),start={x:Math.round(mover.x),y:Math.round(mover.y)};
  mover.path=[];mover.trip++;
  for(let attempt=0;attempt<8&&cells.length;attempt++){
    const goal=cells[Math.floor(hash(mover.index+attempt,mover.trip)*cells.length)%cells.length];
    mover.path=pathTo(start,goal,free);if(mover.path.length) break;
  }
  mover.wait=45+mover.index*20;
}

function refreshActors(){
  const cells=walkableCells(),free=new Set(cells.map(cell=>`${cell.x},${cell.y}`)),claimed=new Set();
  for(const mover of state.movers){
    if(mover.kind!=='restaurant') continue;
    const key=`${Math.round(mover.x)},${Math.round(mover.y)}`;
    if(!free.has(key)||claimed.has(key)){
      const nearest=cells.filter(cell=>!claimed.has(`${cell.x},${cell.y}`)).sort((a,b)=>Math.hypot(a.x-mover.x,a.y-mover.y)-Math.hypot(b.x-mover.x,b.y-mover.y))[0];
      if(!nearest){mover.g.visible=false;continue;}
      mover.x=nearest.x;mover.y=nearest.y;
    }else{mover.x=Math.round(mover.x);mover.y=Math.round(mover.y);}
    mover.g.visible=true;claimed.add(`${mover.x},${mover.y}`);nextRoute(mover,cells);
    const p=riso(mover.x,mover.y);mover.g.position.set(p.x,p.y);mover.g.zIndex=p.y+2;
  }
}

function renderFurniture(){
  for(const child of objects.children.slice()) if(child.label==='placed-furniture'){objects.removeChild(child);child.destroy({children:true});}
  state.restaurantState.forEach(item=>placed(item));refreshActors();
  state.onEditChange?.();
}

function finishEdit(message){
  const saved=saveLayout();renderFurniture();clearPreview();
  if(saved) notify(message);
}

function interact(x,y){
  if(state.deleteMode){
    const index=state.restaurantState.findIndex(item=>occupiedCells(item).includes(`${x},${y}`));
    if(index<0){notify(y<2?'Die feste Küche bleibt erhalten.':'Hier steht kein Möbelstück.');return;}
    rememberEdit();state.restaurantState.splice(index,1);finishEdit('Möbelstück entfernt.');return;
  }
  const item={type:state.selectedTool,x,y,r:state.rotation},issue=placementIssue(item,state.restaurantState);
  if(issue){notify(issue);return;}
  rememberEdit();state.restaurantState.push(item);finishEdit(`${TOOL_NAMES[item.type]} platziert.`);
}

function clearPreview(){
  hoverCell=null;
  if(preview&&!preview.destroyed) preview.removeChildren().forEach(child=>child.destroy({children:true}));
}

export function updatePlacementPreview(){
  if(state.scene!=='restaurant'||!preview||preview.destroyed) return;
  document.querySelector('#placementHint').textContent=state.deleteMode?'Möbelstück antippen zum Entfernen.':`${TOOL_NAMES[state.selectedTool]}: freie Bodenfläche antippen · ${state.rotation*90}°`;
  preview.removeChildren().forEach(child=>child.destroy({children:true}));
  if(!hoverCell) return;
  let item={type:state.selectedTool,...hoverCell,r:state.rotation},invalid=placementIssue(item,state.restaurantState);
  if(state.deleteMode){item=state.restaurantState.find(value=>occupiedCells(value).includes(`${hoverCell.x},${hoverCell.y}`));if(!item) return;invalid=true;}
  const color=invalid?0xd45742:0x70b576,g=new Graphics();
  for(const cell of occupiedCells(item)){
    const [x,y]=cell.split(',').map(Number),p=riso(x,y);
    g.poly([p.x,p.y-RTH/2,p.x+RTW/2,p.y,p.x,p.y+RTH/2,p.x-RTW/2,p.y]).fill({color,alpha:.28}).stroke({color,width:2});
  }
  preview.addChild(g);
  if(!invalid){const ghost=placed(item,false,true);objects.removeChild(ghost);preview.addChild(ghost);}
}

function hover(global){
  const point=roomLayer.toLocal(global),x=Math.floor((point.x/(RTW/2)+point.y/(RTH/2))/2+.5),y=Math.floor((point.y/(RTH/2)-point.x/(RTW/2))/2+.5);
  if(x<0||y<0||x>=ROOM.w||y>=ROOM.h){clearPreview();return;}
  if(hoverCell?.x===x&&hoverCell?.y===y) return;
  hoverCell={x,y};updatePlacementPreview();
}

function wallWindow(layer,x,y,right=true){
  const p=riso(x,y),sign=right?1:-1,g=new Graphics();
  g.poly([p.x,p.y-78,p.x+32*sign,p.y-62,p.x+32*sign,p.y-36,p.x,p.y-52]).fill(0x759599).stroke({color:0xf0dfbc,width:2});
  g.moveTo(p.x+16*sign,p.y-70).lineTo(p.x+16*sign,p.y-44).stroke({color:0xf0dfbc,width:2});layer.addChild(g);
}

export function resizeRestaurant(){
  if(state.scene!=='restaurant'||!roomLayer||roomLayer.destroyed) return;
  const area=sceneViewport(true),minX=-ROOM.h*RTW/2,maxX=ROOM.w*RTW/2,minY=-RTH/2-WALL_HEIGHT,maxY=(ROOM.w+ROOM.h-1)*RTH/2;
  const scale=Math.min(1.45,area.width/(maxX-minX),area.height/(maxY-minY));
  roomLayer.scale.set(scale);
  roomLayer.position.set((area.left+area.right)/2-(minX+maxX)/2*scale,(area.top+area.bottom)/2-(minY+maxY)/2*scale);
  app.stage.hitArea=new Rectangle(0,0,app.screen.width,app.screen.height);
}

export function showRestaurant(){
  if(state.scene==='restaurant') return;
  clearWorld();state.scene='restaurant';sceneUI('restaurant');
  roomLayer=new Container();roomLayer.label='restaurant-room';world.addChild(roomLayer);
  const wall=new Graphics(),floor=new Container();objects=new Container();preview=new Container();
  objects.label='restaurant-objects';objects.sortableChildren=true;preview.eventMode='none';hoverCell=null;
  const a=riso(-.5,-.5),b=riso(ROOM.w-.5,-.5),c=riso(-.5,ROOM.h-.5);
  wall.poly([a.x,a.y,b.x,b.y,b.x,b.y-WALL_HEIGHT,a.x,a.y-WALL_HEIGHT]).fill(0xcbb28b).stroke({color:0x745038,width:2});
  wall.poly([a.x,a.y,c.x,c.y,c.x,c.y-WALL_HEIGHT,a.x,a.y-WALL_HEIGHT]).fill(0xb59670).stroke({color:0x745038,width:2});
  wall.poly([a.x,a.y-32,b.x,b.y-32,b.x,b.y,a.x,a.y]).fill(0x8a5b3d);
  wall.poly([a.x,a.y-32,c.x,c.y-32,c.x,c.y,a.x,a.y]).fill(0x774b36);
  roomLayer.addChild(wall);wallWindow(roomLayer,2,-.5);wallWindow(roomLayer,5,-.5);wallWindow(roomLayer,-.5,2,false);wallWindow(roomLayer,-.5,4.5,false);
  roomLayer.addChild(floor,objects,preview);
  for(let y=0;y<ROOM.h;y++) for(let x=0;x<ROOM.w;x++){
    const p=riso(x,y),kitchen=y<2,entrance=x===ROOM.w-1&&y===ROOM.h-1,g=new Graphics();
    const color=entrance?0xd1bc8a:kitchen?((x+y)%2?0xb89c77:0xc7aa82):((x+y)%2?0xb56d47:0xc77c50);
    g.poly([p.x,p.y-RTH/2,p.x+RTW/2,p.y,p.x,p.y+RTH/2,p.x-RTW/2,p.y]).fill(color).stroke({color:kitchen?0x8b765d:0x8c5338,width:1});
    if(entrance) g.poly([p.x-9,p.y+1,p.x,p.y-4,p.x+9,p.y+1,p.x+3,p.y+1,p.x+3,p.y+6,p.x-3,p.y+6,p.x-3,p.y+1]).fill(0x776c42);
    g.label=`floor-${x}-${y}`;g.eventMode='static';g.cursor='pointer';g.on('pointertap',()=>interact(x,y));floor.addChild(g);
  }
  fixedKitchen();
  [{x:1,y:5},{x:5,y:3},{x:6,y:4},{x:0,y:6}].forEach((position,index)=>{
    const g=person(index);objects.addChild(g);state.movers.push({...position,index,g,kind:'restaurant',trip:0,path:[],wait:0});
  });
  renderFurniture();resizeRestaurant();updatePlacementPreview();
  app.stage.on('globalpointermove',event=>hover(event.global));app.stage.on('pointerdown',event=>hover(event.global));
  app.stage.on('pointerleave',clearPreview);app.stage.on('pointercancel',clearPreview);
}

export function tickRestaurant(dt){
  for(const mover of state.movers){
    if(mover.kind!=='restaurant'||!mover.g.visible) continue;
    if(mover.wait>0){mover.wait-=dt;continue;}
    if(!mover.path.length){nextRoute(mover);continue;}
    const next=mover.path[0],dx=next.x-mover.x,dy=next.y-mover.y,distance=Math.hypot(dx,dy),step=.013*dt;
    if(distance<=step){mover.x=next.x;mover.y=next.y;mover.path.shift();}
    else{mover.x+=dx/distance*step;mover.y+=dy/distance*step;}
    const p=riso(mover.x,mover.y);mover.g.position.set(p.x,p.y);mover.g.zIndex=p.y+2;
  }
}

export function undoRestaurant(){
  if(!state.history.length) return;
  state.restaurantState=state.history.pop();finishEdit('Letzte Änderung rückgängig gemacht.');
}

export function resetRestaurant(){
  const initial=copyLayout();
  if(JSON.stringify(initial)!==JSON.stringify(state.restaurantState)){rememberEdit();state.restaurantState=initial;}
  state.rotation=0;state.selectedTool='table';state.deleteMode=false;
  finishEdit('Start-Einrichtung wiederhergestellt.');updatePlacementPreview();
}
