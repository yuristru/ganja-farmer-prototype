import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const outDir=path.join(root,'qa','v87');
fs.mkdirSync(outDir,{recursive:true});

const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json'};
const server=http.createServer((req,res)=>{
  const clean=decodeURIComponent((req.url||'/').split('?')[0]);
  const rel=clean==='/'?'index.html':clean.replace(/^\//,'');
  const file=path.join(root,rel);
  if(!file.startsWith(root)){res.writeHead(403);res.end();return;}
  fs.readFile(file,(err,data)=>{
    if(err){res.writeHead(404);res.end('not found');return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});
    res.end(data);
  });
});
await new Promise(resolve=>server.listen(4173,'127.0.0.1',resolve));

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:1});
const url='http://127.0.0.1:4173/';

const variants={
  A:{
    label:'Natural',
    training:{prunes:[],bends:[],defoliations:[]},
    defEvents:[]
  },
  B:{
    label:'Early topping',
    training:{
      prunes:[{nodeId:'main:n4',axisId:'main',axisNode:4,cutDay:18,cutProg:.62}],
      bends:[],
      defoliations:[]
    },
    defEvents:[]
  },
  C:{
    label:'Topping + LST + defoliation',
    training:{
      prunes:[{nodeId:'main:n4',axisId:'main',axisNode:4,cutDay:18,cutProg:.62}],
      bends:[
        {axisId:'shoot:main:n4:bud:L',events:[{day:24,amount:.78}]},
        {axisId:'shoot:main:n4:bud:R',events:[{day:24,amount:.78}]}
      ],
      defoliations:['main:n2:leaf:L','main:n2:leaf:R','main:n3:leaf:L','main:n3:leaf:R']
    },
    defEvents:[
      {day:30,leafId:'main:n2:leaf:L'},
      {day:30,leafId:'main:n2:leaf:R'},
      {day:30,leafId:'main:n3:leaf:L'},
      {day:30,leafId:'main:n3:leaf:R'}
    ]
  }
};

function phaseStats(day){
  const counts={seedling:0,veg:0,stretch:0,flower:0};
  for(let d=1;d<=day;d++){
    const k=d<15?'seedling':d<36?'veg':d<57?'stretch':'flower';
    counts[k]++;
  }
  return Object.fromEntries(Object.entries(counts).map(([k,n])=>[k,{sum:n,days:n}]));
}

async function seedState(variant,day){
  await page.goto(url,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>localStorage.getItem('gf_mobile_game_v1'));
  await page.evaluate(({variant,day,phase})=>{
    const key='gf_mobile_game_v1';
    const st=JSON.parse(localStorage.getItem(key));
    st.plant.day=day;
    st.plant.stress=0;
    st.plant.growthPotential=1;
    st.plant.harvested=false;
    st.plant.conditionMemory={stressDebt:0,recoveryMomentum:.35,lastEvaluatedDay:day};
    st.care.water=.68;
    st.care.nutrients=.68;
    st.care.ventilation=.78;
    st.care.cooldowns={water:0,feed:0,vent:0};
    st.turn={day,turnsToday:0,lastTurnAt:0,lastAction:null};
    st.cycle={dateKey:'2099-01-01',advancesToday:0,lastAdvanceAt:0};
    st.settings={...(st.settings||{}),debugBypass:true};
    st.training=structuredClone(variant.training);
    st.history={};
    for(let d=1;d<=day;d++){
      st.history[String(d)]={
        day:d,
        fulfillment:1,
        stress:0,
        vigor:1,
        growthPotential:1,
        scores:{water:1,light:1,nutrients:1,climate:1},
        levels:{water:.68,light:.92,nutrients:.68,ventilation:.78,climate:.86},
        damage:{waterDef:0,nutrientDef:0,waterExcess:0,nutrientExcess:0,lightDef:0,climateDef:0,acute:0},
        conditionMemory:{stressDebt:0,recoveryMomentum:.35,lastEvaluatedDay:d},
        createdAt:0
      };
    }
    st.biography={
      perfectDays:day,
      stressDays:0,
      severeDays:0,
      longestStressStreak:0,
      currentStressStreak:0,
      phase,
      events:[],
      defoliationEvents:structuredClone(variant.defEvents)
    };
    localStorage.setItem(key,JSON.stringify(st));
  },{variant,day,phase:phaseStats(day)});
  await page.reload({waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.__GFTRAIN && window.__GFTRAIN.getBiology);
  await page.evaluate(day=>window.__GFTRAIN.setDay(day),day);
  await page.waitForTimeout(550);
}

async function measureArchitecture(){
  await page.click('[data-mobile-tool="bend"]');
  await page.waitForTimeout(120);
  const raw=await page.evaluate(()=>({
    hits:window.__GFTRAIN.getHits(),
    biology:window.__GFTRAIN.getBiology()
  }));
  const pts=raw.hits.axes.flatMap(a=>a.screen||[]);
  const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);
  const bounds=pts.length?{
    minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys),
    width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)
  }:{minX:0,maxX:0,minY:0,maxY:0,width:0,height:0};
  const growing=raw.biology.buds.filter(b=>b.state==='growing').length;
  const activated=raw.biology.buds.filter(b=>b.state==='activated').length;
  const generations={};
  for(const s of raw.biology.shoots)generations[s.generation]=(generations[s.generation]||0)+1;
  return {
    axisCount:raw.hits.axes.length,
    visibleNodes:raw.hits.nodes.length,
    shootCount:raw.biology.shoots.length,
    growingBuds:growing,
    activatedBuds:activated,
    generations,
    bounds:Object.fromEntries(Object.entries(bounds).map(([k,v])=>[k,Math.round(v*10)/10]))
  };
}

