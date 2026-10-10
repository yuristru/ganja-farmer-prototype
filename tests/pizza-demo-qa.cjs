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
    return {scene:state.scene,balance:state.balance,items:state.restaurantState,history:state.history.length,rotation:state.rotation,deleteMode:state.deleteMode,tool:state.selectedTool,seats:state.selectedSeats,pending:state.pendingPlacement,speed:state.speed,minutes:state.gameMinutes,view:state.cityView,assets:state.assetFailures,screen:{width:app.screen.width,height:app.screen.height},size:{width:root.clientWidth,height:root.clientHeight},movers:state.movers.map(m=>({x:m.x,y:m.y,t:m.t,lane:m.lane,axis:m.axis,z:m.g.zIndex,visible:m.g.visible,kind:m.kind})),worldChildren:world.children.length};
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
async function selectTool(page,type,seats){
  const category=type==='table'?'table':type==='oven'?'oven':type==='bar'?'bar':'decor';
  const selector=seats?`[data-seats="${seats}"]`:`[data-tool="${type}"]`;
  if(!await page.locator(selector).first().isVisible()){
    await page.click(`[data-category="${category}"]`);
    if(type==='table')await page.click('[data-quality="wood"]');
  }
  await page.locator(selector).first().click();
}
async function loaded(page,url){await page.goto(url);await page.waitForSelector('#loading',{state:'hidden',timeout:15000});}

