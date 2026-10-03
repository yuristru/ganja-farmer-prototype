const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const root=process.cwd(),out=path.join(root,'qa/v110');fs.mkdirSync(out,{recursive:true});
const hook=`window.__ROOM110={capture:()=>{buildWorldBackground();const c=worldBgCanvas,p=roomEquipmentPlacements();const hash=data=>{let h=2166136261;for(const b of data)h=Math.imul(h^b,16777619);return h>>>0;};const layers={};for(const id of ['light','vent']){const a=p.find(p=>p.id===id),strip=roomEquipmentLoaded.get(id),seg=strip.segments[a.level-1],layer=document.createElement('canvas');layer.width=c.width;layer.height=c.height;const g=layer.getContext('2d');g.setTransform(DPR,0,0,DPR,0,0);if(id==='light')window.GanjariumRoomHardware.drawLight(g,a);window.GanjariumRoomHardware.draw(g,a,strip.img,seg);layers[id]=hash(g.getImageData(0,0,layer.width,layer.height).data);}return{source:growRoomBackgroundPath(),layers,placements:p.map(({view,...a})=>a),world:hash(c.getContext('2d').getImageData(0,0,c.width,c.height).data),state:JSON.stringify({plant:gameState.plant,care:gameState.care,setup:gameState.setup,turn:gameState.turn,progression:gameState.progression,coins:gameState.coins,training:gameState.training})};}};`;
const mime={'.html':'text/html','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.json':'application/json','.svg':'image/svg+xml','.b64':'text/plain'};
const server=http.createServer((req,res)=>{const rel=decodeURIComponent(req.url.split('?')[0]),file=path.resolve(root,rel==='/'?'index.html':'.'+rel);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}if(file.endsWith('index.html'))data=Buffer.from(data.toString().replace('resize();\n})();','resize();\n'+hook+'\n})();'));res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(data);});});
(async()=>{await new Promise(r=>server.listen(4110,'127.0.0.1',r));let browser;
try{browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const page=await browser.newPage({viewport:{width:393,height:852}}),errors=[],requests=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>requests.push(r.url()));
await page.goto('http://127.0.0.1:4110/',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__GFROOMEQ?.placements().length===6&&window.__ROOM110);
await page.evaluate(()=>window.__GFROOMEQ.setLevels({light:1,vent:1}));const base=await page.evaluate(()=>window.__ROOM110.capture());
const lampHashes=new Map(),ventHashes=new Map(),worldHashes=new Set();
for(let light=1;light<=5;light++)for(let vent=1;vent<=5;vent++){
await page.evaluate(levels=>window.__GFROOMEQ.setLevels(levels),{light,vent});await page.waitForTimeout(40);const s=await page.evaluate(()=>window.__ROOM110.capture());
assert.equal(s.source,base.source,'Background changed with upgrade');assert.equal(s.state,base.state,'Demo mutated game state');
if(lampHashes.has(light))assert.equal(s.layers.light,lampHashes.get(light),'Vent changed lamp or light cone');else lampHashes.set(light,s.layers.light);
if(ventHashes.has(vent))assert.equal(s.layers.vent,ventHashes.get(vent),'Lamp changed ventilation');else ventHashes.set(vent,s.layers.vent);
worldHashes.add(s.world);await page.screenshot({path:path.join(out,`l${light}-v${vent}.png`)});
}
assert.equal(new Set(lampHashes.values()).size,5);assert.equal(new Set(ventHashes.values()).size,5);assert.equal(worldHashes.size,25);
// Exercise real demo controls rather than only the debug setter.
await page.evaluate(()=>window.__GFROOMEQ.setLevels({light:2,vent:2}));let before=await page.evaluate(()=>window.__ROOM110.capture());
await page.click('#upgradeDemoControls [data-demo-upgrade="vent"]');let after=await page.evaluate(()=>window.__ROOM110.capture());assert.equal(before.layers.light,after.layers.light);assert.notEqual(before.layers.vent,after.layers.vent);
before=after;await page.click('#upgradeDemoControls [data-demo-upgrade="light"]');after=await page.evaluate(()=>window.__ROOM110.capture());assert.equal(before.layers.vent,after.layers.vent);assert.notEqual(before.layers.light,after.layers.light);
for(const width of [320,370,393,430]){await page.setViewportSize({width,height:Math.round(width*852/393)});await page.waitForTimeout(350);await page.evaluate(()=>window.__GFROOMEQ.setLevels({light:5,vent:5}));const s=await page.evaluate(()=>window.__ROOM110.capture());for(const p of s.placements.filter(p=>['light','vent'].includes(p.id))){assert(p.x>=0&&p.x+p.width<=width,'Hardware cropped');assert(p.y>=0,'Hardware above viewport');}await page.screenshot({path:path.join(out,`mobile-${width}.png`)});}
assert(!requests.some(u=>/growroom-l\d-v\d/.test(u)),'Legacy combination backgrounds requested');assert.deepEqual(errors,[]);
console.log('V110 passed: 25 unique combinations, pixel-identical independent hardware and light effects, real demo controls, unchanged game state, four mobile sizes.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exit(1)});
