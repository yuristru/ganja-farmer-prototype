import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright';
import '../assets/game-clock.js';
const clock=globalThis.GanjariumClock,ts=s=>Date.parse(s),hour=3600000;
let checks=0;
function check(value,message){assert(value,message);checks++;}
const start=ts('2026-10-02T06:00:00Z');
let r=clock.create(start);
for(let i=0;i<7;i++){
 check(clock.commit(r,start+i*hour),'Hourly action accepted');
 check(!clock.commit(r,start+i*hour+hour-1),'No action before a full hour');
}
check(!clock.commit(r,start+7*hour),'Eighth action rejected');
let completed=0;
clock.reconcile(r,ts('2026-10-02T22:00:00Z'),()=>{completed++;return true;});
check(completed===1&&r.used===0,'Midnight advances one day and resets allowance');
r=clock.create(ts('2026-10-02T21:45:00Z'));clock.commit(r,r.lastObservedAt);
clock.reconcile(r,ts('2026-10-02T22:00:00Z'),()=>true);
check(clock.availability(r,ts('2026-10-02T22:00:00Z')).wait===45*60000,'Cooldown survives midnight');
r=clock.create(start);completed=0;
check(clock.close(r,start,()=>{completed++;return true;}),'Close accepted');
check(!clock.close(r,start,()=>{completed++;return true;}),'Second close rejected');
check(!clock.commit(r,start+hour),'Closed day blocks all actions');
clock.reconcile(r,ts('2026-10-05T06:00:00Z'),()=>{completed++;return true;});
check(completed===3,'Offline return does not double count manually closed date');
clock.reconcile(r,ts('2026-10-05T06:00:00Z'),()=>{completed++;return true;});
check(completed===3,'Reconciliation is idempotent');
for(const [s,h] of [['2026-03-28T23:00:00Z',23],['2026-10-24T22:00:00Z',25]])check(clock.nextMidnight(ts(s))-ts(s)===h*hour,'DST day has correct length');
for(const [s,next] of [['2028-02-27T23:00:00Z','2028-03-01'],['2026-12-29T23:00:00Z','2027-01-01']]){
 r=clock.create(ts(s));clock.reconcile(r,ts(s)+48*hour,()=>true);check(r.dateKey===next,'Leap/year boundary');
}
r=clock.create(start);clock.commit(r,start);clock.reconcile(r,start+hour/2,()=>true);
check(!clock.commit(r,start-hour),'Clock rollback cannot bypass cooldown');
const legacy={turn:{turnsToday:4,lastTurnAt:start},plant:{day:36}};
clock.migrate(legacy,start+100*hour);check(legacy.rhythm.used===4&&legacy.rhythm.lastTurnAt===start,'Migration preserves allowance');
check(legacy.rhythm.dateKey===clock.dateKey(start+100*hour),'Migration starts today');
r=clock.create(start);completed=0;clock.reconcile(r,start+500*24*hour,()=>++completed<=83);check(completed===84&&r.dateKey===clock.dateKey(start+500*24*hour),'Long absence stops replay at harvest');

