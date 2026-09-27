import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const outDir=path.join(root,'qa','v88');
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
await new Promise(resolve=>server.listen(4174,'127.0.0.1',resolve));

const browser=await chromium.launch({headless:true});
const url='http://127.0.0.1:4174/';
const key='gf_mobile_game_v1';

const boot=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:1});
const bootPage=await boot.newPage();
await bootPage.goto(url,{waitUntil:'networkidle'});
await bootPage.waitForFunction(k=>localStorage.getItem(k),key);
const defaultState=await bootPage.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
await boot.close();

function phaseStats(day){
  const counts={seedling:0,veg:0,stretch:0,flower:0};
  for(let d=1;d<=day;d++){
    const k=d<15?'seedling':d<36?'veg':d<57?'stretch':'flower';
    counts[k]++;
  }
  return Object.fromEntries(Object.entries(counts).map(([k,n])=>[k,{sum:n,days:n}]));
}

function makeState({completedGrows=0,coins=450,levels={},unlockedUpgradeLevel=undefined,day=1,training=null,defEvents=[]}={}){
  const st=structuredClone(defaultState);
  st.coins=coins;
  st.meta={...(st.meta||{}),completedGrows,growNumber:completedGrows+1};
  st.progression={...(st.progression||{}),levels:{...(st.progression?.levels||{}),...levels}};
  if(unlockedUpgradeLevel===undefined)delete st.progression.unlockedUpgradeLevel;
  else st.progression.unlockedUpgradeLevel=unlockedUpgradeLevel;
  st.plant.day=day;
  st.plant.harvested=false;
  st.plant.stress=0;
  st.plant.growthPotential=1;
  st.plant.conditionMemory={stressDebt:0,recoveryMomentum:.35,lastEvaluatedDay:day};
  st.care.water=.68;st.care.nutrients=.68;st.care.ventilation=.78;
  st.settings={...(st.settings||{}),debugBypass:true};
  st.training=training?structuredClone(training):{prunes:[],bends:[],defoliations:[]};
  st.history={};
  for(let d=1;d<=day;d++){
    st.history[String(d)]={
      day:d,fulfillment:1,stress:0,vigor:1,growthPotential:1,
      scores:{water:1,light:1,nutrients:1,climate:1},
      levels:{water:.68,light:.92,nutrients:.68,ventilation:.78,climate:.86},
      damage:{waterDef:0,nutrientDef:0,waterExcess:0,nutrientExcess:0,lightDef:0,climateDef:0,acute:0},
      conditionMemory:{stressDebt:0,recoveryMomentum:.35,lastEvaluatedDay:d},createdAt:0
    };
  }
  st.biography={
    perfectDays:day,stressDays:0,severeDays:0,longestStressStreak:0,currentStressStreak:0,
    phase:phaseStats(day),events:[],defoliationEvents:structuredClone(defEvents)
  };
  return st;
}

async function openState(state){
  const context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:1});
  await context.addInitScript(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key,state});
  const page=await context.newPage();
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(String(e)));
  await page.goto(url,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.__GFECO&&window.__GFTRAIN);
  await page.waitForTimeout(200);
  return{context,page,pageErrors};
}

const results={assertions:{},snapshots:{},rewards:{},ui:{}};

// Fresh economy.
{
  const {context,page,pageErrors}=await openState(makeState());
  const snap=await page.evaluate(()=>window.__GFECO.snapshot());
  results.snapshots.fresh=snap;
  const level2Total=Object.values(snap.prices).reduce((sum,arr)=>sum+(arr[0]||0),0);
  results.ui.level2Total=level2Total;
  results.assertions.noFreshErrors=pageErrors.length===0;
  results.assertions.freshCoins=snap.coins===450;
  results.assertions.freshTechLevel=snap.techLevel===2;
  results.assertions.initialChoicePressure=level2Total===455&&level2Total>snap.coins;
  results.assertions.fullCurveBalanced=snap.totalFullUpgradeCost>=7500&&snap.totalFullUpgradeCost<=8200;
  results.assertions.packGatesFresh=snap.packs.starter.unlocked&&!snap.packs.genetics.unlocked&&!snap.packs.exotic.unlocked;
  await page.click('[data-ui-tab="upgrades"]');
  await page.waitForTimeout(120);
  await page.screenshot({path:path.join(outDir,'fresh-upgrades.png'),fullPage:false});
  await page.click('[data-ui-tab="collection"]');
  await page.waitForTimeout(120);
  await page.screenshot({path:path.join(outDir,'fresh-seed-packs.png'),fullPage:false});
  await context.close();
}

