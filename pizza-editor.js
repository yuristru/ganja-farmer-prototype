import {drawIngredientArt} from './pizza-ingredient-art.js?v=20261010q';
import {app,state,clearWorld,sceneUI,notify} from './pizza-core.js?v=20261010q';
import {INGREDIENTS,ingredient,blankRecipe,onPizza,validRecipe,copyRecipe,recipeCost,toppingAt,formOf,nextForm,formName} from './pizza-recipe.js?v=20261010q';
const el=id=>document.getElementById(id),board=el('pizzaBoard'),pixelBoard=document.createElement('canvas'),ctx=pixelBoard.getContext('2d'),KEY='pizza-recipes-v1';
pixelBoard.width=160;pixelBoard.height=160;ctx.setTransform(.5,0,0,.5,0,0);ctx.imageSmoothingEnabled=false;
let recipe=blankRecipe(),recipes=[],selected='mozzarella',erase=false,history=[],stroke=null,forms=Object.fromEntries(INGREDIENTS.map(i=>[i.id,0]));
try{const saved=JSON.parse(localStorage.getItem(KEY));if(validRecipe(saved?.draft))recipe=copyRecipe(saved.draft);if(Array.isArray(saved?.recipes))recipes=saved.recipes.filter(validRecipe).slice(0,20).map(copyRecipe);}catch{}
const price=cents=>(cents/100).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' DM';
function persist(){try{localStorage.setItem(KEY,JSON.stringify({draft:recipe,recipes}));return true;}catch{notify('Pizza bleibt in dieser Sitzung erhalten.');return false;}}
function remember(){history.push(copyRecipe(recipe));if(history.length>50)history.shift();}
function shape(points,color,paint=ctx){paint.fillStyle=color;paint.beginPath();points.forEach(([x,y],i)=>i?paint.lineTo(x,y):paint.moveTo(x,y));paint.closePath();paint.fill();}
function disk(x,y,r,color,paint=ctx){paint.fillStyle=color;paint.beginPath();paint.arc(x,y,r,0,Math.PI*2);paint.fill();}
const circle=disk;
function drawTopping(t,paint=ctx){
 if(drawIngredientArt(t,paint))return;
 const ctx=paint,circle=(...args)=>disk(...args,paint),polygon=(...args)=>shape(...args,paint);
 ctx.save();ctx.translate(Math.round(t.x),Math.round(t.y));ctx.rotate(t.angle);
 const form=formOf(t);
 if(form===0){
   circle(2,4,22,'#573b2640');
   switch(t.id){
   case 'mozzarella':circle(0,0,20,'#d7be89');circle(-2,-3,18,'#f7e8be');circle(-7,-9,5,'#fff1d0');break;
   case 'parmesan':polygon([[-24,12],[-20,-10],[20,-17],[23,13]],'#bf944f');polygon([[-20,-10],[20,-17],[14,7],[-24,12]],'#eed596');for(const [x,y]of [[-12,-4],[2,-8],[8,2],[-10,5]])circle(x,y,2,'#c6a66a');break;
   case 'basil':ctx.strokeStyle='#6d7d3e';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,23);ctx.lineTo(0,-22);ctx.stroke();for(let i=0;i<4;i++){ctx.save();ctx.translate(i%2?5:-5,-15+i*9);ctx.rotate(i%2?.5:-.5);polygon([[0,8],[-8,0],[-4,-9],[4,-10],[8,-2]],'#568342');ctx.restore();}break;
   case 'salami':ctx.save();ctx.rotate(-.35);ctx.fillStyle='#87412e';ctx.fillRect(-26,-11,48,22);circle(-25,0,11,'#b26948');circle(23,0,11,'#73342b');circle(24,0,8,'#bc533b');for(let i=-17;i<19;i+=8){ctx.fillStyle='#c9956a';ctx.fillRect(i,-9,2,18);}ctx.restore();break;
   case 'ham':polygon([[-23,-9],[-11,-20],[15,-14],[24,5],[11,20],[-18,15]],'#b85e54');polygon([[-17,-9],[-8,-14],[14,-9],[17,5],[9,12],[-13,10]],'#e8a38a');break;
   case 'mushroom':ctx.fillStyle='#e5d3b1';ctx.fillRect(-6,-2,12,25);polygon([[-24,4],[-21,-11],[-12,-21],[10,-22],[22,-11],[24,4]],'#967453');circle(-8,-12,3,'#b7976b');circle(10,-8,3,'#b7976b');break;
   case 'pepper':circle(-9,1,15,'#b13e2b');circle(9,1,15,'#ce5330');circle(0,8,15,'#d96b38');ctx.fillStyle='#52743e';ctx.fillRect(-3,-24,6,14);break;
   case 'olive':ctx.save();ctx.scale(1,1.3);circle(0,0,15,'#354a31');circle(-5,-5,5,'#8a9a5c');ctx.restore();break;
   case 'onion':circle(0,2,21,'#9b657d');circle(-3,0,16,'#bf92ac');polygon([[-6,-16],[0,-26],[6,-16]],'#95713e');break;
   case 'tuna':polygon([[-27,-9],[4,-17],[26,-3],[18,14],[-14,15]],'#b8755c');for(let i=-15;i<20;i+=7){ctx.strokeStyle='#e4b899';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(i,-9);ctx.lineTo(i+5,10);ctx.stroke();}break;
   }
   ctx.restore();return;
 }
 if(form===2){
   const color=ingredient(t.id).color,highlight={mozzarella:'#fff0ce',parmesan:'#f4dda7',basil:'#91a562',salami:'#ed917b',ham:'#f0b9a0',mushroom:'#e0ceab',pepper:'#efce6d',olive:'#7f9460',onion:'#e3c4dc',tuna:'#deb191'}[t.id];
   for(let i=0;i<9;i++){const a=i*2.399+t.angle,r=3+Math.sqrt(i/9)*11,x=Math.round(Math.cos(a)*r),y=Math.round(Math.sin(a)*r);ctx.fillStyle=i%3===0?highlight:color;ctx.fillRect(x,y,t.id==='parmesan'?2:3,t.id==='parmesan'?2:3);}
   ctx.restore();return;
 }
 circle(1,2,9,'#573b2640');
 switch(t.id){
 case 'mozzarella':polygon([[-10,-4],[-6,-9],[5,-8],[10,-2],[7,7],[-3,9],[-9,4]],'#f7e8be');ctx.fillStyle='#d9bd83';ctx.fillRect(-4,4,6,2);break;
 case 'parmesan':for(let i=0;i<3;i++)polygon([[-12+i*4,-6+i*4],[4+i*3,-9+i*3],[9+i*3,-3+i*3],[-8+i*4,i*4]],'#efd497');break;
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
 const target=board.getContext('2d');ctx.clearRect(0,0,320,320);ctx.fillStyle='#987045';ctx.fillRect(4,4,312,312);ctx.fillStyle='#bc905b';ctx.fillRect(9,9,302,302);
 for(let y=25;y<310;y+=29){ctx.fillStyle='#a4794840';ctx.fillRect(9,y,302,2);for(let x=15;x<300;x+=67)ctx.fillRect(x,y+7,39,1);}
 circle(162,165,143,'#694a31');circle(160,160,143,'#d8bb83');circle(160,160,136,'#efd59b');circle(160,160,126,'#bd803e');circle(160,157,126,'#e8b864');circle(160,157,118,'#efc985');
 for(let i=0;i<44;i++){const a=i*2.399,r=122+i%3*3;circle(160+Math.cos(a)*r,157+Math.sin(a)*r,2+i%3,'#aa6e38');}
 circle(160,160,113,recipe.sauce==='tomato'?'#a83b28':'#ebd9ad');
 for(let i=0;i<70;i++){const a=i*2.399,r=12+Math.sqrt(i/70)*96;circle(160+Math.cos(a)*r,160+Math.sin(a)*r,1+i%3,recipe.sauce==='tomato'?'#ca5230':'#d1bc8e');}
 for(const t of recipe.toppings)drawTopping(t);
 target.imageSmoothingEnabled=false;target.clearRect(0,0,320,320);target.drawImage(pixelBoard,0,0,320,320);
 board.setAttribute('aria-label',recipe.name+': '+recipe.toppings.length+' Zutatenstücke. Zutat wählen und Pizza antippen.');
}
function render(){
 draw();for(const b of document.querySelectorAll('[data-ingredient]')){const icon=b.querySelector('canvas'),p=icon.getContext('2d');p.setTransform(1,0,0,1,0,0);p.clearRect(0,0,64,64);p.translate(32,32);drawTopping({id:b.dataset.ingredient,form:0,x:0,y:0,angle:0},p);}
 const form=forms[selected],pctx=el('pizzaFormPreview').getContext('2d');pctx.clearRect(0,0,96,80);pctx.save();pctx.translate(48,40);pctx.scale(1.25,1.25);drawTopping({id:selected,form,x:0,y:0,angle:0},pctx);pctx.restore();
 el('pizzaSelectedIngredient').textContent=ingredient(selected).name;
 el('pizzaFormName').textContent=formName(selected,form)+' · '+(form+1)+'/3';
 el('pizzaFormPreview').setAttribute('aria-label',ingredient(selected).name+': '+formName(selected,form));
 el('pizzaShredder').disabled=form===2;el('pizzaShredder').setAttribute('aria-label',form===2?'Kleinste Form erreicht':'Schredder: '+formName(selected,nextForm(form)));
 el('pizzaWhole').disabled=form===0;el('pizzaName').value=recipe.name;
 for(const b of document.querySelectorAll('[data-ingredient]')){const active=!erase&&b.dataset.ingredient===selected;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));}
 for(const b of document.querySelectorAll('[data-sauce]')){const active=b.dataset.sauce===recipe.sauce;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));}
 el('pizzaErase').classList.toggle('active',erase);el('pizzaErase').setAttribute('aria-pressed',String(erase));el('pizzaUndo').disabled=!history.length;
 el('pizzaStats').textContent=recipe.toppings.length+' Portionen · Zutatenkosten '+price(recipeCost(recipe));
 el('pizzaInstructions').textContent=erase?'Zutaten auf der Pizza antippen, um sie zu entfernen.':(ingredient(selected)?.name||'Zutat')+' · '+formName(selected,forms[selected])+': tippen oder verteilen.';
}
function updateRecipes(){const select=el('pizzaRecipes');select.replaceChildren(new Option('Gespeicherte Rezepte',''));recipes.forEach((r,i)=>select.add(new Option(r.name,String(i))));select.value='';}
function point(e){const r=board.getBoundingClientRect();return {x:(e.clientX-r.left)*320/r.width,y:(e.clientY-r.top)*320/r.height};}
function apply(p){
 if(!onPizza(p.x,p.y))return false;
 if(erase){const i=toppingAt(recipe,p.x,p.y);if(i<0)return false;if(!stroke.changed)remember();recipe.toppings.splice(i,1);}
 else{if(recipe.toppings.length>=150){notify('Maximal 150 Zutatenstücke pro Pizza.');return false;}if(!stroke.changed)remember();recipe.toppings.push({id:selected,form:forms[selected],x:Math.round(p.x*100)/100,y:Math.round(p.y*100)/100,angle:(recipe.toppings.length%8)*Math.PI/4});}
 stroke.changed=true;stroke.last=p;render();return true;
}
board.addEventListener('pointerdown',e=>{if(stroke)return;e.preventDefault();stroke={id:e.pointerId,changed:false,last:null};board.setPointerCapture(e.pointerId);apply(point(e));});
board.addEventListener('pointermove',e=>{if(!stroke||stroke.id!==e.pointerId)return;const p=point(e);if(!stroke.last||Math.hypot(p.x-stroke.last.x,p.y-stroke.last.y)>(forms[selected]===0?35:forms[selected]===1?18:12))apply(p);});
function endStroke(e){if(stroke?.id!==e.pointerId)return;if(stroke.changed)persist();stroke=null;}
board.addEventListener('pointerup',endStroke);board.addEventListener('pointercancel',endStroke);
for(const i of INGREDIENTS){
 const button=document.createElement('button');button.type='button';button.className='pizzaIngredient';button.dataset.ingredient=i.id;button.setAttribute('aria-label',i.name+', '+price(i.cost)+' pro Portion');
 const icon=document.createElement('canvas');icon.width=64;icon.height=64;const paint=icon.getContext('2d');paint.translate(32,32);drawTopping({id:i.id,form:0,x:0,y:0,angle:0},paint);
 const name=document.createElement('span');name.textContent=i.name;const cost=document.createElement('small');cost.textContent=price(i.cost);button.append(icon,name,cost);
 button.onclick=()=>{selected=i.id;erase=false;render();};
 button.addEventListener('pointerdown',e=>{if(stroke)return;selected=i.id;erase=false;render();button.setPointerCapture(e.pointerId);});
 button.addEventListener('pointerup',e=>{const p=point(e);if(onPizza(p.x,p.y)){stroke={id:e.pointerId,changed:false,last:null};apply(p);endStroke(e);}});
 el('pizzaIngredients').append(button);
}
el('pizzaShredder').onclick=()=>{if(stroke)return;forms[selected]=nextForm(forms[selected]);erase=false;render();};
el('pizzaWhole').onclick=()=>{if(stroke)return;forms[selected]=0;erase=false;render();};
for(const b of document.querySelectorAll('[data-sauce]'))b.onclick=()=>{if(recipe.sauce===b.dataset.sauce)return;remember();recipe.sauce=b.dataset.sauce;persist();render();};
el('pizzaErase').onclick=()=>{erase=!erase;render();};
el('pizzaUndo').onclick=()=>{if(!history.length)return;recipe=history.pop();persist();render();};
el('pizzaClear').onclick=()=>{if(!recipe.toppings.length)return;remember();recipe.toppings=[];persist();render();};
el('pizzaName').addEventListener('change',()=>{const name=el('pizzaName').value.trim().slice(0,40)||'Meine Pizza';if(name!==recipe.name){remember();recipe.name=name;persist();render();}});
el('pizzaSave').onclick=()=>{el('pizzaName').dispatchEvent(new Event('change'));const index=recipes.findIndex(r=>r.name===recipe.name);if(index<0&&recipes.length>=20){notify('Maximal 20 Rezepte. Einen vorhandenen Namen zum Ersetzen verwenden.');return;}if(index<0)recipes.push(copyRecipe(recipe));else recipes[index]=copyRecipe(recipe);updateRecipes();if(persist())notify('Rezept gespeichert: '+recipe.name+'.');};
el('pizzaRecipes').onchange=()=>{const r=recipes[Number(el('pizzaRecipes').value)];if(el('pizzaRecipes').value===''||!r)return;remember();recipe=copyRecipe(r);erase=false;persist();render();};
el('pizzaNew').onclick=()=>{remember();recipe=blankRecipe();erase=false;persist();render();};
export function showPizza(){if(state.scene==='pizza')return;clearWorld();state.scene='pizza';sceneUI('pizza');app.render();render();}
export function pizzaSnapshot(){return {recipe:copyRecipe(recipe),recipes:recipes.map(copyRecipe),history:history.length,selected,form:forms[selected],forms:{...forms}};}
updateRecipes();render();

new ResizeObserver(()=>{const wrap=board.parentElement,size=Math.max(1,Math.min(wrap.clientWidth,wrap.clientHeight));board.style.width=size+'px';board.style.height=size+'px';}).observe(board.parentElement);
