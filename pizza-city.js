import {app,world,state,TW,TH,CITY_N,Container,Graphics,Sprite,Rectangle,iso,hash,diamond,label,clearWorld,makePerson} from './pizza-core.js';

function roadCell(v){const m=((v%8)+8)%8;return m===0||m===1}
function road(x,y){return roadCell(x)||roadCell(y)}
function sidewalk(x,y){return !road(x,y)&&(road(x-1,y)||road(x+1,y)||road(x,y-1)||road(x,y+1))}
function theme(x,y){const bx=Math.floor((x-2)/8),by=Math.floor((y-2)/8);if(bx===1&&by===0)return'park';if(bx===1&&by===1)return'piazza';return'dense'}
function color(x,y){
  if(road(x,y))return (x+y)%2?0x474b50:0x4c5055;
  if(sidewalk(x,y))return (x+y)%2?0xb9aa87:0xc6b695;
  const t=theme(x,y);
  if(t==='park')return (x+y)%2?0x66855d:0x719166;
  if(t==='piazza')return (x+y)%2?0xb5a57f:0xc3b28c;
  return (x+y)%2?0x91866a:0x9b9072;
}

function tree(sc=.9){
  const c=new Container(),g=new Graphics();
  g.rect(-9,-3,18,4).fill({color:0x000000,alpha:.18});
  g.rect(-2,-25,4,26).fill(0x684630);
  g.rect(-10,-39,20,14).fill(0x416d3f);
  g.rect(-7,-48,14,13).fill(0x5b874f);
  g.rect(-14,-32,10,11).fill(0x527c49);
  g.rect(5,-34,9,10).fill(0x477143);
  c.addChild(g);c.scale.set(sc);return c;
}
function lamp(){const g=new Graphics();g.rect(-1,-24,3,24).fill(0x29272a);g.rect(-4,-28,9,5).fill(0x29272a);g.rect(-2,-27,5,2).fill(0xe6c36b);return g}
function bench(){const g=new Graphics();g.rect(-11,-7,22,5).fill(0x75482f);g.rect(-9,-11,18,4).fill(0x8c5a39);g.rect(-8,-2,3,6).fill(0x2e2b2d);g.rect(5,-2,3,6).fill(0x2e2b2d);return g}
function planter(){const g=new Graphics();g.rect(-5,-6,10,7).fill(0x8a583b);g.rect(-7,-14,14,8).fill(0x4f7946);g.rect(-3,-19,7,7).fill(0x658d55);return g}
function patioTable(){const c=new Container(),g=new Graphics();g.rect(-7,-3,14,4).fill(0x7b4b31);g.rect(-1,0,3,8).fill(0x543421);g.rect(-10,5,5,3).fill(0x6d432d);g.rect(5,5,5,3).fill(0x6d432d);g.rect(-1,-18,3,15).fill(0xe9dfc5);g.poly([-11,-17,0,-25,11,-17,0,-12]).fill(0xb7392f).stroke({color:0xf0d8b6,width:1});c.addChild(g);return c}
function fountain(){const c=new Container(),g=new Graphics();g.poly([-34,0,0,-15,34,0,0,15]).fill(0x7c786e).stroke({color:0xd2c7ad,width:3});g.poly([-25,-1,0,-11,25,-1,0,10]).fill(0x5d96a0);g.rect(-3,-28,6,25).fill(0xbeb39c);g.rect(-7,-31,14,4).fill(0xd1c7ae);c.addChild(g);return c}

function car(i,a){
  const cols=[0xc64938,0x4b77a2,0xd0a135,0x5f8b60,0xd9c9a9],c=cols[i%cols.length],g=new Graphics();
  if(a===0){g.poly([-11,0,-5,-6,10,2,4,8]).fill(c);g.poly([-3,-5,3,-8,9,-4,3,-1]).fill(0x86a5ab)}
  else{g.poly([11,0,5,-6,-10,2,-4,8]).fill(c);g.poly([3,-5,-3,-8,-9,-4,-3,-1]).fill(0x86a5ab)}
  return g;
}

function roadDetail(layer,x,y,p){
  const ix=roadCell(x),iy=roadCell(y);
  if(ix&&iy){
    const z=new Graphics();
    for(let i=-20;i<=14;i+=9){z.rect(p.x+i,p.y-5,5,2).fill(0xe3dac0);z.rect(p.x+i,p.y+4,5,2).fill(0xe3dac0)}
    z.zIndex=p.y+3;layer.addChild(z);return;
  }
  if(ix&&x%8===0&&y%3===0){const m=new Graphics();m.poly([p.x-14,p.y-1,p.x-8,p.y-4,p.x+8,p.y+4,p.x+2,p.y+7]).fill(0xc8c0a8);m.zIndex=p.y+2;layer.addChild(m)}
  if(iy&&y%8===0&&x%3===0){const m=new Graphics();m.poly([p.x+14,p.y-1,p.x+8,p.y-4,p.x-8,p.y+4,p.x-2,p.y+7]).fill(0xc8c0a8);m.zIndex=p.y+2;layer.addChild(m)}
}

