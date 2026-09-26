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
await page.waitForTimeout(1600);

// Use the game's own demo control to create a mature, stable plant scene.
await page.evaluate(()=>document.getElementById('devGood')?.click());
await page.waitForTimeout(1700);

async function shot(name){
  await page.waitForTimeout(1700);
  await page.screenshot({path:path.join(out,name+'.png')});
}
async function domMetrics(kind){
  return await page.evaluate((kind)=>{
    const el=document.querySelector(kind==='light'?'.room-lamp':'.room-vent-rig');
    const canvas=document.querySelector(kind==='light'?'.room-light-canvas':'.room-vent-canvas');
    const cone=document.querySelector('.room-light-cone');
    const rect=o=>{const r=o?.getBoundingClientRect();return r?{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}:null};
    let content=null;
    if(canvas&&canvas.width&&canvas.height){
      const ctx=canvas.getContext('2d'),d=ctx.getImageData(0,0,canvas.width,canvas.height).data;
      let x0=canvas.width,y0=canvas.height,x1=-1,y1=-1,count=0;
      for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
        if(d[(y*canvas.width+x)*4+3]>16){count++;if(x<x0)x0=x;if(y<y0)y0=y;if(x>x1)x1=x;if(y>y1)y1=y;}
      }
      if(x1>=x0)content={x0,y0,x1,y1,w:x1-x0+1,h:y1-y0+1,coverage:count/(canvas.width*canvas.height)};
    }
    return {
      level:Number(el?.dataset[kind==='light'?'lightLevel':'ventLevel']||0),
      element:rect(el),canvas:rect(canvas),cone:rect(cone),content,
      title:el?.getAttribute('title')||'',viewport:{w:innerWidth,h:innerHeight}
    };
  },kind);
}
const data={lamps:[],vents:[],console:consoleLog};

// Capture the real level-1 sunlight state through persisted game state.
// The production game has no artificial lamp or cone at this level.
await page.evaluate(()=>{
  const key='gf_mobile_game_v1',raw=localStorage.getItem(key);
  if(raw){const st=JSON.parse(raw);st.progression.levels.light=1;localStorage.setItem(key,JSON.stringify(st));}
});
await page.reload({waitUntil:'networkidle'});
await page.waitForTimeout(1700);
data.lamps.push({expected:1,...await domMetrics('light')});
await shot('lamp-01');

// Restore the game's own scenario. This starts at the actual default Clip LED (L2) and room-air ventilation (L1).
await page.evaluate(()=>document.getElementById('devGood')?.click());
await page.waitForTimeout(1700);
data.vents.push({expected:1,...await domMetrics('vent')});
await shot('vent-01');

// Lamp demo starts at the real default Clip LED, level 2. Click the actual rendered lamp
// between captures, exactly as a player does in V62.
for(let expected=2;expected<=10;expected++){
  const m=await domMetrics('light');
  data.lamps.push({expected,...m});
  await shot('lamp-'+String(expected).padStart(2,'0'));
  if(expected<10){
    await page.locator('.room-lamp').click({position:{x:Math.max(2,m.element.w/2),y:Math.max(2,m.element.h/2)}});
    await page.waitForTimeout(1700);
  }
}

// Reload to clear the lamp demo override, restore the real scene, then buy only ventilation L2
// through the actual upgrade UI. No internal game variables are accessed.
await page.reload({waitUntil:'networkidle'});
await page.waitForTimeout(1300);
await page.evaluate(()=>document.getElementById('devGood')?.click());
await page.waitForTimeout(1700);
await page.locator('[data-ui-tab="upgrades"]').click();
await page.waitForTimeout(200);
await page.locator('[data-upgrade-category="vent"]').click();
await page.waitForTimeout(200);
await page.locator('[data-buy-level="2"]').click();
await page.waitForTimeout(1700);
await page.locator('[data-game-panel="upgrades"] [data-panel-close]').click();
await page.waitForTimeout(350);

for(let expected=2;expected<=10;expected++){
  const m=await domMetrics('vent');
  data.vents.push({expected,...m});
  await shot('vent-'+String(expected).padStart(2,'0'));
  if(expected<10){
    await page.locator('.room-vent-rig').click({position:{x:Math.max(2,m.element.w/2),y:Math.max(2,m.element.h/2)}});
    await page.waitForTimeout(250);
  }
}

data.console=consoleLog;
fs.writeFileSync(path.join(out,'review.json'),JSON.stringify(data,null,2));
await browser.close();
