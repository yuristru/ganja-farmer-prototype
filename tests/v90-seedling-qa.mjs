import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd(),outDir=path.join(root,'qa','v90-seedling');
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
await new Promise(r=>server.listen(4177,'127.0.0.1',r));

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:1});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(String(e)));
const url='http://127.0.0.1:4177/',key='gf_mobile_game_v1';
await page.goto(url,{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__GFSEEDLING&&window.__GFTRAIN);
await page.waitForTimeout(250);

const results={assertions:{},days:{},variation:{}};
async function snap(day,name){
  await page.evaluate(d=>window.__GFTRAIN.setDay(d),day);
  await page.waitForTimeout(140);
  const s=await page.evaluate(()=>window.__GFSEEDLING.snapshot());
  const prune=page.locator('[data-mobile-tool="prune"]'),bend=page.locator('[data-mobile-tool="bend"]');
  results.days[day]={
    ...s,
    pruneLocked:await prune.evaluate(el=>el.classList.contains('seedling-locked')),
    bendLocked:await bend.evaluate(el=>el.classList.contains('seedling-locked')),
    pruneAria:await prune.getAttribute('aria-disabled')
  };
  await page.screenshot({path:path.join(outDir,name),fullPage:false});
  return s;
}

const d1=await snap(1,'01-day1-emergence.png');
const d2=await snap(2,'02-day2-cotyledons.png');
const d3=await snap(3,'03-day3-true-leaves.png');
const d4=await snap(4,'04-day4-normal-growth.png');

results.assertions.stageNames=d1.name==='emergence'&&d2.name==='cotyledons_open'&&d3.name==='first_true_leaves';
results.assertions.day123Active=d1.active&&d2.active&&d3.active;
results.assertions.day4Normal=!d4.active&&d4.trainingUnlocked;
results.assertions.visualProgression=d1.height<d2.height&&d2.height<d3.height&&d1.trueLeafScale===0&&d2.trueLeafScale>0&&d3.trueLeafScale>d2.trueLeafScale;
results.assertions.trainingLocked123=[1,2,3].every(d=>results.days[d].pruneLocked&&results.days[d].bendLocked&&results.days[d].pruneAria==='true');
results.assertions.trainingUnlocked4=!results.days[4].pruneLocked&&!results.days[4].bendLocked&&results.days[4].pruneAria==='false';

// Clicking a locked tool must not activate training.
await page.evaluate(()=>window.__GFTRAIN.setDay(1));
await page.locator('[data-mobile-tool="prune"]').dispatchEvent('click');
await page.waitForTimeout(80);
results.assertions.lockedToolCannotActivate=await page.locator('[data-mobile-tool="orbit"]').evaluate(el=>el.classList.contains('active')) &&
  !(await page.locator('[data-mobile-tool="prune"]').evaluate(el=>el.classList.contains('active')));

// Day 4 must permit the training tool again.
await page.evaluate(()=>window.__GFTRAIN.setDay(4));
await page.click('[data-mobile-tool="prune"]');
await page.waitForTimeout(80);
results.assertions.day4ToolActivates=await page.locator('[data-mobile-tool="prune"]').evaluate(el=>el.classList.contains('active'));

// Persist Day 2 through the game's real TAG-✓ path and verify reload.
await page.evaluate(()=>window.__GFTRAIN.setDay(1));
await page.click('#adminDaySkip');
await page.waitForTimeout(100);
await page.reload({waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__GFSEEDLING);
await page.waitForTimeout(120);
const reload=await page.evaluate(()=>window.__GFSEEDLING.snapshot());
results.reload=reload;
results.assertions.reloadDay2=reload.active&&reload.day===2&&reload.name==='cotyledons_open';

// Deterministic seed variation without mutating the live save.
const v1=await page.evaluate(()=>window.__GFSEEDLING.variant());
const v1b=await page.evaluate(()=>window.__GFSEEDLING.variant());
results.assertions.variantDeterministic=JSON.stringify(v1)===JSON.stringify(v1b);
const v2=await page.evaluate(seed=>window.__GFSEEDLING.variantForSeed(seed),v1.seed+17011);
results.variation={original:v1,changed:v2};
results.assertions.variantChangesWithSeed=
  v1.seed!==v2.seed&&(
    Math.abs(v1.heightScale-v2.heightScale)>.001 ||
    Math.abs(v1.spread-v2.spread)>.001 ||
    Math.abs(v1.lean-v2.lean)>.001 ||
    v1.shell!==v2.shell
  );

results.assertions.noBrowserErrors=errors.length===0;
results.pass=Object.values(results.assertions).every(Boolean);
fs.writeFileSync(path.join(outDir,'results.json'),JSON.stringify(results,null,2));
fs.writeFileSync(path.join(outDir,'summary.txt'),[
  'GANJARIUM V90 SEEDLING INTRO QA',
  '',
  `Day 1: ${d1.name}, height ${d1.height.toFixed(1)}`,
  `Day 2: ${d2.name}, height ${d2.height.toFixed(1)}`,
  `Day 3: ${d3.name}, height ${d3.height.toFixed(1)}`,
  `Day 4 intro active: ${d4.active}`,
  `Training locked 1-3 / unlocked 4: ${results.assertions.trainingLocked123} / ${results.assertions.trainingUnlocked4}`,
  `PASS: ${results.pass}`
].join('\n'));
console.log(JSON.stringify(results,null,2));
if(!results.pass)process.exitCode=1;

await context.close();await browser.close();await new Promise(r=>server.close(r));