// LV3 must stay locked before the first harvest even with unlimited coins.
{
  const st=makeState({completedGrows:0,coins:9999,levels:{pot:2},unlockedUpgradeLevel:2});
  const {context,page,pageErrors}=await openState(st);
  await page.click('[data-ui-tab="upgrades"]');
  await page.click('[data-upgrade-category="pot"]');
  await page.waitForTimeout(100);
  const locked=await page.locator('.economy-tech-locked').count();
  const lockText=locked?await page.locator('.economy-tech-locked').innerText():'';
  results.ui.preHarvestLockText=lockText;
  results.assertions.preHarvestLevel3Locked=locked===1&&/GROW\s*1/i.test(lockText);
  results.assertions.noLockCaseErrors=pageErrors.length===0;
  await page.screenshot({path:path.join(outDir,'pot-l3-locked.png'),fullPage:false});
  await context.close();
}

// After Grow 1 LV3 becomes buyable and Genetics Pack unlocks.
{
  const st=makeState({completedGrows:1,coins:9999,levels:{pot:2},unlockedUpgradeLevel:2});
  const {context,page,pageErrors}=await openState(st);
  const before=await page.evaluate(()=>window.__GFECO.snapshot());
  await page.click('[data-ui-tab="upgrades"]');
  await page.click('[data-upgrade-category="pot"]');
  const btn=page.locator('[data-buy-level="3"]');
  const enabled=await btn.isEnabled();
  const price=await page.evaluate(()=>window.__GFECO.price('pot',3));
  await btn.click();
  await page.waitForTimeout(120);
  const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  const after=await page.evaluate(()=>window.__GFECO.snapshot());
  results.snapshots.afterGrow1=after;
  results.ui.potL3Price=price;
  results.assertions.grow1TechLevel=before.techLevel===3;
  results.assertions.grow1GeneticsUnlocked=before.packs.genetics.unlocked&&!before.packs.exotic.unlocked;
  results.assertions.level3PurchaseWorks=enabled&&saved.progression.levels.pot===3&&saved.coins===9999-price;
  results.assertions.noGrow1Errors=pageErrors.length===0;
  await context.close();
}

// Grow 3 unlocks Tech LV5 and Exotic Pack.
{
  const {context,page,pageErrors}=await openState(makeState({completedGrows:3,coins:900}));
  const snap=await page.evaluate(()=>window.__GFECO.snapshot());
  results.snapshots.afterGrow3=snap;
  results.assertions.grow3TechLevel=snap.techLevel===5;
  results.assertions.grow3AllPacksUnlocked=snap.packs.starter.unlocked&&snap.packs.genetics.unlocked&&snap.packs.exotic.unlocked;
  results.assertions.noGrow3Errors=pageErrors.length===0;
  await page.click('[data-ui-tab="collection"]');
  await page.waitForTimeout(100);
  await page.screenshot({path:path.join(outDir,'grow3-seed-packs.png'),fullPage:false});
  await context.close();
}

// Legacy saves are grandfathered instead of downgraded.
{
  const {context,page}=await openState(makeState({completedGrows:0,coins:100,levels:{pot:7},unlockedUpgradeLevel:undefined}));
  const snap=await page.evaluate(()=>window.__GFECO.snapshot());
  results.snapshots.legacy=snap;
  results.assertions.legacyGrandfathered=snap.techLevel>=7;
  await context.close();
}

// Long progression eventually reaches Tech LV10.
{
  const {context,page}=await openState(makeState({completedGrows:8}));
  const snap=await page.evaluate(()=>window.__GFECO.snapshot());
  results.assertions.eightGrowsUnlockMaxTech=snap.techLevel===10&&snap.nextTechUnlockGrow===null;
  await context.close();
}

