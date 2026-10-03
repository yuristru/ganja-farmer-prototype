/* V101: photorealistic flower material sources with deterministic seed expression.
 * Generation produces the material; seed/family/traits and packing stay in the game. */
(function(root){
'use strict';
const assets=new Map(),families=['dream','comet','violet'];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const api={loaded:false,ready:null,render};
api.ready=Promise.all(families.flatMap(id=>['hero'].map(form=>new Promise((resolve,reject)=>{
 const image=new Image();image.onload=()=>{assets.set(id+'-'+form,image);resolve();};image.onerror=()=>reject(new Error('Flower material missing: '+id+'-'+form));image.src='assets/flowers/v101/'+id+'-'+form+'.webp';
})))).then(()=>{api.loaded=true;});
function random(seed){let s=seed>>>0;return()=>{s+=0x6D2B79F5;let t=Math.imul(s^s>>>15,1|s);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
function render(seed,profile,compact=false,variant=0){
 const id=families.includes(seed.genetics)?seed.genetics:'dream';
 const salt=((Number(seed.seed)||58317)^Math.imul(variant+1,0x9e3779b1))>>>0,R=random(salt);
 const source=assets.get(id+'-hero');
 const out=document.createElement('canvas');
 if(!source){out.width=1;out.height=1;return out;}
 // Source photographs are material maps. Their complete silhouette is never drawn.
 const size=1024;out.width=size;out.height=size;const c=out.getContext('2d');
 const density=clamp(profile.density||.8,.5,1.2),frost=clamp(profile.frost||.3,.08,1),gp=profile.gp||{};
 const height=(compact?470:690)*(.88+R()*.22)*(compact?1:clamp((profile.height||1)*(gp.stretch||1),.85,1.15));
 const maxR=(compact?235:218)*(.82+R()*.26)*(1+(density-.8)*.2)*clamp(profile.width||1,.9,1.12);
 const bottom=850,lean=(R()-.5)*130,phase=R()*6.28,lobePhase=R()*6.28;
 const lobes=3+Math.floor(R()*4),exponent=.44+R()*.38;
 const center=t=>512+lean*(t-.4)+Math.sin(t*5+phase)*maxR*.12;
 const radius=t=>maxR*(.24+.76*Math.pow(Math.sin(Math.PI*(.035+t*.93)),exponent))*(1-t*(compact?.22:.42))*(.91+.09*Math.sin(t*lobes*6.28+lobePhase));
 const points=[];for(let i=0;i<=40;i++){const t=i/40;points.push({t,x:center(t),y:bottom-t*height,r:radius(t)});}
 // Connected organic support mass underneath overlapping irregular surface clusters.
 c.beginPath();points.forEach((p,i)=>{if(i===0)c.moveTo(p.x-p.r,p.y);else c.lineTo(p.x-p.r,p.y);});for(let i=points.length-1;i>=0;i--)c.lineTo(points[i].x+points[i].r,points[i].y);c.closePath();
 const hue=id==='violet'?275:id==='comet'?85:100;
 const base=c.createLinearGradient(280,0,730,0);base.addColorStop(0,`hsl(${hue},20%,17%)`);base.addColorStop(.38,`hsl(${hue},23%,31%)`);base.addColorStop(1,`hsl(${hue},18%,12%)`);c.fillStyle=base;c.fill();
 const stamp=document.createElement('canvas');stamp.width=160;stamp.height=160;const sc=stamp.getContext('2d');
 const feather=sc.createRadialGradient(80,80,42,80,80,80);feather.addColorStop(0,'rgba(255,255,255,1)');feather.addColorStop(.65,'rgba(255,255,255,.92)');feather.addColorStop(1,'rgba(255,255,255,0)');
 const pieces=[];
 // Clusters vary in number, size, placement and lean. No repeated axis-paired leaves.
 const count=Math.round(160+density*65);
 for(let i=0;i<count;i++){
  const t=R(),across=(R()*2-1)*.98,rad=radius(t),front=Math.sqrt(1-across*across);
  const x=center(t)+across*rad,y=bottom-t*height;
  const w=(34+R()*34)*(.84+density*.18),h=w*(.8+R()*.45);
  // Sample detailed bract/resin groups from different interior regions of the material.
  const sourceSize=70+R()*120;
  const sy=source.height*(.25+R()*.40),sx=source.width*(.43+R()*.14)-sourceSize*.5;
  pieces.push({x,y,w,h,front,angle:(R()-.5)*1.8,sx,sy,sourceSize,shade:R(),edge:Math.abs(across)});
 }
 pieces.sort((a,b)=>a.front-b.front);
 for(const p of pieces){
  c.save();c.translate(p.x,p.y);c.rotate(p.angle);
  // A softly lobed patch masks the material; overlap conceals patch boundaries.
  c.beginPath();for(let n=0;n<16;n++){const angle=n/16*Math.PI*2,r=1+Math.sin(n*2.7+p.shade*9)*.08;const x=Math.cos(angle)*p.w*r,y=Math.sin(angle)*p.h*r;if(n===0)c.moveTo(x,y);else c.lineTo(x,y);}c.closePath();c.clip();
  const brightness=.80+p.front*.25+p.shade*.06;
  c.filter='brightness('+brightness+') saturate('+( .9+frost*.14)+')';
  sc.clearRect(0,0,160,160);sc.globalCompositeOperation='source-over';sc.drawImage(source,p.sx,p.sy,p.sourceSize,p.sourceSize,0,0,160,160);
  sc.globalCompositeOperation='destination-in';sc.fillStyle=feather;sc.fillRect(0,0,160,160);
  c.drawImage(stamp,-p.w,-p.h,p.w*2,p.h*2);
  c.restore();
 }
 // Soft directional shading binds all material samples into one volume.
 c.save();c.globalCompositeOperation='source-atop';
 const shade=c.createLinearGradient(280,0,740,0);shade.addColorStop(0,'rgba(0,9,2,.16)');shade.addColorStop(.25,'rgba(255,249,218,.07)');shade.addColorStop(.7,'rgba(0,5,2,.04)');shade.addColorStop(1,'rgba(0,6,2,.30)');c.fillStyle=shade;c.fillRect(0,0,size,size);c.restore();
 const image=c.getImageData(0,0,size,size).data;let left=size,top=size,right=0,bottomEdge=0;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(image[(y*size+x)*4+3]>16){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottomEdge=Math.max(bottomEdge,y);}
 const pad=10;left=Math.max(0,left-pad);top=Math.max(0,top-pad);right=Math.min(size-1,right+pad);bottomEdge=Math.min(size-1,bottomEdge+pad);
 const trimmed=document.createElement('canvas');trimmed.width=right-left+1;trimmed.height=bottomEdge-top+1;trimmed.getContext('2d').drawImage(out,left,top,trimmed.width,trimmed.height,0,0,trimmed.width,trimmed.height);return trimmed;
}
root.GanjariumFlowerArt=api;
})(typeof window==='undefined'?globalThis:window);
