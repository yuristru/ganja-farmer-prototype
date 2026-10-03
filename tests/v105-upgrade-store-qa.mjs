import assert from 'node:assert/strict';
import fs from 'node:fs';import http from 'node:http';import path from 'node:path';
import {chromium} from 'playwright';
const root=process.cwd(),out='qa/v105';fs.mkdirSync(out,{recursive:true});
const hook=`window.__storeQA={state:()=>JSON.parse(JSON.stringify(gameState)),categories:UPGRADE_CATEGORIES,select:(id,level)=>{gameState.progression.levels[id]=level;selectedUpgradeCategory=id;renderMetaPanels();}};`;
const server=http.createServer((req,res)=>{const file=path.resolve(root,req.url.split('?')[0]==='/'?'index.html':'.'+req.url.split('?')[0]);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}if(file.endsWith('index.html'))data=Buffer.from(data.toString().replace('resize();\n})();','resize();\n'+hook+'\n})();'));res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':'application/octet-stream');res.end(data);});});
await new Promise(r=>server.listen(4205,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:3}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:4205/',{waitUntil:'networkidle'});await page.click('[data-ui-tab="upgrades"]');await page.waitForFunction(()=>document.querySelectorAll('#upgradeGrid canvas.ready').length===6);
 assert.equal(await page.locator('#upgradeGrid [data-eq2d]').count(),0,'Legacy atlas sprites still in store');
 await page.screenshot({path:out+'/overview-393.png'});
 const cats=await page.evaluate(()=>Object.entries(window.__storeQA.categories).map(([id,c])=>({id,max:c.names.length})));let tiers=0;
 for(const {id,max} of cats)for(let level=1;level<=max;level++){
  await page.evaluate(({id,level})=>window.__storeQA.select(id,level),{id,level});
  if(id!=='pot')await page.waitForFunction(()=>[...document.querySelectorAll('#upgradeGrid canvas')].every(c=>c.classList.contains('ready')));
  const art=await page.locator('#upgradeGrid canvas').evaluateAll(els=>els.map(c=>{const rect=c.getBoundingClientRect(),pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let count=0,edge=0;for(let i=0;i<pixels.length/4;i++)if(pixels[i*4+3]>16){count++;const x=i%c.width,y=Math.floor(i/c.width);if(x===0||y===0||x===c.width-1||y===c.height-1)edge++;}return{id:c.dataset.storeEq||c.dataset.eq3d,count,edge,canvasRatio:c.width/c.height,cssRatio:rect.width/rect.height,source:c.dataset.sourceRect?.split(',').map(Number),draw:c.dataset.drawRect?.split(',').map(Number)};}));
  for(const c of art){assert(c.count>300,JSON.stringify({id,level,...c}));assert.equal(c.edge,0,'Clipped '+id+' '+level);assert(Math.abs(c.canvasRatio-c.cssRatio)<.015,'Stretched canvas '+id);if(c.source)assert(Math.abs(c.source[2]/c.source[3]-c.draw[2]/c.draw[3])<.001,'Stretched source '+id);}
  if(level===1||level===max)await page.screenshot({path:out+'/'+id+'-'+level+'.png'});tiers++;
 }
 assert.equal(tiers,60);
 for(const width of [320,393,430]){
  await page.setViewportSize({width,height:Math.round(width*852/393)});await page.evaluate(()=>window.__storeQA.select(null,1));await page.waitForFunction(()=>document.querySelectorAll('#upgradeGrid canvas.ready').length===6);
  await page.screenshot({path:out+'/overview-'+width+'.png'});
  assert.equal(await page.locator('#upgradeGrid').evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
  for(const {id} of cats){await page.evaluate(id=>window.__storeQA.select(id,1),id);if(id!=='pot')await page.waitForFunction(()=>[...document.querySelectorAll('#upgradeGrid canvas')].every(c=>c.classList.contains('ready')));const clipped=await page.locator('.upgrade-compare-v74').evaluate(el=>el.scrollWidth>el.clientWidth+1);assert(!clipped,id+' detail overflow');}
 }
 // Exercise the actual purchase and return to overview using normal controls.
 await page.evaluate(()=>window.__storeQA.select('light',1));await page.waitForFunction(()=>[...document.querySelectorAll('#upgradeGrid canvas')].every(c=>c.classList.contains('ready')));
 const before=await page.evaluate(()=>window.__storeQA.state());await page.click('[data-buy-level="2"]');const after=await page.evaluate(()=>window.__storeQA.state());assert.equal(after.progression.levels.light,2);assert.equal(before.coins-after.coins,80);await page.click('#upgradeBack');assert.equal(await page.locator('[data-upgrade-category="light"] [data-eq-level]').getAttribute('data-eq-level'),'2');
 await page.setViewportSize({width:393,height:852});await page.waitForTimeout(150);const potRatio=await page.locator('#upgradeGrid canvas[data-eq3d]').evaluate(c=>Math.abs(c.width/c.height-c.getBoundingClientRect().width/c.getBoundingClientRect().height));assert(potRatio<.015,'Pot stretched after resize');
 assert.equal(errors.length,0,errors.join('\n'));console.log('V105 passed: all 60 tiers, isolated artwork, aspect ratios, clear borders, seven categories at three mobile sizes and genuine upgrade purchase.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
