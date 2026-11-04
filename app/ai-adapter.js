// 앱에 비밀 API 키를 넣지 않는다. 추후 사용자가 승인한 서버 엔드포인트를 연결한다.
import {cleanMeal,cleanWorkout} from './domain.js';
export const AI_TASKS=['inbody','meal','workout-plan','weekly-report'];
export function validateAIResult(task,data){if(!AI_TASKS.includes(task))throw Error('지원하지 않는 AI 작업입니다.');if(!data||typeof data!=='object')throw Error('AI 응답 형식이 올바르지 않습니다.');if(task==='inbody'&&(!data.measurement||typeof data.measurement!=='object'))throw Error('측정값이 없습니다.');if(task==='meal'&&(!Array.isArray(data.foods)||!data.foods.length))throw Error('음식 결과가 없습니다.');if(task==='workout-plan'&&(!Array.isArray(data.exercises)||!data.exercises.length))throw Error('운동 결과가 없습니다.');if(task==='weekly-report'&&typeof data.summary!=='string')throw Error('리포트 내용이 없습니다.');return data}
export function createAIAdapter(endpoint){if(!endpoint)return {available:false,run:async()=>{throw Error('AI 서비스가 연결되지 않았습니다.')}};const url=new URL(endpoint);if(url.protocol!=='https:')throw Error('AI 연결은 HTTPS가 필요합니다.');return {available:true,async run(task,payload){if(!AI_TASKS.includes(task))throw Error('지원하지 않는 AI 작업입니다.');const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({task,payload})});if(!r.ok)throw Error(`AI 요청 실패 (${r.status})`);return validateAIResult(task,await r.json())}}}

// Codex가 작성한 파일을 기기에서 검토한 뒤 가져오는 계약이다. 외부 AI 호출은 하지 않는다.
export function parseCodexRecord(raw){
  if(!raw||typeof raw!=='object'||raw.version!==1)throw Error('지원하지 않는 마웨로그 파일입니다.');
  if(raw.type==='myweightlog.meal'){
    if(!raw.meal||typeof raw.meal!=='object')throw Error('식단 데이터가 없습니다.');
    return {kind:'meals',record:cleanMeal(raw.meal)};
  }
  if(raw.type==='myweightlog.workout'){
    if(!raw.workout||typeof raw.workout!=='object')throw Error('운동 데이터가 없습니다.');
    return {kind:'workouts',record:cleanWorkout(raw.workout)};
  }
  throw Error('식단 또는 운동 마웨로그 파일이 아닙니다.');
}
