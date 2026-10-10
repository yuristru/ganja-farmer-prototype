const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');

const root=process.cwd(),out=path.join(root,'qa/pizza');fs.mkdirSync(out,{recursive:true});
const corePath=fs.readFileSync(path.join(root,'pizza.js'),'utf8').match(/from ['"](.\/pizza-core\.js[^'"]*)['"]/)[1].replace('./','/');
const modelPath=path.join(root,'pizza-layout.js');
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const file=path.resolve(root,'.'+decodeURIComponent(pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{
    if(error){res.writeHead(404).end();return;}
    res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.png':'image/png'})[path.extname(file)]||'application/octet-stream');
    res.end(data);
  });
});

async function snapshot(page){
  return page.evaluate(async modulePath=>{
    const {app,state,world,root}=await import(modulePath);
    return {scene:state.scene,items:state.restaurantState,history:state.history.length,rotation:state.rotation,deleteMode:state.deleteMode,tool:state.selectedTool,seats:state.selectedSeats,pending:state.pendingPlacement,speed:state.speed,minutes:state.gameMinutes,view:state.cityView,assets:state.assetFailures,screen:{width:app.screen.width,height:app.screen.height},size:{width:root.clientWidth,height:root.clientHeight},movers:state.movers.map(m=>({x:m.x,y:m.y,t:m.t,lane:m.lane,axis:m.axis,z:m.g.zIndex,visible:m.g.visible,kind:m.kind})),worldChildren:world.children.length};
  },corePath);
}

async function nodePoint(page,label){
  return page.evaluate(async ({modulePath,label})=>{
    const {world,root}=await import(modulePath),pending=[world];let target;
    while(pending.length){const node=pending.pop();if(node.label===label){target=node;break;}pending.push(...node.children);}
    if(!target) throw new Error('Missing scene object: '+label);
    const bounds=target.getBounds(),base=root.getBoundingClientRect();
    return {x:base.left+bounds.x+bounds.width/2,y:base.top+bounds.y+bounds.height/2};
  },{modulePath:corePath,label});
}
async function tapCell(page,x,y){await page.evaluate(async modulePath=>{const {app}=await import(modulePath);app.render();},corePath);const point=await nodePoint(page,`floor-${x}-${y}`);await page.mouse.click(point.x,point.y);}
async function placeCell(page,x,y){await tapCell(page,x,y);assert.deepEqual((await snapshot(page)).pending,{x,y});assert.equal(await page.locator('#placeBtn').isEnabled(),true,await page.locator('#placementStatus').innerText());await page.click('#placeBtn');}
async function capture(page,name){
  await page.evaluate(async modulePath=>{const {app}=await import(modulePath);app.render();},corePath);
  await page.screenshot({path:path.join(out,name),style:'#toast { visibility: hidden; }'});
}
async function loaded(page,url){await page.goto(url);await page.waitForSelector('#loading',{state:'hidden',timeout:15000});}

