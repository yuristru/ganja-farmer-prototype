import {app,world,state,TW,TH,CITY_N,Container,Graphics,Sprite,Rectangle,iso,hash,label,clearWorld,makePerson,sceneUI,sceneViewport} from './pizza-core.js?v=20261010b';

const DEFAULT_VIEW={x:0,y:432,zoom:1.18};
function roadCell(value){const m=((value%8)+8)%8;return m===0||m===1;}
function road(x,y){return roadCell(x)||roadCell(y);}
function sidewalk(x,y){return !road(x,y)&&(road(x-1,y)||road(x+1,y)||road(x,y-1)||road(x,y+1));}
function groundColor(x,y){
  if(road(x,y)) return 0x4b5055;
  if(sidewalk(x,y)) return 0xc4b391;
  const bx=Math.floor((x-2)/8),by=Math.floor((y-2)/8);
  if(bx===1&&by===0) return hash(x,y)>.5?0x739168:0x6f8d63;
  return bx===1&&by===1?0xc1ad87:0xa99b7a;
}

function tree(scale=.9){
  const g=new Graphics();
  g.ellipse(0,1,10,4).fill({color:0,alpha:.18});g.rect(-2,-25,4,26).fill(0x684630);
  g.rect(-10,-39,20,14).fill(0x416d3f);g.rect(-7,-48,14,13).fill(0x5b874f);g.rect(-14,-32,10,11).fill(0x527c49);g.rect(5,-34,9,10).fill(0x477143);g.scale.set(scale);return g;
}
function lamp(){const g=new Graphics();g.rect(-1,-24,3,24).fill(0x29272a);g.rect(-4,-28,9,5).fill(0x29272a);g.rect(-2,-27,5,2).fill(0xe6c36b);return g;}
function bench(){const g=new Graphics();g.rect(-11,-7,22,5).fill(0x75482f);g.rect(-9,-11,18,4).fill(0x8c5a39);g.rect(-8,-2,3,6).fill(0x2e2b2d);g.rect(5,-2,3,6).fill(0x2e2b2d);return g;}
function planter(){const g=new Graphics();g.rect(-5,-6,10,7).fill(0x8a583b);g.rect(-7,-14,14,8).fill(0x4f7946);g.rect(-3,-19,7,7).fill(0x658d55);return g;}
function patioTable(){const g=new Graphics();g.rect(-7,-3,14,4).fill(0x7b4b31);g.rect(-1,0,3,8).fill(0x543421);g.rect(-10,5,5,3).fill(0x6d432d);g.rect(5,5,5,3).fill(0x6d432d);g.rect(-1,-18,3,15).fill(0xe9dfc5);g.poly([-11,-17,0,-25,11,-17,0,-12]).fill(0xb7392f).stroke({color:0xf0d8b6,width:1});return g;}
function fountain(){const g=new Graphics();g.poly([-34,0,0,-15,34,0,0,15]).fill(0x7c786e).stroke({color:0xd2c7ad,width:3});g.poly([-25,-1,0,-11,25,-1,0,10]).fill(0x5d96a0);g.rect(-3,-28,6,25).fill(0xbeb39c);g.rect(-7,-31,14,4).fill(0xd1c7ae);return g;}
function place(layer,object,x,y,depth=0){const p=iso(x,y);object.position.set(p.x,p.y);object.zIndex=p.y+depth;layer.addChild(object);return object;}

function car(i,axis,dir){
  const color=[0xc64938,0x4b77a2,0xd0a135,0x5f8b60,0xd9c9a9][i%5],g=new Graphics(),sign=axis===0?1:-1;
  g.ellipse(0,3,12,4).fill({color:0,alpha:.2});g.poly([-11*sign,0,-5*sign,-6,10*sign,2,4*sign,8]).fill(color);g.poly([-3*sign,-5,3*sign,-8,9*sign,-4,3*sign,-1]).fill(0x86a5ab);
  g.rect(-7,-1,3,3).fill(0x27262a);g.rect(5,4,3,3).fill(0x27262a);
  if(dir<0) g.scale.set(-1);return g;
}

