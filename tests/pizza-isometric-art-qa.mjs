import assert from 'node:assert/strict';
import {groundProjection} from '../pizza-isometric-art.js';
for(const corners of [
  [[0,0],[100,50],[200,0]],
  [[800,876],[1050,956],[1146,915]],
  [[1226,941],[1294,990],[1475,908]],
  [[1178,914],[1353,984],[1511,921]]
]){
  const transform=groundProjection(corners),[left,front,right]=corners.map(transform.project);
  assert(Math.abs((front[1]-left[1])/(front[0]-left[0])-.5)<1e-12);
  assert(Math.abs((right[1]-front[1])/(right[0]-front[0])+.5)<1e-12);
  const bottom=transform.project([70,400]),top=transform.project([70,100]);
  assert.equal(top[0],bottom[0]);assert.equal(bottom[1]-top[1],300);
}
assert.throws(()=>groundProjection([[0,0],[0,10],[10,0]]));
console.log('Sprite projection passed: both axes exactly 2:1, vertical direction and height preserved, invalid corners rejected.');
