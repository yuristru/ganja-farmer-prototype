import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd(),outDir=path.join(root,'qa','v90-training-camera');
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
await new Promise(r=>server.listen(4179,'127.0.0.1',r));

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:1,hasTouch:true,isMobile:true});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(String(e)));
const url='http://127.0.0.1:4179/';
await page.goto(url,{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__GFTRAIN&&window.__GFCAMERA);
await page.evaluate(()=>window.__GFTRAIN.setDay(30));
await page.waitForTimeout(450);

const results={assertions:{},prune:{},bend:{},pinch:{}};
const cam=()=>page.evaluate(()=>window.__GFCAMERA.snapshot());
const training=()=>page.evaluate(()=>window.__GFTRAIN.getState());

const client=await page.context().newCDPSession(page);
const box=await page.locator('#c').boundingBox();

function segDist(px,py,a,b){
  const vx=b.x-a.x,vy=b.y-a.y,wx=px-a.x,wy=py-a.y,c1=vx*wx+vy*wy;
  if(c1<=0)return Math.hypot(px-a.x,py-a.y);
  const c2=vx*vx+vy*vy;if(c2<=c1)return Math.hypot(px-b.x,py-b.y);
  const t=c1/c2,qx=a.x+t*vx,qy=a.y+t*vy;return Math.hypot(px-qx,py-qy);
}
async function freePoint(){
  const hits=await page.evaluate(()=>window.__GFTRAIN.getHits());
  const candidates=[
    {x:38,y:285},{x:355,y:285},{x:38,y:430},{x:355,y:430},{x:55,y:610},{x:338,y:610}
  ];
  function distanceToPlant(p){
    let d=9999;
    for(const n of hits.nodes||[])d=Math.min(d,Math.hypot(p.x-n.x,p.y-n.y));
    for(const l of hits.leaves||[])d=Math.min(d,Math.hypot(p.x-l.x,p.y-l.y));
    for(const ax of hits.axes||[])for(let i=0;i<(ax.screen||[]).length-1;i++)d=Math.min(d,segDist(p.x,p.y,ax.screen[i],ax.screen[i+1]));
    return d;
  }
  return candidates.map(p=>({...p,d:distanceToPlant(p)})).sort((a,b)=>b.d-a.d)[0];
}
async function touchDrag(id,from,to){
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[
    {x:box.x+from.x,y:box.y+from.y,id,radiusX:2,radiusY:2,force:1}
  ]});
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[
    {x:box.x+to.x,y:box.y+to.y,id,radiusX:2,radiusY:2,force:1}
  ]});
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForTimeout(160);
}
async function pinch(idA,idB,a0,b0,a1,b1){
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[
    {x:box.x+a0.x,y:box.y+a0.y,id:idA,radiusX:2,radiusY:2,force:1},
    {x:box.x+b0.x,y:box.y+b0.y,id:idB,radiusX:2,radiusY:2,force:1}
  ]});
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[
    {x:box.x+a1.x,y:box.y+a1.y,id:idA,radiusX:2,radiusY:2,force:1},
    {x:box.x+b1.x,y:box.y+b1.y,id:idB,radiusX:2,radiusY:2,force:1}
  ]});
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForTimeout(180);
}

// Prune mode: one-finger drag on empty area must orbit and must not cut.
await page.click('[data-mobile-tool="prune"]');
await page.click('[data-prune-target="shoot"]');
await page.waitForTimeout(120);
const freePrune=await freePoint();
const pCam0=await cam(),pTrain0=await training();
await touchDrag(11,freePrune,{x:Math.max(15,freePrune.x-65),y:Math.max(180,freePrune.y-35)});
const pCam1=await cam(),pTrain1=await training();
results.prune={before:pCam0,after:pCam1,freePoint:freePrune};
results.assertions.pruneModeOrbit=(Math.abs(pCam1.yaw-pCam0.yaw)>.05||Math.abs(pCam1.pitch-pCam0.pitch)>.05);
results.assertions.pruneDragDidNotCut=pTrain1.prunes.length===pTrain0.prunes.length;

// Pinch in prune mode must zoom/pan and not cut even if touches start near the plant.
const prZoom0=await cam(),prTrain0=await training();
await pinch(21,22,{x:155,y:420},{x:235,y:420},{x:125,y:402},{x:270,y:438});
const prZoom1=await cam(),prTrain1=await training();
results.pinch.prune={before:prZoom0,after:prZoom1};
results.assertions.pruneModePinchZoom=Math.abs(prZoom1.zoom-prZoom0.zoom)>.08;
results.assertions.prunePinchDidNotCut=prTrain1.prunes.length===prTrain0.prunes.length;

// Bend mode: one-finger drag on free area must orbit, not create bend.
await page.click('[data-mobile-tool="bend"]');
await page.waitForTimeout(120);
const freeBend=await freePoint();
const bCam0=await cam(),bTrain0=await training();
await touchDrag(31,freeBend,{x:Math.max(15,freeBend.x-55),y:Math.min(650,freeBend.y+38)});
const bCam1=await cam(),bTrain1=await training();
results.bend={before:bCam0,after:bCam1,freePoint:freeBend};
results.assertions.bendModeOrbit=(Math.abs(bCam1.yaw-bCam0.yaw)>.05||Math.abs(bCam1.pitch-bCam0.pitch)>.05);
results.assertions.bendCameraDragDidNotBend=bTrain1.bends.length===bTrain0.bends.length;

// Pinch in bend mode must zoom and must not save a bend.
const bz0=await cam(),bt0=await training();
await pinch(41,42,{x:160,y:430},{x:230,y:430},{x:126,y:412},{x:274,y:448});
const bz1=await cam(),bt1=await training();
results.pinch.bend={before:bz0,after:bz1};
results.assertions.bendModePinchZoom=Math.abs(bz1.zoom-bz0.zoom)>.08;
results.assertions.bendPinchDidNotBend=bt1.bends.length===bt0.bends.length;

// Tool mode must remain selected after camera navigation.
results.assertions.bendToolRemainsSelected=(await cam()).interactionMode==='bend';

results.assertions.noBrowserErrors=errors.length===0;
results.pass=Object.values(results.assertions).every(Boolean);
await page.screenshot({path:path.join(outDir,'training-camera-navigation.png'),fullPage:false});
fs.writeFileSync(path.join(outDir,'results.json'),JSON.stringify(results,null,2));
fs.writeFileSync(path.join(outDir,'summary.txt'),[
  'GANJARIUM V90 TRAINING CAMERA QA',
  '',
  `Prune orbit: ${results.assertions.pruneModeOrbit}`,
  `Prune pinch zoom: ${results.assertions.pruneModePinchZoom}`,
  `Bend orbit: ${results.assertions.bendModeOrbit}`,
  `Bend pinch zoom: ${results.assertions.bendModePinchZoom}`,
  `No accidental cut/bend: ${results.assertions.pruneDragDidNotCut&&results.assertions.prunePinchDidNotCut&&results.assertions.bendCameraDragDidNotBend&&results.assertions.bendPinchDidNotBend}`,
  `PASS: ${results.pass}`
].join('\n'));
console.log(JSON.stringify(results,null,2));
if(!results.pass)process.exitCode=1;

await client.detach();
await context.close();await browser.close();await new Promise(r=>server.close(r));
