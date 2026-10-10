import {START_MONEY,itemPrice,product,money} from './pizza-catalog.js?v=20261010j';
import {app,world,state,Container,Graphics,Rectangle,clearWorld,sceneUI,sceneViewport,rememberEdit,saveLayout,updateMoney,notify,hash} from './pizza-core.js?v=20261010j';
import {ROOM,GRID,KITCHEN,KITCHEN_DOOR,FIXED_DECOR,kitchenCell,passageCell,guestCell,project,gridCell,dimensions,occupiedCells,placementIssue,copyLayout} from './pizza-layout.js?v=20261010j';
import {furnitureSprite,personSprite} from './pizza-sprites.js?v=20261010j';

const RTW=GRID.width,RTH=GRID.height,WALL_HEIGHT=96;
const TOOL_NAMES={table:'Tisch',oven:'Ofen',bar:'Theke',plant:'Pflanze',jukebox:'Musikautomat',arcade:'Spielautomat'};
let roomLayer,roomMask,objects,preview,hoverCell=null,dragPointer=null;
const view={zoom:1,x:0,y:0},pointers=new Map();
let panMode=false,pinching=false,blockTap=false;
export function restaurantView(){return {...view,panMode};}
export function toggleRestaurantPan(){
  panMode=!panMode;cancelPlacement();updateCameraUI();updatePlacementPreview();
}
function updateCameraUI(){
  const button=document.querySelector('#roomPanBtn');button.classList.toggle('active',panMode);button.setAttribute('aria-pressed',String(panMode));
  document.querySelector('#roomZoomOutBtn').disabled=view.zoom<=1;
  document.querySelector('#roomZoomInBtn').disabled=view.zoom>=2.8;
  document.querySelector('#roomPanBtn').title=panMode?'Ansicht ziehen. Erneut drücken zum Einrichten.':'Ansicht verschieben';
}
export function centerRestaurant(){view.zoom=1;view.x=0;view.y=0;panMode=false;resizeRestaurant();updateCameraUI();updatePlacementPreview();}
export function zoomRestaurant(factor,anchor){
  if(state.scene!=='restaurant')return;
  const area=sceneViewport(true),center={x:(area.left+area.right)/2,y:(area.top+area.bottom)/2};
  anchor=anchor||center;const old=view.zoom,next=Math.max(1,Math.min(2.8,old*factor));
  view.x=(view.x+center.x-anchor.x)*next/old+anchor.x-center.x;
  view.y=(view.y+center.y-anchor.y)*next/old+anchor.y-center.y;
  view.zoom=next;resizeRestaurant();updateCameraUI();
}

function chosenItem(cell){
  const item={type:state.selectedTool,...cell,r:state.rotation,variant:state.selectedVariant};
  if(item.type==='table')item.seats=state.selectedSeats;
  return item;
}

function placed(item,interactive=true,ghost=false){
  const {w,h}=dimensions(item),point=project(item.x+(w-1)/2,item.y+(h-1)/2),group=new Container();
  group.label=interactive?'placed-furniture':'fixed-furniture';group.position.set(point.x,point.y);group.zIndex=point.y;
  // A table and all of its chairs are a single flat, cached pixel sprite.
  const sprite=furnitureSprite(item.type,item.r,item.seats,item.variant);group.addChild(sprite);
  if(ghost){group.alpha=.65;group.eventMode='none';}
  else if(interactive){
    group.eventMode=state.deleteMode&&!panMode?'static':'none';group.cursor='pointer';
    group.on('pointertap',event=>{if(state.deleteMode&&!panMode&&!blockTap){event.stopPropagation();removeAt(item.x,item.y);}});
  }else group.eventMode='none';
  objects.addChild(group);return group;
}

function fixedKitchen(){
  [{type:'fridge',x:8,y:0,r:0},{type:'oven',x:9,y:0,r:0},{type:'sink',x:11,y:0,r:1},
    {type:'prep',x:10,y:2,r:0},{type:'prep',x:8,y:2,r:1}].forEach(item=>placed(item,false));
  FIXED_DECOR.forEach(item=>placed(item,false));
  const chef=person(0),p=project(9,2);chef.label='kitchen-chef';chef.position.set(p.x,p.y);chef.zIndex=p.y+.5;objects.addChild(chef);
}

