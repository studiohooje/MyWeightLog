import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyDB,normalizeDB,cleanWorkout,cleanMeal,setWeightKg,workoutTotals,setDietState,dietState,cleanCheckin,cleanCustomExercise,convertSetUnit,cleanMachine} from '../domain.js';
import {periodReport,exerciseTrend} from '../reports.js';
import {copyMeals,createRecipe,recipeMeals,appendMeals,weightTrend,exercisePRs,recommendWorkout} from '../model-features.js';
import {EXERCISE_CATALOG} from '../catalog.js';
const date='2026-11-01';
const meal=(d=date,calories=500)=>cleanMeal({date:d,name:'표본 식사',calories,carbs:50,protein:30,fat:10});
const workout=(unit='kg',weight=50,machineId=null)=>cleanWorkout({date,exercises:[{name:'벤치프레스',machineId,sets:[{weight,unit,reps:10,rpe:8}]}]});
test('lb original values survive repeated normalization and all totals use kg',()=>{let db=emptyDB();db.workouts=[workout('lb',100)];for(let i=0;i<5;i++)db=normalizeDB(JSON.parse(JSON.stringify(db)));const s=db.workouts[0].exercises[0].sets[0];assert.equal(s.weight,100);assert.equal(s.unit,'lb');assert.equal(setWeightKg(s),45.359237);assert.equal(workoutTotals(db.workouts[0]).volume,453.6);assert.equal(exerciseTrend(db,'벤치프레스',7,new Date(date+'T12:00:00'))[0].volume,453.6);assert.throws(()=>workout('stone',10),/단위/)});
test('legacy backup keeps date metadata and assigns stable catalog ids',()=>{const raw=emptyDB();raw.body=[{id:'body',date,weight:70,updatedAt:'2025-01-01T00:00:00.000Z'}];raw.workouts=[workout()];const db=normalizeDB(raw);assert.equal(db.body[0].updatedAt,raw.body[0].updatedAt);assert.equal(db.workouts[0].exercises[0].exerciseId,'exercise:벤치프레스');assert.equal(new Set(EXERCISE_CATALOG.map(x=>x.id)).size,EXERCISE_CATALOG.length)});
test('complete and fasting days form denominator; partial and missing days do not',()=>{let db=emptyDB();db.meals=[meal('2026-10-30',1000),meal('2026-10-31',200)];assert.equal(dietState(db,'2026-10-31'),'partial');db=setDietState(db,'2026-10-30','complete');db=setDietState(db,date,'fasting');const r=periodReport(db,7,new Date(date+'T12:00:00'));assert.equal(r.averageCalories,500);assert.equal(r.completeDietDays,2);assert.equal(r.partialDietDays,1);assert.equal(r.missingDietDays,4);assert.throws(()=>setDietState(db,'2026-10-31','fasting'),/식사 기록/);assert.throws(()=>setDietState(db,'2026-10-29','complete'),/식사 기록/)});
test('copy and recipes preserve nutrients, new identities and original recipe',()=>{let db=emptyDB();db.meals=[meal('2026-10-31')];db=copyMeals(db,'2026-10-31',date);assert.equal(db.meals.length,2);assert.notEqual(db.meals[0].id,db.meals[1].id);assert.throws(()=>copyMeals(db,'2026-10-31',date),/이미 복사/);const recipe=createRecipe('한 끼',[meal()]);const twice=recipeMeals(recipe,date,'저녁',2);assert.equal(twice[0].calories,1000);assert.equal(recipe.items[0].calories,500);assert.equal(appendMeals(db,twice).meals.length,3)});
test('machine PRs remain separate and unfinished sets do not count',()=>{const db=emptyDB();db.workouts=[workout('kg',40,'a'),workout('kg',60,'b')];db.workouts[1].exercises[0].sets.push({weight:100,unit:'kg',reps:10,completed:false});const prs=exercisePRs(db);assert.equal(prs.length,2);assert.equal(prs.find(x=>x.machineId==='a').maxWeightKg,40);assert.equal(prs.find(x=>x.machineId==='b').maxWeightKg,60)});
test('weight smoothing uses measured samples only, not missing-day zeroes',()=>{const rows=weightTrend([{date:'2026-10-25',weight:100},{date:'2026-10-31',weight:80},{date,weight:82}]);assert.equal(rows.at(-1).trend,81);assert.equal(rows.at(-1).count,2)});
test('checkin pain and insufficient history block load suggestions',()=>{const db=emptyDB();assert.equal(recommendWorkout(db,date).status,'insufficient');db.workouts=[workout()];db.checkins[date]=cleanCheckin({sleep:5,energy:5,soreness:1,pain:true});const r=recommendWorkout(db,date);assert.equal(r.status,'hold');assert.equal(r.suggestions.length,0);assert.equal(r.canIncrease,false);db.checkins[date]=cleanCheckin({sleep:1,energy:1,soreness:5,pain:false});assert.equal(recommendWorkout(db,date).status,'light');db.checkins={};assert.equal(recommendWorkout(db,date).status,'limited')});
test('new fields round trip and malformed extension records are rejected',()=>{let db=emptyDB();db.customExercises=[cleanCustomExercise({name:'내 운동',primaryMuscleIds:['chest']})];db.machines=[{id:'m',name:'머신',unit:'lb'}];db.favorites=[db.customExercises[0].id];db.recipes=[createRecipe('식사',[meal()])];db.checkins[date]={energy:4,sleep:4,soreness:2,pain:false};db=normalizeDB(db);assert.equal(db.machines[0].unit,'lb');assert.equal(db.recipes.length,1);assert.equal(db.customExercises.length,1);assert.throws(()=>normalizeDB({...db,dayStates:{wrong:'complete'}}),/식단 상태/);assert.throws(()=>normalizeDB({...db,checkins:{[date]:{energy:8}}}),/컨디션/)});

