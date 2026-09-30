import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd(),outDir=path.join(root,'qa','v90-day36-shapes');
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
await new Promise(r=>server.listen(4183,'127.0.0.1',r));

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:1});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(String(e)));
await page.goto('http://127.0.0.1:4183/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__GFQUICKPLANT&&window.__GFDEVSHAPE&&window.__GFSTEM);
await page.evaluate(()=>window.__GFDEVSHAPE.load('natural'));
await page.waitForTimeout(250);

const results={natural:[],bushy:[],presets:{},assertions:{}};
const salts=[10101,20202,30303,40404,50505,60606,70707,80808,90909,100010];

for(let i=0;i<salts.length;i++){
  const info=await page.evaluate(s=>window.__GFQUICKPLANT.generate(s),salts[i]);
  await page.waitForTimeout(180);
  const stem=await page.evaluate(()=>window.__GFSTEM.snapshot());
  const snap=await page.evaluate(()=>window.__GFQUICKPLANT.snapshot());
  results.natural.push({index:i+1,salt:salts[i],info,snapshot:snap,stem});
  await page.screenshot({path:path.join(outDir,`natural-${String(i+1).padStart(2,'0')}.png`),fullPage:false});
}

// Exercise the bushy/topped crown across multiple deterministic seeds, not just
// the single preset screenshot. This catches horizontal T-shaped leaders and
// disconnected branch origins that can be seed-specific.
await page.evaluate(()=>window.__GFDEVSHAPE.load('bushy'));
await page.waitForTimeout(160);
for(let i=0;i<salts.length;i++){
  await page.evaluate(s=>window.__GFQUICKPLANT.generate(s),salts[i]);
  await page.waitForTimeout(180);
  const snap=await page.evaluate(()=>window.__GFQUICKPLANT.snapshot());
  const training=await page.evaluate(()=>window.__GFTRAIN.getState());
  results.bushy.push({index:i+1,salt:salts[i],snapshot:snap,training});
  await page.screenshot({path:path.join(outDir,`bushy-${String(i+1).padStart(2,'0')}.png`),fullPage:false});
}

// Same deterministic plant base across all three demo forms.
for(const preset of ['natural','narrow','bushy']){
  await page.evaluate(p=>window.__GFDEVSHAPE.load(p),preset);
  await page.waitForTimeout(120);
  await page.evaluate(()=>window.__GFQUICKPLANT.generate(424242));
  await page.waitForTimeout(220);
  results.presets[preset]={
    snapshot:await page.evaluate(()=>window.__GFQUICKPLANT.snapshot()),
    stem:await page.evaluate(()=>window.__GFSTEM.snapshot()),
    training:await page.evaluate(()=>window.__GFTRAIN.getState())
  };
  await page.screenshot({path:path.join(outDir,`preset-${preset}.png`),fullPage:false});
}

const p=results.presets;
const curvatureRatios=results.natural.map(x=>x.stem?.height?x.stem.maxDeviation/x.stem.height:0);
const habitModes=results.natural.map(x=>x.stem?.habit?.mode).filter(Boolean);
const onsetDays=results.natural.map(x=>Number(x.stem?.habit?.onsetDay)).filter(Number.isFinite);
results.assertions={
  tenDifferentSeeds:new Set(results.natural.map(x=>x.snapshot.seed)).size===10,
  allDay36:results.natural.every(x=>x.snapshot.day===36),
  allNaturalPreset:results.natural.every(x=>x.snapshot.shapePreset==='natural'),
  narrowActuallyNarrower:p.narrow.snapshot.metrics.radial<p.natural.snapshot.metrics.radial,
  bushyActuallyWider:(p.bushy.snapshot.metrics.spanX/p.bushy.snapshot.metrics.height)>(p.natural.snapshot.metrics.spanX/p.natural.snapshot.metrics.height)*1.35,
  bushyHasPriorPrune:(p.bushy.training.prunes||[]).length>=1,
  bushyHasNoSyntheticBends:(p.bushy.training.bends||[]).length===0,
  bushyJunctionsConnected:Number(p.bushy.snapshot.metrics.junctionGapMax||0)<.001,
  bushyPromotedLeadersPresent:Number(p.bushy.snapshot.metrics.promotedLeaderCount||0)>=2,
  bushyPromotedLeadersRise:Number(p.bushy.snapshot.metrics.promotedLeaderMinRise||0)>.48,
  bushyVariantsAllDay36:results.bushy.every(x=>x.snapshot.day===36),
  bushyVariantsNoSyntheticBends:results.bushy.every(x=>(x.training.bends||[]).length===0),
  bushyVariantsConnected:results.bushy.every(x=>Number(x.snapshot.metrics.junctionGapMax||0)<.001),
  bushyVariantsHaveTwoLeaders:results.bushy.every(x=>Number(x.snapshot.metrics.promotedLeaderCount||0)>=2),
  bushyVariantsRise:results.bushy.every(x=>Number(x.snapshot.metrics.promotedLeaderMinRise||0)>.48),
  narrowHasNoTopping:(p.narrow.training.prunes||[]).length===0,
  stemCurvatureVaries:new Set(results.natural.map(x=>Math.round((x.stem?.maxDeviation||0)*10))).size>=5,
  stemHabitModesVary:new Set(habitModes).size>=4,
  bendOnsetVaries:onsetDays.length===results.natural.length&&(Math.max(...onsetDays)-Math.min(...onsetDays))>=20,
  hasEarlyAndLateNaturalBends:onsetDays.some(d=>d<=12)&&onsetDays.some(d=>d>=28),
  curvatureIntensityVaries:(Math.max(...curvatureRatios)-Math.min(...curvatureRatios))>=.02,
  noBrowserErrors:errors.length===0
};
results.pass=Object.values(results.assertions).every(Boolean);

fs.writeFileSync(path.join(outDir,'results.json'),JSON.stringify(results,null,2));
fs.writeFileSync(path.join(outDir,'summary.txt'),[
  'GANJARIUM V90 DAY-36 SHAPE QA',
  '',
  'Natural seeds: '+results.natural.map(x=>x.snapshot.seed).join(', '),
  'Natural radial: '+results.presets.natural.snapshot.metrics.radial.toFixed(1),
  'Narrow radial: '+results.presets.narrow.snapshot.metrics.radial.toFixed(1),
  'Bushy radial: '+results.presets.bushy.snapshot.metrics.radial.toFixed(1),
  'Bushy prior prune count: '+results.presets.bushy.training.prunes.length,
  'Bushy synthetic bends: '+results.presets.bushy.training.bends.length,
  'Bushy junction gap max: '+results.presets.bushy.snapshot.metrics.junctionGapMax.toFixed(3),
  'Bushy promoted leader min rise: '+Number(results.presets.bushy.snapshot.metrics.promotedLeaderMinRise||0).toFixed(3),
  'Bushy variant min rises: '+results.bushy.map(x=>Number(x.snapshot.metrics.promotedLeaderMinRise||0).toFixed(3)).join(', '),
  'Natural stem habits: '+habitModes.join(', '),
  'Natural bend onset days: '+onsetDays.join(', '),
  'PASS: '+results.pass
].join('\n'));
console.log(JSON.stringify(results,null,2));
if(!results.pass)process.exitCode=1;

await context.close();await browser.close();await new Promise(r=>server.close(r));
