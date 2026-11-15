import test from 'node:test';
import assert from 'node:assert/strict';
import {EXERCISE_CATALOG,searchExercises} from '../catalog.js';
import {anatomySvg,muscleMapHTML} from '../exercise-ui.js';

const find=name=>EXERCISE_CATALOG.find(x=>x.name===name);

test('기존 프리웨이트 ID는 유지하고 근거를 반영한 타깃을 구분한다',()=>{
 const deadlift=find('데드리프트');
 assert.equal(deadlift.id,'exercise:데드리프트');
 assert.equal(deadlift.equipment,'바벨');
 assert.deepEqual(deadlift.primaryMuscleIds,['glutes','quads','hamstrings']);
 assert.ok(deadlift.secondaryMuscleIds.includes('erectors'));
 assert.equal(searchExercises('컨벤셔널')[0].id,deadlift.id);
 const rdl=find('루마니안 데드리프트');
 assert.equal(rdl.id,'exercise:루마니안 데드리프트');
 assert.deepEqual(rdl.primaryMuscleIds,['hamstrings','glutes']);
 assert.ok(find('덤벨 루마니안 데드리프트'));
 assert.equal(new Set(EXERCISE_CATALOG.map(x=>x.id)).size,EXERCISE_CATALOG.length);
});

test('불가리안 스플릿 스쿼트는 0kg부터 한 손 중량을 기록한다',()=>{
 const bulgarian=find('불가리안 스플릿 스쿼트');
 assert.equal(bulgarian.equipment,'덤벨');
 assert.equal(bulgarian.defaultWeight,0);
 assert.equal(bulgarian.weightBasis,'per-hand');
 assert.equal(bulgarian.handCount,2);
 assert.equal(bulgarian.weightDisplay,'한 손 기준 · 양손 각각');
 for(const name of ['덤벨 벤치프레스','원암 덤벨 로우','덤벨 숄더 프레스','덤벨 컬','덤벨 루마니안 데드리프트']){
  assert.equal(find(name).weightBasis,'per-hand',name);
 }
 assert.equal(find('원암 덤벨 로우').handCount,1);
 assert.equal(find('고블릿 스쿼트').weightBasis,'total');
});

test('아틀라스는 척추기립근을 등과 구분하고 미표시 부위를 숨기지 않는다',()=>{
 const map=muscleMapHTML(['glutes','hamstrings'],['erectors','adductors']);
 assert.match(map,/척추기립근/);
 assert.match(map,/그림에 표시되지 않는 부위: 내전근/);
 assert.match(anatomySvg(['erectors'],[],{side:'back'}),/척추기립근 주 타깃/);
 assert.doesNotMatch(anatomySvg(['erectors'],[],{side:'front'}),/척추기립근 주 타깃/);
});
