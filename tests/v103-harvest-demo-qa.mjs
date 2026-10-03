import assert from 'node:assert/strict';
import fs from 'node:fs';import http from 'node:http';import path from 'node:path';
import {chromium} from 'playwright';
const root=process.cwd(),out='qa/v103';fs.mkdirSync(out,{recursive:true});
const hook=`window.__demoQA={state:()=>JSON.parse(JSON.stringify(gameState)),pending:()=>pendingHarvestResult,commit:commitHarvestResult,open:openHarvestResults,fixture:buildHarvestDemoResult,seed:harvestPreviewSeed,master:renderCoreBudMaster,mature:()=>{gameState.plant.day=84;gameState.plant.harvested=false;currentDay=84;openHarvestResults();}};`;
const server=http.createServer((req,res)=>{const file=path.resolve(root,req.url.split('?')[0]==='/'?'index.html':'.'+req.url.split('?')[0]);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}if(file.endsWith('index.html'))data=Buffer.from(data.toString().replace('resize();\n})();','resize();\n'+hook+'\n})();'));res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':'application/octet-stream');res.end(data);});});
await new Promise(r=>server.listen(4203,'127.0.0.1',r));let browser;
const snapshot=async page=>page.evaluate(()=>{const s=window.__demoQA.state();return{coins:s.coins,plant:s.plant,genetics:s.genetics,collection:s.collection,vault:s.seedVault,meta:s.meta,history:s.history};});
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:2}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:4203/',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.GanjariumFlowerArt.loaded);await page.evaluate(()=>window.__demoQA.mature());
 const before=await snapshot(page),real=await page.evaluate(()=>({seed:window.__demoQA.pending().seed,title:document.getElementById('harvestBudTitle').textContent,image:window.__demoQA.master(window.__demoQA.seed(window.__demoQA.pending())).toDataURL()}));
 await page.click('#harvestDemoToggle');await page.waitForFunction(()=>window.__demoQA.pending()?.demo&&!document.getElementById('harvestDemoNext').disabled);
 const variants=[];
 for(let i=0;i<30;i++){
  if(i){await page.click('#harvestDemoNext');await page.waitForFunction(()=>!document.getElementById('harvestDemoNext').disabled);}
  variants.push(await page.evaluate(()=>{const q=window.__demoQA,r=q.pending();return{id:r.g.id,seed:r.seed,condition:r.condition,density:r.flowerQuality.density,resin:r.flowerQuality.resin,grams:r.grams,score:r.scores.total,image:q.master(q.seed(r)).toDataURL()};}));
  await page.evaluate(()=>window.__demoQA.commit());assert.deepEqual(await snapshot(page),before,'Demo changed real progress');
 }
 assert.equal(new Set(variants.slice(0,15).map(v=>v.id)).size,15);assert.equal(new Set(variants.map(v=>v.seed)).size,30);assert.equal(new Set(variants.map(v=>v.condition)).size,6);assert.equal(new Set(variants.map(v=>v.image)).size,30);assert(new Set(variants.map(v=>v.grams)).size>5);
 for(let i=0;i<15;i++)assert.notEqual(variants[i].condition,variants[i+15].condition);
 const deterministic=await page.evaluate(()=>{const q=window.__demoQA,a=q.fixture(0),b=q.fixture(0);return q.master(q.seed(a)).toDataURL()===q.master(q.seed(b)).toDataURL();});assert(deterministic);
 for(const width of [320,393,430]){
  await page.setViewportSize({width,height:Math.round(width*852/393)});
  await page.screenshot({path:out+'/demo-bud-'+width+'.png'});
  for(const id of ['harvestDemoToggle','harvestDemoNext','harvestToJar']){const b=await page.locator('#'+id).boundingBox();assert(b&&b.x>=0&&b.x+b.width<=width+1&&b.y+b.height<=Math.round(width*852/393)+1,id+' offscreen');}
  await page.click('#harvestToJar');await page.screenshot({path:out+'/demo-jar-'+width+'.png'});
  await page.click('#harvestFinish');assert.deepEqual(await snapshot(page),before);assert.equal(await page.locator('#harvestBudTitle').textContent(),real.title);
  assert.equal(await page.evaluate(()=>window.__demoQA.master(window.__demoQA.seed(window.__demoQA.pending())).toDataURL()),real.image);
  await page.click('#harvestDemoToggle');await page.waitForFunction(()=>window.__demoQA.pending()?.demo&&!document.getElementById('harvestDemoNext').disabled);
 }
 await page.click('#harvestResultClose');await page.evaluate(()=>window.__demoQA.open());assert.equal(await page.locator('#harvestBudTitle').textContent(),real.title);assert.equal(await page.locator('#harvestDemoToggle').getAttribute('aria-pressed'),'false');
 // Cancel a material load while it is in flight: it must never replace the real result.
 await page.evaluate(async()=>{const api=window.GanjariumFlowerArt,old=api.load;api.load=id=>new Promise(resolve=>setTimeout(()=>resolve(old(id)),100));document.getElementById('harvestDemoToggle').click();document.getElementById('harvestResultClose').click();await new Promise(r=>setTimeout(r,180));api.load=old;window.__demoQA.open();});
 assert.equal(await page.locator('#harvestBudTitle').textContent(),real.title);assert.deepEqual(await snapshot(page),before);
 await page.click('#harvestToJar');await page.click('#harvestFinish');const after=await snapshot(page);assert.equal(after.collection.length,before.collection.length+1);assert.equal(after.collection[0].seed,real.seed);assert(after.coins>before.coins);assert.equal(errors.length,0,errors.join('\n'));
 console.log('V103 passed: 30 unique previews, all 15 cultivars, 6 care conditions, deterministic art, real-state protection, cancellation and genuine harvest.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
