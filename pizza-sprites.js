import {Sprite,Texture,Rectangle} from './pizza-core.js?v=20261010d';
import {project} from './pizza-layout.js?v=20261010d';

// Pixel bitmaps with four fixed views. The scene places only flat 2D sprites.
const WIDTH=256,HEIGHT=192,FOOT={x:128,y:144},cache=new Map();
const COLORS={wood:{top:'#e5c88f',x:'#ad7c49',y:'#c3955a'},legs:{top:'#ba9257',x:'#805634',y:'#a37945'},cabinet:{top:'#d8c496',x:'#ad875e',y:'#c5a374'},metal:{top:'#e7eee3',x:'#aabfba',y:'#c8d8cf'}};

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
  cache.set(id,art);return art;
}

function legs(a,spreadX,spreadY,height){
  const positions=[[-spreadX,-spreadY],[spreadX,-spreadY],[-spreadX,spreadY],[spreadX,spreadY]];
  const rotated=([x,y])=>a.rotation===1?-y+x:a.rotation===2?-x-y:a.rotation===3?y-x:x+y;
  positions.sort((p,q)=>rotated(p)-rotated(q));
  for(const [x,y] of positions)a.box(x-.045,y-.045,.09,.09,0,height,COLORS.legs);
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
    a.shadow(.65,.65);legs(a,.25,.25,17);
    a.box(-.35,-.34,.7,.68,17,4,COLORS.wood);
    a.box(-.33,-.31,.08,.08,20,28,COLORS.legs);a.box(-.33,.23,.08,.08,20,28,COLORS.legs);
    a.box(-.35,-.32,.09,.64,32,13,COLORS.wood);
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

function drawTableGroup(a,seats){
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
  a.line([[-width/2+.08,-.19,33],[width/2-.08,-.19,33]],'#d9bb82');
  for(const [x,y,r]of chairs.filter(p=>front(p)>=0))drawChair(shifted(a,x,y,r));
}

function drawFurniture(type,a,seats){
  if(type==='table')drawTableGroup(a,seats);
  else if(type==='bar'){
    a.shadow(1.85,.83);cabinet(a,-.5);cabinet(a,.5);
  }else if(type==='oven'||type==='sink'){
    a.shadow(.86,.8);cabinet(a,0,type);
  }else if(type==='fridge'){
    a.shadow(.82,.82);a.box(-.4,-.41,.8,.82,0,80,COLORS.metal);
    if(a.rotation===0||a.rotation===1){a.front(.403,-.36,.36,4,76,'#e3ebdf');a.line([[.405,-.36,49],[.405,.36,49]],'#92aba2');a.front(.407,-.23,-.18,25,43,'#58736d');a.front(.407,-.23,-.18,57,69,'#58736d');}
  }else if(type==='plant'){
    a.shadow(.56,.56);a.box(-.22,-.22,.44,.44,0,17,{top:'#c69a65',x:'#986b45',y:'#b78752'});a.disc(0,0,.2,18,'#4c4231');
    for(const [x,y,h,color] of [[-.2,-.24,43,'#40735a'],[.23,-.14,53,'#57845a'],[.27,.2,39,'#548f67'],[-.24,.16,50,'#3d7760'],[0,0,58,'#76a279']]){
      a.polygon([a.point(0,0,16),a.point(x-.07,y-.04,h-9),a.point(x,y,h),a.point(x+.07,y+.04,h-8)],color);
    }
  }
}

function sprite(art,label){const result=new Sprite(art.texture);result.anchor.set(art.anchor.x,art.anchor.y);result.label=label;return result;}
export function furnitureSprite(type,rotation=0,seats=4){
  const art=bitmap(type==='table'?'table-'+seats:type,rotation,a=>drawFurniture(type,a,seats)),result=sprite(art,'furniture-sprite');result.hitArea=art.hitArea;return result;
}

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