async function readTrainingBadges(){
  await page.click('[data-ui-tab="genetics"]');
  await page.waitForTimeout(80);
  return await page.locator('.training-architecture-v87 span').allTextContents();
}

async function readHarvest(){
  await page.click('[data-ui-tab="care"]');
  await page.click('#harvestReadyBox');
  await page.waitForTimeout(180);
  const metrics={};
  const rows=page.locator('#harvestMetrics > div');
  const n=await rows.count();
  for(let i=0;i<n;i++){
    const row=rows.nth(i);
    const label=(await row.locator('span').innerText()).trim();
    const value=Number((await row.locator('b').innerText()).trim());
    metrics[label]=value;
  }
  return {
    total:Number((await page.locator('#harvestTotalScore').innerText()).trim()),
    grams:Number((await page.locator('#jarAmount').innerText()).replace(/[^0-9.]/g,'')),
    rating:(await page.locator('#harvestFinalRating').innerText()).trim(),
    reward:Number((await page.locator('#harvestReward').innerText()).replace(/[^0-9.]/g,'')),
    signature:await page.locator('#harvestSignature span').allTextContents(),
    metrics
  };
}

const days=[25,40,60,84];
const results={meta:{viewport:'393x852',seed:'Garden Dream #48291',care:'perfect deterministic',days},variants:{}};

for(const [id,variant] of Object.entries(variants)){
  results.variants[id]={label:variant.label,days:{}};
  for(const day of days){
    await seedState(variant,day);
    const architecture=await measureArchitecture();
    const badges=await readTrainingBadges();
    await page.locator('#c').screenshot({path:path.join(outDir,`${id}-day${day}.png`)});
    const record={architecture,badges};
    if(day===84)record.harvest=await readHarvest();
    results.variants[id].days[String(day)]=record;
  }
}

function pct(a,b){return b===0?0:Math.round((a-b)/b*1000)/10;}
const compare={};
for(const day of days){
  const A=results.variants.A.days[String(day)].architecture;
  const B=results.variants.B.days[String(day)].architecture;
  const C=results.variants.C.days[String(day)].architecture;
  compare[String(day)]={
    B_vs_A:{axisDelta:B.axisCount-A.axisCount,widthPct:pct(B.bounds.width,A.bounds.width),heightPct:pct(B.bounds.height,A.bounds.height),shootDelta:B.shootCount-A.shootCount},
    C_vs_A:{axisDelta:C.axisCount-A.axisCount,widthPct:pct(C.bounds.width,A.bounds.width),heightPct:pct(C.bounds.height,A.bounds.height),shootDelta:C.shootCount-A.shootCount},
    C_vs_B:{axisDelta:C.axisCount-B.axisCount,widthPct:pct(C.bounds.width,B.bounds.width),heightPct:pct(C.bounds.height,B.bounds.height),shootDelta:C.shootCount-B.shootCount}
  };
}
const hA=results.variants.A.days['84'].harvest,hB=results.variants.B.days['84'].harvest,hC=results.variants.C.days['84'].harvest;
compare.harvest={
  A:{total:hA.total,grams:hA.grams,rating:hA.rating,signature:hA.signature},
  B:{total:hB.total,grams:hB.grams,rating:hB.rating,signature:hB.signature,totalDelta:hB.total-hA.total,gramsDelta:hB.grams-hA.grams},
  C:{total:hC.total,grams:hC.grams,rating:hC.rating,signature:hC.signature,totalDelta:hC.total-hA.total,gramsDelta:hC.grams-hA.grams}
};
results.compare=compare;

fs.writeFileSync(path.join(outDir,'results.json'),JSON.stringify(results,null,2));
fs.writeFileSync(path.join(outDir,'summary.txt'),[
  'GANJARIUM V87 TRAINING QA',
  '',
  ...days.map(day=>{
    const r=compare[String(day)];
    return `Day ${day}: B vs A axes ${r.B_vs_A.axisDelta>=0?'+':''}${r.B_vs_A.axisDelta}, width ${r.B_vs_A.widthPct>=0?'+':''}${r.B_vs_A.widthPct}%, height ${r.B_vs_A.heightPct>=0?'+':''}${r.B_vs_A.heightPct}% | C vs A axes ${r.C_vs_A.axisDelta>=0?'+':''}${r.C_vs_A.axisDelta}, width ${r.C_vs_A.widthPct>=0?'+':''}${r.C_vs_A.widthPct}%, height ${r.C_vs_A.heightPct>=0?'+':''}${r.C_vs_A.heightPct}%`;
  }),
  '',
  `Harvest A: ${hA.total} pts, ${hA.grams} g, ${hA.rating}, ${hA.signature.join(', ')}`,
  `Harvest B: ${hB.total} pts, ${hB.grams} g, ${hB.rating}, delta ${hB.total-hA.total} pts / ${hB.grams-hA.grams} g, ${hB.signature.join(', ')}`,
  `Harvest C: ${hC.total} pts, ${hC.grams} g, ${hC.rating}, delta ${hC.total-hA.total} pts / ${hC.grams-hA.grams} g, ${hC.signature.join(', ')}`
].join('\n'));

console.log(JSON.stringify(results,null,2));
await browser.close();
await new Promise(resolve=>server.close(resolve));
