import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCodexRecord} from '../ai-adapter.js';

test('Codex 식단 파일은 검증 후 식단 기록으로 변환한다',()=>{
  const x=parseCodexRecord({type:'myweightlog.meal',version:1,meal:{date:'2026-11-01',slot:'점심',name:'식사',calories:500,carbs:55,protein:35,fat:15}});
  assert.equal(x.kind,'meals');
  assert.equal(x.record.calories,500);
});

test('Codex 운동 파일은 세트 검증 후 운동 기록으로 변환한다',()=>{
  const x=parseCodexRecord({type:'myweightlog.workout',version:1,workout:{date:'2026-11-01',title:'운동',exercises:[{name:'벤치프레스',part:'가슴',sets:[{weight:60,reps:8,type:'본세트'}]}]}});
  assert.equal(x.kind,'workouts');
  assert.equal(x.record.exercises[0].sets[0].weight,60);
});

test('잘못된 날짜나 세트 값은 가져오지 않는다',()=>{
  assert.throws(()=>parseCodexRecord({type:'myweightlog.meal',version:1,meal:{date:'2026-02-30',name:'식사'}}));
  assert.throws(()=>parseCodexRecord({type:'myweightlog.workout',version:1,workout:{date:'2026-11-01',exercises:[{name:'벤치프레스',sets:[{weight:-1,reps:8}]}]}}));
});
