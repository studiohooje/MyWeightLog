import {round,number,cleanFoodPreset} from './domain.js';

// Food values require the user's own label or verified source. No fabricated database values.
export const FOOD_PRESETS=Object.freeze([]);
export const NUTRIENT_KEYS=Object.freeze(['calories','carbs','protein','fat']);
export function scaleNutrition(perServing,servingQty=1){
 const q=number(servingQty);if(q===null||q<=0)throw Error('섭취량은 0보다 커야 합니다.');
 return Object.fromEntries(NUTRIENT_KEYS.map(k=>{const n=number(perServing?.[k]);if(n!==null&&n<0)throw Error('영양값은 음수가 될 수 없습니다.');return [k,n===null?null:round(n*q)]}));
}
export function toFoodPreset(meal){
 const q=number(meal?.servingQty)??1;if(q<=0)throw Error('섭취량을 확인해 주세요.');
 return {name:String(meal.name||'').trim(),servingUnit:String(meal.servingUnit||'회'),...Object.fromEntries(NUTRIENT_KEYS.map(k=>[k,meal[k]==null?null:round(meal[k]/q)]))};
}
export function recentFoods(meals,limit=12){
 const seen=new Set(),result=[];
 for(const meal of [...(meals||[])].sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')))){
  const key=String(meal.name||'').trim().toLocaleLowerCase('ko');if(!key||seen.has(key))continue;
  seen.add(key);result.push(toFoodPreset(meal));if(result.length>=limit)break;
 }
 return result;
}
export function upsertFoodPreset(foods,raw){
 const item=cleanFoodPreset(raw),key=`${item.name.toLocaleLowerCase('ko')}|${item.servingUnit.toLocaleLowerCase('ko')}`;
 const current=(foods||[]).find(x=>`${x.name.toLocaleLowerCase('ko')}|${x.servingUnit.toLocaleLowerCase('ko')}`===key);
 if(current)item.id=current.id;
 return [...(foods||[]).filter(x=>x.id!==item.id),item];
}
export function searchFoods(foods,query=''){
 const q=String(query).trim().toLocaleLowerCase('ko');return (foods||[]).filter(x=>!q||x.name.toLocaleLowerCase('ko').includes(q));
}