function roadDetail(g,x,y,p){
  const ix=roadCell(x),iy=roadCell(y);
  if(ix&&iy) return;
  // Markings follow the two isometric axes and stay below every object.
  if(ix&&x%8===0&&y%3===0) g.poly([p.x-14,p.y-1,p.x-8,p.y-4,p.x+8,p.y+4,p.x+2,p.y+7]).fill(0xc8c0a8);
  if(iy&&y%8===0&&x%3===0) g.poly([p.x+14,p.y-1,p.x+8,p.y-4,p.x-8,p.y+4,p.x-2,p.y+7]).fill(0xc8c0a8);
  if(ix&&y%8===2) for(let i=0;i<4;i++){const q=iso(x-.4+i*.27,y-.38);g.poly([q.x-4,q.y-2,q.x,q.y-4,q.x+12,q.y+2,q.x+8,q.y+4]).fill(0xe3dac0);}
  if(iy&&x%8===2) for(let i=0;i<4;i++){const q=iso(x-.38,y-.4+i*.27);g.poly([q.x+4,q.y-2,q.x,q.y-4,q.x-12,q.y+2,q.x-8,q.y+4]).fill(0xe3dac0);}
}

function restaurantBody(player){
  const g=new Graphics(),awning=player?0xb7352d:0x4e8558;
  g.poly([-46,-59,0,-36,0,22,-46,-1]).fill(0xe3ba83).stroke({color:0x71452e,width:1});
  g.poly([0,-36,46,-59,46,-1,0,22]).fill(0xbf905e).stroke({color:0x71452e,width:1});
  g.poly([-50,-62,0,-87,50,-62,0,-37]).fill(0x9f4e35).stroke({color:0x633326,width:2});
  for(let i=0;i<4;i++) g.poly([-40+i*10,-61+i*5,0+i*10,-81+i*5,5+i*10,-78+i*5,-35+i*10,-58+i*5]).stroke({color:0xbd7150,width:1});
  g.poly([-34,-28,-13,-17,-13,5,-34,-6]).fill(0x66868c).stroke({color:0xffe2b2,width:2});
  g.poly([13,-19,31,-28,31,-2,13,7]).fill(0x62432f).stroke({color:0xf2d29f,width:2});
  g.poly([-48,-36,1,-11,1,-1,-48,-26]).fill(0xf0deba);
  for(let i=0;i<5;i++) g.poly([-48+i*10,-36+i*5,-42+i*10,-33+i*5,-42+i*10,-23+i*5,-48+i*10,-26+i*5]).fill(awning);
  return g;
}

function openRestaurant(){if(state.scene==='city'&&!state.cityGesture?.moved) state.navigate('restaurant');}

function building(objects,labels,x,y,type='medium',name=null,player=false){
  const restaurant=Boolean(name),p=iso(x,y),textures=state.cityTex[type];
  let object;
  if(restaurant){object=restaurantBody(player);object.position.set(p.x,p.y);object.zIndex=p.y+22;}
  else{
    object=new Sprite(textures[Math.floor(hash(x*10,y*10)*textures.length)%textures.length]);
    object.anchor.set(.5,1);object.scale.set(type==='big'?2.4:type==='medium'?2:2.2);object.position.set(p.x,p.y+20);object.zIndex=p.y+20;
  }
  object.label=player?'player-restaurant':'city-building';
  if(player){object.eventMode='static';object.cursor='pointer';object.hitArea=new Rectangle(-60,-105,120,130);object.on('pointertap',openRestaurant);}
  objects.addChild(object);
  if(restaurant){
    [[-1.05,1.05],[.75,1.65]].forEach(([dx,dy])=>place(objects,patioTable(),x+dx,y+dy));
    const tag=new Container(),width=name.length*7+34;tag.position.set(p.x,p.y-106);
    const bg=new Graphics();bg.roundRect(-width/2,-15,width,30,4).fill(0xe0c69b).stroke({color:player?0x8f2924:0x5f3b27,width:2});
    const text=label(name.toUpperCase(),11,'#3b2418');text.anchor.set(.5);tag.addChild(bg,text);
    if(player){tag.label='restaurant-sign';tag.eventMode='static';tag.cursor='pointer';tag.on('pointertap',openRestaurant);}
    labels.addChild(tag);
  }
}

