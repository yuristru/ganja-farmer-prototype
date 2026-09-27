import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd(),outDir=path.join(root,'qa','v90-training-free');
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
await new Promise(r=>server.listen(4178,'127.0.0.1',r));

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:1});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(String(e)));
const url='http://127.0.0.1:4178/',key='gf_mobile_game_v1';

await page.goto(url,{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__GFTRAININGRULES&&window.__GFTRAIN);
const base=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
base.plant.day=30;
base.turn.day=30;
base.turn.turnsToday=7;
base.turn.lastTurnAt=Date.now();
base.turn.lastAction='Pflege';
base.settings.debugBypass=false;
await page.evaluate(({k,s})=>localStorage.setItem(k,JSON.stringify(s)),{k:key,s:base});
await page.reload({waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__GFTRAININGRULES&&window.__GFTRAIN);
await page.evaluate(()=>window.__GFTRAIN.setDay(30));
await page.waitForTimeout(550);

const results={assertions:{},before:{},afterPrune:{},afterDefoliate:{},afterBend:{},ui:{}};
const read=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
results.before=await page.evaluate(()=>window.__GFTRAININGRULES.primeBlockedCareForQA());
await page.waitForTimeout(80);
const beforeState=await read();
const originalLast=beforeState.turn.lastTurnAt;

results.assertions.preconditionFullTurns=results.before.turnsToday===7;
results.assertions.preconditionCooldownActive=Date.now()-results.before.lastTurnAt<60*60*1000;
results.assertions.careBlocked=await page.locator('#waterCard').isDisabled();
results.assertions.freeRuleExposed=(await page.evaluate(()=>window.__GFTRAININGRULES.free))===true;

async function clickableHit(kind,predicate=()=>true){
  return await page.evaluate(({kind})=>{
    const hits=window.__GFTRAIN.getHits()[kind]||[];
    const canvas=document.getElementById('c'),r=canvas.getBoundingClientRect();
    for(const h of hits){
      const x=h.x??h.screen?.[Math.floor((h.screen?.length||1)/2)]?.x;
      const y=h.y??h.screen?.[Math.floor((h.screen?.length||1)/2)]?.y;
      if(!Number.isFinite(x)||!Number.isFinite(y))continue;
      const el=document.elementFromPoint(r.left+x,r.top+y);
      if(el===canvas||canvas.contains(el))return h;
    }
    return hits[0]||null;
  },{kind});
}
async function clickCanvasPoint(x,y){
  const b=await page.locator('#c').boundingBox();
  await page.mouse.click(b.x+x,b.y+y);
}

// 1) Pruning while care is at 7/7 and on cooldown.
await page.click('[data-mobile-tool="prune"]');
await page.click('[data-prune-target="shoot"]');
await page.waitForTimeout(100);
const node=await clickableHit('nodes');
if(!node)throw new Error('No pruning hit target found at day 30');
await clickCanvasPoint(node.x,node.y);
await page.waitForTimeout(120);
const pruneState=await read();
results.afterPrune={
  turnsToday:pruneState.turn.turnsToday,lastTurnAt:pruneState.turn.lastTurnAt,
  pruneCount:pruneState.training?.prunes?.length||0
};
results.assertions.pruneWorked=results.afterPrune.pruneCount>=1;
results.assertions.pruneDidNotConsumeTurn=results.afterPrune.turnsToday===7;
results.assertions.pruneDidNotStartWait=results.afterPrune.lastTurnAt===originalLast;

// 2) Defoliation under the exact same blocked-care state.
await page.click('[data-mobile-tool="prune"]');
await page.click('[data-prune-target="leaf"]');
await page.waitForTimeout(100);
const leaf=await clickableHit('leaves');
if(!leaf)throw new Error('No defoliation hit target found at day 30');
await clickCanvasPoint(leaf.x,leaf.y);
await page.waitForTimeout(120);
const defState=await read();
results.afterDefoliate={
  turnsToday:defState.turn.turnsToday,lastTurnAt:defState.turn.lastTurnAt,
  defoliations:defState.training?.defoliations?.length||0
};
results.assertions.defoliationWorked=results.afterDefoliate.defoliations>=1;
results.assertions.defoliationDidNotConsumeTurn=results.afterDefoliate.turnsToday===7;
results.assertions.defoliationDidNotStartWait=results.afterDefoliate.lastTurnAt===originalLast;

// 3) Bending under 7/7 and active care cooldown.
await page.click('[data-mobile-tool="bend"]');
await page.waitForTimeout(100);
const axes=await page.evaluate(()=>window.__GFTRAIN.getHits().axes||[]);
const main=axes.find(a=>a.id==='main')||axes[0];
if(!main||!main.screen?.length)throw new Error('No bend hit target found at day 30');
const p=main.screen[Math.max(1,Math.floor(main.screen.length*.65))];
const box=await page.locator('#c').boundingBox();
await page.mouse.move(box.x+p.x,box.y+p.y);
await page.mouse.down();
await page.mouse.move(box.x+p.x,box.y+p.y+58,{steps:5});
await page.mouse.up();
await page.waitForTimeout(160);
const bendState=await read();
results.afterBend={
  turnsToday:bendState.turn.turnsToday,lastTurnAt:bendState.turn.lastTurnAt,
  bends:bendState.training?.bends?.length||0
};
results.assertions.bendWorked=results.afterBend.bends>=1;
results.assertions.bendDidNotConsumeTurn=results.afterBend.turnsToday===7;
results.assertions.bendDidNotStartWait=results.afterBend.lastTurnAt===originalLast;

// Care remains blocked because training intentionally does not touch care timing.
results.assertions.careStillBlocked=await page.locator('#waterCard').isDisabled();
results.assertions.noBrowserErrors=errors.length===0;
results.pass=Object.values(results.assertions).every(Boolean);

await page.screenshot({path:path.join(outDir,'training-free-at-7-of-7.png'),fullPage:false});
fs.writeFileSync(path.join(outDir,'results.json'),JSON.stringify(results,null,2));
fs.writeFileSync(path.join(outDir,'summary.txt'),[
  'GANJARIUM V90 FREE TRAINING QA',
  '',
  'Precondition: 7/7 care turns used + active one-hour care cooldown',
  `Prune: turns ${results.afterPrune.turnsToday}, lastTurnAt unchanged ${results.assertions.pruneDidNotStartWait}`,
  `Defoliate: turns ${results.afterDefoliate.turnsToday}, lastTurnAt unchanged ${results.assertions.defoliationDidNotStartWait}`,
  `Bend: turns ${results.afterBend.turnsToday}, lastTurnAt unchanged ${results.assertions.bendDidNotStartWait}`,
  `PASS: ${results.pass}`
].join('\n'));
console.log(JSON.stringify(results,null,2));
if(!results.pass)process.exitCode=1;

await context.close();await browser.close();await new Promise(r=>server.close(r));
