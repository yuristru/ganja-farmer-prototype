/* V105: isolated source rectangles, fitted to each visible store card. */
(function(root){
'use strict';
const images=new Map(),watched=new Set();
const art=()=>({...root.GanjariumRoomArt,...root.GanjariumStoreArtManifest});
function load(id){const spec=art()[id];if(!spec)return Promise.reject(new Error('Missing store art: '+id));if(images.has(spec.source))return images.get(spec.source);const p=new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Store artwork failed: '+spec.source));img.src=spec.source;});images.set(spec.source,p);return p;}
async function draw(canvas){
 if(canvas.dataset.eq3d){if(canvas.isConnected&&canvas.clientWidth&&canvas.clientHeight)root.GanjariumEquipment3D?.renderPreview(canvas,canvas.dataset.eq3d,Number(canvas.dataset.eqLevel)||1);return;}
 const id=canvas.dataset.storeEq,level=Number(canvas.dataset.eqLevel)||1,spec=art()[id];
 if(!spec)return;
 try{const img=await load(id);if(!canvas.isConnected)return;
 const rect=canvas.getBoundingClientRect();if(rect.width<1||rect.height<1)return;
 const seg=spec.segments[Math.min(spec.segments.length-1,Math.max(0,level-1))],dpr=Math.min(3,root.devicePixelRatio||1);
 const w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);canvas.width=w;canvas.height=h;
 const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 const scale=Math.min(w*.88/seg.w,h*.86/seg.h),dw=seg.w*scale,dh=seg.h*scale;
 ctx.drawImage(img,seg.x,seg.y,seg.w,seg.h,(w-dw)/2,(h-dh)/2,dw,dh);
 canvas.dataset.sourceRect=[seg.x,seg.y,seg.w,seg.h].join(',');canvas.dataset.drawRect=[(w-dw)/2,(h-dh)/2,dw,dh].join(',');canvas.classList.add('ready');canvas.classList.remove('failed');
 }catch(err){canvas.classList.add('failed');console.warn(err);}
}
const observer=new ResizeObserver(entries=>{for(const {target} of entries)draw(target);});
function renderPreviews(scope=document){for(const canvas of watched)if(!canvas.isConnected){observer.unobserve(canvas);watched.delete(canvas);}scope.querySelectorAll('canvas[data-store-eq],canvas[data-eq3d]').forEach(canvas=>{if(!watched.has(canvas)){watched.add(canvas);observer.observe(canvas);}draw(canvas);});}
root.GanjariumStoreEquipment={load,draw,renderPreviews};
})(window);
