import assert from 'node:assert/strict';
import {INGREDIENTS,blankRecipe,validRecipe,copyRecipe,recipeCost,onPizza,toppingAt,formOf,nextForm,formName} from '../pizza-recipe.js';
const r=blankRecipe();assert(validRecipe(r));assert.equal(recipeCost(r),145);assert(!onPizza(0,0));assert(onPizza(160,160));
for(const i of INGREDIENTS)r.toppings.push({id:i.id,x:160,y:160,angle:0});assert(validRecipe(r));assert.equal(toppingAt(r,160,160),INGREDIENTS.length-1);assert.equal(toppingAt(r,0,0),-1);assert(recipeCost(r)>145);
const copy=copyRecipe(r);copy.toppings[0].x=100;assert.equal(r.toppings[0].x,160);
for(const invalid of [null,{}, {...r,sauce:'bad'},{...r,toppings:[{id:'bad',x:160,y:160,angle:0}]},{...r,toppings:[{id:'salami',x:0,y:0,angle:0}]},{...r,toppings:[{id:'salami',x:160,y:160,angle:Infinity}]},{...r,toppings:Array(151).fill(r.toppings[0])}])assert(!validRecipe(invalid));
console.log('Pizza recipe passed: ingredients, costs, circular bounds, removal, copy and invalid save checks.');

assert.equal(formOf({id:'salami'}),1,'Legacy recipes retain their sliced form.');
assert.equal(nextForm(0),1);assert.equal(nextForm(1),2);assert.equal(nextForm(2),2);
for(const i of INGREDIENTS)for(const form of [0,1,2]){const topping={id:i.id,form,x:160,y:160,angle:0};assert(formName(i.id,form));assert(validRecipe({...blankRecipe(),toppings:[topping]}));assert.equal(copyRecipe({...blankRecipe(),toppings:[topping]}).toppings[0].form,form);}
for(const form of [-1,3,1.5,null,'1'])assert(!validRecipe({...blankRecipe(),toppings:[{id:'parmesan',form,x:160,y:160,angle:0}]}));
console.log('Shredder model passed: three forms per ingredient, clamped progression, stored forms and legacy recipes.');
