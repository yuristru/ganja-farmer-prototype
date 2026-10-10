import assert from 'node:assert/strict';
import {districtOrder,nextCitySeed,DEFAULT_CITY_SEED} from '../pizza-city-layout.js';
assert.deepEqual(districtOrder(),[0,1,2,3,4,5,6,7,8]);
for(const seed of [0,1,42,0xffffffff,DEFAULT_CITY_SEED]){
  const order=districtOrder(seed);assert.deepEqual([...order].sort(),[0,1,2,3,4,5,6,7,8]);
  assert.deepEqual(districtOrder(seed),order);
  for(const entropy of [seed,0,1,0xffffffff]){
    const next=nextCitySeed(seed,entropy);assert.notEqual(next,seed);assert.notDeepEqual(districtOrder(next),order);
  }
}
console.log('City generation passed: unique district permutation, reproducibility, repeated seed protection and unsigned wrap.');
