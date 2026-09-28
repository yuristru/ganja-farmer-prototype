import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd(),outDir=path.join(root,'qa','v90-quick-plant');
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
await new Promise(r=>server.listen(4182,'127.0.0.1',r));

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:1});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(String(e)));
await page.goto('http://127.0.0.1:4182/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__GFQUICKPLANT&&window.__GFTRAIN&&window.__GFCAMERA);
await page.evaluate(()=>window.__GFTRAIN.setDay(35));
await page.evaluate(()=>window.__GFCAMERA.set({yaw:.72,pitch:.31,zoom:1.28,panX:11,panY:-7}));
await page.waitForTimeout(220);

const button=page.locator('#quickPlantVariant');
const bend=page.locator('[data-mobile-tool="bend"]');
const bb=await button.boundingBox(),bendb=await bend.boundingBox();
const beforeState=await page.evaluate(()=>JSON.parse(localStorage.getItem('gf_mobile_game_v1')));
const beforeCam=await page.evaluate(()=>window.__GFCAMERA.snapshot());
const before=await page.evaluate(()=>window.__GFQUICKPLANT.snapshot());

const variants=[before];
for(let i=0;i<3;i++){
  await button.click();
  await page.waitForTimeout(180);
  variants.push(await page.evaluate(()=>window.__GFQUICKPLANT.snapshot()));
}
const afterState=await page.evaluate(()=>JSON.parse(localStorage.getItem('gf_mobile_game_v1')));
const afterCam=await page.evaluate(()=>window.__GFCAMERA.snapshot());

const results={
  before,variants,
  layout:{button:bb,bend:bendb},
  assertions:{
    buttonVisible:await button.isVisible(),
    buttonBelowBend:!!bb&&!!bendb&&bb.y>bendb.y+bendb.height-2,
    noSettingsOpened:!(await page.locator('#devDrawer').evaluate(el=>el.classList.contains('open'))),
    everyClickNewSeed:new Set(variants.map(v=>v.seed)).size===variants.length,
    profilesActuallyChange:variants.slice(1).some(v=>JSON.stringify(v.profile)!==JSON.stringify(before.profile)),
    dayPreserved:variants.every(v=>v.day===35)&&afterState.plant.day===35,
    coinsPreserved:afterState.coins===beforeState.coins,
    upgradesPreserved:JSON.stringify(afterState.progression?.levels)===JSON.stringify(beforeState.progression?.levels),
    cameraPreserved:['yaw','pitch','zoom','panX','panY'].every(k=>Math.abs(afterCam[k]-beforeCam[k])<1e-9),
    trainingCleared:(afterState.training?.prunes?.length||0)===0&&(afterState.training?.bends?.length||0)===0&&(afterState.training?.defoliations?.length||0)===0,
    noBrowserErrors:errors.length===0
  }
};
results.pass=Object.values(results.assertions).every(Boolean);
await page.screenshot({path:path.join(outDir,'quick-plant-button.png'),fullPage:false});
fs.writeFileSync(path.join(outDir,'results.json'),JSON.stringify(results,null,2));
fs.writeFileSync(path.join(outDir,'summary.txt'),[
  'GANJARIUM V90 QUICK PLANT QA',
  '',
  'Seeds: '+variants.map(v=>v.seed).join(' -> '),
  'Day preserved: '+results.assertions.dayPreserved,
  'Camera preserved: '+results.assertions.cameraPreserved,
  'Button below bend: '+results.assertions.buttonBelowBend,
  'PASS: '+results.pass
].join('\n'));
console.log(JSON.stringify(results,null,2));
if(!results.pass)process.exitCode=1;

await context.close();await browser.close();await new Promise(r=>server.close(r));
