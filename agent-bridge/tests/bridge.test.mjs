import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {draftId,validateDraft,firestoreValue,fromFirestore} from '../contract.mjs';
import {FirestoreBridge} from '../firebase.mjs';

const meal={type:'meal',requestId:'photo-2026-11-17-1',originalUtterance:'10시에 현미밥과 닭가슴살을 먹었어',parsedData:{items:[{date:'2026-11-17',name:'현미밥',servingQty:200,servingUnit:'g',calories:300,carbs:64,protein:5,fat:2}]},uncertainty:{calories:{estimated:true,min:250,max:350}},evidence:{source:'photo'}};
test('초안 ID는 사용자와 요청별로 안정적이고 다른 계정과 분리된다',()=>{
 assert.equal(draftId('user-a','retry-1'),draftId('user-a','retry-1'));
 assert.notEqual(draftId('user-a','retry-1'),draftId('user-b','retry-1'));
 assert.notEqual(draftId('user-a','retry-1'),draftId('user-a','retry-2'));
});
test('식사 입력은 음식별 항목과 불확실성을 보존하고 잘못된 값은 거절한다',()=>{
 assert.equal(validateDraft(meal).parsedData.items[0].name,'현미밥');
 assert.equal(validateDraft(meal).uncertainty.calories.max,350);
 assert.throws(()=>validateDraft({...meal,parsedData:{items:[{...meal.parsedData.items[0],calories:-1}]}}),/calories/);
 assert.throws(()=>validateDraft({...meal,parsedData:{items:[]}}),/items/);
});
test('새 머신은 전체·명판 사진과 식별된 제조사·모델을 요구한다',()=>{
 const input={type:'machine',requestId:'machine-1',originalUtterance:'새 머신 등록',parsedData:{name:'V 스쿼트',manufacturer:'Hammer Strength',model:'V Squat'},evidence:{photos:[{role:'whole'},{role:'nameplate'}]}};
 assert.equal(validateDraft(input).parsedData.model,'V Squat');
 assert.throws(()=>validateDraft({...input,evidence:{photos:[{role:'whole'}]}}),/두 장/);
 assert.throws(()=>validateDraft({...input,parsedData:{...input.parsedData,model:'모름'}}),/명확하지/);
});
test('새 음식과 운동 초안을 구분한다',()=>{
 assert.equal(validateDraft({type:'food',requestId:'f1',originalUtterance:'제로핵',parsedData:{name:'제로핵',servingUnit:'개',calories:200}}).type,'food');
 assert.equal(validateDraft({type:'exercise',requestId:'e1',originalUtterance:'새 운동',parsedData:{name:'새 운동',part:'등'}}).type,'exercise');
});
test('Firestore REST 값 인코딩과 디코딩',()=>{
 const input={name:'제로핵',calories:125.5,estimated:true,items:[{grams:100}]};
 assert.deepEqual(fromFirestore(firestoreValue(input)),input);
});
test('초안 생성은 사용자 경로와 생성 전용 조건 및 서버 시간을 사용한다',async()=>{
 let request;
 const fetcher=async(url,options)=>{request={url,body:JSON.parse(options.body)};return {ok:true,json:async()=>({writeResults:[{}]})}};
 const bridge=new FirestoreBridge({fetcher});bridge.setSession({uid:'friend-user',idToken:'test-token',expiresAt:new Date(Date.now()+3600000).toISOString()});
 const result=await bridge.createDraft(meal);
 assert.equal(result.duplicate,false);
 const write=request.body.writes[0];
 assert.match(write.update.name,/users\/friend-user\/aiDrafts\/ai-/);
 assert.deepEqual(write.currentDocument,{exists:false});
 assert.equal(write.update.fields.requestId.stringValue,result.id);
 assert.deepEqual(write.updateTransforms.map(x=>x.fieldPath),['createdAt','updatedAt']);
 assert.equal(request.url.endsWith('/documents:commit'),true);
});
test('MCP 초기화와 도구 목록에 비밀이 노출되지 않는다',async()=>{
 const proc=spawn(process.execPath,['mcp.mjs'],{cwd:new URL('..',import.meta.url),stdio:['pipe','pipe','pipe']});
 const lines=[];proc.stdout.on('data',chunk=>lines.push(...chunk.toString().split('\n').filter(Boolean)));
 proc.stdin.write(JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-03-26'}})+'\n');
 proc.stdin.write(JSON.stringify({jsonrpc:'2.0',id:2,method:'tools/list'})+'\n');
 await new Promise(resolve=>setTimeout(resolve,250));proc.stdin.end();await new Promise(resolve=>proc.on('exit',resolve));
 const replies=lines.map(JSON.parse);assert.equal(replies[0].result.serverInfo.name,'myweightlog-agent-bridge');assert.ok(replies[1].result.tools.some(tool=>tool.name==='mwl_create_draft'));assert.equal(JSON.stringify(replies).includes('AIza'),false);
});
