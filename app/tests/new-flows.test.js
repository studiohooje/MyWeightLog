import test from 'node:test';
import assert from 'node:assert/strict';
import {batchMeals} from '../meal-batch.js';
import {mealGroups,workoutTitle} from '../timeline-view.js';
import {cleanBody} from '../domain.js';
import {saveGoalSettings} from '../nutrition-goals.js';
import {setGap} from '../workout-times.js';

test('두 음식의 g 입력을 각각 100g 기준으로 계산하고 한 식사로 묶는다',()=>{
 const rows=[
  {name:'현미밥',servingUnit:'g',servingQty:210,calories:130,carbs:28,protein:3,fat:1},
  {name:'닭가슴살',servingUnit:'g',servingQty:150,calories:110,carbs:0,protein:23,fat:2},
 ];
 const meals=batchMeals(rows,'2026-11-07','식사','09:15');
 assert.equal(meals.length,2);
 assert.equal(meals[0].calories,273);
 assert.equal(meals[1].protein,34.5);
 assert.equal(meals[0].mealGroupId,meals[1].mealGroupId);
 assert.equal(mealGroups(meals).length,1);
});

test('운동 제목이 없으면 실제 기록한 첫 운동과 추가 종목 수를 표시한다',()=>{
 assert.equal(workoutTitle({title:'오늘의 운동',exercises:[{name:'레그 프레스',sets:[{completed:true}]},{name:'스쿼트',sets:[{completed:true}]}]}),'레그 프레스 외 1종');
 assert.equal(workoutTitle({title:'Push Day',exercises:[]}), 'Push Day');
});

test('허리둘레만 있는 측정 기록도 저장할 수 있다',()=>{
 const body=cleanBody({date:'2026-11-07',waistCm:82.5});
 assert.equal(body.waistCm,82.5);
 assert.equal(body.weight,null);
});

test('목표 탄단지 비율을 g으로 환산하고 합계 오류를 거부한다',()=>{
 const data={goalMode:'ratio',calorieGoal:'2000',carbsPctGoal:'40',proteinPctGoal:'30',fatPctGoal:'30',barbellWeightKg:'20'};
 const goals=saveGoalSettings({},data);
 assert.equal(goals.carbsGoal,200);
 assert.equal(goals.proteinGoal,150);
 assert.equal(goals.fatGoal,66.7);
 assert.throws(()=>saveGoalSettings({}, {...data,fatPctGoal:'20'}),/100%/);
});

test('두 세트 기록 사이 경과시간을 휴식 추정값으로 표시한다',()=>{
 assert.equal(setGap([{completedAt:'2026-11-07T09:00'},{completedAt:'2026-11-07T09:03'}],1),' · 이전 세트 기록 후 3분');
 assert.equal(setGap([{completedAt:'2026-11-07T09:03'},{completedAt:'2026-11-07T09:00'}],1),'');
});
