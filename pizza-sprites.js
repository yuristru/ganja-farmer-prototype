import {Sprite,Texture,Rectangle} from './pizza-core.js?v=20261010r';
import {restaurantSprite,restaurantIcon} from './pizza-restaurant-art.js?v=20261010r';
import {project} from './pizza-layout.js?v=20261010r';

// Pixel bitmaps with four fixed views. The scene places only flat 2D sprites.
const WIDTH=256,HEIGHT=192,FOOT={x:128,y:144},cache=new Map();
const COLORS={wood:{top:'#966338',x:'#593a24',y:'#75492b'},legs:{top:'#996438',x:'#4c3020',y:'#71492b'},cabinet:{top:'#d8c496',x:'#ad875e',y:'#c5a374'},metal:{top:'#e7eee3',x:'#aabfba',y:'#c8d8cf'}};

function bitmap(key,rotation,draw){
  const id=key+':'+rotation;if(cache.has(id))return cache.get(id);
  const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
  const turn=(x,y)=>rotation===1?[-y,x]:rotation===2?[-x,-y]:rotation===3?[y,-x]:[x,y];
  const point=(x,y,lift=0)=>{const [a,b]=turn(x,y),p=project(a,b);return [Math.round(FOOT.x+p.x),Math.round(FOOT.y+p.y-lift)];};
  const polygon=(points,color,alpha=1)=>{ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();ctx.globalAlpha=1;};
  const surface=(corners,lift,color,alpha=1)=>polygon(corners.map(([x,y])=>point(x,y,lift)),color,alpha);
  const line=(coords,color,width=1)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();coords.map(([x,y,z=0])=>point(x,y,z)).forEach(([x,y],i)=>i?ctx.lineTo(x+.5,y+.5):ctx.moveTo(x+.5,y+.5));ctx.stroke();};
  function box(x,y,w,d,bottom,height,colors){
    const corners=[[x,y],[x+w,y],[x+w,y+d],[x,y+d]].map(([a,b])=>turn(a,b));
    const xs=corners.map(p=>p[0]),ys=corners.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
    const p=(a,b,z)=>{const v=project(a,b);return [Math.round(FOOT.x+v.x),Math.round(FOOT.y+v.y-z)];};
    const a=p(x0,y0,bottom+height),b=p(x1,y0,bottom+height),c=p(x1,y1,bottom+height),e=p(x0,y1,bottom+height);
    polygon([b,c,p(x1,y1,bottom),p(x1,y0,bottom)],colors.x);
    polygon([c,e,p(x0,y1,bottom),p(x1,y1,bottom)],colors.y);
    polygon([a,b,c,e],colors.top);
  }
  function disc(x,y,r,lift,color){surface(Array.from({length:12},(_,i)=>{const angle=i*Math.PI/6;return [x+Math.cos(angle)*r,y+Math.sin(angle)*r];}),lift,color);}
  const shadow=(w,d)=>surface([[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]],0,'#392b23',.2);
  const front=(x,y0,y1,z0,z1,color)=>polygon([point(x,y0,z0),point(x,y1,z0),point(x,y1,z1),point(x,y0,z1)],color);
  draw({box,surface,line,disc,shadow,front,point,polygon,rotation});
  const pixels=ctx.getImageData(0,0,WIDTH,HEIGHT).data;let minX=WIDTH,minY=HEIGHT,maxX=0,maxY=0;
  for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++)if(pixels[(y*WIDTH+x)*4+3]){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
  const source=Texture.from(canvas).source;source.scaleMode='nearest';
  const texture=new Texture({source,frame:new Rectangle(minX,minY,maxX-minX+1,maxY-minY+1)});
  const art={texture,anchor:{x:(FOOT.x-minX)/texture.width,y:(FOOT.y-minY)/texture.height},hitArea:{contains(x,y){const px=Math.floor(x+FOOT.x),py=Math.floor(y+FOOT.y);return px>=0&&py>=0&&px<WIDTH&&py<HEIGHT&&pixels[(py*WIDTH+px)*4+3]>100;}}};
  const icon=document.createElement('canvas');icon.width=texture.width;icon.height=texture.height;
  icon.getContext('2d').drawImage(canvas,minX,minY,icon.width,icon.height,0,0,icon.width,icon.height);art.icon=icon.toDataURL();
  cache.set(id,art);return art;
}