test('blank pain remains unknown while explicit false stays false',()=>{assert.equal(cleanCheckin({pain:''}).pain,null);assert.equal(cleanCheckin({pain:'false'}).pain,false);assert.equal(cleanCheckin({pain:'true'}).pain,true);assert.throws(()=>cleanCheckin({pain:'yes'}),/통증/);const db=emptyDB();db.workouts=[workout()];db.checkins[date]=cleanCheckin({sleep:5,energy:5,soreness:1,pain:''});assert.ok(recommendWorkout(db,date).missing.includes('통증 여부'));});

test('planned set values survive independently of actual completed values',()=>{const db=emptyDB();const w=workout('lb',100);Object.assign(w.exercises[0].sets[0],{targetWeight:120,targetReps:8,targetUnit:'lb'});db.workouts=[w];const saved=normalizeDB(db).workouts[0].exercises[0].sets[0];assert.equal(saved.weight,100);assert.equal(saved.targetWeight,120);assert.equal(saved.targetReps,8);assert.equal(saved.targetUnit,'lb');});

test('unit switches retain the exact original input through backup and repeated round trips',()=>{
 let s={weight:100,unit:'lb',reps:8};
 for(let i=0;i<20;i++){s=convertSetUnit(s,'kg');assert.equal(s.weight,45.3592);assert.equal(setWeightKg(s),45.359237);const w=cleanWorkout({date,exercises:[{name:'벤치프레스',sets:[s]}]});s=w.exercises[0].sets[0];s=convertSetUnit(s,'lb');assert.equal(s.weight,100);}
 assert.equal(s.originalWeight,100);assert.equal(s.originalUnit,'lb');
 s={...s,weight:110,originalWeight:110,originalUnit:'lb'};assert.equal(convertSetUnit(convertSetUnit(s,'kg'),'lb').weight,110);
 assert.throws(()=>convertSetUnit(s,'stone'),/단위/);
});
test('exercise ID tracks renamed movement while machine filters isolate resistance profiles',()=>{
 const db=emptyDB();db.workouts=[workout('kg',40,'a'),workout('kg',60,'b')];db.workouts[0].exercises[0].name='이름 변경';
 const points=exerciseTrend(db,'새 이름',7,new Date(date+'T12:00:00'),{exerciseId:'exercise:벤치프레스',machineId:'a'});
 assert.equal(points.length,1);assert.equal(points[0].volume,400);
 assert.equal(exerciseTrend(db,'새 이름',7,new Date(date+'T12:00:00'),{exerciseId:'exercise:벤치프레스'})[0].volume,1000);
});
test('local machine photo persists and unsupported or oversized payloads are rejected',()=>{
 const photoDataUrl='data:image/jpeg;base64,YWJj';const db=emptyDB();db.machines=[cleanMachine({name:'내 머신',photoDataUrl})];assert.equal(normalizeDB(db).machines[0].photoDataUrl,photoDataUrl);
 assert.throws(()=>cleanMachine({name:'머신',photoDataUrl:'data:image/svg+xml;base64,YWJj'}),/머신 사진/);
 assert.throws(()=>cleanMachine({name:'머신',photoDataUrl:'data:image/jpeg;base64,'+'A'.repeat(2*1024*1024)}),/머신 사진/);
});