function lotPad(layer,p,large=false){const g=new Graphics(),w=large?54:44,h=large?25:21;g.poly([p.x,p.y-h/2,p.x+w/2,p.y,p.x,p.y+h/2,p.x-w/2,p.y]).fill(0xc8b997).stroke({color:0x8f8066,width:1});g.zIndex=p.y+35;layer.addChild(g)}

function restaurantFront(layer,p,player=false){
  const aw=new Graphics();
  aw.poly([p.x-34,p.y-23,p.x,p.y-39,p.x+34,p.y-22,p.x,p.y-6]).fill(0xefd6b4).stroke({color:0x6e3929,width:2});
  for(let i=-27;i<=18;i+=15)aw.poly([p.x+i,p.y-24,p.x+i+8,p.y-28,p.x+i+15,p.y-20,p.x+i+7,p.y-17]).fill(player?0xb7352d:0x4e8558);
  aw.zIndex=p.y+225;layer.addChild(aw);
  [[-1.35,.65],[.75,1.65]].forEach(([dx,dy])=>{const q=iso((p.__gx||0)+dx,(p.__gy||0)+dy),t=patioTable();t.x=q.x;t.y=q.y;t.zIndex=q.y+240;layer.addChild(t)});
}

function building(layer,x,y,type='medium',name=null,player=false,restaurant=false){
  const p=iso(x,y);p.__gx=x;p.__gy=y;
  lotPad(layer,p,type==='big');
  const s=new Sprite(state.cityTex[type]);s.anchor.set(.5,.88);
  const base=type==='big'?1.34:type==='medium'?1.26:1.17;
  s.scale.set(base);s.x=p.x;s.y=p.y+5;s.zIndex=p.y+100;
  if(player){s.eventMode='static';s.cursor='pointer';s.on('pointertap',()=>state.navigate('restaurant'))}
  layer.addChild(s);
  if(restaurant||player)restaurantFront(layer,p,player);
  if(name){
    const tag=new Container(),w=name.length*7+34;tag.x=p.x;tag.y=p.y-(type==='big'?136:122);tag.zIndex=p.y+450;
    const bg=new Graphics();bg.roundRect(-w/2,-15,w,30,4).fill(0xe0c69b).stroke({color:player?0x8f2924:0x5f3b27,width:2});
    const tx=label(name.toUpperCase(),11,'#3b2418');tx.anchor.set(.5);tag.addChild(bg,tx);
    if(player){tag.eventMode='static';tag.cursor='pointer';tag.on('pointertap',()=>state.navigate('restaurant'))}
    layer.addChild(tag);
  }
}

function decorateCorners(layer,ox,oy,mask=0){
  const pts=[[0,0],[5,0],[0,5],[5,5]];
  pts.forEach(([dx,dy],i)=>{if((mask>>i)&1)return;const q=iso(ox+dx,oy+dy);if((i+ox+oy)%2===0){const l=lamp();l.x=q.x;l.y=q.y;l.zIndex=q.y+85;layer.addChild(l)}else{const pl=planter();pl.x=q.x;pl.y=q.y;pl.zIndex=q.y+82;layer.addChild(pl)}})
}

function denseBlock(layer,bx,by){
  const ox=2+bx*8,oy=2+by*8;
  const variants=[
    [[1,1,'big'],[4,1,'medium'],[2.6,4.6,'medium']],
    [[1,1,'medium'],[4.2,1,'big'],[1.5,4.6,'small']],
    [[1,1,'medium'],[4.1,1.2,'medium'],[4.1,4.6,'big']]
  ];
  const defs=variants[(bx+by*2)%variants.length];
  defs.forEach(([dx,dy,tp],i)=>{
    let name=null,player=false,restaurant=false;
    if(bx===0&&by===1&&i===2){name='Donatello';restaurant=true}
    if(bx===2&&by===1&&i===1){name="Luigi's";restaurant=true}
    building(layer,ox+dx,oy+dy,tp,name,player,restaurant)
  });
  decorateCorners(layer,ox,oy,(bx+by)%2?2:4);
}

