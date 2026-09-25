(function(){
'use strict';
const API={version:1};
const PREVIEW_SIZE={w:220,h:150};
const previewCache=new Map();
let previewRenderer=null,previewScene=null,previewCamera=null;
let roomRenderer=null,roomScene=null,roomCamera=null,roomRoot=null,roomCanvas=null,roomSignature='',raf=0;

function C(hex,opts={}){return new THREE.MeshStandardMaterial({color:hex,roughness:opts.roughness??.48,metalness:opts.metalness??.28,emissive:opts.emissive??0x000000,emissiveIntensity:opts.emissiveIntensity??0,transparent:!!opts.transparent,opacity:opts.opacity??1});}
const MAT={
  dark:()=>C(0x182126,{roughness:.42,metalness:.62}),
  black:()=>C(0x080d10,{roughness:.5,metalness:.45}),
  steel:()=>C(0x6f8087,{roughness:.28,metalness:.82}),
  green:()=>C(0x45d84d,{roughness:.36,metalness:.25,emissive:0x103d16,emissiveIntensity:.38}),
  blue:()=>C(0x36a9ff,{roughness:.34,metalness:.28,emissive:0x0a3152,emissiveIntensity:.48}),
  purple:()=>C(0xb759ff,{roughness:.34,metalness:.3,emissive:0x35104e,emissiveIntensity:.5}),
  gold:()=>C(0xe8b539,{roughness:.3,metalness:.62}),
  white:()=>C(0xeef6df,{roughness:.55,metalness:.08}),
  soil:()=>C(0x38251a,{roughness:.92,metalness:0}),
  rubber:()=>C(0x101517,{roughness:.88,metalness:.04})
};
function mesh(g,m,p=[0,0,0],r=[0,0,0],s=[1,1,1]){const o=new THREE.Mesh(g,m);o.position.set(...p);o.rotation.set(...r);o.scale.set(...s);return o}
function box(w,h,d,m,p=[0,0,0],r=[0,0,0]){return mesh(new THREE.BoxGeometry(w,h,d),m,p,r)}
function cyl(rt,rb,h,seg,m,p=[0,0,0],r=[0,0,0]){return mesh(new THREE.CylinderGeometry(rt,rb,h,seg),m,p,r)}
function torus(R,t,m,p=[0,0,0],r=[0,0,0],arc=Math.PI*2){return mesh(new THREE.TorusGeometry(R,t,8,32,arc),m,p,r)}
function sphere(r,m,p=[0,0,0]){return mesh(new THREE.SphereGeometry(r,16,10),m,p)}
function group(){return new THREE.Group()}
function labelPlate(parent,w=.9,h=.28,color=0x45d84d,y=.0,z=.0){const plate=box(w,h,.05,C(0x0b1114,{roughness:.45,metalness:.5}),[0,y,z]);const line=box(w*.78,.035,.06,C(color,{emissive:color,emissiveIntensity:.7}),[0,y,z+.035]);parent.add(plate,line);}

function buildPot(level,opts={}){
  const g=group(),t=(level-1)/9,body=MAT.dark(),rim=level>=7?MAT.gold():level>=4?MAT.green():MAT.steel();
  const r=.73+t*.20,h=1.0+t*.22;
  g.add(cyl(r*.96,r,h,32,body,[0,0,0]));
  g.add(torus(r,.075,rim,[0,h*.48,0],[Math.PI/2,0,0]));
  g.add(cyl(r*.82,r*.86,.08,32,MAT.soil(),[0,h*.49,0]));
  if(level>=3){
    const holes=level>=7?18:12;
    for(let i=0;i<holes;i++){const a=i/holes*Math.PI*2;g.add(sphere(.045,level>=7?MAT.green():MAT.black(),[Math.cos(a)*r*1.005,-.12+((i%2)*.32),Math.sin(a)*r*1.005]));}
  }
  if(level>=8){g.add(cyl(r*1.12,r*1.12,.10,32,MAT.green(),[0,-h*.52,0]));}
  labelPlate(g,.74,.23,level>=7?0x8cff58:0x45d84d,-.12,r+.025);
  g.userData.previewScale=1.15;return g;
}
function buildSubstrate(level){
  const g=group(),t=(level-1)/9,bag=box(1.2,1.45,.52,C(level>=8?0x294b2e:0x34413a,{roughness:.78,metalness:.03}),[0,0,0]);
  g.add(bag);g.add(box(1.03,.25,.54,level>=7?MAT.green():MAT.gold(),[0,.36,.02]));
  labelPlate(g,.72,.22,level>=7?0x8cff58:0xe8b539,-.12,.29);
  const grains=6+Math.round(t*8);for(let i=0;i<grains;i++){const a=i/grains*Math.PI*2;g.add(sphere(.045+(i%3)*.008,i%2?MAT.white():MAT.soil(),[(i%4-.5)*.17,-.48+(i%3)*.08,.29]));}
  g.userData.previewScale=1.0;return g;
}
function buildLight(level){
  const g=group(),t=(level-1)/9,wide=1.55+t*1.05,depth=.88+t*.28,body=level>=8?MAT.black():MAT.dark();
  if(level===1){const sun=sphere(.55,C(0xffd85a,{emissive:0xffb829,emissiveIntensity:1.8,roughness:.5,metalness:0}));g.add(sun);g.userData.previewScale=.95;return g;}
  const count=level>=8?2:1;
  for(let n=0;n<count;n++){
    const x=count===2?(n?wide*.47:-wide*.47):0;
    g.add(box(wide*(count===2?.82:1),.20,depth,body,[x,.18,0]));
    g.add(box(wide*(count===2?.70:.88),.035,depth*.78,C(level>=8?0xe1b8ff:0xfff1b2,{emissive:level>=8?0xb84dff:0xffcf55,emissiveIntensity:1.25,roughness:.2,metalness:.08}),[x,.055,0]));
    const diodes=4+Math.floor(level/2);
    for(let i=0;i<diodes;i++){g.add(sphere(.025,C(i%3===0&&level>=6?0xd36aff:0xeaffc8,{emissive:i%3===0&&level>=6?0xa22dff:0xbfff7a,emissiveIntensity:1.8}),[x-wide*.32+(i/(Math.max(1,diodes-1)))*wide*.64,.03,depth*.2]));}
  }
  for(const x of [-wide*.34,wide*.34]){g.add(cyl(.015,.015,.72,8,MAT.steel(),[x,.65,0]));}
  if(level>=5)g.add(box(wide*.56,.12,.22,MAT.steel(),[0,.39,0]));
  g.userData.previewScale=.9;g.userData.kind='light';return g;
}
function fanBlade(mat,ang,r=.58){const blade=box(.16,r,.055,mat,[0,.12,0],[0,0,ang]);blade.geometry.translate(0,r*.36,0);return blade}
function buildVent(level){
  const g=group(),t=(level-1)/9;
  if(level===1){g.add(torus(.72,.08,MAT.steel(),[0,0,0]));for(let i=0;i<3;i++)g.add(fanBlade(MAT.steel(),i*Math.PI*2/3,.55));g.userData.previewScale=1;g.userData.kind='fan';return g;}
  const ring=level>=7?MAT.green():MAT.steel();g.add(torus(.78,.10,ring,[0,0,0]));
  g.add(cyl(.14,.14,.24,18,MAT.dark(),[0,0,0],[Math.PI/2,0,0]));
  const blades=level>=6?7:5,bladeRoot=group();for(let i=0;i<blades;i++)bladeRoot.add(fanBlade(level>=8?MAT.green():MAT.steel(),i*Math.PI*2/blades,.62));g.add(bladeRoot);bladeRoot.userData.spin=true;
  if(level>=6){g.add(cyl(.92,.92,.35,32,MAT.dark(),[0,0,-.26],[Math.PI/2,0,0]));g.add(torus(.88,.05,ring,[0,0,-.45]));}
  if(level>=9)labelPlate(g,.68,.20,0x65ff6a,-.58,.08);
  g.userData.previewScale=.92;g.userData.kind='fan';return g;
}
function buildIrrigation(level){
  const g=group(),t=(level-1)/9;
  if(level<=2){
    const body=cyl(.55,.62,.72,24,level===2?MAT.blue():MAT.steel(),[0,-.15,0]);g.add(body);
    const handle=torus(.50,.045,MAT.steel(),[0,.28,0],[Math.PI/2,0,0],Math.PI);g.add(handle);
    g.add(cyl(.10,.16,.82,16,MAT.steel(),[.64,.08,0],[0,0,-Math.PI*.32]));g.userData.previewScale=1.05;return g;
  }
  const tankMat=C(0x58bfff,{roughness:.18,metalness:.08,transparent:true,opacity:.55,emissive:0x0d4a78,emissiveIntensity:.32});
  g.add(box(1.28,.88,.78,tankMat,[0,-.05,0]));g.add(box(1.38,.10,.86,MAT.dark(),[0,.44,0]));g.add(box(1.38,.11,.86,MAT.dark(),[0,-.50,0]));
  g.add(cyl(.09,.09,.40,12,MAT.blue(),[.76,-.10,0],[0,0,Math.PI/2]));
  if(level>=5){const hose=torus(.68,.035,MAT.blue(),[.44,-.12,0],[Math.PI/2,0,Math.PI*.18],Math.PI*1.25);g.add(hose);}
  if(level>=8){g.add(box(.54,.32,.08,MAT.dark(),[-.20,.07,.44]));labelPlate(g,.40,.16,0x45d8ff,.07,.49);}
  g.userData.previewScale=.95;return g;
}
function buildNutrients(level){
  const g=group(),count=Math.min(3,1+Math.floor((level-1)/3)),colors=[0x49db58,0xb35aff,0xf3a72f];
  for(let i=0;i<count;i++){const x=(i-(count-1)/2)*.58;g.add(cyl(.22,.26,.82,18,C(colors[i],{roughness:.42,metalness:.08}),[x,-.08,0]));g.add(cyl(.16,.16,.14,16,MAT.black(),[x,.40,0]));labelPlate(g,.30,.18,colors[i],-.07,.27);}
  if(level>=7){g.add(box(1.25,.16,.54,MAT.dark(),[0,-.58,0]));for(let i=0;i<count;i++)g.add(cyl(.08,.08,.16,12,MAT.steel(),[(i-(count-1)/2)*.58,-.45,.25]));}
  g.userData.previewScale=1.02;return g;
}
function buildSensor(level){
  const g=group(),t=(level-1)/9;
  if(level===1){g.add(cyl(.045,.045,1.25,8,MAT.steel(),[0,-.15,0]));g.add(sphere(.12,MAT.green(),[0,.48,0]));g.userData.previewScale=1.05;return g;}
  g.add(box(1.0,.76,.18,MAT.dark(),[0,.12,0]));
  g.add(box(.78,.48,.035,C(level>=7?0x163f55:0x183d2d,{emissive:level>=7?0x0e87c0:0x1d6f3a,emissiveIntensity:.55,roughness:.25,metalness:.08}),[0,.12,.108]));
  for(let i=0;i<3;i++)g.add(box(.14,.055,.02,i===0?MAT.green():i===1?MAT.blue():MAT.gold(),[-.24+i*.24,.11,.135]));
  g.add(cyl(.035,.035,.78,8,MAT.steel(),[0,-.64,0]));
  if(level>=6){g.add(box(.28,.18,.12,MAT.black(),[.48,.48,0]));g.add(sphere(.045,MAT.green(),[.48,.48,.08]));}
  g.userData.previewScale=1.0;return g;
}
function buildModel(category,level,opts={}){
  level=Math.max(1,Math.min(10,Number(level)||1));
  let o;
  if(category==='pot')o=buildPot(level,opts);
  else if(category==='substrate')o=buildSubstrate(level);
  else if(category==='light')o=buildLight(level);
  else if(category==='vent')o=buildVent(level);
  else if(category==='irrigation')o=buildIrrigation(level);
  else if(category==='nutrients')o=buildNutrients(level);
  else if(category==='sensor')o=buildSensor(level);
  else o=group();
  o.userData.category=category;o.userData.level=level;
  return o;
}
API.buildModel=buildModel;
API.catalog=['pot','substrate','light','vent','irrigation','nutrients','sensor'].flatMap(category=>Array.from({length:10},(_,i)=>({id:category+'-'+(i+1),category,level:i+1})));

function disposeObject(root){root.traverse(o=>{o.geometry?.dispose?.();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose?.());else o.material.dispose?.();}});}
function initPreview(){
  if(previewRenderer||!window.THREE)return !!previewRenderer;
  previewRenderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});
  previewRenderer.setPixelRatio(1);previewRenderer.setSize(PREVIEW_SIZE.w,PREVIEW_SIZE.h,false);previewRenderer.setClearColor(0x000000,0);
  previewRenderer.outputEncoding=THREE.sRGBEncoding;
  previewScene=new THREE.Scene();previewCamera=new THREE.PerspectiveCamera(32,PREVIEW_SIZE.w/PREVIEW_SIZE.h,.1,100);previewCamera.position.set(0,1.0,6.2);previewCamera.lookAt(0,0,0);
  previewScene.add(new THREE.HemisphereLight(0xe8fff0,0x0b1418,1.55));const k=new THREE.DirectionalLight(0xffffff,2.0);k.position.set(-3,4,5);previewScene.add(k);const r=new THREE.DirectionalLight(0x66ff99,.85);r.position.set(4,1,-3);previewScene.add(r);
  return true;
}
function previewKey(category,level){return category+':'+level}
function renderMaster(category,level){
  const key=previewKey(category,level);if(previewCache.has(key))return previewCache.get(key);if(!initPreview())return null;
  const obj=buildModel(category,level);const scale=obj.userData.previewScale||1;obj.scale.setScalar(scale);obj.rotation.y=-.55;obj.rotation.x=.12;previewScene.add(obj);previewRenderer.render(previewScene,previewCamera);
  const c=document.createElement('canvas');c.width=PREVIEW_SIZE.w;c.height=PREVIEW_SIZE.h;c.getContext('2d').drawImage(previewRenderer.domElement,0,0);
  previewScene.remove(obj);disposeObject(obj);previewCache.set(key,c);return c;
}
API.renderPreview=function(canvas,category,level){
  if(!canvas)return;const master=renderMaster(category,level);if(!master)return;
  const dpr=Math.min(2,window.devicePixelRatio||1),w=Number(canvas.dataset.eqWidth||canvas.clientWidth||96),h=Number(canvas.dataset.eqHeight||canvas.clientHeight||62);
  canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
  const sc=Math.min(w/master.width,h/master.height)*1.22,dw=master.width*sc,dh=master.height*sc;c.drawImage(master,(w-dw)/2,(h-dh)/2,dw,dh);
};
API.renderPreviews=function(root=document){root.querySelectorAll('canvas[data-eq3d]').forEach(c=>API.renderPreview(c,c.dataset.eq3d,Number(c.dataset.eqLevel||1)));};