const trainingCases={
  A:{training:{prunes:[],bends:[],defoliations:[]},defs:[]},
  C:{training:{
    prunes:[{nodeId:'main:n4',axisId:'main',axisNode:4,cutDay:18,cutProg:.62}],
    bends:[
      {axisId:'shoot:main:n4:bud:L',events:[{day:24,amount:.78}]},
      {axisId:'shoot:main:n4:bud:R',events:[{day:24,amount:.78}]}
    ],
    defoliations:['main:n2:leaf:L','main:n2:leaf:R','main:n3:leaf:L','main:n3:leaf:R']
  },defs:[
    {day:30,leafId:'main:n2:leaf:L'},{day:30,leafId:'main:n2:leaf:R'},
    {day:30,leafId:'main:n3:leaf:L'},{day:30,leafId:'main:n3:leaf:R'}
  ]},
  D:{training:{
    prunes:[{nodeId:'main:n6',axisId:'main',axisNode:6,cutDay:60,cutProg:1}],
    bends:[{axisId:'main',events:[{day:62,amount:.90}]}],
    defoliations:['main:n2:leaf:L','main:n2:leaf:R','main:n3:leaf:L','main:n3:leaf:R','main:n4:leaf:L','main:n4:leaf:R','main:n5:leaf:L','main:n5:leaf:R']
  },defs:[
    {day:64,leafId:'main:n2:leaf:L'},{day:64,leafId:'main:n2:leaf:R'},
    {day:64,leafId:'main:n3:leaf:L'},{day:64,leafId:'main:n3:leaf:R'},
    {day:64,leafId:'main:n4:leaf:L'},{day:64,leafId:'main:n4:leaf:R'},
    {day:64,leafId:'main:n5:leaf:L'},{day:64,leafId:'main:n5:leaf:R'}
  ]}
};
for(const [id,v] of Object.entries(trainingCases)){
  const {context,page,pageErrors}=await openState(makeState({completedGrows:0,day:84,training:v.training,defEvents:v.defs}));
  const h=await page.evaluate(()=>window.__GFTRAIN.getHarvestResult());
  results.rewards[id]={score:h.scores.total,grams:h.grams,reward:h.reward,techUnlock:h.techUnlock,performanceBonus:h.performanceBonus};
  results.assertions['rewardCase'+id+'NoErrors']=pageErrors.length===0;
  await context.close();
}
const A=results.rewards.A,C=results.rewards.C,D=results.rewards.D;
results.assertions.rewardOrder=C.reward>A.reward&&A.reward>D.reward;
results.assertions.rewardSpread=(C.reward-D.reward)>=50;
results.assertions.firstHarvestPreviewsTech3=A.techUnlock===3&&C.techUnlock===3&&D.techUnlock===3;
results.assertions.rewardBounds=[A,C,D].every(x=>x.reward>=220&&x.reward<=650);

results.pass=Object.values(results.assertions).every(Boolean);
fs.writeFileSync(path.join(outDir,'results.json'),JSON.stringify(results,null,2));
fs.writeFileSync(path.join(outDir,'summary.txt'),[
  'GANJARIUM V88 ECONOMY QA',
  '',
  `Fresh: ${results.snapshots.fresh.coins} coins, Tech LV ${results.snapshots.fresh.techLevel}, L2 total ${results.ui.level2Total}, full curve ${results.snapshots.fresh.totalFullUpgradeCost}`,
  `After Grow 1: Tech LV ${results.snapshots.afterGrow1.techLevel}, Genetics ${results.snapshots.afterGrow1.packs.genetics.unlocked?'open':'locked'}`,
  `After Grow 3: Tech LV ${results.snapshots.afterGrow3.techLevel}, Exotic ${results.snapshots.afterGrow3.packs.exotic.unlocked?'open':'locked'}`,
  `Reward A natural: ${A.reward} coins / ${A.grams} g / ${A.score} pts`,
  `Reward C trained: ${C.reward} coins / ${C.grams} g / ${C.score} pts`,
  `Reward D late: ${D.reward} coins / ${D.grams} g / ${D.score} pts`,
  '',
  `Assertions: ${JSON.stringify(results.assertions)}`,
  `PASS: ${results.pass}`
].join('\n'));
console.log(JSON.stringify(results,null,2));
if(!results.pass)process.exitCode=1;

await browser.close();
await new Promise(resolve=>server.close(resolve));
