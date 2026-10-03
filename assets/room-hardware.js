/* Independent lamp above integrated ventilation backgrounds. */
(function(root){
  'use strict';
  const layout=root.GanjariumRoomLayout,originalPlacement=layout.placement;
  const art=root.GanjariumStoreArtManifest;
  for(const id of ['light']){
    root.GanjariumRoomArt[id]=art[id];
    if(!layout.ids.includes(id))layout.ids.push(id);
  }
  layout.placement=function(id,level,segment,iw,ih,w,h,floorLimit){
    if(id!=='light')return originalPlacement(id,level,segment,iw,ih,w,h,floorLimit);
    const view=layout.cover(iw,ih,w,h,floorLimit),n=Math.max(1,Math.min(5,Number(level)||1));
    const maxW=[.30,.32,.34,.36,.38][n-1];
    const maxH=.10;
    const scale=Math.min(iw*maxW/segment.w,ih*maxH/segment.h)*view.scale;
    const width=segment.w*scale,height=segment.h*scale;
    const anchorX=view.x+view.width*.50,anchorY=view.y+view.height*.20;
    return {id,level:n,surface:'overhead',x:anchorX-width/2,
      y:anchorY-height,width,height,anchorX,anchorY,scale,view};
  };
  // Precomputed alpha gives the same feathered light on iOS Safari, where
  // CanvasRenderingContext2D.filter cannot be relied on for blur.
  const beamCache=new Map();
  function beamGeometry(p){
    const v=p.view;
    return {cx:p.x+p.width*.51,top:p.y+p.height*.46,
      length:v.height*.61,sigma:p.width*.23,spread:v.width*(.155+p.level*.008)};
  }
  function beamTexture(p){
    const b=beamGeometry(p),key=[p.level,p.width,p.height,p.view.width,p.view.height].map(n=>n.toFixed(2)).join(':');
    if(beamCache.has(key))return beamCache.get(key);
    const width=(b.sigma+b.spread)*7.2,height=b.length;
    const canvas=document.createElement('canvas');
    const scale=Math.min(1,768/height,768/width);
    canvas.width=Math.max(2,Math.ceil(width*scale));canvas.height=Math.max(2,Math.ceil(height*scale));
    const g=canvas.getContext('2d'),pixels=g.createImageData(canvas.width,canvas.height);
    for(let y=0;y<canvas.height;y++){
      const dy=y/canvas.height*height,t=dy/height;
      const sigma=b.sigma+b.spread*t;
      // Rise underneath the LED plane, then dissolve gradually toward the floor.
      const alpha=(.23+p.level*.012)*(1-Math.exp(-dy/Math.max(1,p.height*.09)))*Math.pow(1-t,1.7);
      for(let x=0;x<canvas.width;x++){
        const dx=(x/canvas.width-.5)*width,offset=(y*canvas.width+x)*4;
        pixels.data[offset]=255;pixels.data[offset+1]=241;pixels.data[offset+2]=193;
        pixels.data[offset+3]=Math.round(255*alpha*Math.exp(-.5*dx*dx/(sigma*sigma)));
      }
    }
    g.putImageData(pixels,0,0);
    const texture={canvas,width,height};
    if(beamCache.size>=20)beamCache.delete(beamCache.keys().next().value);
    beamCache.set(key,texture);return texture;
  }
  function drawLight(g,p){
    if(!p)return;
    const v=p.view,b=beamGeometry(p),texture=beamTexture(p);
    g.save();g.drawImage(texture.canvas,b.cx-texture.width/2,b.top,texture.width,texture.height);
    const floorY=v.y+v.height*.78,rx=v.width*(.13+p.level*.008),ry=v.height*.024;
    g.translate(b.cx,floorY);g.scale(1,ry/rx);
    const pool=g.createRadialGradient(0,0,0,0,0,rx);
    pool.addColorStop(0,'rgba(255,243,187,'+(.12+p.level*.012)+')');pool.addColorStop(1,'rgba(255,243,187,0)');
    g.fillStyle=pool;g.beginPath();g.arc(0,0,rx,0,Math.PI*2);g.fill();g.restore();
  }
  function supports(g,p){
    const v=p.view;
    if(p.id==='light'){
      // The lamp hangs in the tent's middle, from the unseen ceiling above
      // the camera. Never attach it to the rear wall crossbar.
      const railY=Math.min(0,v.y)-20;
      g.save();g.strokeStyle='#57645d';g.lineWidth=Math.max(1,v.width*.0025);
      const anchors=[[[.25,0],[.80,0]],[[.22,.04],[.78,0]],[[.15,.12],[.77,0]],[[.25,.12],[.74,0]],[[.22,.17],[.77,0]]][p.level-1];
      for(const [ax,ay] of anchors){
        const x=p.x+p.width*ax;
        g.beginPath();g.moveTo(x,railY);g.lineTo(x,p.y+p.height*ay);g.stroke();
      }
      g.restore();return;
    }
  }
  function draw(g,p,img,seg){
    supports(g,p);
    g.save();g.shadowColor='rgba(0,0,0,.5)';g.shadowBlur=p.view.width*.009;
    g.shadowOffsetY=3*p.view.scale;g.filter=p.id==='light'?'brightness(.96) saturate(.90)':'brightness(.90) saturate(.75)';
    g.drawImage(img,seg.x,seg.y,seg.w,seg.h,p.x,p.y,p.width,p.height);g.restore();
  }
  root.GanjariumRoomHardware={drawLight,draw,beamGeometry};
})(typeof window==='undefined'?globalThis:window);
