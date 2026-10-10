import {app,world,state,TW,TH,CITY_N,Container,Graphics,Sprite,Rectangle,iso,hash,label,clearWorld,sceneUI,sceneViewport} from './pizza-core.js?v=20261010i';
import {citySprite} from './pizza-city-art.js?v=20261010i';
import {personSprite} from './pizza-sprites.js?v=20261010i';
import {carSprite} from './pizza-city-traffic.js?v=20261010i';

const DEFAULT_VIEW={x:0,y:432,zoom:.88};
function roadCell(value){const m=((value%8)+8)%8;return m<2;}
function road(x,y){return roadCell(x)||roadCell(y);}
function water(x,y){return x>=24&&x<26&&y>=12;}
function bridge(x,y){return water(x,y)&&roadCell(y);}
function sidewalk(x,y){return !road(x,y)&&(road(x-1,y)||road(x+1,y)||road(x,y-1)||road(x,y+1));}
function park(x,y){return x>=18&&x<24&&y>=18&&y<24&&!(x<21&&y>20);}
function groundColor(x,y){
  if(water(x,y)&&!bridge(x,y))return hash(x,y)>.5?0x39798d:0x3c8093;
  if(bridge(x,y))return 0xafa68e;
  if(road(x,y))return hash(x,y)>.55?0x555b5c:0x515759;
  if(park(x,y)&&!sidewalk(x,y)&&!(x>=21&&x<=22&&y>=21&&y<=22))return hash(x,y)>.5?0x6e8854:0x78915b;
  return hash(x,y)>.5?0xb9b29a:0xc1b9a1;
}
function tile(g,x,y,color){const p=iso(x,y);g.poly([p.x,p.y-TH/2,p.x+TW/2,p.y,p.x,p.y+TH/2,p.x-TW/2,p.y]).fill(color);}
function place(layer,object,x,y){const p=iso(x,y);object.position.set(p.x,p.y);object.zIndex=p.y;layer.addChild(object);return object;}

function fallbackTree(){const g=new Graphics();g.ellipse(0,0,12,4).fill({color:0,alpha:.16});g.rect(-2,-20,4,20).fill(0x78553a);g.poly([-17,-23,-15,-41,-7,-52,8,-54,18,-43,20,-27,7,-19]).fill(0x426641);g.poly([-15,-33,-10,-47,2,-51,12,-39,1,-27]).fill(0x6a8b4d);return g;}
function tree(index=0,scale=1){const g=citySprite('props',index)||fallbackTree();g.scale.set(scale);g.label='city-tree';return g;}
function lamp(){const g=new Graphics();g.ellipse(1,1,4,2).fill({color:0,alpha:.17});g.rect(-2,-2,5,3).fill(0x35372f);g.rect(0,-29,2,28).fill(0x383c32);g.poly([-4,-32,1,-35,6,-32,5,-25,-3,-25]).fill(0x343a31);g.rect(-2,-31,6,4).fill(0xe9cc7e);g.rect(-3,-24,8,2).fill(0x32372f);return g;}
function bench(){return citySprite('props',5)||new Graphics().poly([-14,-8,4,-17,16,-11,-2,-2]).fill(0x795534);}
function planter(){return citySprite('props',6)||new Graphics().rect(-5,-9,10,9).fill(0x996842).ellipse(0,-12,8,6).fill(0x557549);}
function patioTable(){const g=citySprite('props',7)||new Graphics().poly([-13,-16,0,-23,13,-16,0,-10]).fill(0xb94832).rect(-1,-10,2,10).fill(0x78593a);g.label='city-terrace';return g;}
function fountain(){return citySprite('props',4)||new Graphics().ellipse(0,-5,36,18).fill(0xb4b096).ellipse(0,-6,30,13).fill(0x598d9e).rect(-3,-25,6,21).fill(0xcac2a8);}

