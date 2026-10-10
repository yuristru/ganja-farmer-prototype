import {app,world,state,Container,Graphics,Rectangle,clearWorld,sceneUI,sceneViewport,rememberEdit,saveLayout,notify,hash} from './pizza-core.js?v=20261010c';
import {ROOM,GRID,project,gridCell,dimensions,occupiedCells,placementIssue,copyLayout} from './pizza-layout.js?v=20261010c';
import {furnitureSprite,personSprite} from './pizza-sprites.js?v=20261010c';

const RTW=GRID.width,RTH=GRID.height,WALL_HEIGHT=96;
const TOOL_NAMES={table:'Tisch',oven:'Ofen',bar:'Theke',plant:'Pflanze'};
let roomLayer,objects,preview,hoverCell=null,dragPointer=null;

function chosenItem(cell){
  const item={type:state.selectedTool,...cell,r:state.rotation};
  if(item.type==='table')item.seats=state.selectedSeats;
  return item;
}

function placed(item,interactive=true,ghost=false){
  const {w,h}=dimensions(item),point=project(item.x+(w-1)/2,item.y+(h-1)/2),group=new Container();
  group.label=interactive?'placed-furniture':'fixed-furniture';group.position.set(point.x,point.y);group.zIndex=point.y;
  // A table and all of its chairs are a single flat, cached pixel sprite.
  const sprite=furnitureSprite(item.type,item.r,item.seats);group.addChild(sprite);
  if(ghost){group.alpha=.65;group.eventMode='none';}
  else if(interactive){
    group.eventMode=state.deleteMode?'static':'none';group.cursor='pointer';
    group.on('pointertap',event=>{if(state.deleteMode){event.stopPropagation();removeAt(item.x,item.y);}});
  }else group.eventMode='none';
  objects.addChild(group);return group;
}

function fixedKitchen(){
  [{type:'fridge',x:0,y:0,r:0},{type:'sink',x:1,y:0,r:0},{type:'oven',x:2,y:0,r:0},
    {type:'bar',x:4,y:0,r:0},{type:'plant',x:7,y:0,r:0},{type:'bar',x:4,y:1,r:0},{type:'bar',x:6,y:1,r:0}]
    .forEach(item=>placed(item,false));
}

function person(index){
  const group=new Container();group.addChild(personSprite(index));group.eventMode='none';return group;
}

function face(mover,dx,dy){
  const rotation=Math.abs(dx)>Math.abs(dy)?(dx>0?0:2):(dy>0?1:3);
  if(rotation===mover.facing)return;
  mover.g.removeChildren().forEach(child=>child.destroy());mover.g.addChild(personSprite(mover.index,rotation));mover.facing=rotation;
}

function walkableCells(){
  const used=new Set(state.restaurantState.flatMap(occupiedCells)),cells=[];
  for(let y=2;y<ROOM.h;y++)for(let x=0;x<ROOM.w;x++)if(!used.has(`${x},${y}`))cells.push({x,y});
  return cells;
}

function pathTo(start,goal,free){
  const first=`${start.x},${start.y}`,last=`${goal.x},${goal.y}`,queue=[first],parents=new Map([[first,null]]);
  for(let i=0;i<queue.length;i++){
    const current=queue[i];if(current===last)break;
    const [x,y]=current.split(',').map(Number);
    for(const [dx,dy]of [[1,0],[0,1],[-1,0],[0,-1]]){
      const next=`${x+dx},${y+dy}`;
      if(free.has(next)&&!parents.has(next)){parents.set(next,current);queue.push(next);}
    }
  }
  if(!parents.has(last))return [];
  const path=[];let cell=last;
  while(cell!==first){const [x,y]=cell.split(',').map(Number);path.unshift({x,y});cell=parents.get(cell);}
  return path;
}

function nextRoute(mover,cells=walkableCells()){
  const free=new Set(cells.map(cell=>`${cell.x},${cell.y}`)),start={x:Math.round(mover.x),y:Math.round(mover.y)};
  mover.path=[];mover.trip++;
  for(let attempt=0;attempt<8&&cells.length;attempt++){
    const goal=cells[Math.floor(hash(mover.index+attempt,mover.trip)*cells.length)%cells.length];
    mover.path=pathTo(start,goal,free);if(mover.path.length)break;
  }
  mover.wait=45+mover.index*20;
}

