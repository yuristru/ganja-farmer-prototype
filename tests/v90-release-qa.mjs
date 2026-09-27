import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd(),outDir=path.join(root,'qa','v90');
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
await new Promise(r=>server.listen(4176,'127.0.0.1',r));

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:1});
const page=await context.newPage();
const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e)));
const url='http://127.0.0.1:4176/',key='gf_mobile_game_v1';
const results={assertions:{},milestones:{},performance:{},ui:{}};

await page.goto(url,{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__GFTRAIN&&window.__GFECO&&window.__GFCOLLECTION);
await page.waitForTimeout(250);

async function state(){return await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);}
async function day(){return (await state()).plant.day;}
async function screenshot(name){await page.screenshot({path:path.join(outDir,name),fullPage:false});}

// Fresh-player entry.
const fresh=await state();
results.milestones.fresh={day:fresh.plant.day,coins:fresh.coins,grow:fresh.meta.growNumber,tech:await page.evaluate(()=>window.__GFECO.techLevel())};
results.assertions.freshStart=fresh.plant.day===1&&fresh.coins===450&&fresh.meta.growNumber===1&&results.milestones.fresh.tech===2;
results.assertions.carePanelStartsActive=await page.locator('[data-game-panel="care"]').evaluate(el=>el.classList.contains('active'));
results.assertions.primaryNavVisible=(await page.locator('[data-ui-tab]').count())===4;
await screenshot('01-fresh-start.png');

// CI only: use the actual developer control to remove the real-time one-hour wait.
await page.click('#devToggle');
await page.click('#devBypass');
await page.waitForTimeout(80);
results.assertions.debugBypassEnabled=(await state()).settings.debugBypass===true;

// Play Grow 1 via normal care/day controls.
let toppingDone=false;
let careClicks=0;
const loopStart=Date.now();
while((await day())<84){
  const d=await day();

  // One real topping action around the useful early window.
  if(d===18&&!toppingDone){
    await page.click('[data-mobile-tool="prune"]');
    await page.click('[data-prune-target="shoot"]');
    await page.waitForTimeout(80);
    const hits=await page.evaluate(()=>window.__GFTRAIN.getHits());
    const target=hits.nodes.find(n=>n.axisId==='main'&&n.axisNode===4)||hits.nodes.find(n=>n.axisId==='main'&&n.axisNode>=3)||hits.nodes[0];
    if(target){
      const box=await page.locator('#c').boundingBox();
      await page.mouse.click(box.x+target.x,box.y+target.y);
      await page.waitForTimeout(80);
      const tr=await page.evaluate(()=>window.__GFTRAIN.getTrainingState());
      toppingDone=tr.prunes.length>0;
    }
    await page.click('[data-mobile-tool="orbit"]');
  }

  // Use recommendations instead of blindly spamming care actions.
  for(const id of ['waterCard','feedCard','ventCard']){
    const el=page.locator('#'+id);
    if(await el.isEnabled()&&await el.evaluate(e=>e.classList.contains('can-act'))){
      await el.click();careClicks++;
    }
  }

  await page.click('#adminDaySkip');
  await page.waitForTimeout(12);
  if(await day()!==d+1)throw new Error('Plant day did not advance from '+d);
}
results.performance.grow1UiLoopMs=Date.now()-loopStart;
results.ui.careClicks=careClicks;
results.assertions.reachedHarvestDay=(await day())===84;
results.assertions.trainingWasUsed=toppingDone&&(await page.evaluate(()=>window.__GFTRAIN.getTrainingState().prunes.length))>=1;
await screenshot('02-grow1-harvest-ready.png');

// Harvest through the actual overlay.
const preHarvest=await state();
await page.click('#harvestReadyBox');
await page.waitForSelector('#harvestResults.open');
results.ui.harvestScore=Number(await page.locator('#harvestTotalScore').innerText());
await page.click('#harvestToJar');
await page.waitForTimeout(80);
results.ui.harvestRewardText=await page.locator('#harvestReward').innerText();
results.ui.harvestGrams=Number((await page.locator('#jarAmount').innerText()).replace(/[^0-9]/g,''));
await screenshot('03-harvest-result.png');
await page.click('#harvestFinish');
await page.waitForTimeout(180);

const harvested=await state();
const reward=harvested.collection[0]?.reward||0;
results.milestones.afterHarvest={
  coins:harvested.coins,completedGrows:harvested.meta.completedGrows,tech:await page.evaluate(()=>window.__GFECO.techLevel()),
  jars:harvested.collection.length,seeds:harvested.seedVault.inventory.length,reward,grams:harvested.collection[0]?.grams
};
results.assertions.harvestCommittedOnce=harvested.plant.harvested===true&&harvested.collection.length===1&&harvested.meta.completedGrows===1;
results.assertions.rewardCredited=harvested.coins===preHarvest.coins+reward&&reward>0;
results.assertions.harvestSeedDropped=harvested.seedVault.inventory.some(s=>s.id===harvested.collection[0].harvestSeedId);
results.assertions.tech3Unlocked=results.milestones.afterHarvest.tech===3;
results.assertions.collectionOpenedAfterHarvest=await page.locator('[data-game-panel="collection"]').evaluate(el=>el.classList.contains('active'));
results.assertions.hallOfFameCreated=(await page.locator('.hof-row-v89').count())===1;
await screenshot('04-after-harvest-collection.png');

