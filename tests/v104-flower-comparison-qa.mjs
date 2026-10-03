import assert from 'node:assert/strict';
import fs from 'node:fs';import http from 'node:http';import path from 'node:path';
import {chromium} from 'playwright';
const root=process.cwd(),out='qa/v104';fs.mkdirSync(out,{recursive:true});
const hook=`window.__demoQA={state:()=>JSON.parse(JSON.stringify(gameState)),pending:()=>pendingHarvestResult,commit:commitHarvestResult,open:openHarvestResults,fixture:buildHarvestDemoResult,seed:harvestPreviewSeed,master:renderCoreBudMaster,mature:()=>{gameState.plant.day=84;gameState.plant.harvested=false;currentDay=84;openHarvestResults();}};`;
const server=http.createServer((req,res)=>{const file=path.resolve(root,req.url.split('?')[0]==='/'?'index.html':'.'+req.url.split('?')[0]);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}if(file.endsWith('index.html'))data=Buffer.from(data.toString().replace('resize();\n})();','resize();\n'+hook+'\n})();'));res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':'application/octet-stream');res.end(data);});});
await new Promise(r=>server.listen(4204,'127.0.0.1',r));let browser;
const snapshot=async page=>page.evaluate(()=>{const s=window.__demoQA.state();return{coins:s.coins,plant:s.plant,genetics:s.genetics,collection:s.collection,vault:s.seedVault,meta:s.meta,history:s.history};});
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:2}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:4204/',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.GanjariumFlowerArt.loaded);
 const before=await snapshot(page);
 await page.click('#devToggle');await page.click('#devFlowerSheet');
 await page.waitForFunction(()=>document.querySelectorAll('.flower-test-card[data-ready="true"]').length===100,{},{timeout:180000});
 assert.equal(await page.locator('.flower-test-card').count(),100);
 const cards=await page.locator('.flower-test-card').evaluateAll(els=>els.map(el=>({seed:el.dataset.seed,cultivar:el.dataset.cultivar,condition:el.dataset.condition,image:el.querySelector('canvas').toDataURL()})));
 assert.equal(new Set(cards.map(c=>c.seed)).size,100);assert.equal(new Set(cards.map(c=>c.cultivar)).size,15);assert.equal(new Set(cards.map(c=>c.condition)).size,6);assert.equal(new Set(cards.map(c=>c.image)).size,100);assert.deepEqual(await snapshot(page),before);
 for(const width of [320,393,1200]){
  await page.setViewportSize({width,height:width===1200?900:852});
  assert.equal(await page.locator('#flowerTestPage').evaluate(el=>el.scrollWidth>el.clientWidth),false);
  const cols=await page.locator('#flowerTestGrid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);assert.equal(cols,width===1200?6:2);
  const geometry=await page.locator('.flower-test-card').first().evaluate(el=>{const card=el.getBoundingClientRect(),art=el.querySelector('canvas').getBoundingClientRect();return{cardWidth:card.width,artWidth:art.width,ratio:art.height/art.width};});assert(geometry.artWidth<geometry.cardWidth);assert(Math.abs(geometry.ratio-340/256)<.03,'Thumbnail stretched or clipped');
  await page.screenshot({path:out+'/comparison-'+width+'.png'});
  await page.locator('.flower-test-card').last().scrollIntoViewIfNeeded();assert(await page.locator('.flower-test-card').last().isVisible());
  await page.locator('#flowerTestPage').evaluate(el=>el.scrollTop=0);
 }
 await page.setViewportSize({width:393,height:852});await page.click('#flowerTestNew');
 await page.waitForFunction(()=>document.querySelectorAll('.flower-test-card[data-ready="true"]').length===100,{},{timeout:180000});
 const next=await page.locator('.flower-test-card').evaluateAll(els=>els.map(el=>el.dataset.seed));assert(next.every(seed=>!cards.some(c=>c.seed===seed)));
 assert.deepEqual(await snapshot(page),before);
 // Restart while rendering and then close: pending work must not resurrect the page.
 await page.click('#flowerTestNew');await page.click('#flowerTestClose');await page.waitForTimeout(300);
 assert(await page.locator('#flowerTestPage').isHidden());assert.equal(await page.locator('.flower-test-card').count(),0);assert.deepEqual(await snapshot(page),before);
 await page.click('#devToggle');await page.click('#devFlowerSheet');await page.keyboard.press('Escape');await page.waitForTimeout(200);assert(await page.locator('#flowerTestPage').isHidden());assert.equal(await page.locator('.flower-test-card').count(),0);
 assert.equal(errors.length,0,errors.join('\n'));console.log('V104 passed: 100 unique variants, all cultivars and care profiles, 100 new seeds, responsive grid, scrolling, cancellation and unchanged game state.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
