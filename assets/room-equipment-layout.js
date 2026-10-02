/* V98: one camera and one coordinate system for background and equipment.
 * Coordinates refer to the un-cropped tent photograph, never to HUD pixels.
 * Floor y=.735 is just in front of the rear seam (.705), behind the plant.
 * Artwork already contains the view angle; never perspective-warp a bitmap.
 */
(function(root){
  'use strict';
  const ids=['substrate','nutrients','irrigation','sensor'];
  function cover(iw,ih,w,h,floorLimit=h-225){
    const scale=Math.max(w/iw,h/ih);
    const y=(h-ih*scale)/2;
    // Short displays need a little upward camera pan to expose the rear floor
    // above the day buttons. Apply it to the photograph AND every room prop.
    const pan=Math.max(0,y+ih*scale*.735-floorLimit);
    return {scale,x:(w-iw*scale)/2,y:y-pan,width:iw*scale,height:ih*scale};
  }
  function placement(id,level,segment,iw,ih,w,h,floorLimit=h-225){
    const view=cover(iw,ih,w,h,floorLimit),n=Math.max(1,Math.min(10,Number(level)||1));
    let x,y,maxW,maxH,anchor='bottom',surface='floor';
    if(id==='substrate'){
      x=.23;y=.735;maxW=n<6?.205:.20;maxH=n<6?.085:.09;
    }else if(id==='irrigation'){
      x=.79;y=.735;maxW=n<6?.185:.215;maxH=n<6?.095:.115;
    }else if(id==='nutrients'){
      x=.325;y=.625;maxW=n<8?.155:.19;maxH=.060;surface='shelf';
    }else if(id==='sensor'){
      // The integrated right clamp touches the existing rear-right tent pole.
      x=.883;y=.50;maxW=n<6?.092:.135;maxH=.065;anchor='right-center';surface='pole';
    }else throw new Error('Unknown room equipment: '+id);
    const artScale=Math.min(iw*maxW/segment.w,ih*maxH/segment.h)*view.scale;
    const width=segment.w*artScale,height=segment.h*artScale;
    const ax=view.x+x*view.width,ay=view.y+y*view.height;
    return {id,level:n,surface,x:anchor==='right-center'?ax-width:ax-width/2,
      y:anchor==='right-center'?ay-height/2:ay-height,width,height,
      anchorX:ax,anchorY:ay,scale:artScale,view};
  }
  function shadow(g,p){
    g.save();
    if(p.surface!=='pole'){
      const y=p.anchorY,rx=p.width*.47,ry=3.5*p.view.scale;
      g.translate(p.anchorX,y);g.scale(1,ry/rx);
      // Create the gradient in local coordinates so the footprint stays soft.
      const local=g.createRadialGradient(0,0,0,0,0,rx);
      local.addColorStop(0,'rgba(0,0,0,.50)');local.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle=local;g.beginPath();g.arc(0,0,rx,0,Math.PI*2);g.fill();
    }
    g.restore();
  }
  function shelf(g,p){
    const s=p.view.scale,half=Math.max(p.width/2,42*s)+5*s,y=p.anchorY;
    g.save();g.fillStyle='#162820';g.strokeStyle='rgba(118,146,123,.25)';g.lineWidth=s;
    g.beginPath();g.moveTo(p.anchorX-half,y);g.lineTo(p.anchorX+half,y);
    g.lineTo(p.anchorX+half+4*s,y+5*s);g.lineTo(p.anchorX-half-4*s,y+5*s);g.closePath();g.fill();g.stroke();
    g.fillStyle='#0c1914';g.fillRect(p.anchorX-half-4*s,y+5*s,half*2+8*s,4*s);
    for(const dx of [-half*.65,half*.65]){
      g.beginPath();g.moveTo(p.anchorX+dx,y+9*s);g.lineTo(p.anchorX+dx,y+23*s);
      g.lineTo(p.anchorX+dx+8*s,y+9*s);g.closePath();g.fill();
    }
    g.restore();
  }
  root.GanjariumRoomLayout={ids,cover,placement,shadow,shelf};
})(typeof window==='undefined'?globalThis:window);
