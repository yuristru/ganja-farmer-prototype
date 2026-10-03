/* Launch catalog: immutable cultivar IDs preserve existing saves. */
(function(root){
'use strict';
const catalog={};
function add(id,name,code,stats,color,icon,tier,description,phenotypes,profile,palette,flower={}){
 catalog[id]={id,name,code,resilience:stats[0],growth:stats[1],flower:stats[2],style:stats[3],color,icon,tier,description,phenotypes,profile,palette,flowerArt:flower,
 material:'assets/flowers/'+(['dream','comet','violet'].includes(id)?'v101/':'v102/')+id+'-hero.webp'};
}
add('dream','Garden Dream','GD-48291',[.82,.82,.84,.78],'Lime','✦','starter','Ausgewogene Krone · robuste Allround-Genetik',
 ['Balanced Crown','Dense Garden','Lime Tower','Wide Canopy'],
 {canopy:1.03,branchAngle:1.03,apical:.98,leafScale:1.02},
 {hue:108,purple:0,pistil:30,leafHue:112});
add('comet','Lime Comet','LC-73104',[.68,.94,.76,.88],'Neon','☄','starter','Hoher Wuchs · schmale Blätter · limettengrün',
 ['Citrus Compact','Comet Stretch','Neon Spear','Lime Fringe'],
 {internode:1.08,stretch:1.10,canopy:.91,leafWidth:.92,branchAngle:.92,apical:1.08,stemThickness:.96},
 {hue:91,purple:0,pistil:34,leafHue:103});
add('violet','Violet Circuit','VC-20577',[.90,.72,.92,.91],'Violett','◆','genetics','Breite Krone · dichte Blüten · violette Farbbildung',
 ['Purple Dense','Violet Stack','Night Crown','Circuit Frost'],
 {internode:.93,stretch:.93,canopy:1.08,leafWidth:1.08,branchAngle:1.10,apical:.92,stemThickness:1.06,flowerMass:1.06},
 {hue:108,purple:282,pistil:24,leafHue:121});
add('mint','Mint Horizon','MH-61429',[.88,.78,.81,.84],'Mint','❋','starter','Kurze Internodien · helle Blüten · trockentolerant',
 ['Mint Compact','Silver Crown','Fresh Stack','Soft Garden'],
 {internode:.88,stretch:.90,branching:1.08,canopy:1.06,leafWidth:1.04,droughtTolerance:1.09,resin:1.02,flowerMass:.96},
 {hue:132,purple:0,pistil:26,leafHue:125},{height:.91,width:1.06,density:1.02});
add('amber','Amber Meadow','AM-82716',[.85,.80,.87,.80],'Gold','☀','starter','Breite Blätter · kräftige Blüten · warme Goldtöne',
 ['Amber Dense','Honey Crown','Golden Stack','Meadow Compact'],
 {internode:.94,stretch:.95,canopy:1.10,leafWidth:1.12,branchAngle:1.08,stemThickness:1.06,feedTolerance:1.07,aroma:1.08,flowerMass:1.08},
 {hue:83,purple:0,pistil:38,leafHue:106},{height:.94,width:1.10,density:1.06});
add('forest','Forest Echo','FE-39562',[.94,.76,.82,.75],'Waldgrün','♣','starter','Robust · breite Verzweigung · dunkelgrüne Blüten',
 ['Forest Crown','Deep Garden','Echo Dense','Woodland Compact'],
 {branching:1.17,canopy:1.16,branchAngle:1.13,stretch:.88,leafWidth:1.11,stemThickness:1.10,droughtTolerance:1.12,feedTolerance:1.05,resin:.94},
 {hue:119,purple:0,pistil:23,leafHue:119},{height:.88,width:1.15,density:1.04});
add('pearl','Pearl Drift','PD-94823',[.79,.73,.96,.90],'Perlmutt','❄','genetics','Kompakter Wuchs · kleine Cluster · starke Harzbildung',
 ['Pearl Frost','Ivory Dense','Drift Compact','Silver Stack'],
 {internode:.86,stretch:.86,canopy:1.03,leafWidth:1.06,branching:1.09,resin:1.18,flowerMass:1.11,feedTolerance:.96,flowerTiming:-.7},
 {hue:111,purple:0,pistil:27,leafHue:116},{height:.86,width:1.13,density:1.10});
add('copper','Copper Grove','CG-76248',[.83,.86,.86,.87],'Kupfer','✺','genetics','Lange Cluster · kräftige Seitentriebe · kupferne Härchen',
 ['Copper Tower','Rust Crown','Grove Stack','Bronze Fringe'],
 {internode:1.03,stretch:1.07,branching:1.14,canopy:1.07,branchAngle:1.08,stemThickness:1.04,aroma:1.12,flowerMass:1.02},
 {hue:92,purple:0,pistil:16,leafHue:107},{height:1.08,width:.98,density:1.02});
add('solar','Solar Haze','SH-15387',[.67,.98,.80,.89],'Sonnengold','✷','genetics','Starker Stretch · offene Krone · goldgrüne Blüten',
 ['Solar Spear','Golden Stretch','Haze Tower','Sun Fringe'],
 {internode:1.16,stretch:1.17,branching:.85,canopy:.87,leafWidth:.86,branchAngle:.90,apical:1.12,aroma:1.10,flowerMass:.93,flowerTiming:1.0},
 {hue:79,purple:0,pistil:32,leafHue:100},{height:1.15,width:.88,density:.91});
add('blue','Blue Harbor','BH-68135',[.86,.79,.88,.92],'Blaugrau','◈','genetics','Breite Blüten · gedeckte kühle Farben · dichte Krone',
 ['Blue Dense','Harbor Crown','Slate Stack','Coastal Compact'],
 {internode:.94,stretch:.95,canopy:1.13,branchAngle:1.10,leafWidth:1.05,resin:1.08,aroma:1.05,flowerMass:1.06},
 {hue:133,purple:246,pistil:31,leafHue:123},{height:.95,width:1.10,density:1.06});
add('berry','Berry Pulse','BP-42968',[.76,.78,.94,.96],'Beere','✿','exotic','Gedrungene Blüten · dunkle Beerentöne · viel Harz',
 ['Berry Dense','Plum Compact','Pulse Frost','Berry Crown'],
 {internode:.88,stretch:.89,canopy:1.10,leafWidth:1.13,branching:1.06,resin:1.12,aroma:1.16,flowerMass:1.12,feedTolerance:.95},
 {hue:108,purple:307,pistil:22,leafHue:121},{height:.87,width:1.14,density:1.10});
add('ember','Ember Kush','EK-57391',[.89,.70,.95,.88],'Glut','✹','exotic','Sehr kompakt · dicke Blüten · intensive kupferrote Härchen',
 ['Ember Compact','Kush Dense','Smolder Stack','Ember Crown'],
 {internode:.81,stretch:.82,branching:1.10,canopy:1.15,leafWidth:1.18,stemThickness:1.12,droughtTolerance:1.08,flowerMass:1.17,resin:1.06,apical:.87},
 {hue:91,purple:292,pistil:13,leafHue:111},{height:.81,width:1.18,density:1.13});
add('aurora','Aurora Bloom','AB-23684',[.75,.85,.89,.99],'Aurora','✧','exotic','Asymmetrische Krone · viele Seitentriebe · mehrfarbige Blüten',
 ['Aurora Crown','Bloom Fringe','Mosaic Stack','Aurora Dense'],
 {branching:1.20,canopy:1.18,branchAngle:1.17,stretch:1.02,leafWidth:.97,petiole:1.08,resin:1.08,aroma:1.10,flowerMass:1.03},
 {hue:112,purple:275,pistil:29,leafHue:118},{height:.97,width:1.13,density:1.01});
add('rose','Rose Voltage','RV-81657',[.69,.91,.87,.98],'Rosé','❖','exotic','Schlanke Blüten · schmale Blätter · gedeckte Rosétöne',
 ['Rose Spear','Mauve Tower','Voltage Stretch','Rose Frost'],
 {internode:1.10,stretch:1.12,canopy:.92,branching:.94,leafWidth:.88,apical:1.08,resin:1.06,aroma:1.13,feedTolerance:.93,flowerTiming:.8},
 {hue:113,purple:322,pistil:32,leafHue:120},{height:1.12,width:.92,density:.98});
add('glacier','Glacier Crown','GC-36725',[.80,.74,.98,.95],'Eis','✥','exotic','Breite kompakte Krone · sehr starke Harzbildung · heller Frost',
 ['Glacier Frost','Ice Crown','Crystal Dense','Glacier Stack'],
 {internode:.87,stretch:.88,branching:1.13,canopy:1.14,branchAngle:1.12,leafWidth:1.09,stemThickness:1.06,resin:1.23,flowerMass:1.13,feedTolerance:.95,droughtTolerance:.95},
 {hue:123,purple:0,pistil:24,leafHue:123},{height:.86,width:1.15,density:1.11});
const phenotypes=Object.fromEntries(Object.values(catalog).map(g=>[g.id,g.phenotypes]));
const packs=Object.fromEntries(['starter','genetics','exotic'].map(tier=>[tier,Object.values(catalog).filter(g=>g.tier===tier).map(g=>g.id)]));
for(const g of Object.values(catalog)){for(const field of ['phenotypes','profile','palette','flowerArt'])Object.freeze(g[field]);Object.freeze(g);}
for(const pool of Object.values(packs))Object.freeze(pool);
root.GanjariumCultivars=Object.freeze({catalog:Object.freeze(catalog),phenotypes:Object.freeze(phenotypes),packs:Object.freeze(packs),phenotypeCount:Object.values(phenotypes).reduce((n,p)=>n+p.length,0)});
})(typeof window==='undefined'?globalThis:window);