// Hard reload must not duplicate harvest or reward.
const coinsAfterHarvest=harvested.coins;
await page.reload({waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__GFCOLLECTION&&window.__GFECO);
await page.waitForTimeout(120);
const reloadedHarvest=await state();
results.assertions.harvestReloadIdempotent=reloadedHarvest.collection.length===1&&reloadedHarvest.coins===coinsAfterHarvest&&reloadedHarvest.plant.harvested===true;

// Buy a real persistent upgrade.
await page.click('[data-ui-tab="upgrades"]');
await page.click('[data-upgrade-category="pot"]');
const buy=page.locator('[data-buy-level="2"]');
results.assertions.firstUpgradeAvailable=await buy.isEnabled();
const potPrice=await page.evaluate(()=>window.__GFECO.price('pot',2));
await buy.click();
await page.waitForTimeout(120);
const upgraded=await state();
results.milestones.afterUpgrade={coins:upgraded.coins,potLevel:upgraded.progression.levels.pot,potLiters:upgraded.setup.pot.liters,price:potPrice};
results.assertions.upgradePurchased=upgraded.progression.levels.pot===2&&upgraded.setup.pot.liters===9&&upgraded.coins===coinsAfterHarvest-potPrice;
await screenshot('05-first-upgrade.png');

// Return to collection, choose a seed and start Grow 2.
await page.click('[data-ui-tab="collection"]');
await page.waitForTimeout(100);
const seedButtons=page.locator('[data-plant-seed]');
results.ui.seedChoicesAfterHarvest=await seedButtons.count();
results.assertions.nextSeedChoiceExists=results.ui.seedChoicesAfterHarvest>=1;
const chosenSeedId=await seedButtons.first().getAttribute('data-plant-seed');
await seedButtons.first().click();
await page.waitForTimeout(180);
const grow2=await state();
results.milestones.grow2={day:grow2.plant.day,grow:grow2.meta.growNumber,seedId:grow2.genetics.currentSeed?.id,potLevel:grow2.progression.levels.pot,potLiters:grow2.setup.pot.liters,coins:grow2.coins,jars:grow2.collection.length};
results.assertions.grow2Started=grow2.plant.day===1&&grow2.meta.growNumber===2&&grow2.plant.harvested===false&&grow2.genetics.currentSeed?.id===chosenSeedId;
results.assertions.metaProgressPersists=grow2.collection.length===1&&grow2.progression.levels.pot===2&&grow2.setup.pot.liters===9&&grow2.coins===upgraded.coins;
results.assertions.usedSeedRemoved=!grow2.seedVault.inventory.some(s=>s.id===chosenSeedId);
results.assertions.returnedToCare=await page.locator('[data-game-panel="care"]').evaluate(el=>el.classList.contains('active'));
await screenshot('06-grow2-start.png');

// Reload Grow 2: state must still be coherent.
await page.reload({waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__GFECO&&window.__GFCOLLECTION);
await page.waitForTimeout(120);
const grow2Reload=await state();
results.assertions.grow2ReloadPersists=grow2Reload.meta.growNumber===2&&grow2Reload.plant.day===1&&grow2Reload.progression.levels.pot===2&&grow2Reload.setup.pot.liters===9&&grow2Reload.collection.length===1;

// Verify Grow 2 can continue and purchased equipment remains effective.
await page.click('#devToggle');
if(!(await state()).settings.debugBypass)await page.click('#devBypass');
for(let i=0;i<5;i++){
  for(const id of ['waterCard','feedCard','ventCard']){
    const el=page.locator('#'+id);
    if(await el.isEnabled()&&await el.evaluate(e=>e.classList.contains('can-act')))await el.click();
  }
  await page.click('#adminDaySkip');
  await page.waitForTimeout(12);
}
const grow2Progress=await state();
results.milestones.grow2Progress={day:grow2Progress.plant.day,potLevel:grow2Progress.progression.levels.pot,potLiters:grow2Progress.setup.pot.liters,historyDays:Object.keys(grow2Progress.history||{}).length};
results.assertions.grow2ActuallyPlays=grow2Progress.plant.day===6&&Object.keys(grow2Progress.history||{}).length===5&&grow2Progress.setup.pot.liters===9;
await screenshot('07-grow2-progress.png');

results.assertions.noBrowserErrors=pageErrors.length===0;
results.performance.totalMs=Date.now()-loopStart;
results.pass=Object.values(results.assertions).every(Boolean);
fs.writeFileSync(path.join(outDir,'results.json'),JSON.stringify(results,null,2));
fs.writeFileSync(path.join(outDir,'summary.txt'),[
  'GANJARIUM V90 RELEASE CANDIDATE E2E',
  '',
  `Grow 1: score ${results.ui.harvestScore}, ${results.ui.harvestGrams} g, reward ${reward} coins`,
  `After harvest: ${harvested.coins} coins, Tech LV ${results.milestones.afterHarvest.tech}, ${harvested.seedVault.inventory.length} seeds`,
  `Upgrade: Pot LV2 / ${upgraded.setup.pot.liters} L / -${potPrice} coins`,
  `Grow 2: seed ${grow2.genetics.currentSeed?.id}, persisted pot LV${grow2.progression.levels.pot}, day after continuation ${grow2Progress.plant.day}`,
  `Grow 1 UI loop: ${results.performance.grow1UiLoopMs} ms`,
  '',
  `Assertions: ${JSON.stringify(results.assertions)}`,
  `PASS: ${results.pass}`
].join('\n'));
console.log(JSON.stringify(results,null,2));
if(!results.pass)process.exitCode=1;

await context.close();await browser.close();await new Promise(r=>server.close(r));