const root=process.cwd(),out='qa/v99';fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const clean=decodeURIComponent(req.url.split('?')[0]),file=path.resolve(root,clean==='/'?'index.html':'.'+clean);if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}fs.readFile(file,(e,d)=>{if(e){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':'application/octet-stream');res.end(d);});});
await new Promise(r=>server.listen(4199,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:393,height:852},timezoneId:'America/Los_Angeles'});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.addInitScript(()=>{const pending=sessionStorage.getItem('qaImport');if(pending){localStorage.setItem('gf_mobile_game_v1',pending);sessionStorage.removeItem('qaImport');}});
 await page.clock.setFixedTime(start);
 await page.goto('http://127.0.0.1:4199/',{waitUntil:'networkidle'});
 const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('gf_mobile_game_v1')));
 const click=id=>page.locator('#'+id).click();
 await click('adminSkip');check((await state()).rhythm.used===1,'Skip consumes real daily action');
 check(await page.locator('#adminSkip').isDisabled(),'Immediate skip blocked');
 await page.clock.setFixedTime(start+hour-1);await page.waitForTimeout(1100);
 check(await page.locator('#waterCard').isDisabled(),'Care blocked before exact hour');
 await page.clock.setFixedTime(start+hour);await page.waitForTimeout(1100);
 check(await page.locator('#adminSkip').isEnabled(),'Exact hour unlocks');
 for(let i=1;i<7;i++){await page.clock.setFixedTime(start+i*hour);await page.waitForTimeout(1100);await click(i===1?'ventCard':'adminSkip');}
 check((await state()).rhythm.used===7&&await page.locator('#adminSkip').isDisabled(),'Seven-action limit integrated');
 await click('adminDaySkip');check((await state()).plant.day===2&&(await state()).rhythm.closed,'Early close persists');
 check(await page.locator('#adminDaySkip').isDisabled(),'Repeated close disabled');
 await page.reload({waitUntil:'networkidle'});check((await state()).plant.day===2&&(await state()).rhythm.closed,'Reload preserves close');
 await page.screenshot({path:out+'/day-closed.png'});
 await page.clock.setFixedTime(ts('2026-10-02T22:00:00Z'));await page.waitForTimeout(1100);
 check((await state()).plant.day===2&&(await state()).rhythm.used===0&&!(await state()).rhythm.closed,'Midnight reopens without double growth');
 check(await page.locator('#adminSkip').isEnabled(),'Berlin midnight used despite different browser timezone');
 await page.clock.setFixedTime(ts('2026-10-05T06:00:00Z'));await page.reload({waitUntil:'networkidle'});
 let st=await state();check(st.plant.day===4&&Object.keys(st.history).length===3,'Offline days simulated once');
 check(st.care.water<.7&&st.care.ventilation<.62,'Offline resource consumption applied');
 const offline=st.plant.day;await page.reload({waitUntil:'networkidle'});check((await state()).plant.day===offline,'Repeated offline load has no duplicate growth');
 await page.screenshot({path:out+'/offline-return.png'});
 // Legacy import retains its plant day, spent actions and active cooldown.
 await page.evaluate(()=>{let s=JSON.parse(localStorage.getItem('gf_mobile_game_v1'));delete s.rhythm;delete s.uiMigrations.sevenTurnLoopV77;s.plant.day=36;s.turn.turnsToday=4;s.turn.lastTurnAt=Date.now()-1800000;s.session.lastSeenAt=Date.now()-20*86400000;sessionStorage.setItem('qaImport',JSON.stringify(s));});
 await page.reload({waitUntil:'networkidle'});st=await state();check(st.plant.day===36&&st.rhythm.used===4,'Legacy import has no retroactive growth or allowance reset');
 check(await page.locator('#adminSkip').isDisabled(),'Legacy cooldown retained');
 // Simulate a long absence: stop at harvest without harvesting or reseeding.
 await page.clock.setFixedTime(ts('2027-10-05T06:00:00Z'));await page.reload({waitUntil:'networkidle'});st=await state();
 check(st.plant.day===84&&!st.plant.harvested&&st.collection.length===0,'Offline progression stops at harvest');
 check(await page.locator('#adminSkip').isDisabled(),'Harvest blocks care');
 await page.reload({waitUntil:'networkidle'});check((await state()).plant.day===84,'Harvest cap idempotent');
 // Harvest and reseed cannot reset today's turns or the pending one-hour wait.
 await page.evaluate(()=>{let s=JSON.parse(localStorage.getItem('gf_mobile_game_v1'));s.rhythm.used=7;s.rhythm.closed=true;s.rhythm.lastTurnAt=Date.now();sessionStorage.setItem('qaImport',JSON.stringify(s));});
 await page.reload({waitUntil:'networkidle'});
 await click('harvestReadyBox');await click('harvestToJar');await click('harvestFinish');
 await page.locator('[data-plant-seed]').first().click();st=await state();
 check(st.plant.day===1&&st.rhythm.used===7&&st.rhythm.closed&&st.rhythm.lastTurnAt===ts('2027-10-05T06:00:00Z'),'New seed preserves exhausted closed daily ledger');
 check(await page.locator('#adminSkip').isDisabled()&&await page.locator('#adminDaySkip').isDisabled(),'New seed cannot bypass daily limits');
 await page.reload({waitUntil:'networkidle'});check((await state()).rhythm.used===7,'Reseed ledger survives reload');
 check(errors.length===0,'No browser errors: '+errors.join('\n'));
 fs.writeFileSync(out+'/results.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors}));
}finally{await browser?.close();server.close();}