function parkBlock(layer,bx,by){
  const ox=2+bx*8,oy=2+by*8,p=iso(ox+3,oy+3),f=fountain();f.x=p.x;f.y=p.y;f.zIndex=p.y+80;layer.addChild(f);
  [[1,1],[5,1],[1,5],[5,5],[3,1]].forEach(([dx,dy],i)=>{const q=iso(ox+dx,oy+dy),v=tree(.78+(i%2)*.07);v.x=q.x;v.y=q.y;v.zIndex=q.y+70;layer.addChild(v)});
  [[2,5],[5,2],[1.5,3.5]].forEach(([dx,dy])=>{const q=iso(ox+dx,oy+dy),v=bench();v.x=q.x;v.y=q.y;v.zIndex=q.y+65;layer.addChild(v)});
  decorateCorners(layer,ox,oy,0);
}

function piazzaBlock(layer,bx,by){
  const ox=2+bx*8,oy=2+by*8;
  building(layer,ox+1.1,oy+1.1,'big',null,false,false);
  building(layer,ox+4.55,oy+1.1,'medium',null,false,false);
  building(layer,ox+2.8,oy+4.75,'big','Mamma Mia',true,true);
  const q=iso(ox+5.35,oy+4.45),pl=planter();pl.x=q.x;pl.y=q.y;pl.scale.set(1.1);pl.zIndex=q.y+90;layer.addChild(pl);
  decorateCorners(layer,ox,oy,8);
}

function block(layer,bx,by){if(bx===1&&by===0)return parkBlock(layer,bx,by);if(bx===1&&by===1)return piazzaBlock(layer,bx,by);return denseBlock(layer,bx,by)}

export function showCity(){
  state.scene='city';clearWorld();
  document.querySelector('#tools').style.display='none';document.querySelector('#restaurantHead').style.display='none';document.querySelector('#cityHint').style.display='block';document.querySelector('#credit').style.display='block';document.querySelector('#cityBtn').classList.add('active');document.querySelector('#restaurantBtn').classList.remove('active');
  state.camera=new Container();state.camera.sortableChildren=true;world.addChild(state.camera);
  const map=new Container();map.sortableChildren=true;state.camera.addChild(map);
  for(let s=0;s<CITY_N*2;s++)for(let x=0;x<CITY_N;x++){const y=s-x;if(y<0||y>=CITY_N)continue;const p=iso(x,y),d=diamond(p.x,p.y,color(x,y),road(x,y)?0x393c40:0x6f654f);d.zIndex=p.y;map.addChild(d);if(road(x,y))roadDetail(map,x,y,p)}
  for(let by=0;by<3;by++)for(let bx=0;bx<3;bx++)block(map,bx,by);
  [[7,4],[18,6],[7,13],[18,12],[7,21],[15,22],[22,15]].forEach(([x,y],i)=>{const p=iso(x,y),t=tree(.66+(i%2)*.04);t.x=p.x;t.y=p.y;t.zIndex=p.y+85;map.addChild(t)});
  const lanes=[.55,8.55,16.55,24.55];
  for(let i=0;i<12;i++){const a=i%2,c=car(i,a);map.addChild(c);state.movers.push({kind:'car',g:c,axis:a,lane:lanes[i%4],t:(i*2.07)%CITY_N,dir:i%3?1:-1,speed:.43+(i%4)*.065})}
  for(let i=0;i<20;i++){const a=i%2,p=makePerson(i);p.scale.set(1.45);map.addChild(p);state.movers.push({kind:'person',g:p,axis:a,lane:lanes[(i+1)%4]+(i%2?.92:-.25),t:(i*1.03)%CITY_N,dir:i%4<2?1:-1,speed:.095+(i%5)*.011})}
  const target=iso(13.3,13.2),zoom=1.12;state.camera.scale.set(zoom);state.camera.x=Math.round(app.screen.width/2-target.x*zoom);state.camera.y=Math.round(app.screen.height*.50-target.y*zoom);
  let drag=false,last=null;app.stage.removeAllListeners();app.stage.hitArea=new Rectangle(0,0,app.screen.width,app.screen.height);
  app.stage.on('pointerdown',e=>{drag=true;last={x:e.global.x,y:e.global.y}});
  app.stage.on('pointermove',e=>{if(!drag||!last)return;state.camera.x+=e.global.x-last.x;state.camera.y+=e.global.y-last.y;last={x:e.global.x,y:e.global.y}});
  app.stage.on('pointerup',()=>{drag=false;last=null});app.stage.on('pointerupoutside',()=>{drag=false;last=null});
}

export function tickCity(dt){
  for(const m of state.movers){m.t+=m.speed*dt*.035*m.dir;if(m.t>CITY_N-.1)m.t=.1;if(m.t<.1)m.t=CITY_N-.1;const x=m.axis===0?m.t:m.lane,y=m.axis===0?m.lane:m.t,p=iso(x,y);m.g.x=Math.round(p.x);m.g.y=Math.round(p.y);m.g.zIndex=p.y+500}
}
