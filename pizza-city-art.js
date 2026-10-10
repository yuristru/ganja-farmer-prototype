import {Sprite,Texture,state} from './pizza-core.js?v=20261010s';

// Atlas coordinates isolate complete flat drawings, including their ground contact.
// Rasterize once at the city's pixel scale instead of scaling high-resolution art per frame.
const ATLASES=[
  {key:'buildings',url:'italian-buildings-v2.png',frames:[
    [43,52,315,460,116],[412,45,336,473,124],[795,92,340,420,116],[1206,40,287,478,106],
    [23,546,355,399,124],[414,557,345,401,124],[798,551,348,404,124],[1175,539,336,416,118]
  ]},
  {key:'buildingExtras',url:'italian-buildings-extra-v1.png',frames:[
    [38,27,331,485,116],[418,108,350,404,124],[811,27,322,485,116],[1158,105,354,405,124],
    [39,518,336,485,116],[418,593,343,411,124],[803,604,358,394,124],[1212,512,273,482,106]
  ]},
  {key:'buildingTypes',url:'italian-building-types-v1.png',frames:[
    [24,22,337,466,116],[365,124,451,361,144],[819,14,339,472,124],[1180,88,352,391,124],
    [2,520,405,464,132],[414,470,394,522,124],[812,516,356,446,124],[1174,520,360,465,124]
  ]},
  {key:'landmarks',url:'italian-landmarks-v2.png',frames:[
    [40,190,839,650,224],[975,21,772,849,194]
  ]},
  {key:'props',url:'italian-props-v2.png',frames:[
    [16,74,433,472,58],[455,20,383,533,57],[896,23,168,540,22],[1118,97,404,453,58],
    [33,592,392,352,82],[488,664,292,283,33],[834,633,277,316,20],[1153,556,347,416,38]
  ]}
];

function frame(image,[x,y,w,h,width]){
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=Math.round(h*width/w);
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
  ctx.drawImage(image,x,y,w,h,0,0,canvas.width,canvas.height);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
  const texture=Texture.from(canvas);texture.source.scaleMode='nearest';
  return {texture,hitArea:{contains(px,py){
    const ix=Math.floor(px+canvas.width/2),iy=Math.floor(py+canvas.height);
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
  const sprite=new Sprite(art.texture);sprite.anchor.set(.5,1);sprite.hitArea=art.hitArea;
  return sprite;
}
