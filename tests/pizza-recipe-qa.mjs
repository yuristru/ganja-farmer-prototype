import assert from 'node:assert/strict';
import {INGREDIENTS,blankRecipe,validRecipe,copyRecipe,recipeCost,onPizza,toppingAt} from '../pizza-recipe.js';
const r=blankRecipe();assert(validRecipe(r));assert.equal(recipeCost(r),145);assert(!onPizza(0,0));assert(onPizza(160,160));
for(const i of INGREDIENTS)r.toppings.push({id:i.id,x:160,y:160,angle:0});assert(validRecipe(r));assert.equal(toppingAt(r,160,160),8);assert.equal(toppingAt(r,0,0),-1);assert(recipeCost(r)>145);
const copy=copyRecipe(r);copy.toppings[0].x=100;assert.equal(r.toppings[0].x,160);
for(const invalid of [null,{}, {...r,sauce:'bad'},{...r,toppings:[{id:'bad',x:160,y:160,angle:0}]},{...r,toppings:[{id:'salami',x:0,y:0,angle:0}]},{...r,toppings:[{id:'salami',x:160,y:160,angle:Infinity}]},{...r,toppings:Array(151).fill(r.toppings[0])}])assert(!validRecipe(invalid));
console.log('Pizza recipe passed: ingredients, costs, circular bounds, removal, copy and invalid save checks.');