function refreshActors(){
  const cells=walkableCells(),free=new Set(cells.map(cell=>`${cell.x},${cell.y}`)),claimed=new Set();
  for(const mover of state.movers){
    if(mover.kind!=='restaurant')continue;
    const key=`${Math.round(mover.x)},${Math.round(mover.y)}`;
    if(!free.has(key)||claimed.has(key)){
      const nearest=cells.filter(cell=>!claimed.has(`${cell.x},${cell.y}`)).sort((a,b)=>Math.hypot(a.x-mover.x,a.y-mover.y)-Math.hypot(b.x-mover.x,b.y-mover.y))[0];
      if(!nearest){mover.g.visible=false;continue;}
      mover.x=nearest.x;mover.y=nearest.y;
    }else{mover.x=Math.round(mover.x);mover.y=Math.round(mover.y);}
    mover.g.visible=true;claimed.add(`${mover.x},${mover.y}`);nextRoute(mover,cells);
    const p=project(mover.x,mover.y);mover.g.position.set(p.x,p.y);mover.g.zIndex=p.y+.5;
  }
}

function renderFurniture(){
  for(const child of objects.children.slice())if(child.label==='placed-furniture'){objects.removeChild(child);child.destroy({children:true});}
  state.restaurantState.forEach(item=>placed(item));refreshActors();state.onEditChange?.();
}

function finishEdit(message){
  state.pendingPlacement=null;hoverCell=null;dragPointer=null;
  const saved=saveLayout();renderFurniture();updatePlacementPreview();
  if(saved)notify(message);
}

function removeAt(x,y){
  const index=state.restaurantState.findIndex(item=>occupiedCells(item).includes(`${x},${y}`));
  if(index<0){notify(y<2?'Die feste Küche bleibt erhalten.':'Hier steht kein Möbelstück.');return;}
  rememberEdit();state.restaurantState.splice(index,1);finishEdit('Möbelstück entfernt.');
}

export function confirmPlacement(){
  if(state.scene!=='restaurant'||state.deleteMode||!state.pendingPlacement)return;
  const item=chosenItem(state.pendingPlacement),issue=placementIssue(item,state.restaurantState);
  if(issue){notify(issue);return;}
  rememberEdit();state.restaurantState.push(item);finishEdit(item.type==='table'?`${item.seats}er-Tisch mit Stühlen platziert.`:`${TOOL_NAMES[item.type]} platziert.`);
}

export function cancelPlacement(){
  state.pendingPlacement=null;hoverCell=null;dragPointer=null;updatePlacementPreview();
}

function tile(graphics,x,y,color,alpha=1,width=1){
  const p=project(x,y);
  graphics.poly([p.x,p.y-RTH/2,p.x+RTW/2,p.y,p.x,p.y+RTH/2,p.x-RTW/2,p.y]).fill({color,alpha}).stroke({color,width});
}

export function updatePlacementPreview(){
  if(state.scene!=='restaurant'||!preview||preview.destroyed)return;
  for(const child of objects.children)if(child.label==='placed-furniture')child.eventMode=state.deleteMode?'static':'none';
  preview.removeChildren().forEach(child=>child.destroy({children:true}));
  const cell=state.pendingPlacement||hoverCell,item=cell?chosenItem(cell):null,issue=item?placementIssue(item,state.restaurantState):null;
  const title=state.deleteMode?'Möbel entfernen':`${state.selectedTool==='table'?state.selectedSeats+'er-Tisch mit Stühlen':TOOL_NAMES[state.selectedTool]} · ${state.rotation*90}°`;
  document.querySelector('#placementTitle').textContent=title;
  document.querySelector('#placementStatus').textContent=state.deleteMode?'Ein Möbelstück antippen.':issue||(state.pendingPlacement?'Position gewählt. Mit Setzen bestätigen.':'Auf das Raster tippen oder ziehen.');
  const button=document.querySelector('#placeBtn');button.hidden=state.deleteMode;button.disabled=!state.pendingPlacement||!!issue;
  document.querySelector('#cancelBtn').hidden=!state.pendingPlacement;
  if(!cell)return;
  let target=item;
  if(state.deleteMode){target=state.restaurantState.find(value=>occupiedCells(value).includes(`${cell.x},${cell.y}`));if(!target)return;}
  const invalid=state.deleteMode||!!issue,color=invalid?0xd96549:0x90bd70,g=new Graphics();
  for(const key of occupiedCells(target)){const [x,y]=key.split(',').map(Number);tile(g,x,y,color,.35,2);}
  preview.addChild(g);
  if(!state.deleteMode){const ghost=placed(target,false,true);ghost.tint=invalid?0xe49b83:0xffffff;objects.removeChild(ghost);preview.addChild(ghost);}
}

