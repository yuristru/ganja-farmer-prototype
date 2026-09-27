import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const outDir=path.join(root,'qa','v89');
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
await new Promise(resolve=>server.listen(4175,'127.0.0.1',resolve));

const browser=await chromium.launch({headless:true});
const url='http://127.0.0.1:4175/';
const key='gf_mobile_game_v1';

const boot=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:1});
const bp=await boot.newPage();
await bp.goto(url,{waitUntil:'networkidle'});
await bp.waitForFunction(k=>localStorage.getItem(k),key);
const base=await bp.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
await boot.close();

const now=Date.now();
const jars=[
  {id:'jar-alpha',name:'Garden Dream #10001',genetics:'dream',seed:10001,score:88,grams:96,phenotype:'Wide Canopy',rarity:'common',rating:'SEHR GUT',growNumber:1,signature:[{label:'TRAINED CANOPY'}],createdAt:now-5000,acquiredAt:now-5000,traits:{}},
  {id:'jar-beta',name:'Violet Circuit #10002',genetics:'violet',seed:10002,score:97,grams:89,phenotype:'Purple Dense',rarity:'epic',rating:'EXZELLENT',growNumber:2,signature:[{label:'TOPPING SPLIT'}],createdAt:now-4000,acquiredAt:now-4000,traits:{}},
  {id:'jar-gamma',name:'Lime Comet #10003',genetics:'comet',seed:10003,score:91,grams:108,phenotype:'Comet Stretch',rarity:'rare',rating:'SEHR GUT',growNumber:3,signature:[{label:'TRAINED CANOPY'}],createdAt:now-3000,acquiredAt:now-3000,traits:{}},
  {id:'jar-delta',name:'Violet Circuit #10004',genetics:'violet',seed:10004,score:95,grams:101,phenotype:'Circuit Frost',rarity:'legendary',rating:'EXZELLENT',growNumber:4,signature:[{label:'CLEAN FLOWER'}],createdAt:now-2000,acquiredAt:now-2000,traits:{}},
  {id:'jar-legacy',name:'Garden Dream #10005',genetics:'dream',seed:10005,score:79,grams:72,phenotype:'Dense Garden',rarity:'common',rating:'GUT',signature:[{label:'CLEAN FLOWER'}],createdAt:now-1000,acquiredAt:now-1000,traits:{}}
];
const state=structuredClone(base);
state.collection=jars;
state.meta={...(state.meta||{}),completedGrows:5,growNumber:6};
state.coins=777;
state.seedVault.inventory=[
  {id:'seed-a',genetics:'dream',seed:50001,rarity:'common',phenotype:'Lime Tower',traits:{growth:2,density:1,potency:0,aroma:2,resilience:1,style:0},known:['growth','aroma'],revealed:false,source:'QA',acquiredAt:now+100},
  {id:'seed-b',genetics:'violet',seed:50002,rarity:'legendary',phenotype:'Night Crown',traits:{growth:4,density:7,potency:8,aroma:5,resilience:3,style:9},known:['style','potency'],revealed:false,source:'QA',acquiredAt:now+200}
];
state.plant.harvested=true;