function paving(g,x,y){
  for(let a=0;a<3;a++)for(let b=0;b<3;b++){
    const p=iso(x-.35+a*.35,y-.35+b*.35),shade=hash(x*9+a,y*9+b);
    g.poly([p.x,p.y-4.5,p.x+9,p.y,p.x,p.y+4.5,p.x-9,p.y]).fill({color:shade>.5?0xe0d6bc:0x847d6b,alpha:shade>.5?.24:.13});
  }
}
function roadDetail(g,x,y){
  const p=iso(x,y),ix=roadCell(x),iy=roadCell(y);
  if(ix&&iy)return;
  if(ix&&x%8===0&&y%3===0)g.poly([p.x-13,p.y-2,p.x-10,p.y-4,p.x+8,p.y+5,p.x+5,p.y+7]).fill(0xc3c5b9);
  if(iy&&y%8===0&&x%3===0)g.poly([p.x+13,p.y-2,p.x+10,p.y-4,p.x-8,p.y+5,p.x-5,p.y+7]).fill(0xc3c5b9);
  if(ix&&y%8===2)for(let i=0;i<5;i++){const q=iso(x-.48+i*.23,y-.42);g.poly([q.x-3,q.y-1.5,q.x,q.y-3,q.x+17,q.y+5.5,q.x+14,q.y+7]).fill(0xdcd9c9);}
  if(iy&&x%8===2)for(let i=0;i<5;i++){const q=iso(x-.42,y-.48+i*.23);g.poly([q.x+3,q.y-1.5,q.x,q.y-3,q.x-17,q.y+5.5,q.x-14,q.y+7]).fill(0xdcd9c9);}
}
function waterDetail(g,x,y){
  for(let i=0;i<4;i++){
    const p=iso(x-.35+hash(x,y,i)*.7,y-.35+hash(y,x,i+9)*.7);
    g.poly([p.x-5,p.y,p.x+4,p.y-4,p.x+10,p.y-1,p.x+1,p.y+3]).fill({color:i%2?0x8ca8a5:0x235e78,alpha:.4});
  }
}
function bridges(g,objects){
  for(const y of [16,24]){
    const points=[[23.5,y-.5],[26.5,y-.5],[26.5,y+1.5],[23.5,y+1.5]].map(([x,gy])=>iso(x,gy));
    g.poly(points.flatMap(p=>[p.x,p.y])).fill(0xbab299).stroke({color:0xe3d8bd,width:2});
    for(let x=24;x<=26;x++)for(let gy=y;gy<=y+1;gy++)paving(g,x,gy);
    for(const edge of [y-.52,y+1.52]){
      const wall=new Graphics(),a=iso(23.5,edge),b=iso(26.5,edge);
      wall.poly([0,-9,b.x-a.x,b.y-a.y-9,b.x-a.x,b.y-a.y,0,0]).fill(0x8c836c).stroke({color:0xd6cbb0,width:2});
      for(let n=0;n<=6;n++){const px=n*16,py=n*8;wall.rect(px-2,py-14,4,8).fill(0xbeb397);}
      wall.position.set(a.x,a.y);wall.zIndex=(a.y+b.y)/2;wall.label='city-bridge';objects.addChild(wall);
    }
  }
}
function waterfront(objects){
  for(let y=12;y<34;y+=1.5){
    if(roadCell(y)||roadCell(y+.5))continue;
    const g=new Graphics();g.poly([0,-5,-40,15,-40,21,0,1]).fill(0x807b69).stroke({color:0xcac4ab,width:1});
    g.rect(-2,-14,4,12).fill(0x55594b);g.poly([-39,5,0,-14]).stroke({color:0x4e5549,width:2});
    place(objects,g,23.55,y+.1);
  }
}