function decorateCorners(layer,ox,oy,mask=0){
  [[0,0],[5,0],[0,5],[5,5]].forEach(([dx,dy],i)=>{if(!((mask>>i)&1)) place(layer,(i+ox+oy)%2===0?lamp():planter(),ox+dx,oy+dy);});
}
function block(objects,labels,bx,by){
  const ox=2+bx*8,oy=2+by*8;
  if(bx===1&&by===0){
    place(objects,fountain(),ox+3,oy+3);
    [[1,1],[5,1],[1,5],[5,5],[3,1]].forEach(([dx,dy],i)=>place(objects,tree(.88+(i%2)*.08),ox+dx,oy+dy));
    [[2,5],[5,2],[1.5,3.5]].forEach(([dx,dy])=>place(objects,bench(),ox+dx,oy+dy));decorateCorners(objects,ox,oy);return;
  }
  if(bx===1&&by===1){
    building(objects,labels,ox+1.1,oy+1.1,'medium');building(objects,labels,ox+4.55,oy+1.1,'big');
    building(objects,labels,ox+2.8,oy+4.75,'small','Mamma Mia',true);place(objects,planter(),ox+5.35,oy+4.45);decorateCorners(objects,ox,oy,8);return;
  }
  const variants=[[[1,1,'big'],[4,1,'medium'],[2.6,4.6,'medium']],[[1,1,'medium'],[4.2,1,'big'],[1.5,4.6,'small']],[[1,1,'medium'],[4.1,1.2,'medium'],[4.1,4.6,'big']]];
  variants[(bx+by*2)%3].forEach(([dx,dy,type],i)=>{
    const name=bx===0&&by===1&&i===2?'Donatello':bx===2&&by===1&&i===1?"Luigi's":null;
    building(objects,labels,ox+dx,oy+dy,type,name);
  });decorateCorners(objects,ox,oy,(bx+by)%2?2:4);
}

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
  const view=state.cityView||DEFAULT_VIEW,center=viewCenter();
  state.camera.scale.set(view.zoom);state.camera.position.set(center.x-view.x*view.zoom,center.y-view.y*view.zoom);
  app.stage.hitArea=new Rectangle(0,0,app.screen.width,app.screen.height);captureView();
}
export function centerCity(){state.cityView={...DEFAULT_VIEW};if(state.scene==='city') resizeCity();}
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
  ground.label='city-ground';objects.label='city-objects';objects.sortableChildren=true;
  state.camera.addChild(ground,markings,objects,labels);
  for(let y=0;y<CITY_N;y++) for(let x=0;x<CITY_N;x++){
    const p=iso(x,y);ground.poly([p.x,p.y-TH/2,p.x+TW/2,p.y,p.x,p.y+TH/2,p.x-TW/2,p.y]).fill(groundColor(x,y));
    if(road(x,y)) roadDetail(markings,x,y,p);
  }
  for(let by=0;by<3;by++) for(let bx=0;bx<3;bx++) block(objects,labels,bx,by);
  [[7,4],[18,6],[7,13],[18,12],[7,21],[15,22],[22,15]].forEach(([x,y],i)=>place(objects,tree(.8+(i%2)*.04),x,y));
  const lanes=[.12,1.12,8.12,9.12,16.12,17.12,24.12,25.12];
  for(let i=0;i<16;i++){
    const axis=Math.floor(i/8),dir=i%2?-1:1,g=car(i,axis,dir);objects.addChild(g);
    state.movers.push({kind:'car',g,axis,lane:lanes[i%8],t:(i*2.07)%CITY_N,dir,speed:.43+(i%4)*.065});
  }
  const sidewalks=[2.12,7.12,10.12,15.12,18.12,23.12];
  for(let i=0;i<24;i++){
    const g=makePerson(i);g.scale.set(1.45);objects.addChild(g);
    state.movers.push({kind:'person',g,axis:i%2,lane:sidewalks[i%6],t:(i*1.03)%CITY_N,dir:i%4<2?1:-1,speed:.095+(i%5)*.011});
  }
  resizeCity();bindGestures();tickCity(0);
}

export function tickCity(dt){
  for(const mover of state.movers){
    mover.t+=mover.speed*dt*.035*mover.dir;
    mover.t=((mover.t+.4)%(CITY_N-.2)+(CITY_N-.2))%(CITY_N-.2)-.4;
    const p=iso(mover.axis===0?mover.t:mover.lane,mover.axis===0?mover.lane:mover.t);
    mover.g.position.set(Math.round(p.x),Math.round(p.y));mover.g.zIndex=p.y;
  }
}
