import {state} from './pizza-core.js?v=20261011c';
import {PRODUCTS,ROOM_PRODUCTS,CATEGORIES,product,roomProduct,itemPrice,money} from './pizza-catalog.js?v=20261011c';
import {furnitureIcon} from './pizza-sprites.js?v=20261011c';
let qualityStep=false,onChoose=()=>{};
function choose(p,seats){state.selectedTool=p.type;state.selectedVariant=p.id;if(seats)state.selectedSeats=seats;state.deleteMode=false;onChoose();}
export function mountCatalog(callback){
  onChoose=callback;
  for(const category of CATEGORIES){
    const button=document.createElement('button');button.type='button';button.className='categorybtn';button.dataset.category=category.id;button.textContent=category.name;
    button.onclick=()=>{qualityStep=category.id==='table';choose([...PRODUCTS,...ROOM_PRODUCTS].find(p=>p.category===category.id));};document.querySelector('#catalogCategories').append(button);
  }
  document.querySelector('#catalogBack').onclick=()=>{qualityStep=true;renderCatalog();};
}
function card(p,seats,tier=false){
  const button=document.createElement('button');button.type='button';button.className='toolbtn catalogCard';button.dataset.tool=p.type;button.dataset.variant=p.id;if(seats)button.dataset.seats=seats;if(tier)button.dataset.quality=p.id;
  const active=!state.deleteMode&&p.type===state.selectedTool&&p.id===state.selectedVariant&&(!seats||seats===state.selectedSeats);
  button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
  const name=seats?seats+'er-Tisch':p.name,price=itemPrice({type:p.type,variant:p.id,seats:seats||2});
  button.setAttribute('aria-label',name+', '+(tier?'ab ':'')+money(price));
  const image=document.createElement('img');image.src=furnitureIcon(p.type,seats||4,p.id);image.alt='';image.className='furnitureIcon';
  const label=document.createElement('span');label.textContent=name;
  const cost=document.createElement('small');cost.textContent=(tier?'ab ':'')+money(price);
  button.append(image,label,cost);button.onclick=()=>{if(tier)qualityStep=false;choose(p,seats);};return button;
}
export function renderCatalog(){
  const selected=roomProduct({type:state.selectedTool,variant:state.selectedVariant})||product({type:state.selectedTool,variant:state.selectedVariant})||PRODUCTS.find(p=>p.id==='wood'),category=selected.category;
  for(const button of document.querySelectorAll('[data-category]')){const active=button.dataset.category===category;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));}
  const options=document.querySelector('#catalogOptions'),scroll=options.scrollLeft;options.replaceChildren();options.classList.toggle('tableOptions',category==='table');
  document.querySelector('#catalogBack').hidden=category!=='table'||qualityStep;
  document.querySelector('#catalogPath').textContent=category==='table'?(qualityStep?'Tische › Stuhlqualität':'Tische › '+selected.name):CATEGORIES.find(p=>p.id===category).name+' › Varianten';
  if(category==='finish'){
    for(const p of ROOM_PRODUCTS){
      const button=document.createElement('button');button.type='button';button.className='toolbtn catalogCard finishCard';button.dataset.finish=p.id;
      const active=p.type===state.selectedTool&&p.id===state.selectedVariant;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
      const swatch=document.createElement('b');swatch.className='finishSwatch';swatch.style.setProperty('--finish-a','#'+p.colors[0].toString(16).padStart(6,'0'));swatch.style.setProperty('--finish-b','#'+p.colors[1].toString(16).padStart(6,'0'));swatch.classList.toggle('wallSwatch',p.type==='renovation');
      const name=document.createElement('span');name.textContent=p.name;
      const cost=document.createElement('small');cost.textContent=(p.type==='floor'?state.finishes.floor===p.id:p.level<=state.finishes.renovation)?'Aktuell / erledigt':money(p.price);
      button.append(swatch,name,cost);button.setAttribute('aria-label',p.name+', '+money(p.price));button.onclick=()=>choose(p);options.append(button);
    }
    document.querySelector('#catalogPath').textContent='Ausbau › Böden und Renovierung';
  }else if(category==='table'&&!qualityStep)for(const seats of [2,4,6,8])options.append(card(selected,seats));
  else for(const p of PRODUCTS.filter(p=>p.category===category))options.append(card(p,undefined,category==='table'));
  options.scrollLeft=scroll;
}

export function showCatalogSizes(){qualityStep=false;}