function legs(a,spreadX,spreadY,height){
  const positions=[[-spreadX,-spreadY],[spreadX,-spreadY],[-spreadX,spreadY],[spreadX,spreadY]];
  const rotated=([x,y])=>a.rotation===1?-y+x:a.rotation===2?-x-y:a.rotation===3?y-x:x+y;
  positions.sort((p,q)=>rotated(p)-rotated(q));
  for(const [x,y] of positions)a.box(x-.045,y-.045,.09,.09,0,height,a.chairStyle?.legs||COLORS.legs);
}

function cabinet(a,cx=0,type='bar'){
  a.box(cx-.4,-.38,.8,.76,0,4,{top:'#978262',x:'#6f614d',y:'#897759'});
  a.box(cx-.43,-.4,.86,.8,4,30,COLORS.cabinet);
  a.box(cx-.47,-.44,.94,.88,34,4,COLORS.metal);
  if(a.rotation===0||a.rotation===1){
    a.front(cx+.432,-.34,.34,8,29,'#bd9b6d');
    a.line([[cx+.435,-.25,26],[cx+.435,.25,26]],'#775f42');
  }
  if(type==='oven'){
    if(a.rotation===0||a.rotation===1){a.front(cx+.438,-.3,.3,10,25,'#334340');a.front(cx+.442,-.22,.22,13,22,'#59706b');a.line([[cx+.444,-.25,30],[cx+.444,.25,30]],'#ebe0bc');}
    for(const x of [-.2,.2])for(const y of [-.2,.2]){a.disc(x,y,.13,38,'#334540');a.disc(x,y,.065,39,'#89998c');}
  }
  if(type==='sink'){
    a.surface([[-.29,-.23],[.29,-.23],[.29,.23],[-.29,.23]],39,'#647f7d');
    a.surface([[-.18,-.13],[.18,-.13],[.18,.13],[-.18,.13]],39,'#8ca9a1');
    a.box(-.27,-.33,.055,.06,38,11,{top:'#f2f1d9',x:'#718b87',y:'#aec3b8'});
    a.box(-.27,-.33,.055,.22,47,3,COLORS.metal);
  }
}

function drawChair(a){
    const style=a.chairStyle||{wood:COLORS.wood,legs:COLORS.legs,cushion:{top:'#b73929',x:'#70271f',y:'#943127'}};
    a.shadow(.65,.65);legs(a,.25,.25,17);
    a.box(-.35,-.34,.7,.68,17,4,style.wood);
    a.box(-.29,-.28,.58,.56,21,2,style.cushion);
    a.box(-.33,-.31,.08,.08,20,28,style.legs);a.box(-.33,.23,.08,.08,20,28,style.legs);
    a.box(-.35,-.32,.09,.64,32,13,style.wood);
}

