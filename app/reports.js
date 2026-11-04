import {mealTotals,workoutTotals,estimate1RM,round,setWeightKg,dietState} from './domain.js';

const dayString=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const dayList=(days,now)=>Array.from({length:days},(_,i)=>{const d=new Date(now);d.setHours(12,0,0,0);d.setDate(d.getDate()-days+1+i);return dayString(d)});
export function dietTrend(db,days=7,now=new Date()){
 return dayList(days,now).map(date=>{const meals=(db.meals||[]).filter(x=>x.date===date),t=mealTotals(meals);const state=dietState(db,date);return {date,state,recorded:meals.length>0||state==='fasting',count:meals.length,calories:state==='fasting'?0:meals.length?t.calories:null,carbs:meals.length?t.carbs:null,protein:meals.length?t.protein:null,fat:meals.length?t.fat:null}});
}
export function exerciseTrend(db,name,days=90,now=new Date(),options={},legacyOptions){
 options=legacyOptions||options||{};
 const q=String(name||'').trim().toLocaleLowerCase('ko');
 return dayList(days,now).flatMap(date=>{const entries=(db.workouts||[]).filter(w=>w.date===date).flatMap(w=>w.exercises||[]).filter(e=>(options.exerciseId?e.exerciseId===options.exerciseId:e.name.trim().toLocaleLowerCase('ko')===q)&&(!Object.hasOwn(options,'machineId')||(e.machineId||null)===(options.machineId||null))&&e.kind!=='cardio');if(!entries.length)return [];let volume=0,sets=0,maxWeight=0,best1RM=0;for(const e of entries)for(const s of e.sets||[]){if(s.completed===false)continue;volume+=setWeightKg(s)*(s.reps||0);sets++;maxWeight=Math.max(maxWeight,setWeightKg(s));best1RM=Math.max(best1RM,estimate1RM(setWeightKg(s),s.reps||0))}return [{date,name:entries[0].name,volume:round(volume),sets,maxWeight,best1RM}]});
}
export function partSummary(db,days=30,now=new Date()){
 const dates=new Set(dayList(days,now)),parts=new Map();
 for(const w of db.workouts||[])if(dates.has(w.date))for(const e of w.exercises||[]){const key=e.part||'기타',x=parts.get(key)||{part:key,sets:0,reps:0,volume:0,lastDate:null,cardioMinutes:0};if(e.kind==='cardio')x.cardioMinutes+=e.durationMin||0;else for(const s of e.sets||[]){if(s.completed===false)continue;x.sets++;x.reps+=s.reps||0;x.volume+=setWeightKg(s)*(s.reps||0)}if(!x.lastDate||w.date>x.lastDate)x.lastDate=w.date;parts.set(key,x)}
 return [...parts.values()].map(x=>({...x,volume:round(x.volume),cardioMinutes:round(x.cardioMinutes)})).sort((a,b)=>b.volume-a.volume||b.sets-a.sets);
}
export function fatigueProxy(db,now=new Date()){
 const today=new Date(now);today.setHours(12,0,0,0);const map=new Map();
 for(const w of db.workouts||[]){const age=Math.round((today-new Date(`${w.date}T12:00:00`))/86400000);if(age<0||age>6)continue;for(const e of w.exercises||[]){if(e.kind==='cardio')continue;const key=e.part||'기타',x=map.get(key)||{part:key,score:0,sets:0,lastDate:null};for(const s of e.sets||[]){if(s.completed===false||s.type==='워밍업')continue;const effort=s.rpe==null?1:Math.max(.5,Math.min(1.5,s.rpe/8));x.score+=effort*Math.exp(-age/2.5);x.sets++}if(!x.lastDate||w.date>x.lastDate)x.lastDate=w.date;map.set(key,x)}}
 return [...map.values()].map(x=>({...x,score:round(x.score),label:'최근 세트 부하 지표. 실제 근육 피로도·회복 상태가 아님'})).sort((a,b)=>b.score-a.score);
}
export function periodReport(db,days=7,now=new Date()){
 const dates=new Set(dayList(days,now)),meals=(db.meals||[]).filter(x=>dates.has(x.date)),workouts=(db.workouts||[]).filter(x=>dates.has(x.date)),body=(db.body||[]).filter(x=>dates.has(x.date)),nutrition=mealTotals(meals),totals=workouts.map(workoutTotals),recordedDietDays=new Set(meals.map(x=>x.date)).size;
 const completedDates=[...dates].filter(date=>['complete','fasting'].includes(dietState(db,date))),completeNutrition=mealTotals(meals.filter(m=>completedDates.includes(m.date))),completeDietDays=completedDates.length,partialDietDays=[...dates].filter(date=>dietState(db,date)==='partial').length;
 const averages={},averageDays={};for(const key of ['calories','carbs','protein','fat']){const values=completedDates.flatMap(date=>{if(dietState(db,date)==='fasting')return [0];const rows=meals.filter(m=>m.date===date);return rows.length&&rows.every(m=>m[key]!=null)?[rows.reduce((sum,m)=>sum+m[key],0)]:[]});averageDays[key]=values.length;averages[key]=values.length?round(values.reduce((a,b)=>a+b,0)/values.length,key==='calories'?0:1):null;}
 const bodySorted=[...body].sort((a,b)=>a.date.localeCompare(b.date));const weightStart=bodySorted.find(x=>x.weight!=null)?.weight??null,weightEnd=[...bodySorted].reverse().find(x=>x.weight!=null)?.weight??null;
 return {days,from:[...dates][0],to:[...dates].at(-1),workoutSessions:workouts.length,workoutDays:new Set(workouts.map(x=>x.date)).size,totalDuration:round(workouts.reduce((sum,w)=>sum+(w.duration||0),0)),totalVolume:round(totals.reduce((sum,x)=>sum+x.volume,0)),totalSets:totals.reduce((sum,x)=>sum+x.sets,0),cardioMinutes:round(totals.reduce((sum,x)=>sum+x.cardioMinutes,0)),distanceKm:round(totals.reduce((sum,x)=>sum+x.distanceKm,0),2),mealRecords:meals.length,recordedDietDays,completeDietDays,partialDietDays,missingDietDays:days-completeDietDays-partialDietDays,totalCalories:nutrition.calories,averageDays,averageCalories:averages.calories,averageCarbs:averages.carbs,averageProtein:averages.protein,averageFat:averages.fat,weightStart,weightEnd,weightChange:weightStart!=null&&weightEnd!=null?round(weightEnd-weightStart):null,parts:partSummary(db,days,now),loadProxy:fatigueProxy(db,now),note:'하루 완료·의도적 단식일만으로 식단 평균을 계산했습니다. 부분 기록일은 제외했습니다. 부하 지표는 건강 상태를 판단하지 않습니다.'};
}
export const weeklyReport=(db,now=new Date())=>periodReport(db,7,now);
export const monthlyReport=(db,now=new Date())=>periodReport(db,30,now);
export function comparePeriods(db,days=30,now=new Date()){
 const previousEnd=new Date(now);previousEnd.setDate(previousEnd.getDate()-days);
 const current=periodReport(db,days,now),previous=periodReport(db,days,previousEnd);
 const delta=(a,b)=>round(a-b),pct=(a,b)=>b>0?round((a-b)/b*100):null;
 return {current,previous,workoutSessionsChange:delta(current.workoutSessions,previous.workoutSessions),volumeChange:delta(current.totalVolume,previous.totalVolume),volumeChangePct:pct(current.totalVolume,previous.totalVolume),averageCaloriesChange:current.averageCalories==null||previous.averageCalories==null?null:delta(current.averageCalories,previous.averageCalories),note:'이전 같은 길이의 기간과 비교합니다. 부분·미기록 식단일은 평균에서 제외합니다.'};
}