function cellAt(global){return gridCell(roomLayer.toLocal(global));}
function inRoom(cell){return cell.x>=0&&cell.y>=0&&cell.x<ROOM.w&&cell.y<ROOM.h;}
function movePointer(event){
  const cell=cellAt(event.global);
  if(dragPointer!==null&&event.pointerId===dragPointer&&!state.deleteMode){
    if(cell.x< -1||cell.y< -1||cell.x>ROOM.w||cell.y>ROOM.h)return;
    if(state.pendingPlacement?.x===cell.x&&state.pendingPlacement?.y===cell.y)return;
    state.pendingPlacement=cell;updatePlacementPreview();return;
  }
  if(state.pendingPlacement||event.pointerType==='touch')return;
  const next=inRoom(cell)?cell:null;
  if(hoverCell?.x===next?.x&&hoverCell?.y===next?.y)return;
  hoverCell=next;updatePlacementPreview();
}

function wallWindow(layer,x,y,right=true){
  const start=project(x,y),end=project(x+(right?1:0),y+(right?0:1)),middle=project(x+(right?.5:0),y+(right?0:.5)),g=new Graphics();
  g.poly([start.x,start.y-78,end.x,end.y-78,end.x,end.y-52,start.x,start.y-52]).fill(0x749397).stroke({color:0xf0dfbc,width:2});
  g.moveTo(middle.x,middle.y-78).lineTo(middle.x,middle.y-52).stroke({color:0xf0dfbc,width:2});layer.addChild(g);
}

export function resizeRestaurant(){
  if(state.scene!=='restaurant'||!roomLayer||roomLayer.destroyed)return;
  const area=sceneViewport(true),minX=-ROOM.h*RTW/2,maxX=ROOM.w*RTW/2,minY=-RTH/2-WALL_HEIGHT,maxY=(ROOM.w+ROOM.h-1)*RTH/2;
  const scale=Math.min(1.45,area.width/(maxX-minX),area.height/(maxY-minY));
  roomLayer.scale.set(scale);
  roomLayer.position.set((area.left+area.right)/2-(minX+maxX)/2*scale,(area.top+area.bottom)/2-(minY+maxY)/2*scale);
  app.stage.hitArea=new Rectangle(0,0,app.screen.width,app.screen.height);
}