function initRoom(canvas){
  if(!canvas||roomRenderer)return !!roomRenderer;roomCanvas=canvas;
  roomRenderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  roomRenderer.setPixelRatio(Math.min(1.5,window.devicePixelRatio||1));roomRenderer.setClearColor(0x000000,0);roomRenderer.outputEncoding=THREE.sRGBEncoding;
  roomScene=new THREE.Scene();roomCamera=new THREE.OrthographicCamera(-4,4,8.6,-8.6,.1,50);roomCamera.position.set(0,0,12);roomCamera.lookAt(0,0,0);
  roomScene.add(new THREE.HemisphereLight(0xeaffee,0x071014,1.28));const key=new THREE.DirectionalLight(0xffffff,1.75);key.position.set(-4,7,7);roomScene.add(key);const green=new THREE.PointLight(0x63ff67,.7,18);green.position.set(0,-1,7);roomScene.add(green);
  roomRoot=new THREE.Group();roomScene.add(roomRoot);resizeRoom();window.addEventListener('resize',resizeRoom,{passive:true});animateRoom();return true;
}
function resizeRoom(){if(!roomRenderer||!roomCanvas)return;const r=roomCanvas.getBoundingClientRect();if(!r.width||!r.height)return;roomRenderer.setSize(r.width,r.height,false);const aspect=r.width/r.height,halfH=8.6;roomCamera.left=-halfH*aspect;roomCamera.right=halfH*aspect;roomCamera.top=halfH;roomCamera.bottom=-halfH;roomCamera.updateProjectionMatrix();}
function clearRoom(){if(!roomRoot)return;while(roomRoot.children.length){const o=roomRoot.children.pop();disposeObject(o);}}
function addRoomModel(category,level,pos,scale,rot=[0,0,0]){if(level<=0)return null;const o=buildModel(category,level);o.position.set(...pos);o.scale.setScalar(scale);o.rotation.set(...rot);roomRoot.add(o);return o;}
API.mountRoom=function(canvas){return initRoom(canvas)};
API.syncRoom=function(levels={}){
  // V46 hybrid renderer: only the pot remains real Three.js geometry.
  // Every other upgrade is a high-detail transparent PNG sprite in the HUD scene.
  if(!roomRenderer||!roomRoot)return;
  const sig='pot:'+(levels.pot||1)+'|substrate:'+(levels.substrate||1);
  if(sig===roomSignature)return;roomSignature=sig;clearRoom();
  const pot=addRoomModel('pot',levels.pot||1,[0,-3.65,0],.82,[0,.15,0]);
  if(pot){
    const soilTone=Math.max(1,levels.substrate||1);
    const soil=pot.children.find(x=>x.material&&x.material.color&&x.position.y>.35);
    if(soil&&soil.material?.color)soil.material.color.offsetHSL(0,Math.min(.12,soilTone*.008),Math.min(.10,soilTone*.004));
  }
};
function animateRoom(){
  raf=requestAnimationFrame(animateRoom);if(!roomRenderer||!roomScene)return;
  const t=performance.now()*.001;
  roomRoot?.traverse(o=>{if(o.userData?.spin)o.rotation.z=t*4.2;});
  roomRenderer.render(roomScene,roomCamera);
}
API.destroy=function(){cancelAnimationFrame(raf);if(roomRenderer){roomRenderer.dispose();roomRenderer=null;}if(previewRenderer){previewRenderer.dispose();previewRenderer=null;}previewCache.clear();};
window.GanjariumEquipment3D=API;
})();