function partition(x,y,right,length,height){
  const start=project(x,y),end=project(x+(right?length:0),y+(right?0:length)),g=new Graphics();
  g.label='kitchen-partition';g.eventMode='none';g.zIndex=Math.max(start.y,end.y)+.1;
  g.poly([start.x,start.y,end.x,end.y,end.x,end.y-height,start.x,start.y-height]).fill(0xdbcaab).stroke({color:0x8b6845,width:1});
  g.poly([start.x,start.y,end.x,end.y,end.x,end.y-24,start.x,start.y-24]).fill(0x865732);
  for(let i=0;i<length;i++){
    const p=project(x+(right?i:0),y+(right?0:i));
    g.moveTo(p.x,p.y).lineTo(p.x,p.y-24).stroke({color:0xba8851,width:1});
  }
  g.moveTo(start.x,start.y-height).lineTo(end.x,end.y-height).stroke({color:0xb77b46,width:4});objects.addChild(g);
}
function kitchenWalls(){
  partition(7.5,-.5,false,4,42);
  partition(7.5,3.5,true,1,48);partition(9.5,3.5,true,2,48);
  // The missing one-cell wall segment is the door, aligned with the reserved approach.
  const a=project(8.5,3.5),b=project(9.5,3.5),g=new Graphics();
  g.label='kitchen-door';g.eventMode='none';g.zIndex=b.y+.2;
  for(const p of [a,b])g.moveTo(p.x,p.y).lineTo(p.x,p.y-60).stroke({color:0x875a35,width:3});
  g.moveTo(a.x,a.y-60).lineTo(b.x,b.y-60).stroke({color:0xb17b46,width:4});objects.addChild(g);
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
  for(let y=0;y<ROOM.h;y++)for(let x=0;x<ROOM.w;x++)if(guestCell(x,y)&&!used.has(`${x},${y}`))cells.push({x,y});
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
  const saved=saveLayout();updateMoney();renderFurniture();updatePlacementPreview();
  if(saved)notify(message);
}

function removeAt(x,y){
  const index=state.restaurantState.findIndex(item=>occupiedCells(item).includes(`${x},${y}`));
  if(index<0){notify(kitchenCell(x,y)?'Die feste Küche bleibt erhalten.':'Hier steht kein Möbelstück.');return;}
  rememberEdit();const refund=Math.floor((state.restaurantState[index].paid||0)/2);state.restaurantState.splice(index,1);state.balance+=refund;finishEdit('Möbel verkauft: '+money(refund)+'.');
}

