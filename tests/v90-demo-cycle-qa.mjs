import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd(),outDir=path.join(root,'qa','v90-demo-cycle');
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
await new Promise(r=>server.listen(4184,'127.0.0.1',r));

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:1});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(String(e)));
await page.goto('http://127.0.0.1:4184/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__GFDEVSHAPE&&window.__GFDEMOCARE);
await page.evaluate(()=>window.__GFDEVSHAPE.load('natural'));
await page.waitForTimeout(180);

const targets=await page.evaluate(()=>window.__GFDEMOCARE.targets());
const first=await page.evaluate(()=>window.__GFDEMOCARE.snapshot());
const days=[];

for(let expected=37;expected<=84;expected++){
  await page.locator('#adminDaySkip').click();
  await page.waitForFunction(d=>window.__GFDEMOCARE.snapshot().day===d,expected);
  const s=await page.evaluate(()=>window.__GFDEMOCARE.snapshot());
  days.push(s);
  if(expected===50||expected===70||expected===84){
    await page.screenshot({path:path.join(outDir,`day-${expected}.png`),fullPage:false});
  }
}

const close=(a,b)=>Math.abs(Number(a)-Number(b))<1e-9;
const results={
  first,targets,days,
  assertions:{
    startsDay36:first.day===36,
    autoCareEnabled:first.autoCare===true,
    startsRefilled:close(first.water,targets.water)&&close(first.nutrients,targets.nutrients)&&close(first.ventilation,targets.ventilation),
    reachedHarvestDay:days.at(-1)?.day===84,
    everySkippedDayRefilled:days.every(s=>close(s.water,targets.water)&&close(s.nutrients,targets.nutrients)&&close(s.ventilation,targets.ventilation)),
    turnsResetEachDay:days.every(s=>s.turnsToday===0),
    cooldownResetEachDay:days.every(s=>s.lastTurnAt===0),
    harvestVisible:await page.locator('#harvestReadyBox').isVisible(),
    noBrowserErrors:errors.length===0
  }
};
results.pass=Object.values(results.assertions).every(Boolean);

fs.writeFileSync(path.join(outDir,'results.json'),JSON.stringify(results,null,2));
fs.writeFileSync(path.join(outDir,'summary.txt'),[
  'GANJARIUM V90 DEMO CYCLE QA',
  '',
  `Start: day ${first.day}`,
  `End: day ${days.at(-1)?.day}`,
  `Skipped days: ${days.length}`,
  `Targets: water ${targets.water}, nutrients ${targets.nutrients}, ventilation ${targets.ventilation}`,
  `Every day refilled: ${results.assertions.everySkippedDayRefilled}`,
  `PASS: ${results.pass}`
].join('\n'));
console.log(JSON.stringify(results,null,2));
if(!results.pass)process.exitCode=1;

await context.close();await browser.close();await new Promise(r=>server.close(r));
