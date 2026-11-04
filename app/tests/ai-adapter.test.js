import test from 'node:test';import assert from 'node:assert/strict';import {createAIAdapter,validateAIResult} from '../ai-adapter.js';
test('연결 전 AI 기능은 작동 완료로 표시하지 않는다',async()=>{const x=createAIAdapter('');assert.equal(x.available,false);await assert.rejects(()=>x.run('meal',{}),/연결되지/)});
test('향후 AI 응답의 형식을 검증한다',()=>{assert.deepEqual(validateAIResult('meal',{foods:[{name:'식사'}]}),{foods:[{name:'식사'}]});assert.throws(()=>validateAIResult('inbody',{measurement:null}),/측정값/);assert.throws(()=>createAIAdapter('http://example.com'),/HTTPS/)});
