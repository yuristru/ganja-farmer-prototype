import {showPizza} from './pizza-editor.js?v=20261010o';
import {app,root,state,loadAssets,updateMoney} from './pizza-core.js?v=20261010o';
import {showCity,tickCity,resizeCity,zoomCity,centerCity} from './pizza-city.js?v=20261010o';
import {showRestaurant,tickRestaurant,resizeRestaurant,resetRestaurant,undoRestaurant,updatePlacementPreview,confirmPlacement,cancelPlacement,zoomRestaurant,centerRestaurant,toggleRestaurantPan,restaurantView} from './pizza-restaurant.js?v=20261010o';

import {furnitureIcon} from './pizza-sprites.js?v=20261010o';

const rotateBtn=document.querySelector('#rotateBtn'),deleteBtn=document.querySelector('#deleteBtn');
import {mountCatalog,renderCatalog,showCatalogSizes} from './pizza-catalog-ui.js?v=20261010o';
mountCatalog(()=>{if(restaurantView().panMode)toggleRestaurantPan();cancelPlacement();syncEditUI();});
state.navigate=where=>where==='restaurant'?showRestaurant():showCity();
document.querySelector('#cityBtn').onclick=showCity;
document.querySelector('#restaurantBtn').onclick=showRestaurant;
document.querySelector('#pizzaBtn').onclick=showPizza;

function syncEditUI(){
  rotateBtn.textContent=`Drehen ${state.rotation*90}°`;
  rotateBtn.setAttribute('aria-label',`Möbelstück um 90 Grad drehen. Aktuell ${state.rotation*90} Grad.`);
  deleteBtn.classList.toggle('active',state.deleteMode);deleteBtn.setAttribute('aria-pressed',String(state.deleteMode));
  rotateBtn.disabled=['floor','renovation'].includes(state.selectedTool);
  renderCatalog();
  document.querySelector('#undoBtn').disabled=!state.history.length;
  updatePlacementPreview();resizeRestaurant();
}
state.onEditChange=syncEditUI;
rotateBtn.onclick=()=>{state.rotation=(state.rotation+1)%4;state.deleteMode=false;syncEditUI();};
deleteBtn.onclick=()=>{state.deleteMode=!state.deleteMode;cancelPlacement();syncEditUI();};
document.querySelector('#resetBtn').onclick=()=>{showCatalogSizes();resetRestaurant();};
document.querySelector('#undoBtn').onclick=undoRestaurant;
document.querySelector('#placeBtn').onclick=confirmPlacement;
document.querySelector('#cancelBtn').onclick=cancelPlacement;


for(const button of document.querySelectorAll('[data-speed]')) button.onclick=()=>{
  state.speed=Number(button.dataset.speed);
  for(const other of document.querySelectorAll('[data-speed]')){
    const active=other===button;other.classList.toggle('active',active);other.setAttribute('aria-pressed',String(active));
  }
};
document.querySelector('#zoomInBtn').onclick=()=>zoomCity(1.2);
document.querySelector('#zoomOutBtn').onclick=()=>zoomCity(1/1.2);
document.querySelector('#centerBtn').onclick=centerCity;
document.querySelector('#roomZoomInBtn').onclick=()=>zoomRestaurant(1.25);
document.querySelector('#roomZoomOutBtn').onclick=()=>zoomRestaurant(1/1.25);
document.querySelector('#roomCenterBtn').onclick=centerRestaurant;
document.querySelector('#roomPanBtn').onclick=toggleRestaurantPan;
app.canvas.addEventListener('wheel',event=>{
  if(!['city','restaurant'].includes(state.scene)) return;
  event.preventDefault();const bounds=app.canvas.getBoundingClientRect();
  (state.scene==='city'?zoomCity:zoomRestaurant)(Math.exp(-event.deltaY*.001),{x:(event.clientX-bounds.left)*app.screen.width/bounds.width,y:(event.clientY-bounds.top)*app.screen.height/bounds.height});
},{passive:false});

const dateFormat=new Intl.DateTimeFormat('de-DE',{weekday:'short',day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'});
const timeFormat=new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit',timeZone:'UTC'});
let displayedMinute=-1;
function updateClock(){
  const minute=Math.floor(state.gameMinutes);if(minute===displayedMinute) return;displayedMinute=minute;
  const date=new Date(Date.UTC(2001,3,12)+minute*60000);
  document.querySelector('#gameDate').textContent=dateFormat.format(date);
  document.querySelector('#gameTime').textContent=timeFormat.format(date);
}
updateClock();updateMoney();syncEditUI();
app.ticker.maxFPS=60;
app.ticker.add(ticker=>{
  if(!state.ready||state.speed===0) return;
  const dt=Math.min(ticker.deltaTime,3)*state.speed;
  if(state.scene==='city') tickCity(dt);else if(state.scene==='restaurant')tickRestaurant(dt);
  state.gameMinutes+=Math.min(ticker.deltaMS,50)*state.speed/5000;updateClock();
});

let resizeFrame;
function resize(){
  root.dataset.compact=matchMedia('(max-height:540px) and (min-width:500px)').matches?'landscape':'portrait';
  cancelAnimationFrame(resizeFrame);
  resizeFrame=requestAnimationFrame(()=>{
    app.resize();
    if(!state.ready) return;
    if(state.scene==='city') resizeCity();else resizeRestaurant();
  });
}
new ResizeObserver(resize).observe(root);window.addEventListener('resize',resize);resize();
document.addEventListener('visibilitychange',()=>document.hidden?app.ticker.stop():app.ticker.start());
window.addEventListener('keydown',event=>{
  if(state.scene!=='restaurant'||event.target.closest?.('input,textarea,select,[contenteditable]')) return;
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();undoRestaurant();}
  else if(!event.ctrlKey&&!event.metaKey&&event.key.toLowerCase()==='r') rotateBtn.click();
  else if(event.key==='Enter'&&state.pendingPlacement){event.preventDefault();confirmPlacement();}
  else if(event.key==='Escape'){state.deleteMode=false;cancelPlacement();syncEditUI();}
});

await loadAssets();renderCatalog();state.ready=true;showCity();
