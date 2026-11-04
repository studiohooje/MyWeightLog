import test from 'node:test';import assert from 'node:assert/strict';import {latestEstimate,suggestSets} from '../training.js';import {cleanWorkout} from '../domain.js';
test('과거 종목 기록 기반 5x5 제안',()=>{const w=cleanWorkout({date:'2026-10-26',exercises:[{name:'벤치프레스',sets:[{weight:60,reps:10}]}]});const rm=latestEstimate([w],'벤치프레스');assert.equal(rm,80);const sets=suggestSets('5x5',rm);assert.equal(sets.length,5);assert.equal(sets[0].weight,60);assert.equal(sets[0].reps,5)});
test('기록 없는 종목은 임의 중량을 만들지 않는다',()=>assert.throws(()=>suggestSets('5x5',0),/과거/));
