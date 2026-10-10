export const PROPERTY_SIZES={
  small:{name:'Klein',badge:'S',area:80,color:0x66834b},
  medium:{name:'Mittel',badge:'M',area:160,color:0xc09242},
  large:{name:'Groß',badge:'L',area:280,color:0xa85138}
};
export const PROPERTIES=[
  {id:'san-marco',name:'San Marco',district:'Altstadt',size:'small',price:28000,bx:0,by:1,slot:0,art:'buildings',sprite:9},
  {id:'via-roma',name:'Via Roma',district:'Altstadt',size:'medium',price:64000,bx:0,by:1,slot:1,art:'buildingTypes',sprite:5},
  {id:'piazza-limone',name:'Piazza Limone',district:'Zentrum',size:'small',price:32000,bx:1,by:1,slot:1,art:'buildings',sprite:13},
  {id:'belvedere',name:'Belvedere',district:'Domviertel',size:'medium',price:72000,bx:2,by:0,slot:0,art:'buildingTypes',sprite:7},
  {id:'palazzo-sole',name:'Palazzo del Sole',district:'Domviertel',size:'large',price:118000,bx:2,by:0,slot:1,art:'buildingTypes',sprite:0},
  {id:'mercato',name:'Il Mercato',district:'Südviertel',size:'large',price:138000,bx:0,by:2,slot:0,art:'buildingTypes',sprite:1},
  {id:'bottega',name:'La Bottega',district:'Südviertel',size:'small',price:38000,bx:0,by:2,slot:1,art:'buildingTypes',sprite:3},
  {id:'lungofiume',name:'Lungofiume',district:'Am Fluss',size:'medium',price:84000,bx:1,by:2,slot:0,art:'buildings',sprite:12},
  {id:'teatro',name:'Il Teatro',district:'Ostviertel',size:'large',price:156000,bx:2,by:1,slot:0,art:'buildingTypes',sprite:6}
];
export function property(id){return PROPERTIES.find(p=>p.id===id)||null;}
export function restoreProperties(value){
  if(!Array.isArray(value)||value.length>PROPERTIES.length||new Set(value).size!==value.length||value.some(id=>!property(id)))return [];
  return [...value];
}
export function propertySpend(owned=[]){return restoreProperties(owned).reduce((sum,id)=>sum+property(id).price,0);}
export function propertyPurchaseIssue(id,owned,balance){
  const p=property(id);
  if(!p)return 'Dieser Standort existiert nicht.';
  if(owned.includes(id))return 'Dieser Standort gehört dir bereits.';
  if(!Number.isInteger(balance)||balance<p.price)return 'Nicht genügend Geld für diesen Standort.';
  return null;
}
export function buyProperty(id,owned,balance){
  if(propertyPurchaseIssue(id,owned,balance))return null;
  return {owned:[...owned,id],balance:balance-property(id).price};
}