export function showRestaurant(){
  if(state.scene==='restaurant')return;
  clearWorld();state.scene='restaurant';sceneUI('restaurant');
  roomLayer=new Container();roomLayer.label='restaurant-room';world.addChild(roomLayer);
  const wall=new Graphics(),floor=new Container();objects=new Container();preview=new Container();
  objects.label='restaurant-objects';objects.sortableChildren=true;preview.label='placement-preview';preview.eventMode='none';hoverCell=null;dragPointer=null;
  const a=project(-.5,-.5),b=project(ROOM.w-.5,-.5),c=project(-.5,ROOM.h-.5);
  wall.poly([a.x,a.y,b.x,b.y,b.x,b.y-WALL_HEIGHT,a.x,a.y-WALL_HEIGHT]).fill(0xcbb28b).stroke({color:0x745038,width:2});
  wall.poly([a.x,a.y,c.x,c.y,c.x,c.y-WALL_HEIGHT,a.x,a.y-WALL_HEIGHT]).fill(0xb59670).stroke({color:0x745038,width:2});
  wall.poly([a.x,a.y-32,b.x,b.y-32,b.x,b.y,a.x,a.y]).fill(0x8a5b3d);
  wall.poly([a.x,a.y-32,c.x,c.y-32,c.x,c.y,a.x,a.y]).fill(0x774b36);
  roomLayer.addChild(wall);wallWindow(roomLayer,2,-.5);wallWindow(roomLayer,5,-.5);wallWindow(roomLayer,-.5,2,false);wallWindow(roomLayer,-.5,4.5,false);
  roomLayer.addChild(floor,objects,preview);
  for(let y=0;y<ROOM.h;y++)for(let x=0;x<ROOM.w;x++){
    const p=project(x,y),kitchen=y<2,entrance=x===ROOM.w-1&&y===ROOM.h-1,g=new Graphics();
    const color=entrance?0xd1bc8a:kitchen?((x+y)%2?0xb89c77:0xc7aa82):((x+y)%2?0xb56d47:0xc77c50);
    tile(g,x,y,color);
    // A light, continuous 2:1 grid stays readable underneath the preview.
    g.poly([p.x,p.y-RTH/2,p.x+RTW/2,p.y,p.x,p.y+RTH/2,p.x-RTW/2,p.y]).stroke({color:0xf2d8aa,alpha:.3,width:1});
    if(entrance)g.poly([p.x-9,p.y+1,p.x,p.y-4,p.x+9,p.y+1,p.x+3,p.y+1,p.x+3,p.y+6,p.x-3,p.y+6,p.x-3,p.y+1]).fill(0x776c42);
    g.label=`floor-${x}-${y}`;g.eventMode='static';g.cursor='pointer';g.on('pointertap',()=>{if(state.deleteMode)removeAt(x,y);});floor.addChild(g);
  }
  fixedKitchen();
  [{x:1,y:5},{x:5,y:3},{x:6,y:4},{x:0,y:6}].forEach((position,index)=>{
    const g=person(index);objects.addChild(g);state.movers.push({...position,index,g,kind:'restaurant',trip:0,path:[],wait:0,facing:0});
  });
  renderFurniture();resizeRestaurant();updatePlacementPreview();
  app.stage.on('globalpointermove',movePointer);
  app.stage.on('pointerdown',event=>{
    const cell=cellAt(event.global);if(!inRoom(cell))return;
    hoverCell=cell;
    if(!state.deleteMode){dragPointer=event.pointerId;state.pendingPlacement=cell;}
    updatePlacementPreview();
  });
  const release=()=>{dragPointer=null;};
  app.stage.on('pointerup',release);app.stage.on('pointerupoutside',release);app.stage.on('pointercancel',release);
  app.stage.on('pointerleave',()=>{hoverCell=null;if(!state.pendingPlacement)updatePlacementPreview();});
}

export function tickRestaurant(dt){
  for(const mover of state.movers){
    if(mover.kind!=='restaurant'||!mover.g.visible)continue;
    if(mover.wait>0){mover.wait-=dt;continue;}
    if(!mover.path.length){nextRoute(mover);continue;}
    const next=mover.path[0],dx=next.x-mover.x,dy=next.y-mover.y,distance=Math.hypot(dx,dy),step=.013*dt;
    face(mover,dx,dy);
    if(distance<=step){mover.x=next.x;mover.y=next.y;mover.path.shift();}
    else{mover.x+=dx/distance*step;mover.y+=dy/distance*step;}
    const p=project(mover.x,mover.y);mover.g.position.set(p.x,p.y);mover.g.zIndex=p.y+.5;
  }
}

export function undoRestaurant(){
  if(!state.history.length)return;
  state.restaurantState=state.history.pop();finishEdit('Letzte Änderung rückgängig gemacht.');
}

export function resetRestaurant(){
  const initial=copyLayout();
  if(JSON.stringify(initial)!==JSON.stringify(state.restaurantState)){rememberEdit();state.restaurantState=initial;}
  state.rotation=0;state.selectedTool='table';state.selectedSeats=4;state.deleteMode=false;
  finishEdit('Start-Einrichtung wiederhergestellt.');
}
