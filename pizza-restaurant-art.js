import {Sprite,Texture} from './pizza-core.js?v=20261010p';

// Individually measured atlas frames become small, flat pixel sprites once at load time.
const art=new Map();
const SHEETS=[
  {url:'italian-oven-v1.png',frames:[
    ['oven:0',86,68,459,501,64,16],['oven:1',718,70,458,499,64,16],
    ['oven:2',89,671,453,489,64,16],['oven:3',714,671,455,489,64,16]
  ]},
  {url:'italian-decor-v1.png',frames:[
    ['plant:0',30,82,472,677,42,7],['wine:0',564,90,697,736,92,16],['jukebox:0',1342,160,395,640,42,10]
  ]}
];
export async function loadRestaurantArt(){
  await Promise.all(SHEETS.map(async sheet=>{
    try{
      const image=new Image();image.src='./assets/pizza/restaurant/'+sheet.url;await image.decode();
      for(const [key,x,y,w,h,width,foot] of sheet.frames){
        const canvas=document.createElement('canvas');canvas.width=width;canvas.height=Math.round(h*width/w);
        const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(image,x,y,w,h,0,0,canvas.width,canvas.height);
        const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data,texture=Texture.from(canvas);texture.source.scaleMode='nearest';
        const baseline=canvas.height-foot;
        art.set(key,{texture,baseline,icon:canvas.toDataURL(),hitArea:{contains(px,py){
          const ix=Math.floor(px+canvas.width/2),iy=Math.floor(py+baseline);
          return ix>=0&&iy>=0&&ix<canvas.width&&iy<canvas.height&&pixels[(iy*canvas.width+ix)*4+3]>100;
        }}});
      }
    }catch(error){console.warn('Restaurant art unavailable: '+sheet.url,error);}
  }));
}
function lookup(type,rotation){return art.get(type+':'+(type==='oven'?rotation:0));}
export function restaurantSprite(type,rotation=0){
  const data=lookup(type,rotation);if(!data)return null;
  const sprite=new Sprite(data.texture);sprite.anchor.set(.5,data.baseline/data.texture.height);sprite.hitArea=data.hitArea;sprite.label='furniture-sprite';return sprite;
}
export function restaurantIcon(type){return lookup(type,0)?.icon;}
