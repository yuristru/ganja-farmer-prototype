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
  function drawLight(g,p){
    if(!p)return;
    const v=p.view,cx=p.anchorX,sy=p.anchorY-p.height*.13;
    const length=v.height*.52,half=v.width*(.19+p.level*.012);
    g.save();
    // A feathered cone and floor reflection belong only to the lamp level.
    const glow=g.createLinearGradient(0,sy,0,sy+length);
    const strength=.24+p.level*.020;
    glow.addColorStop(0,'rgba(255,239,179,'+strength+')');
    glow.addColorStop(.35,'rgba(249,240,187,'+(strength*.75)+')');
    glow.addColorStop(1,'rgba(242,238,195,0)');
    g.fillStyle=glow;g.filter='blur('+Math.max(8,v.width*.028)+'px)';
    g.beginPath();g.moveTo(cx-p.width*.27,sy);g.lineTo(cx+p.width*.27,sy);
    g.lineTo(cx+half,sy+length);g.quadraticCurveTo(cx,sy+length*1.07,cx-half,sy+length);g.closePath();g.fill();
    g.filter='none';
    const floorY=v.y+v.height*.78,rx=v.width*(.13+p.level*.008),ry=v.height*.024;
    g.translate(cx,floorY);g.scale(1,ry/rx);
    const pool=g.createRadialGradient(0,0,0,0,0,rx);
    pool.addColorStop(0,'rgba(255,243,187,'+(strength*.6)+')');pool.addColorStop(1,'rgba(255,243,187,0)');
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
  root.GanjariumRoomHardware={drawLight,draw};
})(typeof window==='undefined'?globalThis:window);
