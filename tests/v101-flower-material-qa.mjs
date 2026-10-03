import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';import http from 'node:http';import path from 'node:path';
const root=process.cwd(),out='qa/v101';fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{let file=path.resolve(root,req.url.split('?')[0]==='/'?'index.html':'.'+req.url.split('?')[0]);if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}fs.readFile(file,(e,d)=>{if(e){res.writeHead(404);res.end();return;}if(file.endsWith('index.html'))d=Buffer.from(d.toString().replace('resize();\n})();','resize();\nwindow.__artQA={master:renderCoreBudMaster,seed:makeSeed};\n})();'));res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':'application/octet-stream');res.end(d);});});
await new Promise(r=>server.listen(4201,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:3});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:4201/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.GanjariumFlowerArt.loaded);
 const geometry=await page.evaluate(()=>{
  const results=[];
  for(const compact of [false,true])for(const genetics of ['dream','violet','comet'])for(const density of [-9,0,9])for(const n of [16317,20577,36005]){
   const seed=window.__artQA.seed(genetics,n,'common','QA');seed.traits.density=density;
   const c=window.__artQA.master(seed,compact),{width:w,height:h}=c,data=c.getContext('2d').getImageData(0,0,w,h).data;
   const mask=new Uint8Array(w*h);let total=0,minY=h,maxY=0;
   for(let i=0;i<w*h;i++)if(data[i*4+3]>16){mask[i]=1;total++;minY=Math.min(minY,Math.floor(i/w));maxY=Math.max(maxY,Math.floor(i/w));}
   let gaps=0;for(let y=minY;y<=maxY;y++){let occupied=false;for(let x=0;x<w;x++)if(mask[y*w+x]){occupied=true;break;}if(!occupied)gaps++;}
   let largest=0;const seen=new Uint8Array(w*h),stack=[];
   for(let i=0;i<w*h;i++)if(mask[i]&&!seen[i]){let count=0;stack.push(i);seen[i]=1;while(stack.length){const at=stack.pop(),x=at%w,y=Math.floor(at/w);count++;for(let yy=Math.max(0,y-1);yy<=Math.min(h-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(w-1,x+1);xx++){const next=yy*w+xx;if(mask[next]&&!seen[next]){seen[next]=1;stack.push(next);}}}largest=Math.max(largest,count);}
   results.push({compact,genetics,density,seed:n,gaps,connected:largest/total,w,h});
  }return results;
 });
 for(const r of geometry){assert.equal(r.gaps,0,'Detached tip: '+JSON.stringify(r));assert(r.connected>.98,'Disconnected flower mass: '+JSON.stringify(r));}
 const diversity=await page.evaluate(()=>{
  const samples=[];
  for(let i=0;i<12;i++){
   const seed=window.__artQA.seed('dream',50000+i,'common','QA');
   const c=window.__artQA.master(seed),data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   let hash=2166136261;for(let n=0;n<data.length;n+=4)hash=Math.imul(hash^data[n+3],16777619);
   samples.push({seed:seed.seed,hash:hash>>>0,w:c.width,h:c.height});
  }
  const seed=window.__artQA.seed('dream',50000,'common','QA');
  const a=window.__artQA.master(seed).toDataURL(),b=window.__artQA.master(seed).toDataURL();
  seed.harvestArt={density:.5,resin:.2};const poor=window.__artQA.master(seed).toDataURL();
  seed.harvestArt={density:1.1,resin:1};const rich=window.__artQA.master(seed).toDataURL();
  return {samples,deterministic:a===b,conditionChangesArt:poor!==rich};
 });
 assert.equal(new Set(diversity.samples.map(s=>s.hash)).size,12,'Different seeds repeat the same geometry');
 assert.equal(new Set(diversity.samples.map(s=>s.w+':'+s.h)).size,12,'Different seeds repeat the same proportions');
 assert(diversity.deterministic,'Same seed changes on redraw');
 assert(diversity.conditionChangesArt,'Actual harvest condition is ignored');
 fs.writeFileSync(out+'/diversity.json',JSON.stringify(diversity,null,2));
 await page.setViewportSize({width:800,height:650});
 await page.evaluate(()=>{
  const sheet=document.createElement('div');sheet.id='artSheet';sheet.style='position:fixed;inset:0;z-index:9999;background:#092219;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:12px';
  for(let i=0;i<8;i++){const seed=window.__artQA.seed('dream',50000+i,'common','QA'),art=window.__artQA.master(seed),card=document.createElement('div'),c=document.createElement('canvas');c.width=360;c.height=520;c.style='width:100%!important;height:275px!important;object-fit:contain';const x=c.getContext('2d'),scale=Math.min(320/art.width,470/art.height);x.drawImage(art,(360-art.width*scale)/2,(520-art.height*scale)/2,art.width*scale,art.height*scale);card.append(c);const label=document.createElement('p');label.textContent='Seed '+seed.seed;label.style='color:#d5e8c5;text-align:center;margin:0;font:14px system-ui';card.append(label);sheet.append(card);}document.body.append(sheet);
 });
 await page.screenshot({path:out+'/seed-diversity.png'});
 await page.evaluate(()=>document.getElementById('artSheet').remove());
 // Load a mature violet harvest without modifying the player's real save.
 const base=await page.evaluate(()=>JSON.parse(localStorage.getItem('gf_mobile_game_v1')));
 await context.close();
 const visual=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:3});
 base.plant.day=84;base.plant.seed=16317;base.genetics.active='violet';base.genetics.phenotypeSeed=16317;
 base.genetics.currentSeed={...base.genetics.currentSeed,genetics:'violet',seed:16317,traits:{density:6,potency:7,style:8},id:'qa-violet'};
 await visual.addInitScript(s=>localStorage.setItem('gf_mobile_game_v1',JSON.stringify(s)),base);
 const vp=await visual.newPage();vp.on('pageerror',e=>errors.push(String(e)));await vp.goto('http://127.0.0.1:4201/',{waitUntil:'networkidle'});
 await vp.click('#harvestReadyBox');await vp.screenshot({path:out+'/violet-bud.png'});
 await vp.click('#harvestToJar');await vp.screenshot({path:out+'/violet-jar.png'});
 const firstPile=await vp.locator('#jarBuds canvas').evaluate(c=>c.toDataURL());
 await vp.click('#harvestResultClose');await vp.click('#harvestReadyBox');await vp.click('#harvestToJar');
 assert.equal(await vp.locator('#jarBuds canvas').evaluate(c=>c.toDataURL()),firstPile,'Jar arrangement changes when reopening');
  await vp.click('#harvestFinish');await vp.waitForTimeout(1800);await vp.screenshot({path:out+'/collection.png'});
 for(const size of [{width:320,height:693},{width:430,height:932}]){await vp.setViewportSize(size);await vp.screenshot({path:out+'/collection-'+size.width+'.png'});}
 assert.equal(errors.length,0,errors.join('\n'));fs.writeFileSync(out+'/results.json',JSON.stringify({geometry,errors},null,2));console.log('PASS: 54 connected flowers, 12 distinct silhouettes, deterministic redraw and three mobile sizes');
}finally{await browser?.close();server.close();}
