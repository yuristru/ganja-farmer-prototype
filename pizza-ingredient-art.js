// Generated food is sampled once onto small native pixel grids, then drawn without smoothing.
const art=new Map();
const SHEETS=[
 {url:'italian-dairy-meat-v1.png',ids:['mozzarella','parmesan','basil','salami','ham'],xs:[0,460,850,1280],ys:[0,285,550,785,995,1280]},
 {url:'italian-vegetables-v1.png',ids:['mushroom','pepper','olive','onion','tuna'],xs:[0,420,850,1280],ys:[0,280,560,775,1020,1280]}
];
export async function loadIngredientArt(){
 await Promise.all(SHEETS.map(async sheet=>{
  try{
   const image=new Image();image.src='./assets/pizza/ingredients/'+sheet.url;await image.decode();
   for(let row=0;row<5;row++)for(let form=0;form<3;form++){
    const x=Math.round(sheet.xs[form]*image.width/1280),y=Math.round(sheet.ys[row]*image.height/1280),w=Math.round(sheet.xs[form+1]*image.width/1280)-x,h=Math.round(sheet.ys[row+1]*image.height/1280)-y;
    const frame=document.createElement('canvas');frame.width=w;frame.height=h;const ctx=frame.getContext('2d');ctx.drawImage(image,x,y,w,h,0,0,w,h);
    const data=ctx.getImageData(0,0,w,h).data;let left=w,top=h,right=0,bottom=0;
    for(let py=0;py<h;py++)for(let px=0;px<w;px++)if(data[(py*w+px)*4+3]>200&&((px>0&&data[(py*w+px-1)*4+3]>200)||(px+1<w&&data[(py*w+px+1)*4+3]>200))&&((py>0&&data[((py-1)*w+px)*4+3]>200)||(py+1<h&&data[((py+1)*w+px)*4+3]>200))){left=Math.min(left,px);right=Math.max(right,px);top=Math.min(top,py);bottom=Math.max(bottom,py);}
    if(left>right)throw new Error('Empty ingredient frame');
    const fw=right-left+1,fh=bottom-top+1,native=64,scale=native/Math.max(fw,fh),sprite=document.createElement('canvas');sprite.width=Math.max(1,Math.round(fw*scale));sprite.height=Math.max(1,Math.round(fh*scale));
    const out=sprite.getContext('2d');out.imageSmoothingEnabled=true;out.imageSmoothingQuality='high';out.drawImage(frame,left,top,fw,fh,0,0,sprite.width,sprite.height);const pixels=out.getImageData(0,0,sprite.width,sprite.height);for(let i=0;i<pixels.data.length;i+=4){pixels.data[i+3]=pixels.data[i+3]<120?0:255;for(let channel=0;channel<3;channel++)pixels.data[i+channel]=Math.min(255,Math.round(pixels.data[i+channel]/16)*16);}out.putImageData(pixels,0,0);art.set(sheet.ids[row]+':'+form,sprite);
   }
  }catch(error){console.warn('Ingredient sprites unavailable: '+sheet.url,error);}
 }));
}
export function drawIngredientArt(t,ctx){
 const sprite=art.get(t.id+':'+(t.form===undefined?1:t.form));if(!sprite)return false;
 const form=t.form===undefined?1:t.form,size=form===0?54:form===1?32:26,scale=size/Math.max(sprite.width,sprite.height),w=Math.round(sprite.width*scale),h=Math.round(sprite.height*scale);
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(t.x),Math.round(t.y));ctx.rotate(t.angle);ctx.drawImage(sprite,-Math.round(w/2),-Math.round(h/2),w,h);ctx.restore();return true;
}
export function ingredientArtCount(){return art.size;}
