import {Application,Container,Graphics,Sprite,Texture,Text,Rectangle} from './assets/pizza/vendor/pixi-8.22.0.mjs';
import {copyLayout,upgradeLayout} from './pizza-layout.js?v=20261010h';
export {Container,Graphics,Sprite,Texture,Text,Rectangle};

export const root=document.querySelector('#app');
const loading=document.querySelector('#loading');
export const app=new Application();
await app.init({resizeTo:root,background:'#171416',antialias:false,autoDensity:true,resolution:Math.min(devicePixelRatio||1,2),preference:'webgl'});
root.prepend(app.canvas);
app.canvas.setAttribute('aria-label','Isometrische Stadt und Restaurant-Einrichtung');
app.stage.eventMode='static';
export const world=new Container();
app.stage.addChild(world);
export const TW=64,TH=32,CITY_N=26;
const SAVE_KEY='pizza-city-layout-v1';

function restore(){
  try{
    const saved=JSON.parse(localStorage.getItem(SAVE_KEY));
    const items=upgradeLayout(saved?.items,saved?.version);
    if(items) return items;
  }catch{}
  return copyLayout();
}

export const state={scene:null,camera:null,cityView:null,cityGesture:null,movers:[],selectedTool:'table',selectedSeats:4,rotation:0,deleteMode:false,pendingPlacement:null,navigate:null,onEditChange:null,cityTex:{},cityArt:{},restaurantState:restore(),history:[],speed:1,gameMinutes:11*60+30,ready:false,assetFailures:[]};

export function iso(x,y,ox=0,oy=0){return{x:ox+(x-y)*TW/2,y:oy+(x+y)*TH/2};}
export function hash(x,y,s=94117){let n=(x*374761393+y*668265263+s*69069)>>>0;n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;}
export function label(text,size=11,color='#fff1cf'){return new Text({text,style:{fontFamily:'Georgia, serif',fontSize:size,fill:color,fontWeight:'900'}});}
export function clearWorld(){
  app.stage.removeAllListeners();
  state.movers=[];
  state.pendingPlacement=null;
  world.removeChildren().forEach(child=>child.destroy({children:true}));
}

export function sceneUI(scene){
  const restaurant=scene==='restaurant';
  root.dataset.scene=scene;
  document.querySelector('#tools').hidden=!restaurant;
  document.querySelector('#roomControls').hidden=!restaurant;
  document.querySelector('#restaurantHead').hidden=!restaurant;
  document.querySelector('#placementHint').hidden=!restaurant;
  document.querySelector('#cityHint').hidden=restaurant;
  document.querySelector('#cityControls').hidden=restaurant;
  document.querySelector('#credit').hidden=restaurant;
  for(const id of ['city','restaurant']){
    const button=document.querySelector(`#${id}Btn`),active=id===scene;
    button.classList.toggle('active',active);
    button.setAttribute('aria-pressed',String(active));
  }
}

export function localRect(element){
  const rect=element.getBoundingClientRect(),base=root.getBoundingClientRect();
  return {left:rect.left-base.left,right:rect.right-base.left,top:rect.top-base.top,bottom:rect.bottom-base.top};
}

export function sceneViewport(restaurant=false){
  const topElement=restaurant?(root.dataset.compact==='landscape'?'#restaurantHead':'#placementHint'):'.topbar';
  const top=localRect(document.querySelector(topElement)).bottom+12;
  const nav=localRect(document.querySelector('#cityBtn').closest('.bottomnav'));
  let right=app.screen.width-12,bottom=nav.top-12;
  if(restaurant){
    const tools=localRect(document.querySelector('#tools'));
    if(root.dataset.compact==='landscape') right=tools.left-12;
    else bottom=tools.top-12;
  }
  return {left:12,top,right,bottom,width:Math.max(1,right-12),height:Math.max(1,bottom-top)};
}

let toastTimer;
export function notify(message){
  const toast=document.querySelector('#toast');
  toast.textContent=message;toast.hidden=false;
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.hidden=true;},2400);
}

export function saveLayout(){
  try{localStorage.setItem(SAVE_KEY,JSON.stringify({version:2,items:state.restaurantState}));return true;}
  catch{notify('Einrichtung bleibt in dieser Sitzung erhalten.');return false;}
}

export function rememberEdit(){
  state.history.push(copyLayout(state.restaurantState));
  if(state.history.length>50) state.history.shift();
}

// The city remains usable even if its atlas cannot be loaded.
const fallbackCache=new Map();
function fallback(){
  if(fallbackCache.has('city')) return fallbackCache.get('city');
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=80;
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
  const polygon=(points,color)=>{ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();};
  polygon([[7,30],[32,43],[32,73],[7,60]],'#875c3c');polygon([[32,43],[57,30],[57,60],[32,73]],'#61472f');polygon([[7,30],[32,17],[57,30],[32,43]],'#b68452');
  const texture=Texture.from(canvas);texture.source.scaleMode='nearest';fallbackCache.set('city',texture);return texture;
}

async function loadCityAtlas(){
  try{
    const image=new Image();image.src='./assets/pizza/city/pixel-city.png';await image.decode();
    const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
    const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
    const data=ctx.getImageData(0,0,canvas.width,canvas.height);
    for(let i=0;i<data.data.length;i+=4) if(data.data[i]===255&&data.data[i+1]===0&&data.data[i+2]===255) data.data[i+3]=0;
    ctx.putImageData(data,0,0);
    const atlas=Texture.from(canvas);atlas.source.scaleMode='nearest';
    const frames={small:[[83,400,34,29],[263,373,34,25],[304,403,34,25]],medium:[[45,224,52,65],[45,303,52,50],[4,370,52,58],[124,297,34,53]],big:[[3,227,34,60],[123,217,34,70],[163,220,34,67],[164,289,34,62],[124,368,34,60],[164,372,34,56]]};
    for(const [type,rects] of Object.entries(frames)) state.cityTex[type]=rects.map(rect=>new Texture({source:atlas.source,frame:new Rectangle(...rect)}));
  }catch(error){
    console.warn('Unable to load city atlas',error);state.assetFailures.push('city');
    for(const type of ['small','medium','big']) state.cityTex[type]=[fallback()];
  }
}

export async function loadAssets(){
  const {loadCityArt}=await import('./pizza-city-art.js?v=20261010h');
  await loadCityArt();
  if(!state.cityArt.buildings) await loadCityAtlas();
  loading.hidden=true;
  if(state.assetFailures.length) notify('Einige Grafiken konnten nicht geladen werden.');
}

export function makePerson(i){
  const g=new Graphics(),colors=[0xb34536,0x416f98,0x56804b,0xca9a36,0x80567b];
  g.ellipse(0,1,4,2).fill({color:0,alpha:.22});g.rect(-2,-10,4,7).fill(colors[i%colors.length]);g.rect(-1,-13,3,3).fill(0xce9870);g.rect(-2,-3,1,4).fill(0x282630);g.rect(1,-3,1,4).fill(0x282630);return g;
}