function openRestaurant(){if(state.scene==='city'&&!state.cityGesture?.moved)state.navigate('restaurant');}
function pizzaBadge(g,x){
  g.circle(x,0,9).fill(0xcf9e52).stroke({color:0x75502f,width:1});g.circle(x,0,6.5).fill(0xaf3b2a);
  g.poly([x,0,x-5,-4,x-2,-6]).fill(0xf0cf82);g.poly([x,0,x+5,-4,x+6,1]).fill(0xf0cf82);g.poly([x,0,x-2,6,x-6,2]).fill(0xf0cf82);
}
function building(objects,labels,x,y,index=0,name=null,player=false){
  let object=citySprite('buildings',index);
  if(!object){const type=index>=4?'small':index%2?'medium':'big',textures=state.cityTex[type];object=new Sprite(textures[Math.floor(hash(x,y)*textures.length)]);object.anchor.set(.5,1);object.scale.set(2);}
  const p=iso(x,y);place(objects,object,x,y);object.label=player?'player-restaurant':'city-building';
  if(player){object.eventMode='static';object.cursor='pointer';object.on('pointertap',openRestaurant);}
  if(name){
    const tablePositions=[[-.55,.4],[.65,.2]];
    for(const [dx,dy]of tablePositions)place(objects,patioTable(),x+dx,y+dy);
    place(objects,planter(),x-1.6,y+.15);place(objects,planter(),x+1.25,y-.7);
    const tag=new Container(),text=label(name,12,'#3a2b1f'),width=Math.ceil(text.width)+36;tag.position.set(p.x,p.y-object.height-11);tag.zIndex=p.y;
    const bg=new Graphics();bg.roundRect(-width/2,-13,width,26,4).fill(0xf0dfbf).stroke({color:0x745238,width:2});
    bg.poly([-width/2+4,-10,width/2-4,-10]).stroke({color:0xfff1d4,width:1});pizzaBadge(bg,-width/2+13);
    text.anchor.set(0,.5);text.x=-width/2+28;tag.addChild(bg,text);
    if(player){tag.label='restaurant-sign';tag.eventMode='static';tag.cursor='pointer';tag.hitArea=new Rectangle(-width/2,-14,width,28);tag.on('pointertap',openRestaurant);}
    labels.addChild(tag);
  }
  return object;
}
function landmark(objects,labels,x,y,index){
  const object=citySprite('landmarks',index)||building(objects,labels,x,y,7);
  place(objects,object,x,y);object.label=index?'city-cathedral':'city-colosseum';
}
function decorateCorners(objects,ox,oy){
  [[.1,.1],[5.3,.1],[.1,5.3],[5.3,5.3]].forEach(([x,y],i)=>place(objects,i%2?planter():lamp(),ox+x,oy+y));
}
function block(objects,labels,bx,by){
  const ox=2+bx*8,oy=2+by*8;
  if(bx===0&&by===0){
    landmark(objects,labels,ox+3.4,oy+5.2,0);
    [[.1,3.9],[5.3,2.0],[5.2,5.3]].forEach(([x,y],i)=>place(objects,tree(i===1?3:2),ox+x,oy+y));
    decorateCorners(objects,ox,oy);return;
  }
  if(bx===1&&by===0){
    landmark(objects,labels,ox+2.7,oy+5.4,1);
    [[.1,1.1],[5.2,1.6],[5.3,5.2]].forEach(([x,y])=>place(objects,tree(2,.9),ox+x,oy+y));
    decorateCorners(objects,ox,oy);return;
  }
  if(bx===2&&by===2){
    place(objects,fountain(),ox+4.0,oy+4.0);
    building(objects,labels,ox+2.2,oy+4.6,6,'Donatello');
    [[.2,.8],[2.4,.4],[5.3,1.3],[5.2,5.2]].forEach(([x,y],i)=>place(objects,tree(i===1?3:i%3,.86),ox+x,oy+y));
    [[3.0,5.3],[5.4,3.0],[1.0,2.7]].forEach(([x,y])=>place(objects,bench(),ox+x,oy+y));
    decorateCorners(objects,ox,oy);return;
  }
  const variant=Math.floor(hash(bx,by)*4);
  building(objects,labels,ox+2.35,oy+2.35,variant);
  building(objects,labels,ox+5.2,oy+2.35,(variant+1)%4);
  if(bx===1&&by===1)building(objects,labels,ox+2.5,oy+4.6,4,'Mamma Mia',true);
  else if(bx===2&&by===1)building(objects,labels,ox+2.2,oy+4.6,5,"Luigi's");
  else{building(objects,labels,ox+2.35,oy+5.2,(variant+2)%4);if((bx+by)%2===0)building(objects,labels,ox+5.2,oy+5.2,7);}
  if(bx!==1||by!==1)place(objects,tree((bx+by+6)%4,.8),ox+5.25,oy+5.25);
  else place(objects,tree(3,.86),ox+5.2,oy+5.1);
  decorateCorners(objects,ox,oy);
}

let viewOffset=0;
function orientationOffset(){return matchMedia('(max-height:540px) and (min-width:500px)').matches?-72:0;}
function viewCenter(){const area=sceneViewport();return {x:(area.left+area.right)/2,y:(area.top+area.bottom)/2};}
function captureView(){
  const center=viewCenter(),camera=state.camera;
  state.cityView={x:(center.x-camera.x)/camera.scale.x,y:(center.y-camera.y)/camera.scale.y,zoom:camera.scale.x};
}
function clampCamera(){
  const center=viewCenter(),camera=state.camera,z=camera.scale.x;
  const x=(center.x-camera.x)/z,y=(center.y-camera.y)/z;
  const gx=Math.max(2,Math.min(CITY_N-3,(x/(TW/2)+y/(TH/2))/2));
  const gy=Math.max(2,Math.min(CITY_N-3,(y/(TH/2)-x/(TW/2))/2)),p=iso(gx,gy);
  camera.position.set(center.x-p.x*z,center.y-p.y*z);captureView();
}
export function resizeCity(){
  if(state.scene!=='city') return;
  const offset=orientationOffset(),view=state.cityView?{...state.cityView,y:state.cityView.y+offset-viewOffset}:{...DEFAULT_VIEW,y:DEFAULT_VIEW.y+offset},center=viewCenter();
  viewOffset=offset;
  state.camera.scale.set(view.zoom);state.camera.position.set(center.x-view.x*view.zoom,center.y-view.y*view.zoom);
  app.stage.hitArea=new Rectangle(0,0,app.screen.width,app.screen.height);captureView();
}
export function centerCity(){viewOffset=orientationOffset();state.cityView={...DEFAULT_VIEW,y:DEFAULT_VIEW.y+viewOffset};if(state.scene==='city') resizeCity();}
export function zoomCity(factor,anchor=viewCenter()){
  if(state.scene!=='city') return;
  const camera=state.camera,oldZoom=camera.scale.x,zoom=Math.max(.65,Math.min(2.2,oldZoom*factor));
  const x=(anchor.x-camera.x)/oldZoom,y=(anchor.y-camera.y)/oldZoom;
  camera.scale.set(zoom);camera.position.set(anchor.x-x*zoom,anchor.y-y*zoom);clampCamera();
}

