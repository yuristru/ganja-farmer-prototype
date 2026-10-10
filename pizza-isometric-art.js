// A 2D affine transform aligns both measured ground edges with the 2:1 grid.
// Vertical lines retain their direction and height; there is no 3D geometry.
export function groundProjection([left,front,right]){
  const riseLeft=(front[1]-left[1])/(front[0]-left[0]);
  const riseRight=(front[1]-right[1])/(right[0]-front[0]);
  if(!Number.isFinite(riseLeft)||!Number.isFinite(riseRight)||riseLeft<=0||riseRight<=0)throw new Error('Invalid sprite ground corners.');
  const scaleX=riseLeft+riseRight,skewY=(riseRight-riseLeft)/2;
  return {scaleX,skewY,project:([x,y])=>[x*scaleX,y+x*skewY]};
}
