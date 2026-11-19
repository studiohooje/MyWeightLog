import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyDB,cleanMeal,cleanMachine,mealTotals} from '../domain.js';
import {EXERCISE_CATALOG} from '../catalog.js';
import {emptyQuickMeal,emptyQuickWorkout,quickMealHTML,quickMealRecords,quickWorkoutHTML,quickWorkoutRecord} from '../quick-entry.js';
import {toFoodPreset} from '../nutrition.js';

const date='2026-11-13';
test('빠른 식단은 실제 사용자 음식 두 개를 각각 계산하고 목표·누적 막대를 보인다',()=>{
 const db=emptyDB();db.meals=[cleanMeal({date:'2026-11-12',name:'현미밥',servingQty:200,servingUnit:'g',calories:330,carbs:72,protein:7,fat:2,loggedAt:'2026-11-12T09:00:00'}),cleanMeal({date:'2026-11-12',name:'닭가슴살',servingQty:100,servingUnit:'g',calories:110,carbs:0,protein:23,fat:1})];
 const state=emptyQuickMeal(date,'13:35');state.rows=[{name:'현미밥',servingQty:210,servingUnit:'g',calories:165,carbs:36,protein:3.5,fat:1,source:'manual'},{name:'닭가슴살',servingQty:150,servingUnit:'g',calories:110,carbs:0,protein:23,fat:1,source:'manual'}];
 const html=quickMealHTML(db,state),records=quickMealRecords(state),total=mealTotals(records);
 assert.match(html,/최근 음식/);assert.match(html,/nutrition-goal kcal/);assert.match(html,/nutrition-goal protein/);assert.match(html,/이번 식사 ÷ 현재 하루 누적/);
 assert.equal(records.length,2);assert.equal(records[0].servingQty,210);assert.equal(records[1].servingQty,150);assert.equal(new Set(records.map(x=>x.mealGroupId)).size,1);assert.equal(total.calories,511.5);
});
test('추정 음식을 다른 중량으로 재사용하면 칼로리와 추정 범위도 함께 환산한다',()=>{
 const previous=cleanMeal({date:'2026-11-12',name:'사진 속 밥',servingQty:200,servingUnit:'g',calories:300,carbs:64,protein:5,fat:2,aiEstimate:{estimated:true,caloriesMin:240,caloriesMax:360,carbsMin:50,carbsMax:78,basis:'사진 추정'}});
 const preset=toFoodPreset(previous);
 assert.equal(preset.calories,150);assert.equal(preset.aiEstimate.caloriesMin,120);
 const state=emptyQuickMeal(date,'13:35');state.rows=[{...preset,servingQty:300}];
 const [record]=quickMealRecords(state);
 assert.equal(record.calories,450);assert.equal(record.aiEstimate.caloriesMin,360);assert.equal(record.aiEstimate.caloriesMax,540);assert.equal(record.aiEstimate.carbsMin,75);
});

test('빠른 운동은 지점별 머신을 보여주고 실제 완료 세트만 한 운동으로 저장한다',()=>{
 const db=emptyDB(),leg=EXERCISE_CATALOG.find(x=>x.name==='레그 프레스');db.settings.gyms=['헬스플러스 안산점','다른 지점'];
 const local=cleanMachine({name:'내 레그프레스',manufacturer:'회사 A',model:'LP-1',location:'헬스플러스 안산점',exerciseId:leg.id,unit:'kg'}),other=cleanMachine({name:'타 지점 레그프레스',manufacturer:'회사 B',model:'LP-2',location:'다른 지점',exerciseId:leg.id,unit:'lb'});db.machines=[local,other];
 const s=emptyQuickWorkout(date,db.settings.gyms);s.exerciseId=leg.id;s.machineId=local.id;s.title='하체';s.sets=[{id:'set-1',exerciseId:leg.id,machineId:local.id,exercise:leg,weight:120,reps:10,unit:'kg',completedAt:'2026-11-13T13:40'},{id:'set-2',exerciseId:leg.id,machineId:local.id,exercise:leg,weight:140,reps:8,unit:'kg',completedAt:'2026-11-13T13:43'}];
 const html=quickWorkoutHTML(db,s,EXERCISE_CATALOG),w=quickWorkoutRecord(s,db);
 assert.match(html,/주·보조 근육 그림 보기/);assert.match(html,/동일 값 기록/);assert.match(html,/LP-1/);assert.doesNotMatch(html,/LP-2/);assert.equal(w.exercises.length,1);assert.equal(w.exercises[0].sets.length,2);assert.equal(w.exercises[0].machineId,local.id);assert.equal(w.exercises[0].sets[1].completedAt,'2026-11-13T13:43');
 s.workoutId=w.id;db.workouts=[w];s.sets[1].reps=9;const changed=quickWorkoutRecord(s,db);assert.equal(changed.id,w.id);assert.equal(changed.exercises[0].sets[1].reps,9);
});
