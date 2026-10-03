import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';import http from 'node:http';import path from 'node:path';
import '../assets/room-equipment-layout.js';
const root=process.cwd(),outDir=path.join(root,'qa/v98-room-integration');fs.mkdirSync(outDir,{recursive:true});
const art=JSON.parse(fs.readFileSync('assets/equipment/room-v98/manifest.json','utf8'));
const layout=globalThis.GanjariumRoomLayout,ids=layout.ids;
const sizes=[{width:320,height:693},{width:360,height:800},{width:393,height:852},{width:430,height:932}];
const results={geometryCases:0,screens:[],errors:[],requests:[]};
// Check the actual alpha-trimmed art rectangles, not arbitrary invisible boxes.
for(const {width:w,height:h} of sizes){
  const placements=Object.fromEntries(ids.map(id=>[id,Array.from({length:10},(_,i)=>layout.placement(id,i+1,art[id].segments[i],706,1255,w,h))]));
  for(const id of ids)for(const p of placements[id]){
    assert(p.x>=0&&p.x+p.width<=w,`${id} L${p.level} cropped at ${w}x${h}`);
    const s=art[id].segments[p.level-1];assert(s.w/p.width>=3&&s.h/p.height>=3,`${id} below 3x display resolution`);
    if(p.surface==='floor')assert(Math.abs(p.y+p.height-p.anchorY)<1e-8,'Floating floor prop');
    if(p.surface==='pole')assert(Math.abs(p.x+p.width-p.anchorX)<1e-8,'Clamp detached from pole');
    if(id==='substrate')assert(p.x+p.width<w*.34,'Substrate intrudes into plant');
    if(id==='irrigation')assert(p.x>w*.66,'Water equipment intrudes into plant');
    results.geometryCases++;
  }
  for(const a of placements.substrate)for(const b of placements.nutrients){
    assert(b.y+b.height+8*b.view.scale<a.y,'Shelf crosses substrate artwork');results.geometryCases++;
  }
}
const mime={'.html':'text/html','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.b64':'text/plain','.json':'application/json'};
const server=http.createServer((req,res)=>{const clean=decodeURIComponent(req.url.split('?')[0]),file=path.resolve(root,clean==='/'?'index.html':'.'+clean);if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}fs.readFile(file,(e,d)=>{if(e){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(d);});});
await new Promise(r=>server.listen(4198,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:sizes[2],deviceScaleFactor:3});const page=await context.newPage();
 page.on('pageerror',e=>results.errors.push(String(e)));
 page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1:4198')&&r.status()>=400)results.requests.push({url:r.url(),status:r.status()});});
 await page.goto('http://127.0.0.1:4198',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__GFROOMEQ?.placements().length===5);
 const meta=await page.evaluate(()=>window.__GFROOMEQ.assetMeta());
 for(const id of ids){assert.equal(meta[id].width,art[id].width);assert.equal(meta[id].height,art[id].height);assert.equal(meta[id].segments.length,10);}
 async function capture(name,levels){
  await page.evaluate(lv=>{window.__GFROOMEQ.setLevels(lv);window.__GFTRAIN.setDay(41);},levels);
  await page.waitForFunction(lv=>Object.entries(lv).every(([id,n])=>window.__GFROOMEQ.snapshot()[id]===n),levels);
  await page.waitForTimeout(350);
  const frame=await page.evaluate(()=>window.__GFROOMEQ.frame());assert.equal(frame.renderedFloorLimit,frame.floorLimit,'Rendered room camera differs from current HUD frame');
  const state=await page.evaluate(()=>({placements:window.__GFROOMEQ.placements(),overlays:document.querySelectorAll('.room-equipment-overlay,.room-equipment-mount').length,needs:document.querySelector('.bottom-wrap').getBoundingClientRect().top,canvas:document.getElementById('c').getBoundingClientRect().toJSON()}));
  assert.equal(state.overlays,0,'Legacy scene overlays returned');assert.equal(state.placements.length,5);
  for(const p of state.placements){assert(p.y+p.height<state.needs,`${p.id} bottom ${p.y+p.height} behind HUD ${state.needs}`);assert(p.width>10&&p.height>10);}
  const hitBoxes=await page.evaluate(()=>Array.from(document.querySelectorAll('.room-equipment-hit')).map(el=>({id:el.dataset.demoUpgrade,...el.getBoundingClientRect().toJSON()})));
  for(const p of state.placements){const b=hitBoxes.find(b=>b.id===p.id);assert(Math.abs(b.x-state.canvas.x-p.x)<.05&&Math.abs(b.y-state.canvas.y-p.y)<.05,'Demo hit area drifts from artwork '+JSON.stringify({p,b}));}
  await page.screenshot({path:path.join(outDir,name+'.png')});results.screens.push({name,levels,...state});
 }
 for(let level=1;level<=10;level++)await capture('level-'+String(level).padStart(2,'0'),Object.fromEntries(ids.map(id=>[id,level])));
 for(const size of sizes){
  await page.setViewportSize(size);
  await capture(size.width+'-mixed-user',{substrate:1,nutrients:2,sensor:1,irrigation:10});
  await capture(size.width+'-mixed-heavy',{substrate:10,nutrients:10,sensor:5,irrigation:10});
 }
 await page.setViewportSize(sizes[2]);
 await page.evaluate(()=>{const ui=document.getElementById('mobileGameUI');ui.style.setProperty('--safe-top','44px');ui.style.setProperty('--safe-bottom','34px');});
 await capture('393-iphone-safe-area',{substrate:1,nutrients:2,sensor:1,irrigation:10});
 await page.evaluate(()=>{const ui=document.getElementById('mobileGameUI');ui.style.removeProperty('--safe-top');ui.style.removeProperty('--safe-bottom');});
 await page.waitForTimeout(350);
 // Browser output must match the pure cover transform after resize.
 for(const size of sizes){await page.setViewportSize(size);await page.waitForTimeout(80);const frame=await page.evaluate(()=>window.__GFROOMEQ.frame());const placed=await page.evaluate(()=>window.__GFROOMEQ.placements());
  for(const p of placed.filter(p=>!['light','vent'].includes(p.id))){const expected=layout.placement(p.id,p.level,art[p.id].segments[p.level-1],706,1255,frame.width,frame.height,frame.floorLimit);assert(Math.abs(expected.x-p.x)<.01&&Math.abs(expected.y-p.y)<.01,'Background/equipment resize mismatch');}
 }
 // Tap the actual controller in demo mode; preview must cycle one category only.
 const before=await page.evaluate(()=>window.__GFROOMEQ.snapshot());await page.locator('.room-equipment-hit[data-demo-upgrade="sensor"]').click();
 const after=await page.evaluate(()=>window.__GFROOMEQ.snapshot());assert.equal(after.sensor,before.sensor%10+1);for(const id of ids.filter(id=>id!=='sensor'))assert.equal(after[id],before[id]);
 // Category/gallery previews use the same native artwork and keep their ratio.
 await page.locator('[data-ui-tab="upgrades"]').click();await page.waitForTimeout(200);
 const previews=await page.evaluate(()=>Array.from(document.querySelectorAll('.hd-eq-preview')).map(el=>({ready:el.classList.contains('ready'),failed:el.classList.contains('failed')})));
 assert(previews.length>=4&&previews.every(p=>p.ready&&!p.failed),'Upgrade gallery artwork failed');
 assert.deepEqual(results.errors,[]);assert.deepEqual(results.requests,[]);results.pass=true;
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(outDir,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({pass:results.pass,geometryCases:results.geometryCases,screens:results.screens.length,errors:results.errors},null,2));}