function shifted(a,cx,cy,r,scale=.75){
  const turn=(x,y)=>{x*=scale;y*=scale;return r===1?[cx-y,cy+x]:r===2?[cx-x,cy-y]:r===3?[cx+y,cy-x]:[cx+x,cy+y];};
  return {...a,rotation:(a.rotation+r)%4,
    point:(x,y,z)=>a.point(...turn(x,y),z),
    surface:(corners,z,color,alpha)=>a.surface(corners.map(p=>turn(...p)),z,color,alpha),
    line:(coords,color,width)=>a.line(coords.map(([x,y,z])=>[...turn(x,y),z]),color,width),
    shadow:(w,d)=>a.surface([[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(p=>turn(...p)),0,'#392b23',.2),
    box:(x,y,w,d,z,h,colors)=>{const corners=[[x,y],[x+w,y],[x+w,y+d],[x,y+d]].map(p=>turn(...p));const xs=corners.map(p=>p[0]),ys=corners.map(p=>p[1]),x0=Math.min(...xs),y0=Math.min(...ys);a.box(x0,y0,Math.max(...xs)-x0,Math.max(...ys)-y0,z,h,colors);}
  };
}

function drawTableGroup(a,seats,variant){
  if(variant==='plastic')a.chairStyle={wood:{top:'#ecead6',x:'#b4b5a4',y:'#d4d5c2'},legs:{top:'#e1e2ce',x:'#a7aa9b',y:'#cbd0be'},cushion:{top:'#e7e8d7',x:'#b2b9a7',y:'#d1d6c2'}};
  if(variant==='premium')a.chairStyle={wood:{top:'#663b2a',x:'#362219',y:'#4e2b20'},legs:{top:'#79543a',x:'#3e2b20',y:'#62422e'},cushion:{top:'#d7ba83',x:'#91774d',y:'#b89a64'}};
  const width=seats<=4?.84:seats===6?2.65:3.65,depth=.8;
  let chairs;
  if(seats===2)chairs=[[0,-.7,1],[0,.7,3]];
  else if(seats===4)chairs=[[-.7,0,0],[.7,0,2],[0,-.7,1],[0,.7,3]];
  else{const xs=seats===6?[-.95,0,.95]:[-1.45,-.48,.48,1.45];chairs=xs.flatMap(x=>[[x,-.7,1],[x,.7,3]]);}
  const front=([x,y])=>a.rotation===1?x-y:a.rotation===2?-x-y:a.rotation===3?y-x:x+y;
  chairs.sort((p,q)=>front(p)-front(q));
  for(const [x,y,r]of chairs.filter(p=>front(p)<0))drawChair(shifted(a,x,y,r));
  a.shadow(width-.12,depth-.1);legs(a,width/2-.12,.25,29);
  a.box(-width/2,-depth/2,width,depth,29,4,COLORS.wood);
  // The cloth uses the same projected plane as the table, in every fixed view.
  const step=.14,x0=-width/2,y0=-depth/2;
  for(let i=0;i<Math.ceil(width/step);i++)for(let j=0;j<Math.ceil(depth/step);j++){
    const x=x0+i*step,y=y0+j*step,w=Math.min(step,width-i*step),d=Math.min(step,depth-j*step);
    a.surface([[x,y],[x+w,y],[x+w,y+d],[x,y+d]],34,variant==='plastic'?'#e2e5d0':(i+j)%2?'#f3dfbe':variant==='premium'?'#7b302b':'#b43d2c');
  }
  for(let i=0;i<Math.ceil(width/step);i++){
    const x=x0+i*step,w=Math.min(step,width-i*step),color=variant==='plastic'?'#c7cbb8':i%2?'#dbc9a9':variant==='premium'?'#632521':'#8e3025';
    for(const y of [y0,y0+depth])a.polygon([a.point(x,y,34),a.point(x+w,y,34),a.point(x+w,y,27),a.point(x,y,27)],color);
  }
  a.disc(0,0,.095,35,'#664127');a.disc(0,0,.065,40,'#b88b49');
  a.line([[0,0,40],[0,0,48]],'#38643b',2);
  a.disc(-.035,0,.065,45,'#547c3b');a.disc(.045,0,.055,47,'#78934a');
  if(seats>=6)for(const x of [-width*.3,width*.3]){a.disc(x,0,.13,35,'#f0e6cc');a.disc(x,0,.085,36,'#d6cbb3');}
  for(const [x,y,r]of chairs.filter(p=>front(p)>=0))drawChair(shifted(a,x,y,r));
}

function drawFurniture(type,a,seats,variant){
  if(type==='table')drawTableGroup(a,seats,variant);
  else if(type==='arcade'){
    a.shadow(.8,.8);a.box(-.36,-.32,.72,.64,0,59,{top:variant==='deluxe'?'#4b72a0':'#9b4032',x:'#293c4a',y:'#3b4b59'});
    a.box(-.4,-.35,.8,.7,59,5,{top:'#e8b953',x:'#956235',y:'#b68b46'});
    if(a.rotation===0||a.rotation===1){
      a.front(.365,-.27,.27,31,52,'#121d2b');a.front(.37,-.19,.19,34,48,variant==='deluxe'?'#60b6ad':'#7881bb');
      for(const [y,z] of [[-.1,39],[.08,44],[.15,37]])a.front(.375,y,y+.055,z,z+3,'#eccc69');
      a.front(.38,-.28,.28,24,29,'#dda65a');a.line([[.385,-.1,29],[.385,-.1,34]],'#e9ded0',2);
    }
  }else if(type==='bar'||type==='wine'){
    a.shadow(1.85,.83);
    a.box(-.94,-.4,1.88,.8,0,34,COLORS.wood);
    for(const x of [-.88,-.42,.04,.5]){
      a.box(x,.405,.035,.02,3,28,COLORS.legs);
      a.line([[x,-.39,5],[x,-.39,30]],'#ba8650');
    }
    a.box(-.98,-.44,1.96,.88,34,4,variant==='marble'?{top:'#e7dbc5',x:'#b0a58e',y:'#cdc1a5'}:variant==='tiled'?{top:'#708b79',x:'#405d50',y:'#5d7763'}:{top:'#b8814a',x:'#68412a',y:'#87532f'});
    for(const x of [-.55,.5]){a.disc(x,0,.14,39,'#ede3ca');a.disc(x,0,.1,40,'#c9bca0');}
    a.box(-.12,.04,.13,.13,38,9,{top:'#78834a',x:'#33452b',y:'#4b6237'});
  }else if(type==='jukebox'){
    a.shadow(.7,.7);a.box(-.32,-.32,.64,.64,0,53,{top:'#b34329',x:'#713523',y:'#952c22'});
    a.box(-.22,-.22,.44,.44,53,6,{top:'#d8a44d',x:'#8b6033',y:'#b6853e'});
    if(a.rotation===0||a.rotation===1){a.front(.325,-.25,.25,5,49,'#deaa46');a.front(.33,-.19,.19,9,45,'#573c28');a.front(.335,-.16,.16,28,39,'#f0d393');}
  }else if(type==='oven'&&variant==='electric'){a.shadow(.86,.8);cabinet(a,0,'oven');
  }else if(type==='oven'){
    a.shadow(.95,.94);
    a.box(-.46,-.44,.92,.88,0,25,{top:'#a59680',x:'#6e6557',y:'#938775'});
    a.box(-.49,-.47,.98,.94,25,5,{top:'#c6b69a',x:'#8b7b63',y:'#ab9679'});
    // Stacked projected brick courses form a baked bitmap, not a scene mesh.
    const radii=[.44,.43,.4,.35,.28,.18,.06];
    for(let level=0;level<6;level++){
      const z=30+level*7,r0=radii[level],r1=radii[level+1];
      const segments=Array.from({length:16},(_,i)=>{
        const angle=i*Math.PI/8,next=(i+1)*Math.PI/8;
        const p=[Math.cos(angle),Math.sin(angle)],q=[Math.cos(next),Math.sin(next)];
        return {p,q,depth:a.point(p[0]*r0,p[1]*r0,0)[1]+a.point(q[0]*r0,q[1]*r0,0)[1]};
      }).sort((p,q)=>p.depth-q.depth);
      for(const {p,q} of segments){
        const color=(a.point(p[0],p[1],0)[0]>128)?'#9a4930':'#bb603b';
        a.polygon([a.point(p[0]*r0,p[1]*r0,z),a.point(q[0]*r0,q[1]*r0,z),a.point(q[0]*r1,q[1]*r1,z+7),a.point(p[0]*r1,p[1]*r1,z+7)],color);
        a.line([[p[0]*r0,p[1]*r0,z],[q[0]*r0,q[1]*r0,z]],'#dda47a');
        a.line([[p[0]*r0,p[1]*r0,z],[p[0]*r1,p[1]*r1,z+7]],'#d69268');
      }
    }
    a.box(-.12,-.12,.24,.24,72,12,{top:'#754934',x:'#563525',y:'#6b4030'});
    const opening=[a.point(.44,-.25,30),a.point(.44,.25,30),a.point(.44,.25,44),a.point(.44,.12,53),a.point(.44,-.12,53),a.point(.44,-.25,44)];
    if(a.rotation===0||a.rotation===1){
      a.polygon(opening,'#e5b77b');
      a.front(.445,-.19,.19,31,44,'#30251e');
      a.polygon([a.point(.45,-.17,31),a.point(.45,.17,31),a.point(.45,.11,40),a.point(.45,.03,36),a.point(.45,-.04,47),a.point(.45,-.1,37)],'#ed782b');
      a.front(.455,-.06,.06,32,39,'#ffd37b');
    }
  }else if(type==='prep'){
    a.shadow(1.85,.83);cabinet(a,-.5);cabinet(a,.5);
    a.disc(-.5,0,.15,39,'#e8ddbd');a.disc(.5,0,.17,39,'#a44a30');
  }else if(type==='sink'){
    a.shadow(.86,.8);cabinet(a,0,type);
  }else if(type==='fridge'){
    a.shadow(.82,.82);a.box(-.4,-.41,.8,.82,0,80,COLORS.metal);
    if(a.rotation===0||a.rotation===1){a.front(.403,-.36,.36,4,76,'#e3ebdf');a.line([[.405,-.36,49],[.405,.36,49]],'#92aba2');a.front(.407,-.23,-.18,25,43,'#58736d');a.front(.407,-.23,-.18,57,69,'#58736d');}
  }else if(type==='plant'){
    a.shadow(.56,.56);
    a.box(-.21,-.21,.42,.42,0,17,{top:'#c69a65',x:'#986b45',y:'#b78752'});
    a.disc(0,0,.24,17,'#d3a16a');a.disc(0,0,.2,18,'#4c4231');
    a.line([[0,0,18],[0,0,48]],'#765337',2);
    for(const [x,y,h] of [[-.17,0,30],[.16,.12,34],[-.12,-.12,39],[.18,-.09,43],[0,.12,47],[0,-.08,53]]){
      a.line([[0,0,22],[x,y,h]],'#547142',2);
      a.disc(x,y,.19,h,'#355e37');a.disc(x-.025,y-.04,.135,h+2,'#648744');
      a.disc(x+.04,y+.02,.07,h+3,'#8d9c50');
    }
    if(variant==='palm')for(const [x,y] of [[-.4,0],[.4,0],[0,-.4],[0,.4]])a.polygon([a.point(0,0,65),a.point(x,y,53),a.point(x*.9,y*.9,42),a.point(0,0,60)],'#518044');

  }
}

function sprite(art,label){const result=new Sprite(art.texture);result.anchor.set(art.anchor.x,art.anchor.y);result.label=label;return result;}
function furnitureArt(type,rotation,seats,variant){
  return bitmap((type==='table'?'table-'+seats:type)+':'+(variant||'default'),rotation,a=>drawFurniture(type,a,seats,variant));
}
function detailedVariant(type,variant){return (type==='oven'&&(!variant||variant==='brick'||variant==='professional'))||(type==='plant'&&(!variant||variant==='olive'))||(type==='jukebox'&&(!variant||variant==='vintage'))||type==='wine';}
export function furnitureSprite(type,rotation=0,seats=4,variant){
  const detailed=detailedVariant(type,variant)?restaurantSprite(type,rotation):null;
  if(detailed){if(variant==='professional')detailed.tint=0xdde4ec;return detailed;}
  const art=furnitureArt(type,rotation,seats,variant),result=sprite(art,'furniture-sprite');result.hitArea=art.hitArea;return result;
}
export function furnitureIcon(type,seats=4,variant){return (detailedVariant(type,variant)&&restaurantIcon(type))||furnitureArt(type,0,seats,variant).icon;}

export function personSprite(index,rotation=0){
  const shirt=[{top:'#efe6ce',x:'#b6b9a7',y:'#ded8bf'},{top:'#c56349',x:'#803b30',y:'#a94b39'},{top:'#5b93a4',x:'#315f73',y:'#427c94'},{top:'#729563',x:'#3d613c',y:'#58834f'}][index%4],art=bitmap('person-'+index,rotation,a=>{
    a.shadow(.35,.32);
    for(const y of [-.095,.095]){a.box(-.11,y-.055,.22,.11,0,3,{top:'#5a4d3c',x:'#302b24',y:'#403a2e'});a.box(-.08,y-.045,.13,.09,3,19,{top:'#584d3a',x:'#3c3930',y:'#514a38'});}
    a.box(-.12,-.14,.24,.28,22,22,shirt);
    for(const y of [-.22,.14]){a.box(-.1,y,.16,.08,23,19,shirt);a.box(-.1,y,.16,.08,19,4,{top:'#d9ac78',x:'#b8855d',y:'#c99869'});}
    a.box(-.06,-.09,.12,.18,44,3,{top:'#d9ac78',x:'#b8855d',y:'#c99869'});
    a.box(-.09,-.11,.18,.22,47,11,{top:'#d2a16e',x:'#b68457',y:'#d0a16e'});
    a.box(-.095,-.115,.19,.23,58,3,{top:index===0?'#f1ead5':'#634a31',x:'#765335',y:'#906a44'});
    if(a.rotation===0||a.rotation===1){a.front(.093,-.08,-.04,52,54,'#413428');a.front(.093,.04,.08,52,54,'#413428');}
  });
  return sprite(art,'person-sprite');
}
