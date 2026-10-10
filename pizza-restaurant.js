import {app,world,state,Container,Graphics,clearWorld,spriteFor} from './pizza-core.js';

const RTW=62,RTH=31,ROOM={w:8,h:7};

function riso(x,y){
  return {
    x:app.screen.width/2+(x-y)*RTW/2,
    y:228+(x+y)*RTH/2
  };
}

function dims(it){
  if(it.type==='table') return {w:2,h:2};
  if(it.type==='bar') return it.r%2?{w:1,h:2}:{w:2,h:1};
  return {w:1,h:1};
}

function cells(it){
  const d=dims(it),out=[];
  for(let dx=0;dx<d.w;dx++){
    for(let dy=0;dy<d.h;dy++) out.push(`${it.x+dx},${it.y+dy}`);
  }
  return out;
}

function canPlace(type,x,y,r){
  const it={type,x,y,r},c=cells(it);
  if(c.some(v=>{
    const[a,b]=v.split(',').map(Number);
    return a<0||b<0||a>=ROOM.w||b>=ROOM.h;
  })) return false;
  const used=new Set(state.restaurantState.flatMap(cells));
  return c.every(v=>!used.has(v));
}

const OBJECT_WIDTH={
  table:50,
  chair:27,
  oven:41,
  bar:45,
  plant:25,
  fridge:37,
  sink:39
};

function placed(layer,it){
  const d=dims(it);
  const p=riso(it.x+(d.w-1)/2,it.y+(d.h-1)/2);
  const s=spriteFor(it.type,it.r,OBJECT_WIDTH[it.type]||34);
  s.x=p.x;
  s.y=p.y+3;
  s.zIndex=p.y+180;
  layer.addChild(s);
}

function fixedKitchen(layer){
  const items=[
    {type:'fridge',x:.25,y:.25,w:37},
    {type:'sink',x:1.45,y:.2,w:39},
    {type:'oven',x:2.75,y:.15,w:41},
    {type:'bar',x:4.05,y:.2,w:45},
    {type:'plant',x:6.15,y:.25,w:25}
  ];
  for(const it of items){
    const p=riso(it.x,it.y);
    const s=spriteFor(it.type,0,it.w);
    s.x=p.x;
    s.y=p.y+1;
    s.zIndex=p.y+230;
    layer.addChild(s);
  }

  for(const it of[
    {type:'bar',x:4.35,y:1.25,w:43},
    {type:'bar',x:5.45,y:1.25,w:43}
  ]){
    const p=riso(it.x,it.y);
    const s=spriteFor(it.type,0,it.w);
    s.x=p.x;
    s.y=p.y+2;
    s.zIndex=p.y+240;
    layer.addChild(s);
  }
}

function person(waiter=false){
  const c=new Container(),g=new Graphics();
  g.ellipse(0,2,5,2).fill({color:0,alpha:.22});
  g.rect(-3,-16,6,11).fill(waiter?0xf4eee3:0xb34536);
  g.rect(-2,-21,4,5).fill(0xc98f69);
  g.rect(-3,-8,6,3).fill(0x252326);
  g.rect(-3,-5,2,6).fill(0x252326);
  g.rect(1,-5,2,6).fill(0x252326);
  c.addChild(g);
  c.scale.set(1.15);
  return c;
}

function wallWindow(layer,x,y,side='right'){
  const p=riso(x,y);
  const g=new Graphics();
  if(side==='right'){
    g.poly([
      p.x+4,p.y-92,
      p.x+30,p.y-79,
      p.x+30,p.y-54,
      p.x+4,p.y-67
    ]).fill(0x6f8c91).stroke({color:0xf0dfbc,width:2});
  }else{
    g.poly([
      p.x-4,p.y-92,
      p.x-30,p.y-79,
      p.x-30,p.y-54,
      p.x-4,p.y-67
    ]).fill(0x6f8c91).stroke({color:0xf0dfbc,width:2});
  }
  layer.addChild(g);
}