const context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:1});
await context.addInitScript(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key,state});
const page=await context.newPage();
const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e)));
await page.goto(url,{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__GFCOLLECTION);
await page.click('[data-ui-tab="collection"]');
await page.waitForTimeout(500);

const snap=await page.evaluate(()=>window.__GFCOLLECTION.snapshot());
const results={snapshot:snap,assertions:{},ui:{}};
results.assertions.noBrowserErrors=pageErrors.length===0;
results.assertions.jarCount=snap.totalJars===5;
results.assertions.totalGrams=snap.totalGrams===466;
results.assertions.phenotypeCount=snap.phenotypes===5;
results.assertions.bestScore=snap.bestScore?.id==='jar-beta'&&snap.bestScore.score===97;
results.assertions.bestYield=snap.bestYield?.id==='jar-gamma'&&snap.bestYield.grams===108;
results.assertions.top3=snap.top3.map(x=>x.id).join(',')==='jar-beta,jar-delta,jar-gamma';

const hofRows=page.locator('.hof-row-v89');
results.ui.hofRows=await hofRows.count();
results.ui.hofText=await page.locator('.hall-of-fame-v89').innerText();
results.assertions.hallTop3Rendered=results.ui.hofRows===3&&/#1/.test(results.ui.hofText)&&/97\/100/.test(results.ui.hofText);

const bestScoreBadges=await page.locator('.collection-record-v89.score').count();
const bestYieldBadges=await page.locator('.collection-record-v89.yield').count();
results.assertions.recordBadges=bestScoreBadges===1&&bestYieldBadges===1;

// Filter to grows.
await page.click('[data-collection-filter="grows"]');
await page.waitForTimeout(140);
results.ui.growCards=await page.locator('.collection-item-card.jar:not(.demo)').count();
results.ui.seedCardsUnderGrowFilter=await page.locator('.collection-item-card.seed').count();
results.assertions.growFilter=results.ui.growCards===5&&results.ui.seedCardsUnderGrowFilter===0;

// Sort by yield, first stored jar must be gamma.
await page.click('[data-collection-sort="yield"]');
await page.waitForTimeout(140);
const firstJar=page.locator('.collection-unified .collection-item-card.jar:not(.demo)').first();
results.ui.firstYieldJar=await firstJar.getAttribute('data-collection-jar');
results.assertions.yieldSort=results.ui.firstYieldJar==='jar-gamma';

// Sort by score.
await page.click('[data-collection-sort="score"]');
await page.waitForTimeout(140);
results.ui.firstScoreJar=await page.locator('.collection-unified .collection-item-card.jar:not(.demo)').first().getAttribute('data-collection-jar');
results.assertions.scoreSort=results.ui.firstScoreJar==='jar-beta';

// Seeds filter and rarity sort should put legendary seed first.
await page.click('[data-collection-filter="seeds"]');
await page.click('[data-collection-sort="rarity"]');
await page.waitForTimeout(140);
results.ui.seedCount=await page.locator('.collection-item-card.seed').count();
results.ui.firstSeed=await page.locator('.collection-unified .collection-item-card.seed').first().getAttribute('data-collection-seed');
results.assertions.seedFilterAndRarity=results.ui.seedCount===2&&results.ui.firstSeed==='seed-b';

// Legacy jar must render safely with unknown grow number.
await page.click('[data-collection-filter="grows"]');
await page.click('[data-collection-sort="recent"]');
await page.waitForTimeout(140);
const legacy=page.locator('[data-collection-jar="jar-legacy"]');
results.ui.legacyText=await legacy.innerText();
results.assertions.legacyCompatible=/GROW \?/.test(results.ui.legacyText);

// Screenshot all and filtered leaderboard.
await page.click('[data-collection-filter="all"]');
await page.click('[data-collection-sort="score"]');
await page.waitForTimeout(160);
await page.screenshot({path:path.join(outDir,'collection-v89.png'),fullPage:false});
await page.click('[data-collection-filter="grows"]');
await page.waitForTimeout(120);
await page.screenshot({path:path.join(outDir,'hall-of-fame-v89.png'),fullPage:false});

results.pass=Object.values(results.assertions).every(Boolean);
fs.writeFileSync(path.join(outDir,'results.json'),JSON.stringify(results,null,2));
fs.writeFileSync(path.join(outDir,'summary.txt'),[
  'GANJARIUM V89 COLLECTION QA',
  '',
  `Jars: ${snap.totalJars}, archived: ${snap.totalGrams} g, phenotypes: ${snap.phenotypes}/12`,
  `Best score: ${snap.bestScore.id} ${snap.bestScore.score}/100`,
  `Best yield: ${snap.bestYield.id} ${snap.bestYield.grams} g`,
  `Top 3: ${snap.top3.map(x=>x.id).join(' > ')}`,
  '',
  `Assertions: ${JSON.stringify(results.assertions)}`,
  `PASS: ${results.pass}`
].join('\n'));
console.log(JSON.stringify(results,null,2));
if(!results.pass)process.exitCode=1;

await context.close();
await browser.close();
await new Promise(resolve=>server.close(resolve));
