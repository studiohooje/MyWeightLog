import {cleanMeal,cleanCheckin,uid,validDate,number,round,setWeightKg,estimate1RM,dietState} from './domain.js';
import {EXERCISE_CATALOG} from './catalog.js';

// All amounts remain user-entered estimates; these helpers never invent nutrient values.
export function copyMeals(db,fromDate,toDate,slot=''){
 if(!validDate(fromDate)||!validDate(toDate)||fromDate===toDate)throw Error('서로 다른 복사 날짜를 선택해 주세요.');
 const source=(db.meals||[]).filter(m=>m.date===fromDate&&(!slot||m.slot===slot));
 if(!source.length)throw Error('복사할 식사 기록이 없습니다.');
 const items=source.filter(m=>!(db.meals||[]).some(x=>x.copyKey===`${m.id}:${toDate}`)).map(m=>cleanMeal({...m,id:uid(),date:toDate,copyKey:`${m.id}:${toDate}`,createdAt:undefined,updatedAt:undefined}));
 if(!items.length)throw Error('이미 복사한 식사입니다.');
 return {...db,meals:[...db.meals,...items],dayStates:{...db.dayStates,[toDate]:'partial'}};
}
export function createRecipe(name,meals){
 if(!String(name||'').trim()||!Array.isArray(meals)||!meals.length)throw Error('레시피 이름과 구성 음식을 입력해 주세요.');
 return {id:uid(),name:String(name).trim(),items:meals.map(m=>cleanMeal({...m,id:uid(),date:m.date||'2000-01-01'}))};
}
export function recipeMeals(recipe,date,slot='아침',quantity=1){
 if(!validDate(date)||!Number.isFinite(Number(quantity))||Number(quantity)<=0)throw Error('날짜와 레시피 분량을 확인해 주세요.');
 return recipe.items.map(m=>cleanMeal({...m,id:uid(),date,slot,copyKey:'',servingQty:m.servingQty*quantity,...Object.fromEntries(['calories','carbs','protein','fat'].map(k=>[k,m[k]==null?null:round(m[k]*quantity)])),createdAt:undefined,updatedAt:undefined}));
}
export function appendMeals(db,items){
 if(!Array.isArray(items)||!items.length)throw Error('음식을 하나 이상 추가해 주세요.');
 const clean=items.map(cleanMeal),states={...db.dayStates};for(const item of clean)states[item.date]='partial';
 return {...db,meals:[...db.meals,...clean],dayStates:states};
}
export function weightTrend(body,windowDays=7){
 const points=(body||[]).filter(x=>number(x.weight)!==null).map(x=>({date:x.date,weight:Number(x.weight)})).sort((a,b)=>a.date.localeCompare(b.date));
 return points.map(p=>{const end=new Date(p.date+'T12:00:00'),start=new Date(end);start.setDate(start.getDate()-windowDays+1);const sample=points.filter(x=>x.date<=p.date&&new Date(x.date+'T12:00:00')>=start);return {...p,trend:round(sample.reduce((n,x)=>n+x.weight,0)/sample.length,2),count:sample.length,rule:`측정일 기준 최근 ${windowDays}일 측정값 평균 · 결측은 제외`}});
}
export function exercisePRs(db){
 const groups=new Map();
 for(const w of db.workouts||[])for(const e of w.exercises||[]){if(e.kind==='cardio')continue;const key=`${e.exerciseId||e.name}|${e.machineId||'unspecified'}`,g=groups.get(key)||{key,exerciseId:e.exerciseId||null,machineId:e.machineId||null,name:e.name,maxWeightKg:0,maxReps:0,best1RM:0,maxSetVolume:0,sets:0};
 for(const s of e.sets||[]){if(s.completed===false)continue;const kg=setWeightKg(s);g.maxWeightKg=Math.max(g.maxWeightKg,kg);g.maxReps=Math.max(g.maxReps,s.reps||0);g.best1RM=Math.max(g.best1RM,estimate1RM(kg,s.reps));g.maxSetVolume=Math.max(g.maxSetVolume,kg*(s.reps||0));g.sets++;}if(g.sets)groups.set(key,g);}
 return [...groups.values()].map(g=>({...g,maxWeightKg:round(g.maxWeightKg,2),maxSetVolume:round(g.maxSetVolume,2)}));
}
export function recommendWorkout(db,date){
 if(!validDate(date))throw Error('제안 날짜를 확인해 주세요.');
 const raw=db.checkins?.[date],checkin=raw?cleanCheckin(raw):null,missing=[];
 for(const k of ['sleep','energy','soreness'])if(checkin?.[k]==null)missing.push(({sleep:'수면',energy:'에너지',soreness:'근육통'})[k]);
 if(checkin?.pain==null)missing.push('통증 여부');
 const loads=new Map(),history=[];let missingRPE=0;
 for(const w of db.workouts||[]){const age=Math.round((new Date(date+'T12:00:00')-new Date(w.date+'T12:00:00'))/86400000);if(age<0||age>13)continue;
 for(const e of w.exercises||[]){if(e.kind==='cardio')continue;const complete=(e.sets||[]).filter(s=>s.completed!==false&&s.type!=='워밍업');if(!complete.length)continue;history.push({w,e,complete,age});
 const primary=e.primaryMuscleIds?.length?e.primaryMuscleIds:EXERCISE_CATALOG.find(x=>x.id===e.exerciseId||x.name===e.name)?.primaryMuscleIds||[];
 for(const s of complete){if(s.rpe==null)missingRPE++;const effort=s.rpe==null?1:Math.max(.5,Math.min(1.25,s.rpe/8));for(const [ids,factor] of [[primary,1],[e.secondaryMuscleIds||[],.5]])for(const id of ids){const load=loads.get(id)||{muscleId:id,score:0,sets:0,lastDate:w.date};load.score+=factor*effort*Math.exp(-age/3);load.sets+=factor;if(w.date>load.lastDate)load.lastDate=w.date;loads.set(id,load);}}}}
 const base={date,missing,loads:[...loads.values()].map(x=>({...x,score:round(x.score),level:x.score>=6?'부담 큼':'보통'})),canIncrease:false,note:'최근 14일 완료 본세트 × 주근육 1·보조근육 0.5 × RPE/8(0.5~1.25) × exp(-경과일/3). 실제 회복이나 건강 상태를 측정한 값이 아닙니다. 제안은 수정하거나 건너뛸 수 있습니다.'};
 if(missingRPE)missing.push(`RPE 없는 세트 ${missingRPE}개`);
 if(checkin?.pain)return {...base,status:'hold',reason:'통증·부상 우려가 입력되어 중량·세트 제안을 보류합니다.',suggestions:[]};
 if(!history.length)return {...base,status:'insufficient',reason:'최근 14일의 완료 세트 기록이 부족합니다. 직접 운동을 선택해 주세요.',suggestions:[]};
 const low=checkin&&(checkin.energy!=null&&checkin.energy<=2||checkin.sleep!=null&&checkin.sleep<=2||checkin.soreness!=null&&checkin.soreness>=4);
 if(low)return {...base,status:'light',reason:'오늘 수면·에너지·근육통 입력을 반영해 증량을 보류합니다. 휴식 또는 직접 낮춘 강도를 선택하세요.',suggestions:[]};
 const candidates=[...EXERCISE_CATALOG,...(db.customExercises||[])].filter(e=>e.kind!=='cardio'&&e.primaryMuscleIds?.length).map(e=>({...e,load:e.primaryMuscleIds.reduce((n,id)=>n+(loads.get(id)?.score||0),0)})).sort((a,b)=>a.load-b.load);
 const seen=new Set(),suggestions=[];
 for(const e of candidates){if(seen.has(e.part))continue;seen.add(e.part);const prior=history.filter(x=>(x.e.exerciseId||x.e.name)===(e.id||e.name)).sort((a,b)=>a.age-b.age)[0];suggestions.push({exerciseId:e.id,name:e.name,part:e.part,load:round(e.load),machineId:prior?.e.machineId||null,sets:prior?prior.complete.slice(0,3).map(s=>({...s,id:uid(),completed:false})):[],reason:prior?`${prior.w.date} 기록 ${prior.complete.length}세트를 참고한 동일 중량 초안입니다.`:'이 종목의 최근 기록이 없어 중량을 제안하지 않습니다.'});if(suggestions.length===3)break;}
 return {...base,status:missing.length?'limited':'ready',reason:missing.length?'오늘 상태 또는 RPE가 부족해 증량 없이 참고 후보만 표시합니다.':'최근 부위별 기록과 오늘 상태를 반영한 후보입니다. 중량은 마지막 기록을 유지합니다.',suggestions};
}