export function showRestaurant(){
  state.scene='restaurant';
  clearWorld();

  document.querySelector('#tools').style.display='block';
  document.querySelector('#restaurantHead').style.display='flex';
  document.querySelector('#cityHint').style.display='none';
  document.querySelector('#credit').style.display='none';
  document.querySelector('#cityBtn').classList.remove('active');
  document.querySelector('#restaurantBtn').classList.add('active');

  app.stage.removeAllListeners();

  const layer=new Container();
  layer.sortableChildren=true;
  world.addChild(layer);

  const a=riso(0,0);
  const b=riso(ROOM.w-1,0);
  const c=riso(0,ROOM.h-1);

  const wall=new Graphics();
  wall.poly([a.x,a.y-8,b.x,b.y-8,b.x,b.y-112,a.x,a.y-112])
    .fill(0xcbb28b).stroke({color:0x745038,width:2});
  wall.poly([a.x,a.y-8,c.x,c.y-8,c.x,c.y-112,a.x,a.y-112])
    .fill(0xb59670).stroke({color:0x745038,width:2});
  wall.poly([a.x,a.y-44,b.x,b.y-44,b.x,b.y-12,a.x,a.y-12]).fill(0x8a5b3d);
  wall.poly([a.x,a.y-44,c.x,c.y-44,c.x,c.y-12,a.x,a.y-12]).fill(0x774b36);
  layer.addChild(wall);

  wallWindow(layer,2.0,0,'right');
  wallWindow(layer,5.0,0,'right');
  wallWindow(layer,0,2.0,'left');

  for(let s=0;s<ROOM.w+ROOM.h;s++){
    for(let x=0;x<ROOM.w;x++){
      const y=s-x;
      if(y<0||y>=ROOM.h) continue;

      const p=riso(x,y);
      const kitchen=y<=1;
      const fill=kitchen
        ? ((x+y)%2?0xb89c77:0xc7aa82)
        : ((x+y)%2?0xb56d47:0xc77c50);

      const t=new Graphics();
      t.poly([
        p.x,p.y-RTH/2,
        p.x+RTW/2,p.y,
        p.x,p.y+RTH/2,
        p.x-RTW/2,p.y
      ]).fill(fill).stroke({color:kitchen?0x8b765d:0x8c5338,width:1});

      t.eventMode='static';
      t.cursor='pointer';
      t.on('pointertap',()=>{
        if(state.deleteMode){
          const i=state.restaurantState.findIndex(it=>cells(it).includes(`${x},${y}`));
          if(i>=0) state.restaurantState.splice(i,1);
          showRestaurant();
          return;
        }

        if(canPlace(state.selectedTool,x,y,state.rotation)){
          state.restaurantState.push({type:state.selectedTool,x,y,r:state.rotation});
          showRestaurant();
        }
      });

      layer.addChild(t);
    }
  }

  fixedKitchen(layer);

  state.restaurantState
    .slice()
    .sort((aa,bb)=>(aa.x+aa.y)-(bb.x+bb.y))
    .forEach(it=>placed(layer,it));

  const actors=[];
  const actorPositions=[
    {x:1.2,y:4.2,waiter:true},
    {x:3.3,y:4.4,waiter:false},
    {x:5.4,y:3.8,waiter:false},
    {x:6.1,y:5.3,waiter:false}
  ];

  actorPositions.forEach((pos,i)=>{
    const a0=person(pos.waiter);
    const p=riso(pos.x,pos.y);
    a0.x=p.x;
    a0.y=p.y;
    a0.zIndex=p.y+320;
    layer.addChild(a0);
    actors.push({
      g:a0,
      x:pos.x,
      y:pos.y,
      phase:i*1.3,
      kind:'restaurant'
    });
  });

  state.movers=actors;
}

export function tickRestaurant(dt){
  for(const m of state.movers){
    if(m.kind!=='restaurant') continue;
    m.phase+=dt*.018;
    const p=riso(
      m.x+Math.sin(m.phase)*.08,
      m.y+Math.cos(m.phase*.8)*.05
    );
    m.g.x=p.x;
    m.g.y=p.y;
    m.g.zIndex=p.y+320;
  }
}

export function resetRestaurant(){
  state.restaurantState=[
    {type:'table',x:2,y:3,r:0},
    {type:'chair',x:1,y:3,r:0},
    {type:'chair',x:4,y:3,r:2},
    {type:'table',x:4,y:5,r:0},
    {type:'chair',x:3,y:5,r:0},
    {type:'chair',x:6,y:5,r:2},
    {type:'plant',x:0,y:5,r:0}
  ];
  state.deleteMode=false;
  showRestaurant();
}
