import {groundProjection} from './pizza-isometric-art.js?v=20261011a';
import {Sprite,Texture,state} from './pizza-core.js?v=20261011a';

// Atlas coordinates isolate complete flat drawings, including their ground contact.
// Rasterize once at the city's pixel scale instead of scaling high-resolution art per frame.
const ATLASES=[
  {key:'buildings',url:'italian-buildings-v2.png',frames:[
    [43,52,315,460,116],[412,45,336,473,124],[795,92,340,420,116],[1206,40,287,478,106],
    [23,546,355,399,124],[414,557,345,401,124],[798,551,348,404,124],[1175,539,336,416,118]
  ]},
  {key:'buildingExtras',url:'italian-buildings-extra-v1.png',frames:[
    [38,27,331,485,116,[[49,442],[198,510],[361,434]]],
    [418,108,350,404,124,[[432,443],[584,510],[750,441]]],
    [811,27,322,485,116,[[816,442],[980,510],[1127,434]]],
    [1158,105,354,405,124,[[1170,443],[1318,507],[1498,436]]],
    [39,518,336,485,116,[[50,936],[198,1000],[362,934]]],
    [418,593,343,411,124,[[427,934],[576,1003],[751,929]]],
    [803,604,358,394,124,[[817,928],[979,996],[1144,928]]],
    [1212,512,273,482,106,[[1226,941],[1294,990],[1475,908]]]
  ]},
  {key:'buildingTypes',url:'italian-building-types-v2.png',frames:[
    [40,34,328,450,116,[[47,412],[214,480],[354,415]]],
    [404,143,396,351,144,[[416,416],[602,491],[790,416]]],
    [825,50,336,440,124,[[836,420],[982,486],[1151,412]]],
    [1177,107,355,389,124,[[1192,416],[1381,493],[1518,433]]],
    [11,509,397,470,132,[[15,881],[233,973],[395,900]]],
    [420,494,360,487,124,[[430,908],[610,977],[770,907]]],
    [797,520,352,442,124,[[800,876],[1050,956],[1146,915]]],
    [1165,524,360,467,124,[[1178,914],[1353,984],[1511,921]]]
  ]},
  {key:'landmarks',url:'italian-landmarks-v2.png',frames:[
    [40,190,839,650,224],[975,21,772,849,194]
  ]},
  {key:'props',url:'italian-props-v2.png',frames:[
    [16,74,433,472,58],[455,20,383,533,57],[896,23,168,540,22],[1118,97,404,453,58],
    [33,592,392,352,82],[488,664,292,283,33],[834,633,277,316,20],[1153,556,347,416,38]
  ]}
];

function frame(image,[x,y,w,h,width,corners]){
  const scale=width/w,projection=corners?groundProjection(corners):null;
  const scaleX=projection?.scaleX||1,skewY=projection?.skewY||0,minY=Math.min(0,skewY*w);
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(w*scaleX*scale);canvas.height=Math.ceil((h+Math.abs(skewY)*w)*scale);
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
  ctx.setTransform(scaleX*scale,skewY*scale,0,scale,0,-minY*scale);
  ctx.drawImage(image,x,y,w,h,0,0,w,h);
  const front=corners?[corners[1][0]-x,corners[1][1]-y]:[w/2,h];
  const anchor={x:front[0]*scaleX*scale/canvas.width,y:(front[1]+skewY*front[0]-minY)*scale/canvas.height};
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
  const texture=Texture.from(canvas);texture.source.scaleMode='nearest';
  return {texture,anchor,projection:projection?{scaleX,skewY}:null,hitArea:{contains(px,py){
    const ix=Math.floor(px+anchor.x*canvas.width),iy=Math.floor(py+anchor.y*canvas.height);
    return ix>=0&&iy>=0&&ix<canvas.width&&iy<canvas.height&&pixels[(iy*canvas.width+ix)*4+3]>100;
  }}};
}

export async function loadCityArt(){
  await Promise.all(ATLASES.map(async atlas=>{
    try{
      const image=new Image();image.src='./assets/pizza/city/'+atlas.url;await image.decode();
      state.cityArt[atlas.key]=atlas.frames.map(rect=>frame(image,rect));
    }catch(error){
      console.warn('City art unavailable: '+atlas.key,error);state.assetFailures.push(atlas.key);
    }
  }));
  if(state.cityArt.buildings&&state.cityArt.buildingExtras){
    state.cityArt.buildings.push(...state.cityArt.buildingExtras);
  }
  delete state.cityArt.buildingExtras;
}

export function citySprite(kind,index=0){
  const art=state.cityArt[kind]?.[index];if(!art)return null;
  const sprite=new Sprite(art.texture);sprite.anchor.set(art.anchor.x,art.anchor.y);sprite.hitArea=art.hitArea;
  return sprite;
}
