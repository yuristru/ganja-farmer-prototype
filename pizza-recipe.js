export const INGREDIENTS=[
 {id:'mozzarella',name:'Mozzarella',color:'#f5e2ad',cost:7},
 {id:'parmesan',name:'Parmesan',color:'#e5ca83',cost:6},
 {id:'basil',name:'Basilikum',color:'#568544',cost:3},
 {id:'salami',name:'Salami',color:'#b94535',cost:9},
 {id:'ham',name:'Schinken',color:'#d78770',cost:8},
 {id:'mushroom',name:'Pilze',color:'#bca786',cost:5},
 {id:'pepper',name:'Paprika',color:'#c6a342',cost:4},
 {id:'olive',name:'Oliven',color:'#384538',cost:4},
 {id:'onion',name:'Zwiebeln',color:'#b194af',cost:3},
 {id:'tuna',name:'Thunfisch',color:'#b8866a',cost:8}
];
export const ingredient=id=>INGREDIENTS.find(i=>i.id===id);
export function blankRecipe(){return {name:'Meine Pizza',sauce:'tomato',toppings:[]};}
export function onPizza(x,y){return Number.isFinite(x)&&Number.isFinite(y)&&Math.hypot(x-160,y-160)<=112;}
export function validRecipe(r){return !!r&&typeof r.name==='string'&&r.name.length<=40&&['tomato','white'].includes(r.sauce)&&Array.isArray(r.toppings)&&r.toppings.length<=150&&r.toppings.every(t=>ingredient(t.id)&&(t.form===undefined||Number.isInteger(t.form)&&t.form>=0&&t.form<=2)&&onPizza(t.x,t.y)&&Number.isFinite(t.angle));}
export function copyRecipe(r){return {name:r.name,sauce:r.sauce,toppings:r.toppings.map(t=>({...t}))};}
export function recipeCost(r){return 110+(r.sauce==='tomato'?35:45)+r.toppings.reduce((sum,t)=>sum+ingredient(t.id).cost,0);}
export function toppingAt(r,x,y){let nearest=-1,distance=18;for(let i=r.toppings.length-1;i>=0;i--){const d=Math.hypot(r.toppings[i].x-x,r.toppings[i].y-y);if(d<(nearest<0?(formOf(r.toppings[i])===0?25:18):distance)){nearest=i;distance=d;}}return nearest;}

export const FORMS={
 mozzarella:['Kugel','Scheiben','Gezupft'],parmesan:['Käsestück','Hobel','Geriebener Parmesan'],
 basil:['Zweig','Blätter','Gehackt'],salami:['Ganze Salami','Scheiben','Würfel'],ham:['Schinkenstück','Streifen','Kleine Würfel'],
 mushroom:['Ganzer Pilz','Scheiben','Gehackt'],pepper:['Ganze Paprika','Streifen','Würfel'],olive:['Ganze Olive','Ringe','Gehackt'],
 onion:['Ganze Zwiebel','Ringe','Fein gehackt'],tuna:['Filet','Stücke','Flocken']
};
export function formOf(t){return t.form===undefined?1:t.form;}
export function nextForm(form){return Math.min(2,form+1);}
export function formName(id,form){return FORMS[id]?.[form]||'';}
