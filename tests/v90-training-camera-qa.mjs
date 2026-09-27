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

function segDist(px,py,a,b){
  const vx=b.x-a.x,vy=b.y-a.y,wx=px-a.x,wy=py-a.y,c1=vx*wx+vy*wy;
  if(c1<=0)return Math.hypot(px-a.x,py-a.y);
  const c2=vx*vx+vy*vy;if(c2<=c1)return Math.hypot(px-b.x,py-b.y);
  const t=c1/c2,qx=a.x+t*vx,qy=a.y+t*vy;return Math.hypot(px-qx,py-qy);
}
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
const free=candidates.map(p=>({...p,d:distanceToPlant(p)})).sort((a,b)=>b.d-a.d)[0];
const box=await page.locator('#c').boundingBox();
async function drag(from,to){
  await page.mouse.move(box.x+from.x,box.y+from.y);
  await page.mouse.down();
  await page.mouse.move(box.x+to.x,box.y+to.y,{steps:8});
  await page.mouse.up();
  await page.waitForTimeout(140);
}

// Prune mode: empty-area drag must orbit and must not cut.
await page.click('[data-mobile-tool="prune"]');
await page.click('[data-prune-target="shoot"]');
const pCam0=await cam(),pTrain0=await training();
await drag(free,{x:Math.max(15,free.x-65),y:Math.max(180,free.y-35)});
const pCam1=await cam(),pTrain1=await training();
results.prune={before:pCam0,after:pCam1,freePoint:free};
results.assertions.pruneModeOrbit=(Math.abs(pCam1.yaw-pCam0.yaw)>.05||Math.abs(pCam1.pitch-pCam0.pitch)>.05);
results.assertions.pruneDragDidNotCut=pTrain1.prunes.length===pTrain0.prunes.length;

// Pinch in prune mode must zoom/pan and not cut even if first touch starts near plant center.
const client=await page.context().newCDPSession(page);
const prZoom0=await cam(),prTrain0=await training();
await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[
  {x:155,y:420,id:1,radiusX:2,radiusY:2,force:1},
  {x:235,y:420,id:2,radiusX:2,radiusY:2,force:1}
]});
await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[
  {x:125,y:402,id:1,radiusX:2,radiusY:2,force:1},
  {x:270,y:438,id:2,radiusX:2,radiusY:2,force:1}
]});
await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
await page.waitForTimeout(180);
const prZoom1=await cam(),prTrain1=await training();
results.pinch.prune={before:prZoom0,after:prZoom1};
results.assertions.pruneModePinchZoom=Math.abs(prZoom1.zoom-prZoom0.zoom)>.08;
results.assertions.prunePinchDidNotCut=prTrain1.prunes.length===prTrain0.prunes.length;

// Bend mode: drag on free area must orbit, not create bend.
await page.click('[data-mobile-tool="bend"]');
const bCam0=await cam(),bTrain0=await training();
await drag(free,{x:Math.max(15,free.x-55),y:Math.min(650,free.y+38)});
const bCam1=await cam(),bTrain1=await training();
results.bend={before:bCam0,after:bCam1};
results.assertions.bendModeOrbit=(Math.abs(bCam1.yaw-bCam0.yaw)>.05||Math.abs(bCam1.pitch-bCam0.pitch)>.05);
results.assertions.bendCameraDragDidNotBend=bTrain1.bends.length===bTrain0.bends.length;

// Pinch in bend mode must zoom and must not save a bend.
const bz0=await cam(),bt0=await training();
await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[
  {x:160,y:430,id:3,radiusX:2,radiusY:2,force:1},
  {x:230,y:430,id:4,radiusX:2,radiusY:2,force:1}
]});
await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[
  {x:126,y:412,id:3,radiusX:2,radiusY:2,force:1},
  {x:274,y:448,id:4,radiusX:2,radiusY:2,force:1}
]});
await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
await page.waitForTimeout(180);
const bz1=await cam(),bt1=await training();
results.pinch.bend={before:bz0,after:bz1};
results.assertions.bendModePinchZoom=Math.abs(bz1.zoom-bz0.zoom)>.08;
results.assertions.bendPinchDidNotBend=bt1.bends.length===bt0.bends.length;

// Tool mode must remain selected after camera navigation.
results.assertions.bendToolRemainsSelected=(await cam()).interactionMode==='bend';

// Desktop wheel zoom is global too.
const wheel0=await cam();
await page.mouse.move(box.x+free.x,box.y+free.y);
await page.mouse.wheel(0,-420);
await page.waitForTimeout(180);
const wheel1=await cam();
results.assertions.wheelZoomInTraining=Math.abs(wheel1.zoom-wheel0.zoom)>.03;

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