function bindGestures(){
  const pointers=new Map();let lastPinch=0;
  state.cityGesture={moved:false,distance:0};
  app.stage.on('pointerdown',event=>{
    if(!pointers.size){state.cityGesture.moved=false;state.cityGesture.distance=0;}
    pointers.set(event.pointerId,{x:event.global.x,y:event.global.y});
    try{app.canvas.setPointerCapture(event.pointerId);}catch{}
    if(pointers.size===2){const [a,b]=[...pointers.values()];lastPinch=Math.hypot(a.x-b.x,a.y-b.y);state.cityGesture.moved=true;}
  });
  app.stage.on('globalpointermove',event=>{
    const previous=pointers.get(event.pointerId);if(!previous) return;
    const point={x:event.global.x,y:event.global.y};pointers.set(event.pointerId,point);
    if(pointers.size>=2){
      const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);
      if(lastPinch>0) zoomCity(distance/lastPinch,{x:(a.x+b.x)/2,y:(a.y+b.y)/2});lastPinch=distance;
    }else{
      const dx=point.x-previous.x,dy=point.y-previous.y;
      state.cityGesture.distance+=Math.hypot(dx,dy);
      if(state.cityGesture.distance>6) state.cityGesture.moved=true;
      state.camera.x+=dx;state.camera.y+=dy;clampCamera();
    }
  });
  const release=event=>{pointers.delete(event.pointerId);lastPinch=0;try{app.canvas.releasePointerCapture(event.pointerId);}catch{}};
  app.stage.on('pointerup',release);app.stage.on('pointerupoutside',release);app.stage.on('pointercancel',release);
}

export function showCity(){
  if(state.scene==='city') return;
  clearWorld();state.scene='city';sceneUI('city');
  state.camera=new Container();world.addChild(state.camera);
  const ground=new Graphics(),markings=new Graphics(),objects=new Container(),labels=new Container();
  ground.label='city-ground';objects.label='city-objects';objects.sortableChildren=true;labels.sortableChildren=true;
  state.camera.addChild(ground,markings,objects,labels);
  for(let y=-8;y<CITY_N+8;y++) for(let x=-8;x<CITY_N+8;x++){
    tile(ground,x,y,groundColor(x,y));
    if(water(x,y)&&!bridge(x,y))waterDetail(markings,x,y);
    else if(!road(x,y)||bridge(x,y))paving(markings,x,y);
    else roadDetail(markings,x,y);
  }
  bridges(markings,objects);waterfront(objects);
  for(let by=-1;by<4;by++) for(let bx=-1;bx<4;bx++) block(objects,labels,bx,by);
  [[7,4],[18,6],[7,13],[18,12],[7,21],[15,22],[22,15]].forEach(([x,y],i)=>place(objects,tree(i%4,.78),x,y));
  const lanes=[.12,1.12,8.12,9.12,16.12,17.12,24.12,25.12];
  for(let i=0;i<16;i++){
    const axis=Math.floor(i/8),dir=i%2?-1:1;if(axis===1&&i%8>=6)continue;
    const g=carSprite(i,axis,dir);objects.addChild(g);
    state.movers.push({kind:'car',g,axis,lane:lanes[i%8],t:(i*2.07)%CITY_N,dir,speed:.43+(i%4)*.065});
  }
  const sidewalks=[2.12,7.12,10.12,15.12,18.12,23.12];
  for(let i=0;i<24;i++){
    const axis=i%2,dir=i%4<2?1:-1,lane=sidewalks[i%6];
    const g=personSprite(i%4,axis===0?(dir>0?0:2):(dir>0?1:3));g.scale.set(.33);g.label='city-pedestrian';objects.addChild(g);
    const limit=axis===0&&lane>=12?23.4:CITY_N-.2;
    state.movers.push({kind:'person',g,axis,lane,t:(i*1.03)%limit,dir,limit,speed:.095+(i%5)*.011});
  }
  resizeCity();bindGestures();tickCity(0);
}

export function tickCity(dt){
  for(const mover of state.movers){
    mover.t+=mover.speed*dt*.035*mover.dir;
    const limit=mover.limit||CITY_N-.2;
    mover.t=((mover.t+.4)%limit+limit)%limit-.4;
    const p=iso(mover.axis===0?mover.t:mover.lane,mover.axis===0?mover.lane:mover.t);
    mover.g.position.set(Math.round(p.x),Math.round(p.y));mover.g.zIndex=p.y;
  }
}
