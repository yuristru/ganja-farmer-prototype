import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const out='review-output';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({
  viewport:{width:393,height:852},
  deviceScaleFactor:2,
  isMobile:true,
  hasTouch:true,
  userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'
});
const page=await context.newPage();
const consoleLog=[];
page.on('console',m=>consoleLog.push({type:m.type(),text:m.text()}));
page.on('pageerror',e=>consoleLog.push({type:'pageerror',text:String(e)}));
await page.goto('http://127.0.0.1:4173/?equipment-review=1',{waitUntil:'networkidle'});
await page.evaluate(()=>localStorage.clear());
await page.reload({waitUntil:'networkidle'});
await page.waitForTimeout(1800);
await page.evaluate(()=>{
  if(window.__GFTRAIN?.setDay)window.__GFTRAIN.setDay(44);
  if(typeof gameState!=='undefined'&&gameState){
    gameState.plant.day=44;
    gameState.progression.levels.light=6;
    gameState.progression.levels.vent=6;
    if(typeof updateGameHUD==='function')updateGameHUD();
    if(typeof invalidatePlant==='function')invalidatePlant();
    if(typeof requestRender==='function')requestRender();
  }
});
await page.waitForTimeout(700);

async function setVariant(light,vent){
  await page.evaluate(({light,vent})=>{
    demoRoomEquipment.light=light;
    demoRoomEquipment.vent=vent;
    syncEquipment2D();
    if(typeof requestRender==='function')requestRender();
  },{light,vent});
  await page.waitForTimeout(500);
}
async function metrics(kind,level){
  return await page.evaluate(({kind,level})=>{
    const selector=kind==='light'?'.room-lamp':'.room-vent-rig';
    const el=document.querySelector(selector);
    const canvas=document.querySelector(kind==='light'?'.room-light-canvas':'.room-vent-canvas');
    const rect=el?.getBoundingClientRect();
    const cr=canvas?.getBoundingClientRect();
    let content=null;
    if(canvas&&canvas.width&&canvas.height){
      const ctx=canvas.getContext('2d');
      const d=ctx.getImageData(0,0,canvas.width,canvas.height).data;
      let x0=canvas.width,y0=canvas.height,x1=-1,y1=-1,count=0;
      for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
        if(d[(y*canvas.width+x)*4+3]>16){count++;if(x<x0)x0=x;if(y<y0)y0=y;if(x>x1)x1=x;if(y>y1)y1=y;}
      }
      if(x1>=x0)content={x0,y0,x1,y1,w:x1-x0+1,h:y1-y0+1,coverage:count/(canvas.width*canvas.height)};
    }
    const cone=document.querySelector('.room-light-cone')?.getBoundingClientRect();
    return {
      kind,level,
      element:rect?{x:rect.x,y:rect.y,w:rect.width,h:rect.height,right:rect.right,bottom:rect.bottom}:null,
      canvas:cr?{x:cr.x,y:cr.y,w:cr.width,h:cr.height,right:cr.right,bottom:cr.bottom}:null,
      content,
      cone:cone?{x:cone.x,y:cone.y,w:cone.width,h:cone.height,right:cone.right,bottom:cone.bottom}:null,
      viewport:{w:innerWidth,h:innerHeight}
    };
  },{kind,level});
}
const data={lamps:[],vents:[],console:consoleLog};
for(let level=1;level<=10;level++){
  await setVariant(level,1);
  await page.screenshot({path:path.join(out,'lamp-'+String(level).padStart(2,'0')+'.png')});
  data.lamps.push(await metrics('light',level));
}
for(let level=1;level<=10;level++){
  await setVariant(6,level);
  await page.screenshot({path:path.join(out,'vent-'+String(level).padStart(2,'0')+'.png')});
  data.vents.push(await metrics('vent',level));
}
fs.writeFileSync(path.join(out,'review.json'),JSON.stringify(data,null,2));
await browser.close();
