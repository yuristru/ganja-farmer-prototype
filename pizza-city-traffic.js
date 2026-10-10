import {Sprite,Texture} from './pizza-core.js?v=20261011b';

const cache=new Map(),COLORS=['#bb4c37','#456c8b','#c39b3f','#5d8061','#d7cdb5'];

// Four directional bitmaps keep wheels underneath the body in both traffic directions.
export function carSprite(index,axis,dir){
  const color=COLORS[index%COLORS.length],rotation=axis===0?(dir>0?0:2):(dir>0?1:3),key=color+rotation;
  if(!cache.has(key)){
    const canvas=document.createElement('canvas');canvas.width=64;canvas.height=48;
    const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
    const turn=(x,y)=>rotation===1?[-y,x]:rotation===2?[-x,-y]:rotation===3?[y,-x]:[x,y];
    const p=(x,y,z=0)=>{const [a,b]=turn(x,y);return [Math.round(32+(a-b)*32),Math.round(34+(a+b)*16-z)];};
    const poly=(points,fill)=>{ctx.fillStyle=fill;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();};
    const surface=(points,z,fill)=>poly(points.map(([x,y])=>p(x,y,z)),fill);
    ctx.fillStyle='#28312b44';ctx.beginPath();ctx.ellipse(32,34,18,7,0,0,Math.PI*2);ctx.fill();
    const wheels=[[-.25,-.19],[.25,-.19],[-.25,.19],[.25,.19]].sort((a,b)=>{const u=turn(...a),v=turn(...b);return u[0]+u[1]-v[0]-v[1];});
    for(const [x,y]of wheels){const [px,py]=p(x,y,2);ctx.fillStyle='#25292a';ctx.fillRect(px-2,py-1,4,5);ctx.fillStyle='#777b75';ctx.fillRect(px-1,py,2,2);}
    const footprint=[[-.4,-.17],[.4,-.17],[.4,.17],[-.4,.17]],corners=footprint.map(([x,y])=>turn(x,y));
    const xs=corners.map(c=>c[0]),ys=corners.map(c=>c[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
    const absolute=(x,y,z)=>[Math.round(32+(x-y)*32),Math.round(34+(x+y)*16-z)];
    const A=absolute(x0,y0,7),B=absolute(x1,y0,7),C=absolute(x1,y1,7),D=absolute(x0,y1,7);
    poly([B,C,absolute(x1,y1,2),absolute(x1,y0,2)],color);
    poly([C,D,absolute(x0,y1,2),absolute(x1,y1,2)],'#000000');
    ctx.globalAlpha=.72;poly([C,D,absolute(x0,y1,2),absolute(x1,y1,2)],color);ctx.globalAlpha=1;
    poly([A,B,C,D],color);
    surface([[-.2,-.14],[.08,-.14],[.08,.14],[-.2,.14]],11,'#7a9ca0');
    surface([[-.18,-.12],[-.03,-.12],[-.03,.12],[-.18,.12]],12,color);
    poly([p(.08,-.14,11),p(.19,-.14,7),p(.19,.14,7),p(.08,.14,11)],'#b2c3b9');
    poly([p(-.2,-.14,11),p(-.27,-.14,7),p(-.27,.14,7),p(-.2,.14,11)],'#405961');
    for(const y of [-.13,.13]){const [x1,y1]=p(.4,y,4);ctx.fillStyle='#ead8a2';ctx.fillRect(x1-1,y1-1,2,2);const [x2,y2]=p(-.4,y,4);ctx.fillStyle='#86332b';ctx.fillRect(x2-1,y2-1,2,2);}
    const texture=Texture.from(canvas);texture.source.scaleMode='nearest';cache.set(key,texture);
  }
  const sprite=new Sprite(cache.get(key));sprite.anchor.set(.5,34/48);sprite.label='city-car';return sprite;
}
