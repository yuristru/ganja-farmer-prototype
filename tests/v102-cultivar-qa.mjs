import assert from 'node:assert/strict';
import fs from 'node:fs';import http from 'node:http';import path from 'node:path';import crypto from 'node:crypto';
import {chromium} from 'playwright';
import '../assets/cultivars.js';
const catalog=globalThis.GanjariumCultivars,ids=Object.keys(catalog.catalog),out='qa/v102';fs.mkdirSync(out,{recursive:true});
assert.equal(ids.length,15);assert.equal(catalog.phenotypeCount,60);
assert.equal(new Set(Object.values(catalog.phenotypes).flat()).size,60);
assert.equal(new Set(Object.values(catalog.catalog).map(g=>JSON.stringify(g.profile))).size,15);
for(const pool of Object.values(catalog.packs))assert.equal(pool.length,5);
assert.equal(new Set(Object.values(catalog.packs).flat()).size,15);
const materials=ids.map(id=>{const file=catalog.catalog[id].material;assert(fs.existsSync(file),file);return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');});
assert.equal(new Set(materials).size,15,'Cultivars reuse material sources');
const root=process.cwd();
const hook="window.__cultivarQA={seed:makeSeed,profile:seedGeneticProfile,master:renderCoreBudMaster,roll:generateRandomSeed,state:()=>gameState,save:saveGameState,panels:renderMetaPanels,panel:setMainPanel,mature:(seed)=>{gameState.plant.seed=seed.seed;gameState.plant.day=84;gameState.plant.harvested=false;gameState.genetics={active:seed.genetics,phenotypeSeed:seed.seed,currentSeed:seed};currentDay=84;hydrateTrainingFromGame();resetBioPlant();invalidatePlant();sync();renderMetaPanels();saveGameState();requestRender();}};";
const server=http.createServer((req,res)=>{const file=path.resolve(root,req.url.split('?')[0]==='/'?'index.html':'.'+req.url.split('?')[0]);if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}fs.readFile(file,(e,d)=>{if(e){res.writeHead(404);res.end();return;}if(file.endsWith('index.html'))d=Buffer.from(d.toString().replace('resize();\n})();','resize();\n'+hook+'\n})();'));res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':'application/octet-stream');res.end(d);});});
await new Promise(r=>server.listen(4202,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:2}),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(/flowers\/v10[12]\//.test(r.url()))requests.push(r.url());});
 await page.goto('http://127.0.0.1:4202/',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.GanjariumFlowerArt.loaded);
 assert.equal(requests.length,3,'All 15 materials loaded at startup');
 const profiles=await page.evaluate(()=>{
  const qa=window.__cultivarQA,C=window.GanjariumCultivars,result=[];
  for(const id of Object.keys(C.catalog)){const s=qa.seed(id,50000);s.phenotype='QA';s.traits={};result.push({id,profile:qa.profile(s)});}
  const coverage={};
  for(const [type,pool] of Object.entries(C.packs)){
   const seen=new Set();for(let n=0;n<100;n++){const picked=[];for(let i=0;i<3;i++){const s=qa.roll('common','QA',n*3+i,pool,picked);picked.push(s.genetics);seen.add(s.genetics);}if(new Set(picked).size!==3)throw Error('Duplicate family in '+type);}
   coverage[type]=[...seen];
  }
  return{result,coverage};
 });
 assert.equal(new Set(profiles.result.map(x=>JSON.stringify(x.profile))).size,15);
 for(const [type,seen] of Object.entries(profiles.coverage))assert.deepEqual([...seen].sort(),[...catalog.packs[type]].sort());
 const profile=id=>profiles.result.find(p=>p.id===id).profile;
 assert(profile('solar').stretch>profile('ember').stretch);assert(profile('glacier').resin>profile('forest').resin);
 await page.evaluate(async()=>{await Promise.all(Object.keys(window.GanjariumCultivars.catalog).map(window.GanjariumFlowerArt.load));});
 assert.equal(new Set(requests).size,15);
 const geometry=await page.evaluate(()=>{
  const qa=window.__cultivarQA,results=[];
  for(const id of Object.keys(window.GanjariumCultivars.catalog))for(const compact of [false,true])for(const n of [50000,50001]){
   const s=qa.seed(id,n),c=qa.master(s,compact),w=c.width,h=c.height,d=c.getContext('2d').getImageData(0,0,w,h).data,mask=new Uint8Array(w*h);let total=0,minY=h,maxY=0,hash=2166136261;
   for(let i=0;i<w*h;i++){hash=Math.imul(hash^d[i*4+3],16777619);if(d[i*4+3]>16){mask[i]=1;total++;minY=Math.min(minY,Math.floor(i/w));maxY=Math.max(maxY,Math.floor(i/w));}}
   let gaps=0;for(let y=minY;y<=maxY;y++){let row=false;for(let x=0;x<w;x++)if(mask[y*w+x]){row=true;break;}if(!row)gaps++;}
   let largest=0;const seen=new Uint8Array(w*h),stack=[];
   for(let i=0;i<w*h;i++)if(mask[i]&&!seen[i]){let count=0;stack.push(i);seen[i]=1;while(stack.length){const at=stack.pop(),x=at%w,y=Math.floor(at/w);count++;for(let yy=Math.max(0,y-1);yy<=Math.min(h-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(w-1,x+1);xx++){const next=yy*w+xx;if(mask[next]&&!seen[next]){seen[next]=1;stack.push(next);}}}largest=Math.max(largest,count);}
   const repeated=qa.master(s,compact);results.push({id,seed:n,compact,w,h,gaps,connected:largest/total,hash:hash>>>0,deterministic:c.toDataURL()===repeated.toDataURL()});
  }return results;
 });
 for(const g of geometry){assert(g.w>100&&g.h>100);assert.equal(g.gaps,0,JSON.stringify(g));assert(g.connected>.98,JSON.stringify(g));assert(g.deterministic);}
 for(const id of ids)assert.notEqual(geometry.find(g=>g.id===id&&!g.compact&&g.seed===50000).hash,geometry.find(g=>g.id===id&&!g.compact&&g.seed===50001).hash);
 await page.setViewportSize({width:1200,height:1050});
 await page.evaluate(()=>{
  const sheet=document.createElement('div');sheet.id='cultivarSheet';sheet.style='position:fixed;inset:0;z-index:9999;background:#092219;display:grid;grid-template-columns:repeat(5,1fr);gap:10px;padding:12px';
  for(const g of Object.values(window.GanjariumCultivars.catalog)){const art=window.__cultivarQA.master(window.__cultivarQA.seed(g.id,50000)),card=document.createElement('div'),c=document.createElement('canvas');c.width=360;c.height=460;c.style='width:100%!important;height:280px!important;object-fit:contain';const scale=Math.min(325/art.width,430/art.height);c.getContext('2d').drawImage(art,(360-art.width*scale)/2,(460-art.height*scale)/2,art.width*scale,art.height*scale);card.append(c);const label=document.createElement('p');label.textContent=g.name;label.style='font:14px system-ui;color:#d7ebc6;text-align:center';card.append(label);sheet.append(card);}document.body.append(sheet);
 });
 await page.screenshot({path:out+'/cultivar-contact-sheet.png'});await page.evaluate(()=>document.getElementById('cultivarSheet').remove());
 await page.setViewportSize({width:393,height:852});await page.click('[data-ui-tab="genetics"]');assert.equal(await page.locator('[data-cultivar]').count(),15);
 for(const width of [320,393,430]){
  await page.setViewportSize({width,height:Math.round(width*852/393)});await page.locator('[data-cultivar="dream"]').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/catalog-'+width+'.png'});
  const overflow=await page.locator('.cultivar-catalog').evaluate(el=>el.scrollWidth>el.clientWidth+1);assert(!overflow,'Catalog overflows at '+width);
 }
 await page.setViewportSize({width:393,height:852});
 await page.evaluate(()=>{const q=window.__cultivarQA,st=q.state();st.coins=10000;st.meta.completedGrows=3;q.save();q.panels();});
 await page.click('[data-ui-tab="collection"]');
 const packs=[];
 for(const type of ['starter','genetics','exotic']){
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('gf_mobile_game_v1')));
  await page.click('[data-collection-pack="'+type+'"]');
  const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('gf_mobile_game_v1'))),seeds=after.seedVault.inventory.slice(0,3);
  assert.equal(after.seedVault.inventory.length,before.seedVault.inventory.length+3);assert.equal(new Set(seeds.map(s=>s.genetics)).size,3);
  for(const s of seeds)assert(catalog.packs[type].includes(s.genetics));
  assert.equal(before.coins-after.coins,{starter:150,genetics:450,exotic:900}[type]);
  if(type==='genetics')assert.equal(seeds[0].rarity,'rare');if(type==='exotic')assert.equal(seeds[0].rarity,'epic');
  packs.push({type,seeds});await page.click('.collection-pack-close');
 }
 // A new exotic cultivar completes the real harvest and persists after reload.
 await page.evaluate(()=>{const q=window.__cultivarQA;q.mature(q.seed('glacier',535353,'epic','QA'));q.panel('care');});
 await page.click('#harvestReadyBox');await page.screenshot({path:out+'/glacier-harvest.png'});
 await page.click('#harvestToJar');await page.screenshot({path:out+'/glacier-jar.png'});await page.click('#harvestFinish');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('gf_mobile_game_v1'))),jar=saved.collection[0];assert.equal(jar.genetics,'glacier');assert(jar.flowerQuality);
 await page.reload({waitUntil:'networkidle'});
 const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('gf_mobile_game_v1')));assert.deepEqual(restored.collection[0],jar);assert.deepEqual(restored.seedVault.inventory,saved.seedVault.inventory);
 const nextSeed=packs.find(p=>p.type==='exotic').seeds[0];
 await page.click('[data-ui-tab="collection"]');await page.click('[data-plant-seed="'+nextSeed.id+'"]');
 const next=await page.evaluate(()=>JSON.parse(localStorage.getItem('gf_mobile_game_v1')));
 assert.equal(next.plant.day,1);assert.equal(next.genetics.active,nextSeed.genetics);assert.equal(next.genetics.currentSeed.id,nextSeed.id);
 assert(!next.seedVault.inventory.some(s=>s.id===nextSeed.id));assert.deepEqual(next.collection[0],jar);assert.equal(next.coins,restored.coins);
 assert.equal(next.rhythm.used,restored.rhythm.used);assert.equal(next.rhythm.closed,restored.rhythm.closed);
 assert.equal(errors.length,0,errors.join('\n'));fs.writeFileSync(out+'/results.json',JSON.stringify({profiles,geometry,packs,errors},null,2));
 console.log('PASS: 15 unique materials/profiles, 60 connected flowers, all pack pools, lazy loading and new cultivar harvest persistence');
}finally{await browser?.close();server.close();}