(async()=>{
  const model=await import(pathToFileURL(modelPath));
  assert(model.validLayout(model.DEFAULT_LAYOUT));
  assert(model.validLayout([]));
  assert.equal(model.placementIssue({type:'table',seats:4,x:5,y:2,r:0},model.DEFAULT_LAYOUT),null);
  assert.match(model.placementIssue({type:'plant',x:8,y:1,r:0},[]),/Küche/);
  assert.match(model.placementIssue({type:'table',seats:4,x:11,y:5,r:0},[]),/Raum/);
  assert.match(model.placementIssue({type:'bar',x:11,y:8,r:1},[]),/Eingang/);
  assert.equal(model.placementIssue({type:'bar',x:7,y:4,r:1},model.DEFAULT_LAYOUT),null);
  assert.match(model.placementIssue({type:'plant',x:3,y:4,r:0},model.DEFAULT_LAYOUT),/bereits/);
  for(const invalid of [null,{},[{type:'unknown',x:0,y:3,r:0}],[{type:'plant',x:2.5,y:3,r:0}],[{type:'plant',x:2,y:3,r:5}],[{type:'plant',x:8,y:1,r:0}],[{type:'chair',x:0,y:3,r:0}],[{type:'table',seats:3,x:0,y:3,r:0}],[...model.DEFAULT_LAYOUT,model.DEFAULT_LAYOUT[0]]]) assert.equal(model.validLayout(invalid),false);
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
  assert.equal(model.ROOM.w*model.ROOM.h,120);
  assert.match(model.placementIssue({type:'plant',x:0,y:0,r:0},[]),/Wanddekoration/);
  assert(!model.guestCell(0,0));
  assert.equal(model.KITCHEN.w*model.KITCHEN.h,16);
  assert.equal(model.placementIssue({type:'table',seats:4,x:6,y:0,r:0},[]),null,'The former kitchen strip must be available to guests.');
  assert.match(model.placementIssue({type:'plant',...model.KITCHEN_DOOR,r:0},[]),/Küchendurchgang/);
  for(let y=0;y<4;y++)for(let x=8;x<12;x++)assert.match(model.placementIssue({type:'plant',x,y,r:0},[]),/Küche/);
  assert.equal(model.placementIssue({type:'table',seats:4,x:7,y:1,r:0},[]).includes('Küche'),true,'A multi-cell table cannot cross the kitchen wall.');
  assert.deepEqual(model.upgradeLayout([{type:'table',seats:4,x:6,y:4,r:0}],2),[{type:'table',seats:4,x:6,y:4,r:0}]);
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
    const cityArt=await page.evaluate(async modulePath=>{
      const {state,Sprite}=await import(modulePath),objects=state.camera.children.find(c=>c.label==='city-objects');
      return {atlases:Object.fromEntries(Object.entries(state.cityArt).map(([key,frames])=>[key,frames.length])),buildings:objects.children.filter(c=>c.label==='city-building').length,
        landmarks:objects.children.filter(c=>['city-colosseum','city-cathedral'].includes(c.label)).map(c=>({label:c.label,sprite:c instanceof Sprite})),
        traffic:state.movers.map(m=>({sprite:m.g instanceof Sprite,scaleX:m.g.scale.x,scaleY:m.g.scale.y})),
        terraces:objects.children.filter(c=>c.label==='city-terrace').map(c=>({sprite:c instanceof Sprite,x:(c.x/32+c.y/16)/2,y:(c.y/16-c.x/32)/2}))};
    },corePath);
    assert.deepEqual(cityArt.atlases,{buildings:8,landmarks:2,props:8});assert(cityArt.buildings>=30);
    assert.equal(cityArt.landmarks.length,2);assert(cityArt.landmarks.every(item=>item.sprite));
    assert(cityArt.traffic.every(item=>item.sprite&&item.scaleX>0&&item.scaleY>0),'Directional traffic must remain upright flat sprites.');
    assert.equal(cityArt.terraces.length,6);
    const roadCell=value=>{const cell=Math.round(value),m=((cell%8)+8)%8;return m<2;};
    assert(cityArt.terraces.every(item=>item.sprite&&!roadCell(item.x)&&!roadCell(item.y)),'Terraces must stay off the carriageway.');
    console.log('City art passed: eight buildings, two landmarks, eight props, upright 2D traffic and six terrace sprites off the roads.');
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
    const pinchStart=(await snapshot(page)).view.zoom,cdp=await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:90,y:300,id:1},{x:240,y:300,id:2}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:55,y:300,id:1},{x:275,y:300,id:2}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert((await snapshot(page)).view.zoom>pinchStart*1.4);assert.equal((await snapshot(page)).scene,'city');await page.click('#centerBtn');
    console.log('City interaction passed: drag versus tap, camera persistence, zoom buttons and two-finger zoom.');

    // Run the registered ticker at known frame intervals, independent of CPU speed.
    await page.evaluate(async modulePath=>{const {app}=await import(modulePath);app.ticker.stop();app.ticker.maxFPS=0;},corePath);
    const advance=()=>page.evaluate(async modulePath=>{const {app}=await import(modulePath);for(let i=0;i<60;i++)app.ticker.update(app.ticker.lastTime+1000/60);},corePath);
    const paused=await snapshot(page);await advance();assert.equal((await snapshot(page)).minutes,paused.minutes);assert.deepEqual((await snapshot(page)).movers,paused.movers);
    await page.click('[data-speed="1"]');const normal=await snapshot(page);await advance();const normalDelta=(await snapshot(page)).minutes-normal.minutes;
    await page.click('[data-speed="3"]');const fast=await snapshot(page);await advance();const fastDelta=(await snapshot(page)).minutes-fast.minutes;
    await page.click('[data-speed="6"]');const fastest=await snapshot(page);await advance();const fastestDelta=(await snapshot(page)).minutes-fastest.minutes;
    assert(normalDelta>0);assert(Math.abs(fastDelta/normalDelta-3)<.001);assert(Math.abs(fastestDelta/normalDelta-6)<.001);await page.click('[data-speed="0"]');
    for(const mover of (await snapshot(page)).movers){
      const x=mover.axis===0?mover.t:mover.lane,y=mover.axis===0?mover.lane:mover.t;
      assert(Math.abs(mover.z-(x+y)*16)<1e-8,'Traffic depth must use its ground position.');
      const inCanal=x>=23.5&&x<25.5&&y>=11.5;
      assert(!inCanal||(mover.kind==='car'&&roadCell(y)),'Traffic must cross the canal only on bridges.');
    }
    console.log('Time and depth passed: real pause, normal/3x/6x speed, live clock, traffic depth and safe canal crossings.');
    await page.evaluate(async modulePath=>{const {app}=await import(modulePath);app.ticker.maxFPS=0;app.ticker.stop();},corePath);

    await page.click('#restaurantBtn');assert.equal(await page.locator('[data-tool="chair"]').count(),0);
    const restaurantModule=fs.readFileSync(path.join(root,'pizza.js'),'utf8').match(/from ['"](.\/pizza-restaurant\.js[^'"]*)['"]/)[1].replace('./','/');
    const getRoomView=()=>page.evaluate(async source=>(await import(source)).restaurantView(),restaurantModule);
    assert.equal((await getRoomView()).zoom,1);
    await page.click('#roomZoomInBtn');assert.equal((await getRoomView()).zoom,1.25);
    await page.click('#roomZoomInBtn');await page.click('#roomPanBtn');assert.equal((await getRoomView()).panMode,true);
    const panStart=await nodePoint(page,'floor-5-4'),itemsBeforePan=(await snapshot(page)).items;
    await page.mouse.move(panStart.x,panStart.y);await page.mouse.down();await page.mouse.move(panStart.x+35,panStart.y+10,{steps:5});await page.mouse.up();
    assert(Math.abs((await getRoomView()).x)>1,'The enlarged restaurant must pan.');
    assert.deepEqual((await snapshot(page)).items,itemsBeforePan);assert.equal((await snapshot(page)).pending,null);
    await page.click('#roomCenterBtn');assert.equal((await getRoomView()).zoom,1);assert.equal((await getRoomView()).panMode,false);
    const pinchArea=await page.evaluate(async source=>(await import(source)).sceneViewport(true),corePath);
    const pinchX=(pinchArea.left+pinchArea.right)/2,pinchY=(pinchArea.top+pinchArea.bottom)/2;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:pinchX-20,y:pinchY,id:1},{x:pinchX+20,y:pinchY,id:2}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:pinchX-40,y:pinchY,id:1},{x:pinchX+40,y:pinchY,id:2}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert((await getRoomView()).zoom>1.4,'Two-finger zoom must enlarge the restaurant.');
    assert.equal((await snapshot(page)).pending,null);assert.deepEqual((await snapshot(page)).items,itemsBeforePan);
    await page.click('#roomCenterBtn');

    await page.click('[data-category="table"]');assert.equal(await page.locator('[data-quality]').count(),3);
    await page.click('[data-quality="premium"]');assert.equal(await page.locator('[data-seats]').count(),4);
    await page.click('[data-seats="2"]');const beforeBuy=await snapshot(page);await placeCell(page,5,0);
    let purchased=await snapshot(page);assert.equal(purchased.balance,beforeBuy.balance-1040);assert(purchased.items.some(p=>p.variant==='premium'&&p.paid===1040));
    await page.click('#deleteBtn');await tapCell(page,5,0);assert.equal((await snapshot(page)).balance,beforeBuy.balance-520);
    await page.click('#undoBtn');assert.equal((await snapshot(page)).balance,beforeBuy.balance-1040);
    await page.click('#undoBtn');assert.deepEqual((await snapshot(page)).items,beforeBuy.items);assert.equal((await snapshot(page)).balance,beforeBuy.balance);
    await selectTool(page,'arcade');await placeCell(page,5,0);assert((await snapshot(page)).items.some(p=>p.type==='arcade'&&p.paid===2800));await page.click('#undoBtn');
    await page.click('#resetBtn');
    const budget=(await snapshot(page)).balance;
    await page.evaluate(async source=>{const {state,updateMoney}=await import(source);state.balance=0;updateMoney();},corePath);
    await selectTool(page,'oven');await tapCell(page,6,0);assert.equal(await page.locator('#placeBtn').isEnabled(),false);assert.match(await page.locator('#placementStatus').innerText(),/Nicht genügend/);
    await page.evaluate(async ({source,budget})=>{const {state,updateMoney}=await import(source);state.balance=budget;updateMoney();},{source:corePath,budget});
    await page.click('#resetBtn');
    // Each capacity is one sprite and one placement, including its chairs.
    for(const [seats,x,y]of [[2,0,2],[4,5,2],[6,5,0],[8,0,5]]){
      await selectTool(page,'table',seats);const before=await snapshot(page);await tapCell(page,x,y);
      assert.equal((await snapshot(page)).items.length,before.items.length);assert.equal((await snapshot(page)).history,before.history);
      await capture(page,`table-${seats}-preview.png`);await page.click('#placeBtn');
      assert((await snapshot(page)).items.some(item=>item.type==='table'&&item.seats===seats&&item.x===x&&item.y===y));
      const groups=await page.evaluate(async modulePath=>{const {world,Sprite}=await import(modulePath);return world.children[0].children.find(c=>c.label==='restaurant-objects').children.filter(c=>c.label==='placed-furniture').map(c=>({children:c.children.length,isSprite:c.children[0] instanceof Sprite,label:c.children[0].label}));},corePath);
      assert(groups.every(g=>g.children===1&&g.isSprite&&g.label==='furniture-sprite'),'Furniture must consist of one flat sprite.');
      await page.click('#undoBtn');assert.deepEqual((await snapshot(page)).items,before.items);
    }
    await selectTool(page,'table',8);await page.click('#rotateBtn');await placeCell(page,6,2);
    assert((await snapshot(page)).items.some(item=>item.seats===8&&item.r===1&&item.x===6&&item.y===2));await capture(page,'table-8-rotated.png');await page.click('#undoBtn');
    await page.click('#resetBtn');await selectTool(page,'plant');await tapCell(page,0,3);
    assert.equal((await snapshot(page)).items.length,model.DEFAULT_LAYOUT.length);await page.click('#cancelBtn');assert.equal((await snapshot(page)).pending,null);
    await tapCell(page,0,3);await page.keyboard.press('Escape');assert.equal((await snapshot(page)).pending,null);assert.equal((await snapshot(page)).items.length,model.DEFAULT_LAYOUT.length);
    await tapCell(page,0,3);await page.keyboard.press('Enter');assert((await snapshot(page)).items.some(item=>item.type==='plant'&&item.x===0&&item.y===3));await page.click('#undoBtn');
    // A touch drag moves only the snapped preview until Setzen is pressed.
    const start=await nodePoint(page,'floor-0-2'),end=await nodePoint(page,'floor-0-3');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start.x,y:start.y,id:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:end.x,y:end.y,id:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.deepEqual((await snapshot(page)).pending,{x:0,y:3});assert.equal((await snapshot(page)).items.length,model.DEFAULT_LAYOUT.length);await page.click('#placeBtn');
    let current=await snapshot(page);assert(current.items.some(item=>item.type==='plant'&&item.x===0&&item.y===3));
    const count=current.items.length;await tapCell(page,8,1);assert.equal((await snapshot(page)).items.length,count);assert.equal(await page.locator('#placeBtn').isEnabled(),false);assert.match(await page.locator('#placementStatus').innerText(),/Küche/);
    await selectTool(page,'table',4);await placeCell(page,5,2);current=await snapshot(page);assert.equal(current.items.length,count+1);
    await tapCell(page,6,2);assert.equal((await snapshot(page)).items.length,count+1);assert.equal(await page.locator('#placeBtn').isEnabled(),false);assert.match(await page.locator('#placementStatus').innerText(),/bereits/);
    await selectTool(page,'bar');await page.click('#rotateBtn');assert.equal((await snapshot(page)).rotation,1);
    await tapCell(page,11,8);assert.equal((await snapshot(page)).items.length,count+1);assert.equal(await page.locator('#placeBtn').isEnabled(),false);assert.match(await page.locator('#placementStatus').innerText(),/Eingang/);
    await placeCell(page,7,4);assert((await snapshot(page)).items.some(item=>item.type==='bar'&&item.x===7&&item.y===4&&item.r===1));
    await capture(page,'custom-furniture.png');
    await page.click('#deleteBtn');assert.equal(await page.locator('.toolbtn.active').count(),0);
    const chairPoint=await page.evaluate(async modulePath=>{
      const {world,root,app}=await import(modulePath);app.render();
      const group=world.children[0].children.find(c=>c.label==='restaurant-objects').children.find(c=>c.label==='placed-furniture'&&c.position.x===96&&c.position.y===128);
      const sprite=group.children[0];if(!sprite.hitArea.contains(-30,-54))throw new Error('Chair pixel is not opaque.');
      const point=sprite.toGlobal({x:-30,y:-54}),base=root.getBoundingClientRect();return {x:point.x+base.left,y:point.y+base.top};
    },corePath);
    await page.mouse.click(chairPoint.x,chairPoint.y);assert(!(await snapshot(page)).items.some(item=>item.type==='table'&&item.x===5&&item.y===2),'Tapping a baked chair must remove its whole table group.');
    await page.click('#undoBtn');assert((await snapshot(page)).items.some(item=>item.type==='table'&&item.x===5&&item.y===2));
    const custom=(await snapshot(page)).items;await page.click('#resetBtn');current=await snapshot(page);
    assert.deepEqual(current.items,model.DEFAULT_LAYOUT);assert.equal(current.rotation,0);assert.equal(current.deleteMode,false);assert.equal(current.tool,'table');
    assert.equal(current.seats,4);assert.equal(await page.locator('#deleteBtn').getAttribute('aria-pressed'),'false');assert.equal(await page.locator('[data-seats="4"]').getAttribute('aria-pressed'),'true');
    await page.click('#undoBtn');assert.deepEqual((await snapshot(page)).items,custom);
    await loaded(page,url);assert.deepEqual((await snapshot(page)).items,custom);
    await page.click('#restaurantBtn');await page.click('[data-speed="1"]');
    await page.evaluate(async modulePath=>{const {app}=await import(modulePath);app.ticker.stop();app.ticker.maxFPS=0;for(let i=0;i<480;i++)app.ticker.update(app.ticker.lastTime+1000/60);},corePath);
    current=await snapshot(page);const occupied=new Set(current.items.flatMap(model.occupiedCells));
    for(const actor of current.movers.filter(actor=>actor.visible)){assert(!occupied.has(`${Math.round(actor.x)},${Math.round(actor.y)}`),'Guest walked through furniture.');assert(model.guestCell(Math.round(actor.x),Math.round(actor.y)),'Guest entered the separate kitchen.');}
    await page.click('[data-speed="0"]');await page.click('#resetBtn');
    await page.evaluate(async modulePath=>{const {app}=await import(modulePath);app.ticker.maxFPS=0;app.ticker.stop();},corePath);
    console.log('Restaurant passed: combined 2D table sprites, all capacities, touch preview/confirm/cancel, kitchen/entrance/overlap checks, rotation, deletion, undo/reset, reload and guest paths.');

    for(const {width,height} of [{width:320,height:568},{width:393,height:852},{width:430,height:932},{width:768,height:1024},{width:1280,height:720},{width:844,height:390}]){
      await page.setViewportSize({width,height});await page.waitForTimeout(120);
      await page.click('#cityBtn');await page.click('#restaurantBtn');
      const geometry=await page.evaluate(async modulePath=>{
        const {root,world,app,sceneViewport}=await import(modulePath),area=sceneViewport(true),room=world.children[0].getBounds();
        const visible=[...document.querySelectorAll('#app button')].filter(element=>element.getClientRects().length&&getComputedStyle(element).visibility!=='hidden');
        const base=root.getBoundingClientRect();
        const tools=document.querySelector('#tools').getBoundingClientRect(),nav=document.querySelector('.bottomnav').getBoundingClientRect(),hint=document.querySelector('#placementHint').getBoundingClientRect();
        const head=document.querySelector('#restaurantHead').getBoundingClientRect(),headerOverflow=[...document.querySelectorAll('#restaurantHead strong,#restaurantHead span')].filter(e=>e.getClientRects().length).some(e=>{const r=e.getBoundingClientRect();return r.top<head.top+2||r.bottom>head.bottom-2;});
        return {area,room:{left:room.x,right:room.x+room.width,top:room.y,bottom:room.y+room.height},screen:{width:app.screen.width,height:app.screen.height},base:{width:base.width,height:base.height},headerOverflow,toolbarOverlap:tools.bottom>nav.top+1,hintOverlap:root.dataset.compact==='landscape'&&hint.bottom>tools.top+1,uiClipped:visible.filter(element=>{let rect=element.getBoundingClientRect();const scroller=element.closest('.catalogOptions');if(scroller){const clip=scroller.getBoundingClientRect();rect={left:Math.max(rect.left,clip.left),right:Math.min(rect.right,clip.right),top:Math.max(rect.top,clip.top),bottom:Math.min(rect.bottom,clip.bottom)};if(rect.right<=rect.left||rect.bottom<=rect.top)return false;}return rect.left<base.left-.5||rect.right>base.right+.5||rect.top<base.top-.5||rect.bottom>base.bottom+.5;}).map(element=>element.id||element.innerText),buttonOverflow:visible.filter(element=>element.scrollWidth>element.clientWidth+1).map(element=>element.id||element.innerText),moneyOverflow:document.querySelector('.money').scrollWidth>document.querySelector('.money').clientWidth+1};
      },corePath);
      assert.equal(geometry.uiClipped.length,0,JSON.stringify({width,height,...geometry}));assert(!geometry.moneyOverflow,'Account text overflow at '+width);
      assert.equal(geometry.buttonOverflow.length,0,JSON.stringify({width,height,buttonOverflow:geometry.buttonOverflow}));
      assert(!geometry.toolbarOverlap&&!geometry.hintOverlap,'Editor controls overlap at '+width+'x'+height);
      assert(!geometry.headerOverflow,'Restaurant title overflows at '+width+'x'+height);
      assert.equal(geometry.screen.width,geometry.base.width);assert.equal(geometry.screen.height,geometry.base.height);
      assert(geometry.room.left>=geometry.area.left-2&&geometry.room.right<=geometry.area.right+2&&geometry.room.top>=geometry.area.top-2&&geometry.room.bottom<=geometry.area.bottom+2,JSON.stringify({width,height,...geometry}));
      await capture(page,`restaurant-${width}x${height}.png`);
      await selectTool(page,'plant');await placeCell(page,7,3);assert((await snapshot(page)).items.some(item=>item.type==='plant'&&item.x===7&&item.y===3));await page.click('#undoBtn');
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
    await loaded(storagePage,url);await storagePage.click('#restaurantBtn');await selectTool(storagePage,'plant');await placeCell(storagePage,0,3);assert.equal((await snapshot(storagePage)).items.length,model.DEFAULT_LAYOUT.length+1);await storagePage.close();
    for(const asset of ['buildings','landmarks','props']){
      const pattern='**/assets/pizza/city/italian-'+asset+'-v2.png';
      await page.route(pattern,route=>route.fulfill({status:404,body:'missing'}));
      await loaded(page,url);assert.deepEqual((await snapshot(page)).assets,[asset]);
      await page.click('#restaurantBtn');assert.equal(await page.locator('#placementTitle').innerText(),'4er-Tisch mit Stühlen · 0°');
      await page.unroute(pattern);
    }
    await page.route('**/assets/pizza/restaurant/*.png',route=>route.fulfill({status:404,body:'missing'}));
    await loaded(page,url);await page.click('#restaurantBtn');await selectTool(page,'oven');await placeCell(page,0,3);
    await capture(page,'restaurant-art-fallback.png');await page.click('#undoBtn');await page.unroute('**/assets/pizza/restaurant/*.png');
    await page.route('**/assets/pizza/city/*.png',route=>route.fulfill({status:404,body:'missing'}));
    await loaded(page,url);assert.equal((await snapshot(page)).assets.length,4);
    await page.click('#restaurantBtn');await selectTool(page,'plant');await placeCell(page,0,3);
    await page.unroute('**/assets/pizza/city/*.png');
    await page.route('**/assets/pizza/vendor/pixi-8.22.0.mjs',route=>route.abort());
    await page.goto(url);await page.getByRole('button',{name:'Erneut laden',exact:true}).waitFor();
    await page.unroute('**/assets/pizza/vendor/pixi-8.22.0.mjs');await page.getByRole('button',{name:'Erneut laden',exact:true}).click();await page.waitForSelector('#loading',{state:'hidden',timeout:15000});
    assert.equal(errors.length,0,errors.join('\n'));assert.equal(external.length,0,external.join('\n'));
    console.log('Recovery passed: invalid/empty saves, unavailable storage, missing asset fallback and startup retry. No external requests or runtime errors.');
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
