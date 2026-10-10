import {state,saveLayout,updateMoney,notify} from './pizza-core.js?v=20261011c';
import {money} from './pizza-catalog.js?v=20261011c';
import {PROPERTIES,PROPERTY_SIZES,property,buyProperty,propertyPurchaseIssue} from './pizza-properties.js?v=20261011c';
const el=id=>document.getElementById(id);
let selected=null,filter='small';
function render(){
  const owned=state.ownedProperties;
  el('propertySummary').textContent=`9 Standorte · ${owned.length} in deinem Besitz · Konto ${money(state.balance)}`;
  el('propertyList').hidden=!!selected;el('propertyDetail').hidden=!selected;el('propertyFilters').hidden=!!selected;
  el('propertyTitle').textContent=selected?'Standort ansehen':'Immobilien';
  if(!selected){
    el('propertyFilters').replaceChildren(...Object.entries(PROPERTY_SIZES).map(([key,size])=>{
      const button=document.createElement('button');button.type='button';button.textContent=size.name+' · '+size.area+' m²';button.classList.toggle('active',filter===key);button.setAttribute('aria-pressed',String(filter===key));button.onclick=()=>{filter=key;render();};return button;
    }));
    el('propertyList').replaceChildren(...PROPERTIES.filter(p=>p.size===filter).map(p=>{
      const button=document.createElement('button');button.type='button';button.dataset.property=p.id;
      const name=document.createElement('strong'),detail=document.createElement('span');name.textContent=p.name;detail.textContent=p.district+' · '+(owned.includes(p.id)?'Dein Standort':money(p.price));button.append(name,detail);button.onclick=()=>openProperty(p.id);return button;
    }));return;
  }
  const p=property(selected),size=PROPERTY_SIZES[p.size],isOwned=owned.includes(p.id),issue=propertyPurchaseIssue(p.id,owned,state.balance);
  el('propertyName').textContent=p.name;el('propertyInfo').textContent=`${p.district} · ${size.name} · ${size.area} m²`;
  el('propertyPrice').textContent=money(p.price);el('propertyBuy').disabled=!!issue;el('propertyBuy').textContent=isOwned?'Bereits gekauft':'Standort kaufen';
  el('propertyStatus').textContent=isOwned?'Dieser Standort gehört dir.':issue||'Einmaliger Kaufpreis. Keine automatische Abbuchung.';
  const canvas=el('propertyPreview'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,180,180);ctx.imageSmoothingEnabled=false;
  const image=(state.cityArt[p.art]?.[p.sprite]||state.cityArt.buildings?.[0])?.texture.source.resource;
  if(image){const scale=Math.min(160/image.width,170/image.height);ctx.drawImage(image,Math.round((180-image.width*scale)/2),Math.round(175-image.height*scale),Math.round(image.width*scale),Math.round(image.height*scale));}
}
export function openProperty(id=null){
  if(id&&!property(id))return;
  selected=id;render();const dialog=el('propertyDialog');if(!dialog.open)dialog.showModal();
  (selected?el('propertyBuy'):el('propertyFilters').querySelector('button')).focus();
}
export function mountProperties(){
  el('propertiesBtn').onclick=()=>openProperty();el('propertyClose').onclick=()=>el('propertyDialog').close();
  el('propertyBack').onclick=()=>{selected=null;render();el('propertyFilters').querySelector('button').focus();};
  el('propertyBuy').onclick=()=>{
    const result=buyProperty(selected,state.ownedProperties,state.balance);if(!result)return;
    state.balance=result.balance;state.ownedProperties=result.owned;state.history=[];
    saveLayout();updateMoney();state.onPropertyChange?.();render();notify(property(selected).name+' gekauft.');
  };
}
