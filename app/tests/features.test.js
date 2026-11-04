import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanMeal,cleanWorkout,workoutTotals,emptyDB,normalizeDB,setDietState} from '../domain.js';
import {scaleNutrition,recentFoods,upsertFoodPreset,searchFoods} from '../nutrition.js';
import {EXERCISE_CATALOG,searchExercises,PROGRAM_TEMPLATES,createRoutineFromProgram} from '../catalog.js';
import {suggestSets,SET_MODES,setIntensityPct,latestEstimate,lastExerciseRecord,plateLoadPerSide} from '../training.js';
import {dietTrend,exerciseTrend,partSummary,fatigueProxy,weeklyReport,monthlyReport,comparePeriods} from '../reports.js';

test('과거 백업과 새 식사 수량·단위가 함께 유지된다',()=>{
 const db=emptyDB();db.meals=[{date:'2026-10-29',name:'우유',calories:130,protein:6}];
 const restored=normalizeDB(db);assert.equal(restored.meals[0].servingQty,1);assert.equal(restored.meals[0].servingUnit,'회');
 const consumed=scaleNutrition({calories:100,carbs:10,protein:5,fat:4},2.5);
 const meal=cleanMeal({date:'2026-10-30',name:'예시',servingQty:2.5,servingUnit:'개',...consumed});
 assert.equal(meal.calories,250);assert.equal(meal.protein,12.5);assert.equal(meal.servingQty,2.5);
 assert.throws(()=>scaleNutrition({calories:100},0),/0보다/);
 assert.throws(()=>cleanMeal({date:'2026-10-30',name:'예시',servingQty:-1}),/섭취량/);
});

test('최근 입력한 음식은 사용자 값으로만 재사용한다',()=>{
 const meals=[cleanMeal({date:'2026-10-29',name:'삶은 달걀',servingQty:2,servingUnit:'개',calories:150,protein:12}),cleanMeal({date:'2026-10-30',name:'삶은 달걀',servingQty:1,servingUnit:'개',calories:80,protein:6})];
 const foods=recentFoods(meals);assert.equal(foods.length,1);assert.equal(foods[0].calories,80);assert.equal(foods[0].protein,6);
});

test('사용자 음식 프리셋을 저장·검색하고 기존 백업에도 적용한다',()=>{
 const db=emptyDB();db.foods=upsertFoodPreset(db.foods,{name:'나의 쉐이크',servingUnit:'잔',calories:210,protein:30});
 db.foods=upsertFoodPreset(db.foods,{name:'나의 쉐이크',servingUnit:'잔',calories:220,protein:32});
 assert.equal(db.foods.length,1);assert.equal(searchFoods(db.foods,'쉐이크')[0].protein,32);
 assert.equal(normalizeDB(db).foods[0].calories,220);
 assert.equal(normalizeDB({schemaVersion:1,body:[],meals:[],workouts:[],routines:[],settings:{}}).foods.length,0);
});

test('운동 카탈로그는 자체 종목과 유산소를 검색한다',()=>{
 assert.ok(EXERCISE_CATALOG.length>=40);
 assert.equal(searchExercises('벤치','가슴')[0].name,'벤치프레스');
 assert.equal(searchExercises('달리기')[0].kind,'cardio');
});

test('자체 프로그램 템플릿과 바벨 중량 계산',()=>{
 assert.equal(PROGRAM_TEMPLATES.length,3);
 const routine=createRoutineFromProgram('full-body',0);assert.equal(routine.exercises.length,3);assert.equal(routine.exercises[0].sets[0].weight,0);
 assert.equal(plateLoadPerSide(80,20),30);assert.equal(plateLoadPerSide(80,15),32.5);
 assert.throws(()=>plateLoadPerSide(10,20),/작습니다/);
});

test('완료 세트와 유산소 시간·거리를 구분해 합산한다',()=>{
 const w=cleanWorkout({date:'2026-10-30',condition:4,exercises:[
  {name:'벤치프레스',part:'가슴',supersetGroup:'A',sets:[{weight:60,reps:8,completed:true},{weight:70,reps:5,completed:false}]},
  {name:'달리기',part:'유산소',kind:'cardio',durationMin:25,distanceKm:4.2,sets:[]}
 ]});
 const t=workoutTotals(w);assert.equal(t.volume,480);assert.equal(t.sets,1);assert.equal(t.cardioMinutes,25);assert.equal(t.distanceKm,4.2);assert.equal(w.exercises[0].supersetGroup,'A');assert.equal(latestEstimate([w],'벤치프레스'),76);
 assert.equal(lastExerciseRecord([w],'벤치프레스').exercise.sets[0].weight,60);
 assert.throws(()=>cleanWorkout({date:'2026-10-30',exercises:[{name:'달리기',kind:'cardio',sets:[]}]}),/유산소/);
});

test('6종 세트 초안은 과거 1RM 기준으로 편집 가능한 숫자를 만든다',()=>{
 assert.equal(SET_MODES.length,6);
 for(const mode of SET_MODES){const rows=suggestSets(mode.id,100);assert.ok(rows.length>=3);assert.ok(rows.every(s=>s.weight>0&&s.reps>0&&s.completed===true))}
 assert.equal(setIntensityPct(75,100),75);assert.equal(setIntensityPct(75,0),null);
});

test('식단 미기록일을 0 kcal로 위장하지 않고 기간 분석한다',()=>{
 const db=emptyDB();db.meals.push(cleanMeal({date:'2026-10-30',name:'저녁',calories:600,carbs:60,protein:30,fat:20}));
 const points=dietTrend(db,3,new Date('2026-10-31T12:00:00'));
 assert.deepEqual(points.map(x=>x.calories),[null,600,null]);
 const report=weeklyReport(db,new Date('2026-10-31T12:00:00'));
 assert.equal(report.averageCalories,null);assert.equal(report.recordedDietDays,1);assert.equal(report.partialDietDays,1);
 const complete=setDietState(db,'2026-10-30','complete');
 assert.equal(weeklyReport(complete,new Date('2026-10-31T12:00:00')).averageCalories,600);
 const withFasting=setDietState(complete,'2026-10-31','fasting');
 const final=weeklyReport(withFasting,new Date('2026-10-31T12:00:00'));
 assert.equal(final.averageCalories,300);assert.equal(final.completeDietDays,2);
});

test('종목 추이·부위 부하·월간 요약은 완료 기록만 사용한다',()=>{
 const db=emptyDB();db.workouts.push(cleanWorkout({date:'2026-10-30',duration:45,exercises:[{name:'스쿼트',part:'하체',sets:[{weight:80,reps:5,rpe:8},{weight:100,reps:3,completed:false}]}]}));
 const now=new Date('2026-10-31T12:00:00');
 assert.equal(exerciseTrend(db,'스쿼트',7,now)[0].volume,400);
 assert.equal(partSummary(db,7,now)[0].sets,1);
 assert.equal(fatigueProxy(db,now)[0].sets,1);
 const report=monthlyReport(db,now);assert.equal(report.totalVolume,400);assert.equal(report.workoutSessions,1);assert.match(report.note,/건강 상태를 판단하지/);
 const comparison=comparePeriods(db,7,now);assert.equal(comparison.volumeChange,400);assert.equal(comparison.volumeChangePct,null);
});
