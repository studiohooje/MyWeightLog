import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanWorkout,workoutTotals} from '../domain.js';

test('한 손 5kg씩 양손·양쪽 다리 10회는 기록 볼륨을 명시적으로 계산한다',()=>{
 const workout=cleanWorkout({date:'2026-11-15',exercises:[{name:'불가리안 스플릿 스쿼트',exerciseId:'exercise:불가리안 스플릿 스쿼트',part:'하체',weightBasis:'per-hand',handCount:2,repBasis:'per-side',sets:[{weight:5,unit:'kg',reps:10,completed:true}]}]});
 assert.equal(workout.exercises[0].weightBasis,'per-hand');
 assert.equal(workout.exercises[0].handCount,2);
 assert.equal(workout.exercises[0].repBasis,'per-side');
 assert.equal(workoutTotals(workout).volume,200);
 assert.equal(workoutTotals(workout).reps,20);
});

test('과거 기록은 새로운 도감의 덤벨 메타데이터로 소급 재계산하지 않는다',()=>{
 const old=cleanWorkout({date:'2026-11-15',exercises:[{name:'덤벨 벤치프레스',part:'가슴',sets:[{weight:5,unit:'kg',reps:10,completed:true}]}]});
 assert.equal(old.exercises[0].weightBasis,'total');
 assert.equal(workoutTotals(old).volume,50);
});