export function confirmPlacement(){
  if(state.scene!=='restaurant'||state.deleteMode||!state.pendingPlacement)return;
  const item=chosenItem(state.pendingPlacement),issue=placementIssue(item,state.restaurantState);
  if(issue){notify(issue);return;}
  const price=itemPrice(item);if(state.balance<price){notify('Nicht genügend Geld.');return;}
  rememberEdit();state.balance-=price;item.paid=price;state.restaurantState.push(item);finishEdit(item.type==='table'?`${item.seats}er-Tisch mit Stühlen platziert.`:`${TOOL_NAMES[item.type]} platziert.`);
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
  for(const child of objects.children)if(child.label==='placed-furniture')child.eventMode=state.deleteMode&&!panMode?'static':'none';
  preview.removeChildren().forEach(child=>child.destroy({children:true}));
  const cell=state.pendingPlacement||hoverCell,item=cell?chosenItem(cell):null,issue=item?(placementIssue(item,state.restaurantState)||(state.balance<itemPrice(item)?'Nicht genügend Geld.':null)):null;
  const title=panMode?'Ansicht verschieben':state.deleteMode?'Möbel verkaufen':`${state.selectedTool==='table'?state.selectedSeats+'er-Tisch mit Stühlen':TOOL_NAMES[state.selectedTool]} · ${state.rotation*90}°`;
  document.querySelector('#placementTitle').textContent=title;
  document.querySelector('#placementStatus').textContent=panMode?'Zum Einrichten den Hand-Modus ausschalten.':state.deleteMode?'Antippen: 50 % des Kaufpreises zurück.':issue||(state.pendingPlacement?'Position gewählt. Mit Setzen bestätigen.':'Auf das Raster tippen oder ziehen.');
  const button=document.querySelector('#placeBtn');button.hidden=state.deleteMode;button.disabled=!state.pendingPlacement||!!issue;
  document.querySelector('#cancelBtn').hidden=!state.pendingPlacement;
  if(!state.deleteMode&&!panMode)document.querySelector('#placementStatus').textContent=money(itemPrice(chosenItem({x:0,y:0})))+' · '+document.querySelector('#placementStatus').textContent;
  if(!cell||panMode)return;
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
  const previous=pointers.get(event.pointerId);
  if(previous){
    if(!pointers.size)blockTap=panMode;
    pointers.set(event.pointerId,{x:event.global.x,y:event.global.y});
    if(pointers.size>=2){
      const [a,b]=[...pointers.values()],old=[...pointers.entries()].map(([id,p])=>id===event.pointerId?previous:p);
      const distance=Math.hypot(a.x-b.x,a.y-b.y),before=Math.hypot(old[0].x-old[1].x,old[0].y-old[1].y);
      const anchor={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
      if(before>0)zoomRestaurant(distance/before,anchor);
      view.x+=(a.x+b.x-old[0].x-old[1].x)/2;view.y+=(a.y+b.y-old[0].y-old[1].y)/2;resizeRestaurant();return;
    }
    if(panMode){view.x+=event.global.x-previous.x;view.y+=event.global.y-previous.y;resizeRestaurant();return;}
  }
  if(pinching||panMode)return;
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

function wallPanel(layer,x,y,right,width,z0,z1,color,outline=0x65452d){
  const a=project(x,y),b=project(x+(right?width:0),y+(right?0:width)),g=new Graphics();
  g.poly([a.x,a.y-z1,b.x,b.y-z1,b.x,b.y-z0,a.x,a.y-z0]).fill(color).stroke({color:outline,width:1});layer.addChild(g);return g;
}

function wallWindow(layer,x,y,right=true){
  wallPanel(layer,x-.08*(right?1:0),y-.08*(right?0:1),right,1.16,46,83,0x956637);
  wallPanel(layer,x,y,right,1,49,80,0x88a6a0,0xe8cea0);
  for(const offset of [-.28,1.04]){
    const sx=x+(right?offset:0),sy=y+(right?0:offset);
    wallPanel(layer,sx,sy,right,.23,48,81,0x456440);
    for(let z=51;z<80;z+=5)wallPanel(layer,sx,sy,right,.23,z,z+1,0x7e8d52);
  }
  wallPanel(layer,x+(right?.48:0),y+(right?0:.48),right,.045,49,80,0xe9d6af);
  wallPanel(layer,x,y,right,1,39,47,0x7b4d2e);
  const flowers=new Graphics();
  for(let i=0;i<8;i++){
    const p=project(x+(right?i/8:0),y+(right?0:i/8));
    flowers.rect(p.x-2,p.y-47,4,5).fill(0x54713a);
    flowers.rect(p.x-1,p.y-49,2,2).fill(i%2?0xd69a44:0xaf3d2c);
  }
  layer.addChild(flowers);
}

function wallDetails(layer){
  for(const right of [true,false]){
    const length=right?ROOM.w:ROOM.h;
    for(let i=0;i<length;i++){
      wallPanel(layer,right?i-.5:-.5,right?-.5:i-.5,right,.025,2,30,0xbd8950);
      wallPanel(layer,right?i-.5:-.5,right?-.5:i-.5,right,1,30,33,0xb88852);
      const p=project(right?i:-.5,right?-.5:i),g=new Graphics();
      for(let n=0;n<14;n++){
        const t=.1+hash(i,n,right?41:73)*.8,z=37+hash(n,i,91)*48;
        const v=project(right?i-.5+t:-.5,right?-.5:i-.5+t);
        g.rect(Math.round(v.x),Math.round(v.y-z),n%3===0?2:1,1).fill({color:n%2?0xe9d2aa:0x997954,alpha:.25});
      }
      g.rect(p.x,p.y-90,2,1).fill({color:0xf2dec0,alpha:.4});layer.addChild(g);
    }
    for(const i of [1,3.8,6,8.4,10.8]){
      if(i>length-.6)continue;
      const p=project(right?i:-.5,right?-.5:i),g=new Graphics();
      for(let n=0;n<14;n++){
        const t=.1+hash(i,n,right?41:73)*.8,z=37+hash(n,i,91)*48;
        const v=project(right?i-.5+t:-.5,right?-.5:i-.5+t);
        g.rect(Math.round(v.x),Math.round(v.y-z),n%3===0?2:1,1).fill({color:n%2?0xe9d2aa:0x997954,alpha:.25});
      }
      g.circle(p.x,p.y-62,8).fill({color:0xf8c264,alpha:.12});
      g.rect(p.x-2,p.y-67,4,11).fill(0x644831);
      g.rect(p.x-2,p.y-65,4,6).fill(0xf4c264);layer.addChild(g);
    }
  }
  wallPanel(layer,-.5,.45,false,.55,53,73,0xb58847);
  wallPanel(layer,-.5,.51,false,.43,56,70,0x61764a);
  wallPanel(layer,6.2,-.5,true,1,51,56,0x855530);
  for(let i=0;i<5;i++){
    const p=project(6.25+i*.18,-.5),g=new Graphics();
    g.rect(p.x-2,p.y-65,3,9).fill(i%2?0x64733c:0x893f2c);
    g.rect(p.x-1,p.y-68,1,3).fill(0x543d2b);layer.addChild(g);
  }
}

export function resizeRestaurant(){
  if(state.scene!=='restaurant'||!roomLayer||roomLayer.destroyed)return;
  const area=sceneViewport(true),minX=-ROOM.h*RTW/2,maxX=ROOM.w*RTW/2,minY=-RTH/2-WALL_HEIGHT,maxY=(ROOM.w+ROOM.h-1)*RTH/2;
  const fit=Math.min(1.45,area.width/(maxX-minX),area.height/(maxY-minY)),scale=fit*view.zoom;
  const limitX=Math.max(0,((maxX-minX)*scale-area.width)/2),limitY=Math.max(0,((maxY-minY)*scale-area.height)/2);
  view.x=Math.max(-limitX,Math.min(limitX,view.x));view.y=Math.max(-limitY,Math.min(limitY,view.y));
  roomMask.clear().rect(area.left,area.top,area.width,area.height).fill(0xffffff);
  roomLayer.scale.set(scale);
  roomLayer.position.set((area.left+area.right)/2-(minX+maxX)/2*scale+view.x,(area.top+area.bottom)/2-(minY+maxY)/2*scale+view.y);
  app.stage.hitArea=new Rectangle(0,0,app.screen.width,app.screen.height);
}

export function showRestaurant(){
  if(state.scene==='restaurant')return;
  clearWorld();state.scene='restaurant';sceneUI('restaurant');
  roomLayer=new Container();roomLayer.label='restaurant-room';world.addChild(roomLayer);
  roomMask=new Graphics();roomMask.eventMode='none';world.addChild(roomMask);roomLayer.mask=roomMask;
  view.zoom=1;view.x=0;view.y=0;panMode=false;pinching=false;blockTap=false;pointers.clear();updateCameraUI();
  const wall=new Graphics(),floor=new Container();objects=new Container();preview=new Container();
  objects.label='restaurant-objects';objects.sortableChildren=true;preview.label='placement-preview';preview.eventMode='none';hoverCell=null;dragPointer=null;
  const a=project(-.5,-.5),b=project(ROOM.w-.5,-.5),c=project(-.5,ROOM.h-.5);
  wall.poly([a.x,a.y,b.x,b.y,b.x,b.y-WALL_HEIGHT,a.x,a.y-WALL_HEIGHT]).fill(0xcbb28b).stroke({color:0x745038,width:2});
  wall.poly([a.x,a.y,c.x,c.y,c.x,c.y-WALL_HEIGHT,a.x,a.y-WALL_HEIGHT]).fill(0xb59670).stroke({color:0x745038,width:2});
  wall.poly([a.x,a.y-32,b.x,b.y-32,b.x,b.y,a.x,a.y]).fill(0x8a5b3d);
  wall.poly([a.x,a.y-32,c.x,c.y-32,c.x,c.y,a.x,a.y]).fill(0x774b36);
  roomLayer.addChild(wall);wallWindow(roomLayer,2,-.5);wallWindow(roomLayer,5,-.5);wallWindow(roomLayer,-.5,2,false);wallWindow(roomLayer,-.5,4.5,false);wallWindow(roomLayer,-.5,7.5,false);wallWindow(roomLayer,10,-.5);
  wallDetails(roomLayer);
  for(const right of [true,false])for(let i=0;i<(right?ROOM.w:ROOM.h);i++){
    const p=project(right?i-.5:-.5,right?-.5:i-.5),q=project(right?i+.5:-.5,right?-.5:i+.5),cap=new Graphics();
    cap.moveTo(p.x,p.y-WALL_HEIGHT).lineTo(q.x,q.y-WALL_HEIGHT).stroke({color:i%2?0xa65735:0xbf7042,width:2});roomLayer.addChild(cap);
  }
  roomLayer.addChild(floor,objects,preview);
  for(let y=0;y<ROOM.h;y++)for(let x=0;x<ROOM.w;x++){
    const p=project(x,y),kitchen=kitchenCell(x,y),entrance=x===ROOM.w-1&&y===ROOM.h-1,g=new Graphics();
    const rug=(x===ROOM.w-2&&y===ROOM.h-1)||(x===ROOM.w-1&&y===ROOM.h-2);
    const color=rug?0x934a36:entrance?0xd1bc8a:kitchen?((x+y)%2?0x999c91:0xb6b5a5):((x+y)%2?0xb56d47:0xc77c50);
    tile(g,x,y,color);
    // A light, continuous 2:1 grid stays readable underneath the preview.
    g.poly([p.x,p.y-RTH/2,p.x+RTW/2,p.y,p.x,p.y+RTH/2,p.x-RTW/2,p.y]).stroke({color:0xf2d8aa,alpha:.5,width:1});
    if(!kitchen){
      const shade=(x*7+y*13)%3===0?0xc48a60:0xad704a;
      g.poly([p.x,p.y-12,p.x+25,p.y,p.x,p.y+12,p.x-25,p.y]).stroke({color:shade,alpha:.4,width:1});
    }
    if(passageCell(x,y))g.poly([p.x,p.y-9,p.x+20,p.y,p.x,p.y+9,p.x-20,p.y]).fill({color:0xd8bd86,alpha:.7});
    if(entrance)g.poly([p.x-9,p.y+1,p.x,p.y-4,p.x+9,p.y+1,p.x+3,p.y+1,p.x+3,p.y+6,p.x-3,p.y+6,p.x-3,p.y+1]).fill(0x776c42);
    g.label=`floor-${x}-${y}`;g.eventMode='static';g.cursor='pointer';g.on('pointertap',()=>{if(state.deleteMode&&!panMode&&!blockTap)removeAt(x,y);});floor.addChild(g);
  }
  fixedKitchen();kitchenWalls();
  // Low cutaway edges give the building a facade while leaving the floor visible.
  partition(ROOM.w-.5,-.5,false,ROOM.h,9);
  partition(-.5,ROOM.h-.5,true,ROOM.w-1,9);
  [{x:1,y:5},{x:5,y:3},{x:6,y:4},{x:0,y:6}].forEach((position,index)=>{
    const g=person(index);objects.addChild(g);state.movers.push({...position,index,g,kind:'restaurant',trip:0,path:[],wait:0,facing:0});
  });
  renderFurniture();resizeRestaurant();updatePlacementPreview();
  app.stage.on('globalpointermove',movePointer);
  app.stage.on('pointerdown',event=>{
    const area=sceneViewport(true);if(event.global.x<area.left||event.global.x>area.right||event.global.y<area.top||event.global.y>area.bottom)return;
    if(!pointers.size)blockTap=panMode;
    pointers.set(event.pointerId,{x:event.global.x,y:event.global.y});
    if(pointers.size>=2){pinching=true;blockTap=true;cancelPlacement();return;}
    if(panMode)return;
    const cell=cellAt(event.global);if(!inRoom(cell))return;
    hoverCell=cell;
    if(!state.deleteMode){dragPointer=event.pointerId;state.pendingPlacement=cell;}
    updatePlacementPreview();
  });
  const release=event=>{pointers.delete(event.pointerId);dragPointer=null;if(!pointers.size)pinching=false;};
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
  const edit=state.history.pop();state.restaurantState=edit.items;state.balance=edit.balance;finishEdit('Letzte Änderung rückgängig gemacht.');
}

export function resetRestaurant(){
  const initial=copyLayout();
  if(JSON.stringify(initial)!==JSON.stringify(state.restaurantState)||state.balance!==START_MONEY){rememberEdit();state.restaurantState=initial;state.balance=START_MONEY;}
  state.rotation=0;state.selectedTool='table';state.selectedSeats=4;state.selectedVariant='wood';state.deleteMode=false;
  finishEdit('Start-Einrichtung wiederhergestellt.');
}
