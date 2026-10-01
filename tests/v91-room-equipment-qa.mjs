import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd(),outDir=path.join(root,'qa','v91-room-equipment');
fs.mkdirSync(outDir,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json'};
const server=http.createServer((req,res)=>{
  const clean=decodeURIComponent((req.url||'/').split('?')[0]);
  const rel=clean==='/'?'index.html':clean.replace(/^\//,'');
  const file=path.join(root,rel);
  if(!file.startsWith(root)){res.writeHead(403);res.end();return;}
  fs.readFile(file,(err,data)=>{
    if(err){res.writeHead(404);res.end('not found');return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});
    res.end(data);
  });
});
await new Promise(r=>server.listen(4191,'127.0.0.1',r));

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:1});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(String(e)));

async function loadLevel(level){
  await page.goto('http://127.0.0.1:4191/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.__GFTRAIN&&window.__GFQUICKPLANT&&window.__GFROOMEQ);
  await page.evaluate(lv=>window.__GFROOMEQ.setLevel(lv),level);
  await page.waitForFunction(lv=>{
    const snap=window.__GFROOMEQ?.snapshot?.();
    return snap&&['substrate','irrigation','sensor','nutrients'].every(id=>snap[id]===lv)
      &&document.querySelectorAll('.room-equipment-overlay.ready').length>=3;
  },level);
  await page.evaluate(()=>window.__GFTRAIN.setDay(36));
  await page.waitForTimeout(450);
  const metrics=await page.evaluate(()=>{
    const out={};
    for(const id of ['substrate','irrigation','sensor']){
      const el=document.querySelector('.room-eq-'+id);
      if(!el){out[id]={missing:true};continue;}
      const r=el.getBoundingClientRect(),ctx=el.getContext('2d'),data=ctx.getImageData(0,0,el.width,el.height).data;
      let alpha=0;for(let i=3;i<data.length;i+=4)if(data[i]>20)alpha++;
      out[id]={x:r.x,y:r.y,w:r.width,h:r.height,alphaPixels:alpha,ready:el.classList.contains('ready')};
    }
    return out;
  });
  await page.screenshot({path:path.join(outDir,`room-level-${level}.png`),fullPage:false});
  return metrics;
}
const results={levels:{},errors};
for(const level of [1,5,10])results.levels[level]=await loadLevel(level);
results.assertions={
  assetsPresent:[1,5,10].every(l=>['substrate','irrigation','sensor'].every(id=>results.levels[l][id]&&!results.levels[l][id].missing)),
  assetsRendered:[1,5,10].every(l=>['substrate','irrigation','sensor'].every(id=>results.levels[l][id].ready&&results.levels[l][id].alphaPixels>5000)),
  substrateLeft:[1,5,10].every(l=>results.levels[l].substrate.x<150),
  irrigationRight:[1,5,10].every(l=>results.levels[l].irrigation.x>250),
  sensorRight:[1,5,10].every(l=>results.levels[l].sensor.x>280),
  noBrowserErrors:errors.length===0
};
results.pass=Object.values(results.assertions).every(Boolean);
fs.writeFileSync(path.join(outDir,'results.json'),JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));
if(!results.pass)process.exitCode=1;
await context.close();await browser.close();await new Promise(r=>server.close(r));
