import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd(),outDir=path.join(root,'qa','v90-pot-soil');
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
await new Promise(r=>server.listen(4180,'127.0.0.1',r));

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:1});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(String(e)));
await page.goto('http://127.0.0.1:4180/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__GFCAMERA&&window.__GFPOT);
await page.evaluate(()=>window.__GFTRAIN?.setDay?.(18));
await page.waitForTimeout(300);

await page.evaluate(()=>window.__GFCAMERA.set({yaw:0,pitch:.16,zoom:1,panX:0,panY:0}));
await page.waitForTimeout(180);
const before=await page.evaluate(()=>({cam:window.__GFCAMERA.snapshot(),soil:window.__GFPOT.soilProbe()}));
await page.screenshot({path:path.join(outDir,'soil-yaw-0.png'),fullPage:false});

await page.evaluate(()=>window.__GFCAMERA.set({yaw:1.05,pitch:.16,zoom:1,panX:0,panY:0}));
await page.waitForTimeout(180);
const after=await page.evaluate(()=>({cam:window.__GFCAMERA.snapshot(),soil:window.__GFPOT.soilProbe()}));
await page.screenshot({path:path.join(outDir,'soil-yaw-60deg.png'),fullPage:false});

const deltas=before.soil.map((p,i)=>{
  const q=after.soil[i];
  return{
    index:i,
    worldStable:Math.abs(p.world.x-q.world.x)<1e-9&&Math.abs(p.world.y-q.world.y)<1e-9&&Math.abs(p.world.z-q.world.z)<1e-9,
    screenDelta:Math.hypot(p.screen.x-q.screen.x,p.screen.y-q.screen.y),
    before:p.screen,
    after:q.screen
  };
});
const results={
  before,after,deltas,
  assertions:{
    yawChanged:Math.abs(after.cam.yaw-before.cam.yaw)>.9,
    soilWorldCoordinatesStable:deltas.every(d=>d.worldStable),
    soilProjectionRotates:deltas.every(d=>d.screenDelta>8),
    soilPointsRotateDifferently:new Set(deltas.map(d=>Math.round(d.screenDelta))).size>1,
    noBrowserErrors:errors.length===0
  }
};
results.pass=Object.values(results.assertions).every(Boolean);
fs.writeFileSync(path.join(outDir,'results.json'),JSON.stringify(results,null,2));
fs.writeFileSync(path.join(outDir,'summary.txt'),[
  'GANJARIUM V90 POT SOIL ROTATION QA',
  '',
  `Yaw: ${before.cam.yaw.toFixed(2)} -> ${after.cam.yaw.toFixed(2)}`,
  `Probe screen deltas: ${deltas.map(d=>d.screenDelta.toFixed(1)).join(', ')} px`,
  `World coordinates stable: ${results.assertions.soilWorldCoordinatesStable}`,
  `Projected positions rotate: ${results.assertions.soilProjectionRotates}`,
  `PASS: ${results.pass}`
].join('\n'));
console.log(JSON.stringify(results,null,2));
if(!results.pass)process.exitCode=1;

await context.close();await browser.close();await new Promise(r=>server.close(r));
