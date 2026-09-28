import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd(),outDir=path.join(root,'qa','v90-stem-continuity');
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
await new Promise(r=>server.listen(4181,'127.0.0.1',r));

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:1});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(String(e)));
await page.goto('http://127.0.0.1:4181/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__GFSTEM&&window.__GFTRAIN);

const results={days:{},assertions:{}};
for(const day of [18,35,60]){
  await page.evaluate(d=>window.__GFTRAIN.setDay(d),day);
  await page.waitForTimeout(260);
  const s=await page.evaluate(()=>window.__GFSTEM.snapshot());
  results.days[day]=s;
  await page.screenshot({path:path.join(outDir,`stem-day-${day}.png`),fullPage:false});
}

const mature=[results.days[18],results.days[35],results.days[60]];
results.assertions.mainStemHasEnoughPoints=mature.every(s=>s&&s.points>=4);
results.assertions.mainStemNotPerfectlyStraight=mature.every(s=>s.maxDeviation>1.2);
results.assertions.organicTurnPresent=mature.every(s=>s.totalTurn>.018);
results.assertions.visibleFrontCurvature=mature.every(s=>Number(s.visibleXSpan||0)>18);
results.assertions.mainStemTapersStrongly=mature.every(s=>Number(s.mainBaseWidth||0)>Number(s.mainTipWidth||0)*5);
results.assertions.branchTapersStrongly=mature.every(s=>s.branchBaseWidth==null||Number(s.branchBaseWidth)>Number(s.branchTipWidth||0)*5);
results.assertions.curvaturePersistsWithAge=results.days[60].maxDeviation>1.2;
results.assertions.noBrowserErrors=errors.length===0;
results.pass=Object.values(results.assertions).every(Boolean);

fs.writeFileSync(path.join(outDir,'results.json'),JSON.stringify(results,null,2));
fs.writeFileSync(path.join(outDir,'summary.txt'),[
  'GANJARIUM V90 STEM CONTINUITY QA',
  '',
  ...[18,35,60].map(d=>`Day ${d}: points ${results.days[d].points}, max deviation ${results.days[d].maxDeviation.toFixed(2)}, total turn ${results.days[d].totalTurn.toFixed(4)}`),
  '',
  `PASS: ${results.pass}`
].join('\n'));
console.log(JSON.stringify(results,null,2));
if(!results.pass)process.exitCode=1;

await context.close();await browser.close();await new Promise(r=>server.close(r));
