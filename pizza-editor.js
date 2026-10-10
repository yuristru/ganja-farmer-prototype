import {app,state,clearWorld,sceneUI,notify} from './pizza-core.js?v=20261010m';
import {INGREDIENTS,ingredient,blankRecipe,onPizza,validRecipe,copyRecipe,recipeCost,toppingAt} from './pizza-recipe.js?v=20261010m';
const el=id=>document.getElementById(id),board=el('pizzaBoard'),ctx=board.getContext('2d'),KEY='pizza-recipes-v1';
let recipe=blankRecipe(),recipes=[],selected='mozzarella',erase=false,history=[],stroke=null;
try{const saved=JSON.parse(localStorage.getItem(KEY));if(validRecipe(saved?.draft))recipe=copyRecipe(saved.draft);if(Array.isArray(saved?.recipes))recipes=saved.recipes.filter(validRecipe).slice(0,20).map(copyRecipe);}catch{}
const price=cents=>(cents/100).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' DM';
function persist(){try{localStorage.setItem(KEY,JSON.stringify({draft:recipe,recipes}));return true;}catch{notify('Pizza bleibt in dieser Sitzung erhalten.');return false;}}
function remember(){history.push(copyRecipe(recipe));if(history.length>50)history.shift();}
function shape(points,color,paint=ctx){paint.fillStyle=color;paint.beginPath();points.forEach(([x,y],i)=>i?paint.lineTo(x,y):paint.moveTo(x,y));paint.closePath();paint.fill();}
function disk(x,y,r,color,paint=ctx){paint.fillStyle=color;paint.beginPath();paint.arc(x,y,r,0,Math.PI*2);paint.fill();}
const circle=disk;
function drawTopping(t,paint=ctx){
 const ctx=paint,circle=(...args)=>disk(...args,paint),polygon=(...args)=>shape(...args,paint);
 ctx.save();ctx.translate(Math.round(t.x),Math.round(t.y));ctx.rotate(t.angle);
 circle(1,2,9,'#573b2640');
 switch(t.id){
 case 'mozzarella':polygon([[-10,-4],[-6,-9],[5,-8],[10,-2],[7,7],[-3,9],[-9,4]],'#f7e8be');ctx.fillStyle='#d9bd83';ctx.fillRect(-4,4,6,2);break;
 case 'basil':polygon([[0,10],[-7,2],[-5,-8],[1,-12],[7,-6],[6,2]],'#4d7937');ctx.fillStyle='#93a653';ctx.fillRect(0,-7,2,15);break;
 case 'salami':circle(0,0,11,'#7f3428');circle(0,-1,9,'#c35a3c');for(const [x,y]of [[-4,-5],[4,-3],[-3,3],[5,4]]){ctx.fillStyle='#f2c799';ctx.fillRect(x,y,3,2);}break;
 case 'ham':polygon([[-12,-5],[5,-9],[12,1],[3,9],[-9,6]],'#d98f7f');ctx.fillStyle='#f0bda0';ctx.fillRect(-6,-3,13,2);break;
 case 'mushroom':ctx.fillStyle='#dfcfac';ctx.fillRect(-3,-1,6,13);polygon([[-12,2],[-11,-5],[-5,-10],[4,-10],[11,-5],[12,2]],'#baa184');ctx.fillStyle='#80694d';ctx.fillRect(-8,1,16,3);break;
 case 'pepper':ctx.strokeStyle='#ddb247';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,10,.2,Math.PI*1.8);ctx.stroke();break;
 case 'olive':circle(0,0,8,'#354032');circle(-2,-2,3,'#7a8653');circle(1,1,3,'#262d26');break;
 case 'onion':ctx.strokeStyle='#c4a4ba';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,11,.3,Math.PI*1.9);ctx.stroke();break;
 case 'tuna':for(let i=0;i<5;i++)polygon([[-8+i*3,-6+i%2*5],[-2+i*3,-3+i%2*5],[-7+i*3,4+i%2*5]],i%2?'#dcab88':'#ac795a');break;
 }
 ctx.restore();
}
function draw(){
 ctx.clearRect(0,0,320,320);ctx.fillStyle='#987045';ctx.fillRect(4,4,312,312);ctx.fillStyle='#bc905b';ctx.fillRect(9,9,302,302);
 for(let y=25;y<310;y+=29){ctx.fillStyle='#a4794840';ctx.fillRect(9,y,302,2);for(let x=15;x<300;x+=67)ctx.fillRect(x,y+7,39,1);}
 circle(162,165,143,'#694a31');circle(160,160,143,'#d8bb83');circle(160,160,136,'#efd59b');circle(160,160,126,'#bd803e');circle(160,157,126,'#e8b864');circle(160,157,118,'#efc985');
 for(let i=0;i<44;i++){const a=i*2.399,r=122+i%3*3;circle(160+Math.cos(a)*r,157+Math.sin(a)*r,2+i%3,'#aa6e38');}
 circle(160,160,113,recipe.sauce==='tomato'?'#a83b28':'#ebd9ad');
 for(let i=0;i<70;i++){const a=i*2.399,r=12+Math.sqrt(i/70)*96;circle(160+Math.cos(a)*r,160+Math.sin(a)*r,1+i%3,recipe.sauce==='tomato'?'#ca5230':'#d1bc8e');}
 for(const t of recipe.toppings)drawTopping(t);
 board.setAttribute('aria-label',recipe.name+': '+recipe.toppings.length+' Zutatenstücke. Zutat wählen und Pizza antippen.');
}
function render(){
 draw();el('pizzaName').value=recipe.name;
 for(const b of document.querySelectorAll('[data-ingredient]')){const active=!erase&&b.dataset.ingredient===selected;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));}
 for(const b of document.querySelectorAll('[data-sauce]')){const active=b.dataset.sauce===recipe.sauce;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));}
 el('pizzaErase').classList.toggle('active',erase);el('pizzaErase').setAttribute('aria-pressed',String(erase));el('pizzaUndo').disabled=!history.length;
 el('pizzaStats').textContent=recipe.toppings.length+' Stück · Zutatenkosten '+price(recipeCost(recipe));
 el('pizzaInstructions').textContent=erase?'Zutaten auf der Pizza antippen, um sie zu entfernen.':(ingredient(selected)?.name||'Zutat')+' wählen: tippen, aufstreichen oder auf die Pizza ziehen.';
}
function updateRecipes(){const select=el('pizzaRecipes');select.replaceChildren(new Option('Gespeicherte Rezepte',''));recipes.forEach((r,i)=>select.add(new Option(r.name,String(i))));select.value='';}
function point(e){const r=board.getBoundingClientRect();return {x:(e.clientX-r.left)*320/r.width,y:(e.clientY-r.top)*320/r.height};}
function apply(p){
 if(!onPizza(p.x,p.y))return false;
 if(erase){const i=toppingAt(recipe,p.x,p.y);if(i<0)return false;if(!stroke.changed)remember();recipe.toppings.splice(i,1);}
 else{if(recipe.toppings.length>=150){notify('Maximal 150 Zutatenstücke pro Pizza.');return false;}if(!stroke.changed)remember();recipe.toppings.push({id:selected,x:Math.round(p.x*100)/100,y:Math.round(p.y*100)/100,angle:(recipe.toppings.length*2.399)%6.28});}
 stroke.changed=true;stroke.last=p;render();return true;
}
board.addEventListener('pointerdown',e=>{if(stroke)return;e.preventDefault();stroke={id:e.pointerId,changed:false,last:null};board.setPointerCapture(e.pointerId);apply(point(e));});
board.addEventListener('pointermove',e=>{if(!stroke||stroke.id!==e.pointerId)return;const p=point(e);if(!stroke.last||Math.hypot(p.x-stroke.last.x,p.y-stroke.last.y)>18)apply(p);});
function endStroke(e){if(stroke?.id!==e.pointerId)return;if(stroke.changed)persist();stroke=null;}
board.addEventListener('pointerup',endStroke);board.addEventListener('pointercancel',endStroke);
for(const i of INGREDIENTS){
 const button=document.createElement('button');button.type='button';button.className='pizzaIngredient';button.dataset.ingredient=i.id;button.setAttribute('aria-label',i.name+', '+price(i.cost)+' pro Stück');
 const icon=document.createElement('canvas');icon.width=32;icon.height=32;const paint=icon.getContext('2d');paint.translate(-144,-144);drawTopping({id:i.id,x:160,y:160,angle:0},paint);
 const name=document.createElement('span');name.textContent=i.name;const cost=document.createElement('small');cost.textContent=price(i.cost);button.append(icon,name,cost);
 button.onclick=()=>{selected=i.id;erase=false;render();};
 button.addEventListener('pointerdown',e=>{if(stroke)return;selected=i.id;erase=false;render();button.setPointerCapture(e.pointerId);});
 button.addEventListener('pointerup',e=>{const p=point(e);if(onPizza(p.x,p.y)){stroke={id:e.pointerId,changed:false,last:null};apply(p);endStroke(e);}});
 el('pizzaIngredients').append(button);
}
for(const b of document.querySelectorAll('[data-sauce]'))b.onclick=()=>{if(recipe.sauce===b.dataset.sauce)return;remember();recipe.sauce=b.dataset.sauce;persist();render();};
el('pizzaErase').onclick=()=>{erase=!erase;render();};
el('pizzaUndo').onclick=()=>{if(!history.length)return;recipe=history.pop();persist();render();};
el('pizzaClear').onclick=()=>{if(!recipe.toppings.length)return;remember();recipe.toppings=[];persist();render();};
el('pizzaName').addEventListener('change',()=>{const name=el('pizzaName').value.trim().slice(0,40)||'Meine Pizza';if(name!==recipe.name){remember();recipe.name=name;persist();render();}});
el('pizzaSave').onclick=()=>{el('pizzaName').dispatchEvent(new Event('change'));const index=recipes.findIndex(r=>r.name===recipe.name);if(index<0&&recipes.length>=20){notify('Maximal 20 Rezepte. Einen vorhandenen Namen zum Ersetzen verwenden.');return;}if(index<0)recipes.push(copyRecipe(recipe));else recipes[index]=copyRecipe(recipe);updateRecipes();if(persist())notify('Rezept gespeichert: '+recipe.name+'.');};
el('pizzaRecipes').onchange=()=>{const r=recipes[Number(el('pizzaRecipes').value)];if(el('pizzaRecipes').value===''||!r)return;remember();recipe=copyRecipe(r);erase=false;persist();render();};
el('pizzaNew').onclick=()=>{remember();recipe=blankRecipe();erase=false;persist();render();};
export function showPizza(){if(state.scene==='pizza')return;clearWorld();state.scene='pizza';sceneUI('pizza');app.render();render();}
export function pizzaSnapshot(){return {recipe:copyRecipe(recipe),recipes:recipes.map(copyRecipe),history:history.length};}
updateRecipes();render();

new ResizeObserver(()=>{const wrap=board.parentElement,size=Math.max(1,Math.min(wrap.clientWidth,wrap.clientHeight));board.style.width=size+'px';board.style.height=size+'px';}).observe(board.parentElement);