(async()=>{
  const model=await import(pathToFileURL(modelPath));
  assert(model.validLayout(model.DEFAULT_LAYOUT));
  assert(model.validLayout([]));
  assert.equal(model.placementIssue({type:'table',seats:4,x:5,y:2,r:0},model.DEFAULT_LAYOUT),null);
  assert.match(model.placementIssue({type:'plant',x:3,y:1,r:0},[]),/Küche/);
  assert.match(model.placementIssue({type:'table',seats:4,x:7,y:3,r:0},[]),/Raum/);
  assert.match(model.placementIssue({type:'bar',x:7,y:5,r:1},[]),/Eingang/);
  assert.equal(model.placementIssue({type:'bar',x:7,y:4,r:1},model.DEFAULT_LAYOUT),null);
  assert.match(model.placementIssue({type:'plant',x:3,y:4,r:0},model.DEFAULT_LAYOUT),/bereits/);
  for(const invalid of [null,{},[{type:'unknown',x:0,y:3,r:0}],[{type:'plant',x:2.5,y:3,r:0}],[{type:'plant',x:2,y:3,r:5}],[{type:'plant',x:2,y:1,r:0}],[{type:'chair',x:0,y:3,r:0}],[{type:'table',seats:3,x:0,y:3,r:0}],[...model.DEFAULT_LAYOUT,model.DEFAULT_LAYOUT[0]]]) assert.equal(model.validLayout(invalid),false);
  for(const seats of model.TABLE_SEATS){
    const size=model.TABLE_SIZES[seats];
    assert.deepEqual(model.dimensions({type:'table',seats,r:0}),size);
    assert.deepEqual(model.dimensions({type:'table',seats,r:1}),{w:size.h,h:size.w});
    assert.equal(model.occupiedCells({type:'table',seats,x:0,y:2,r:0}).length,size.w*size.h);
  }
  for(let y=0;y<model.ROOM.h;y++)for(let x=0;x<model.ROOM.w;x++){
    assert.deepEqual(model.gridCell(model.project(x,y)),{x,y});
    assert.deepEqual(model.gridCell(model.project(x+.49,y-.49)),{x,y});
  }
  assert.deepEqual(model.upgradeLayout([{type:'table',x:2,y:3,r:0},{type:'chair',x:1,y:3,r:0}],1),[{type:'table',seats:4,x:2,y:3,r:0}]);
  assert.equal(model.upgradeLayout([{type:'table',seats:3,x:2,y:3,r:0}],2),null);
  const independent=model.copyLayout();independent[0].x=0;assert.equal(model.DEFAULT_LAYOUT[0].x,2);
  console.log('Layout validation passed: 2/4/6/8 seats, rotated footprints, 2:1 grid snapping, kitchen, entrance, overlap and save migration.');

  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`,url=base+'/pizza.html';
  let browser;
  try{
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:process.env.PIZZA_BROWSER_ARGS?JSON.parse(process.env.PIZZA_BROWSER_ARGS):['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
    const context=await browser.newContext({viewport:{width:393,height:852},hasTouch:true,deviceScaleFactor:2});
    const external=[],errors=[];
    await context.route('**/*',route=>{if(route.request().url().startsWith(base+'/'))return route.continue();external.push(route.request().url());return route.abort();});
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    await loaded(page,url);assert.equal((await snapshot(page)).assets.length,0);assert.equal((await snapshot(page)).worldChildren,1);
    assert.match(await page.locator('#gameDate').innerText(),/Do\./);
    await page.click('[data-speed="0"]');
    await capture(page,'city-393.png');

    // Dragging an interactive sign must pan without opening the restaurant.
    const sign=await nodePoint(page,'restaurant-sign');
    await page.mouse.move(sign.x,sign.y);await page.mouse.down();await page.mouse.move(sign.x+42,sign.y+20,{steps:8});await page.mouse.up();
    assert.equal((await snapshot(page)).scene,'city');
    const panned=(await snapshot(page)).view;assert.notEqual(panned.x,0);
    const movedSign=await nodePoint(page,'restaurant-sign');await page.mouse.click(movedSign.x,movedSign.y);
    assert.equal((await snapshot(page)).scene,'restaurant');
    await page.click('#cityBtn');assert.deepEqual((await snapshot(page)).view,panned);
    await page.click('#zoomInBtn');assert((await snapshot(page)).view.zoom>panned.zoom);
    await page.click('#zoomOutBtn');assert(Math.abs((await snapshot(page)).view.zoom-panned.zoom)<1e-8);
    await page.click('#centerBtn');assert.equal((await snapshot(page)).view.x,0);

    // Exercise a genuine two-finger gesture through Chromium's touch input.
    const cdp=await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:90,y:300,id:1},{x:240,y:300,id:2}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:55,y:300,id:1},{x:275,y:300,id:2}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert((await snapshot(page)).view.zoom>1.4);assert.equal((await snapshot(page)).scene,'city');await page.click('#centerBtn');
    console.log('City interaction passed: drag versus tap, camera persistence, zoom buttons and two-finger zoom.');

    // Run the registered ticker at known frame intervals, independent of CPU speed.
    await page.evaluate(async modulePath=>{const {app}=await import(modulePath);app.ticker.stop();app.ticker.maxFPS=0;},corePath);
    const advance=()=>page.evaluate(async modulePath=>{const {app}=await import(modulePath);for(let i=0;i<60;i++)app.ticker.update(app.ticker.lastTime+1000/60);},corePath);
    const paused=await snapshot(page);await advance();assert.equal((await snapshot(page)).minutes,paused.minutes);assert.deepEqual((await snapshot(page)).movers,paused.movers);
    await page.click('[data-speed="1"]');const normal=await snapshot(page);await advance();const normalDelta=(await snapshot(page)).minutes-normal.minutes;
    await page.click('[data-speed="3"]');const fast=await snapshot(page);await advance();const fastDelta=(await snapshot(page)).minutes-fast.minutes;
    assert(normalDelta>0);assert(Math.abs(fastDelta/normalDelta-3)<.001);await page.click('[data-speed="0"]');
    for(const mover of (await snapshot(page)).movers){const y=((mover.axis===0?mover.t:mover.lane)+(mover.axis===0?mover.lane:mover.t))*16;assert(Math.abs(mover.z-y)<1e-8,'Traffic depth must use its ground position.');}
    console.log('Time and depth passed: real pause, normal/3x speed, live clock and traffic behind buildings.');
    await page.evaluate(async modulePath=>{const {app}=await import(modulePath);app.ticker.maxFPS=60;app.ticker.start();},corePath);

    await page.click('#restaurantBtn');assert.equal(await page.locator('[data-tool="chair"]').count(),0);
    // Each capacity is one sprite and one placement, including its chairs.
    for(const [seats,x,y]of [[2,0,2],[4,5,2],[6,5,2],[8,0,5]]){
      await page.click(`[data-seats="${seats}"]`);const before=await snapshot(page);await tapCell(page,x,y);
      assert.equal((await snapshot(page)).items.length,before.items.length);assert.equal((await snapshot(page)).history,before.history);
      await capture(page,`table-${seats}-preview.png`);await page.click('#placeBtn');
      assert((await snapshot(page)).items.some(item=>item.type==='table'&&item.seats===seats&&item.x===x&&item.y===y));
      const groups=await page.evaluate(async modulePath=>{const {world,Sprite}=await import(modulePath);return world.children[0].children.find(c=>c.label==='restaurant-objects').children.filter(c=>c.label==='placed-furniture').map(c=>({children:c.children.length,isSprite:c.children[0] instanceof Sprite,label:c.children[0].label}));},corePath);
      assert(groups.every(g=>g.children===1&&g.isSprite&&g.label==='furniture-sprite'),'Furniture must consist of one flat sprite.');
      await page.click('#undoBtn');assert.deepEqual((await snapshot(page)).items,before.items);
    }
    await page.click('[data-seats="8"]');await page.click('#rotateBtn');await placeCell(page,6,2);
    assert((await snapshot(page)).items.some(item=>item.seats===8&&item.r===1&&item.x===6&&item.y===2));await capture(page,'table-8-rotated.png');await page.click('#undoBtn');
    await page.click('#resetBtn');await page.click('[data-tool="plant"]');await tapCell(page,0,3);
    assert.equal((await snapshot(page)).items.length,model.DEFAULT_LAYOUT.length);await page.click('#cancelBtn');assert.equal((await snapshot(page)).pending,null);
    // A touch drag moves only the snapped preview until Setzen is pressed.
    const start=await nodePoint(page,'floor-0-2'),end=await nodePoint(page,'floor-0-3');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start.x,y:start.y,id:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:end.x,y:end.y,id:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.deepEqual((await snapshot(page)).pending,{x:0,y:3});assert.equal((await snapshot(page)).items.length,model.DEFAULT_LAYOUT.length);await page.click('#placeBtn');
    let current=await snapshot(page);assert(current.items.some(item=>item.type==='plant'&&item.x===0&&item.y===3));
    const count=current.items.length;await tapCell(page,3,1);assert.equal((await snapshot(page)).items.length,count);assert.equal(await page.locator('#placeBtn').isEnabled(),false);assert.match(await page.locator('#placementStatus').innerText(),/Küche/);
    await page.click('[data-seats="4"]');await placeCell(page,5,2);current=await snapshot(page);assert.equal(current.items.length,count+1);
    await tapCell(page,6,2);assert.equal((await snapshot(page)).items.length,count+1);assert.equal(await page.locator('#placeBtn').isEnabled(),false);assert.match(await page.locator('#placementStatus').innerText(),/bereits/);
    await page.click('[data-tool="bar"]');await page.click('#rotateBtn');assert.equal((await snapshot(page)).rotation,1);
    await tapCell(page,7,5);assert.equal((await snapshot(page)).items.length,count+1);assert.equal(await page.locator('#placeBtn').isEnabled(),false);assert.match(await page.locator('#placementStatus').innerText(),/Eingang/);
    await placeCell(page,7,4);assert((await snapshot(page)).items.some(item=>item.type==='bar'&&item.x===7&&item.y===4&&item.r===1));
    await capture(page,'custom-furniture.png');
    await page.click('#deleteBtn');assert.equal(await page.locator('.toolbtn.active').count(),0);
    await tapCell(page,5,2);assert(!(await snapshot(page)).items.some(item=>item.type==='table'&&item.x===5&&item.y===2));
    await page.click('#undoBtn');assert((await snapshot(page)).items.some(item=>item.type==='table'&&item.x===5&&item.y===2));
    const custom=(await snapshot(page)).items;await page.click('#resetBtn');current=await snapshot(page);
    assert.deepEqual(current.items,model.DEFAULT_LAYOUT);assert.equal(current.rotation,0);assert.equal(current.deleteMode,false);assert.equal(current.tool,'table');
    assert.equal(current.seats,4);assert.equal(await page.locator('#deleteBtn').getAttribute('aria-pressed'),'false');assert.equal(await page.locator('[data-seats="4"]').getAttribute('aria-pressed'),'true');
    await page.click('#undoBtn');assert.deepEqual((await snapshot(page)).items,custom);
    await loaded(page,url);assert.deepEqual((await snapshot(page)).items,custom);
    await page.click('#restaurantBtn');await page.click('[data-speed="1"]');
    await page.evaluate(async modulePath=>{const {app}=await import(modulePath);app.ticker.stop();app.ticker.maxFPS=0;for(let i=0;i<480;i++)app.ticker.update(app.ticker.lastTime+1000/60);},corePath);
    current=await snapshot(page);const occupied=new Set(current.items.flatMap(model.occupiedCells));
    for(const actor of current.movers.filter(actor=>actor.visible)){assert(!occupied.has(`${Math.round(actor.x)},${Math.round(actor.y)}`),'Guest walked through furniture.');assert(actor.y>=2&&actor.x>=0&&actor.x<model.ROOM.w&&actor.y<model.ROOM.h);}
    await page.click('[data-speed="0"]');await page.click('#resetBtn');
    await page.evaluate(async modulePath=>{const {app}=await import(modulePath);app.ticker.maxFPS=60;app.ticker.start();},corePath);
    console.log('Restaurant passed: combined 2D table sprites, all capacities, touch preview/confirm/cancel, kitchen/entrance/overlap checks, rotation, deletion, undo/reset, reload and guest paths.');

    for(const {width,height} of [{width:320,height:568},{width:393,height:852},{width:430,height:932},{width:768,height:1024},{width:1280,height:720},{width:844,height:390}]){
      await page.setViewportSize({width,height});await page.waitForTimeout(120);
      await page.click('#cityBtn');await page.click('#restaurantBtn');
      const geometry=await page.evaluate(async modulePath=>{
        const {root,world,app,sceneViewport}=await import(modulePath),area=sceneViewport(true),room=world.children[0].getBounds();
        const visible=[...document.querySelectorAll('#app button')].filter(element=>element.getClientRects().length&&getComputedStyle(element).visibility!=='hidden');
        const base=root.getBoundingClientRect();
        return {area,room:{left:room.x,right:room.x+room.width,top:room.y,bottom:room.y+room.height},screen:{width:app.screen.width,height:app.screen.height},base:{width:base.width,height:base.height},uiClipped:visible.filter(element=>{const rect=element.getBoundingClientRect();return rect.left<base.left-.5||rect.right>base.right+.5||rect.top<base.top-.5||rect.bottom>base.bottom+.5;}).map(element=>element.id||element.innerText),buttonOverflow:visible.filter(element=>element.scrollWidth>element.clientWidth+1).map(element=>element.id||element.innerText),moneyOverflow:document.querySelector('.money').scrollWidth>document.querySelector('.money').clientWidth+1};
      },corePath);
      assert.equal(geometry.uiClipped.length,0,JSON.stringify({width,height,...geometry}));assert(!geometry.moneyOverflow,'Account text overflow at '+width);
      assert.equal(geometry.buttonOverflow.length,0,JSON.stringify({width,height,buttonOverflow:geometry.buttonOverflow}));
      assert.equal(geometry.screen.width,geometry.base.width);assert.equal(geometry.screen.height,geometry.base.height);
      assert(geometry.room.left>=geometry.area.left-2&&geometry.room.right<=geometry.area.right+2&&geometry.room.top>=geometry.area.top-2&&geometry.room.bottom<=geometry.area.bottom+2,JSON.stringify({width,height,...geometry}));
      await capture(page,`restaurant-${width}x${height}.png`);
      await page.click('[data-tool="plant"]');await placeCell(page,7,3);assert((await snapshot(page)).items.some(item=>item.type==='plant'&&item.x===7&&item.y===3));await page.click('#undoBtn');
      await page.click('#cityBtn');await capture(page,`city-${width}x${height}.png`);
    }
    console.log('Responsive views passed: 320, 393, 430, tablet, desktop and landscape, including real placement after resize.');

    await page.evaluate(()=>localStorage.setItem('pizza-city-layout-v1','{"version":1,"items":[{"type":"broken","x":1,"y":1,"r":0}]}'));
    await loaded(page,url);assert.deepEqual((await snapshot(page)).items,model.DEFAULT_LAYOUT);
    await page.evaluate(()=>localStorage.setItem('pizza-city-layout-v1','{"version":1,"items":[]}'));
    await loaded(page,url);assert.equal((await snapshot(page)).items.length,0);
    await page.evaluate(()=>localStorage.setItem('pizza-city-layout-v1',JSON.stringify({version:1,items:[{type:'table',x:2,y:3,r:0},{type:'chair',x:1,y:3,r:0}]})));
    await loaded(page,url);assert.deepEqual((await snapshot(page)).items,[{type:'table',seats:4,x:2,y:3,r:0}]);
    const storagePage=await context.newPage();storagePage.on('pageerror',error=>errors.push(error.message));
    await storagePage.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Unavailable','SecurityError');}}));
    await loaded(storagePage,url);await storagePage.click('#restaurantBtn');await storagePage.click('[data-tool="plant"]');await placeCell(storagePage,0,3);assert.equal((await snapshot(storagePage)).items.length,model.DEFAULT_LAYOUT.length+1);await storagePage.close();
    await page.route('**/assets/pizza/city/pixel-city.png',route=>route.fulfill({status:404,body:'missing'}));
    await loaded(page,url);assert.equal((await snapshot(page)).assets.length,1);await page.click('#restaurantBtn');assert.equal(await page.locator('#placementTitle').innerText(),'4er-Tisch mit Stühlen · 0°');await page.unroute('**/assets/pizza/city/pixel-city.png');
    await page.route('**/assets/pizza/vendor/pixi-8.22.0.mjs',route=>route.abort());
    await page.goto(url);await page.getByRole('button',{name:'Erneut laden',exact:true}).waitFor();
    await page.unroute('**/assets/pizza/vendor/pixi-8.22.0.mjs');await page.getByRole('button',{name:'Erneut laden',exact:true}).click();await page.waitForSelector('#loading',{state:'hidden',timeout:15000});
    assert.equal(errors.length,0,errors.join('\n'));assert.equal(external.length,0,external.join('\n'));
    console.log('Recovery passed: invalid/empty saves, unavailable storage, missing asset fallback and startup retry. No external requests or runtime errors.');
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
