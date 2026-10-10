import {Sprite,Texture,CITY_N,hash} from './pizza-core.js?v=20261011b';

// Paint opaque pixels at half world resolution; the road texture is baked once.
export function cityGround({road,roadCell,water,bridge,park,fountainCell},seed){
  const min=-8,max=CITY_N+7,left=(min-max)*32-32,top=min*32-16;
  const canvas=document.createElement('canvas');
  canvas.width=((max-min)*64+64)/2;canvas.height=((max-min)*32+32)/2;
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
  const random=(x,y,s=0)=>hash(x,y,(seed+s)>>>0);
  const point=(x,y)=>[((x-y)*32-left)/2,((x+y)*16-top)/2];
  const mod=n=>((n%8)+8)%8;
  const stats={asphalt:0,crossings:0,manholes:0,curbs:0};
  function polygon(points,color,worn=0){
    const ys=points.map(p=>p[1]),start=Math.ceil(Math.min(...ys)-.5),end=Math.ceil(Math.max(...ys)-.5);
    ctx.fillStyle=color;
    for(let y=start;y<end;y++){
      const scan=y+.5,intersections=[];
      for(let i=0;i<points.length;i++){
        const a=points[i],b=points[(i+1)%points.length];
        if((a[1]<=scan&&b[1]>scan)||(b[1]<=scan&&a[1]>scan))intersections.push(a[0]+(scan-a[1])*(b[0]-a[0])/(b[1]-a[1]));
      }
      intersections.sort((a,b)=>a-b);
      for(let i=0;i+1<intersections.length;i+=2){
        const x0=Math.ceil(intersections[i]-.5),x1=Math.ceil(intersections[i+1]-.5);
        if(!worn)ctx.fillRect(x0,y,x1-x0,1);
        else for(let x=x0;x<x1;x++)if(random(x,y,37)>worn)ctx.fillRect(x,y,1,1);
      }
    }
  }
  function quad(x,y,w,h,color,worn=0){polygon([point(x,y),point(x+w,y),point(x+w,y+h),point(x,y+h)],color,worn);}
  function pixel(x,y,color,width=1){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),width,1);}
  function line(a,b,color){
    let x=Math.round(a[0]),y=Math.round(a[1]);const endX=Math.round(b[0]),endY=Math.round(b[1]);
    const dx=Math.abs(endX-x),sx=x<endX?1:-1,dy=-Math.abs(endY-y),sy=y<endY?1:-1;let error=dx+dy;
    while(true){pixel(x,y,color);if(x===endX&&y===endY)break;const e=2*error;if(e>=dy){error+=dy;x+=sx;}if(e<=dx){error+=dx;y+=sy;}}
  }
  function stone(x,y){
    const palette=['#b8ae96','#c6baa0','#cec0a6','#bdb39d','#d2c6ac'];
    quad(x-.5,y-.5,1,1,'#958b75');
    for(let a=0;a<3;a++)for(let b=0;b<3;b++){
      const px=x-.48+a/3,py=y-.48+b/3,color=palette[Math.floor(random(x*3+a,y*3+b,8)*palette.length)];
      quad(px,py,.3,.3,color);
      line(point(px,py),point(px+.3,py),'#dfd1b5');
      line(point(px+.3,py),point(px+.3,py+.3),'#a79a81');
    }
  }
  function asphalt(x,y){
    stats.asphalt++;quad(x-.5,y-.5,1,1,'#484d4b');
    const colors=['#555a55','#3d4441','#61645b','#414743'];
    for(let n=0;n<23;n++){
      const p=point(x-.46+random(x,y,n*3+10)*.92,y-.46+random(x,y,n*3+11)*.92);
      pixel(p[0],p[1],colors[Math.floor(random(x,y,n*3+12)*colors.length)]);
    }
    if(random(x,y,90)>.87){
      const p=point(x-.15,y-.1);line([p[0]-4,p[1]-2],[p[0]+1,p[1]],'#383f3c');line([p[0]+1,p[1]],[p[0]+4,p[1]-1],'#3e4541');
    }
  }
  function waterTile(x,y){
    quad(x-.5,y-.5,1,1,'#397b8d');
    for(let n=0;n<8;n++){
      const p=point(x-.45+random(x,y,n+120)*.9,y-.45+random(y,x,n+140)*.9);
      pixel(p[0],p[1],n%3?'#518c99':'#256578',2+(n%2));
    }
  }
  for(let y=min;y<=max;y++)for(let x=min;x<=max;x++){
    if(water(x,y)&&!bridge(x,y))waterTile(x,y);
    else if(bridge(x,y))stone(x,y);
    else if(road(x,y))asphalt(x,y);
    else if(park(x,y)&&!fountainCell(x,y)&&!road(x-1,y)&&!road(x+1,y)&&!road(x,y-1)&&!road(x,y+1)){
      quad(x-.5,y-.5,1,1,'#788851');
      for(let n=0;n<18;n++){const p=point(x-.45+random(x,y,n+170)*.9,y-.45+random(y,x,n+190)*.9);pixel(p[0],p[1],n%2?'#87995c':'#677a49');}
    }else stone(x,y);
  }
  // Small stone blocks form a continuous curb around every city block.
  for(let y=min;y<=max;y++)for(let x=min;x<=max;x++){
    if(road(x,y)||water(x,y))continue;
    for(const [dx,dy]of [[-1,0],[1,0],[0,-1],[0,1]]){
      if(!road(x+dx,y+dy))continue;stats.curbs++;
      for(let n=0;n<4;n++){
        const px=x+(dx<0?-.5:dx>0?.4:-.5+n*.25),py=y+(dy<0?-.5:dy>0?.4:-.5+n*.25);
        quad(px,py,dx?.1:.23,dy?.1:.23,n%2?'#d4c5a5':'#c5b695');
        line(point(px,py),point(px+(dx?.1:.23),py),'#ede0c3');
      }
    }
  }
  // Markings are world-plane rectangles, rasterized on the same pixel lattice.
  for(let y=min;y<=max;y++)for(let x=min;x<=max;x++){
    if(!road(x,y)||water(x,y))continue;
    const ix=roadCell(x),iy=roadCell(y);if(ix&&iy)continue;
    if(ix&&mod(x)===0){
      if(y%3===0)quad(x+.46,y-.32,.08,.64,'#b7baa5',.08);
      if([2,7].includes(mod(y))){stats.crossings++;for(let n=0;n<5;n++)quad(x-.37+n*.37,y-.38,.19,.76,'#e5dcc4',.045);}
    }
    if(iy&&mod(y)===0){
      if(x%3===0)quad(x-.32,y+.46,.64,.08,'#b7baa5',.08);
      if([2,7].includes(mod(x))){stats.crossings++;for(let n=0;n<5;n++)quad(x-.38,y-.37+n*.37,.76,.19,'#e5dcc4',.045);}
    }
    if(random(x,y,240)>.985&&![2,7].includes(ix?mod(y):mod(x))){
      stats.manholes++;const p=point(x,y);
      for(let dy=-3;dy<=3;dy++)for(let dx=-5;dx<=5;dx++){
        const radius=dx*dx/25+dy*dy/6.25;if(radius<=1)pixel(p[0]+dx,p[1]+dy,radius>.6?'#777b6b':(dx+dy)%2?'#333c39':'#454f48');
      }
      pixel(p[0]-2,p[1]-2,'#9b9c86',3);
    }
  }
  // The bridge deck shares the paving raster; raised railings stay in the object layer.
  for(const y of [16,24]){
    quad(23.5,y-.5,3,2,'#a99e85');
    for(let x=24;x<=26;x++)for(let gy=y;gy<=y+1;gy++)stone(x,gy);
  }
  const texture=Texture.from(canvas);texture.source.scaleMode='nearest';
  const sprite=new Sprite(texture);sprite.position.set(left,top);sprite.scale.set(2);sprite.label='city-ground';sprite.pixelScale=2;sprite.groundDetails=stats;
  return sprite;
}
