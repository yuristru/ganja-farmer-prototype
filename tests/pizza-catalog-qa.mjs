import assert from 'node:assert/strict';
import {PRODUCTS,itemPrice,START_MONEY} from '../pizza-catalog.js';
import {copyLayout,validLayout,upgradeLayout,placementIssue} from '../pizza-layout.js';
for(const p of PRODUCTS){
  for(const seats of p.type==='table'?[2,4,6,8]:[undefined]){
    const item={type:p.type,variant:p.id,x:2,y:5,r:0,...(seats?{seats}:{})},paid=itemPrice(item);
    assert(paid>0&&paid<START_MONEY);assert(validLayout([{...item,paid}]));
    assert.deepEqual(upgradeLayout([{...item,paid}],3),[{...item,paid}]);
    assert.match(placementIssue({...item,paid:paid+1}),/Kaufpreis/);
  }
}
assert.equal(itemPrice({type:'table',variant:'premium',seats:2}),1040);
assert(itemPrice({type:'table',variant:'plastic',seats:8})<itemPrice({type:'table',variant:'wood',seats:8}));
assert.match(placementIssue({type:'plant',variant:'invalid',x:2,y:5,r:0}),/variante/i);
const legacy=[{type:'table',seats:4,x:2,y:3,r:0}];assert.deepEqual(copyLayout(legacy),legacy);assert.deepEqual(upgradeLayout(legacy,2),legacy);
console.log('Catalog model passed: every product/size, price validation, tier pricing, variants and v2/v3 saves.');
