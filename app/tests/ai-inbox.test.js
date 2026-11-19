import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyDB} from '../domain.js';
import {renderAIInbox,readAIReviewValues} from '../ai-inbox.js';
import {validateDraftRecords,recordIdentity} from '../ai-drafts.js';

const base={id:'ai-test',status:'pending',createdAt:'2026-11-17T10:00:00+09:00',originalUtterance:'사진 보고 기록해줘',uncertainty:{},evidence:{}};

test('AI 식단 초안은 음식별 검토와 추정 범위를 보여주고 기록에 보존한다',()=>{
 const item={date:'2026-11-17',slot:'식사①',name:'사진 속 식사',servingQty:1,servingUnit:'회',calories:650,carbs:75,protein:35,fat:20,aiEstimate:{estimated:true,caloriesMin:500,caloriesMax:800,basis:'photo'}};
 const draft={...base,type:'meal',parsedData:{items:[item]}};
 const html=renderAIInbox([draft],emptyDB());
 assert.match(html,/약 650 kcal · 추정/);
 assert.match(html,/500~800 kcal/);
 assert.match(html,/item-0-servingQty/);
 const records=validateDraftRecords(draft,draft.parsedData);
 assert.equal(records[0].record.aiEstimate.caloriesMin,500);
 assert.equal(records[0].record.source,'ai-estimated');
});

test('신규 머신은 전체·명판 근거와 식별된 제조사·모델이 있어야 확정된다',()=>{
 const draft={...base,type:'machine',parsedData:{name:'V스쿼트',manufacturer:'브랜드',model:'모델 1',unit:'kg'},evidence:{photos:[{role:'whole'},{role:'nameplate'}]}};
 assert.match(renderAIInbox([draft],emptyDB()),/머신 별칭/);
 assert.equal(validateDraftRecords(draft).length,1);
 assert.throws(()=>validateDraftRecords({...draft,evidence:{photos:[{role:'whole'}]}}),/명판/);
 assert.throws(()=>validateDraftRecords({...draft,parsedData:{...draft.parsedData,model:'모름'}}),/제조사와 모델/);
});

test('AI 초안의 사용자 문장은 HTML로 실행되지 않는다',()=>{
 const draft={...base,type:'body',originalUtterance:'<script>alert(1)</script>',parsedData:{date:'2026-11-17',weight:80}};
 const html=renderAIInbox([draft],emptyDB());
 assert.doesNotMatch(html,/<script>/);
 assert.match(html,/&lt;script&gt;/);
});

const formValues=values=>({get:key=>values[key]??null,getAll:key=>values[key]??[]});
test('식사 검토에서 날짜·시각·번호를 수정하고 중앙값이 범위를 벗어나면 막는다',()=>{
 const draft={...base,type:'meal',parsedData:{items:[{date:'2026-11-17',slot:'식사①',loggedAt:'2026-11-17T10:00:00+09:00',name:'베이글',servingQty:1,servingUnit:'개',calories:650,carbs:70,protein:20,fat:12,aiEstimate:{estimated:true,caloriesMin:500,caloriesMax:800}}]}};
 const values={'item-0-date':'2026-11-18','item-0-slot':'식사②','item-0-loggedAt':'2026-11-18T11:30','item-0-name':'베이글','item-0-servingQty':'1','item-0-servingUnit':'개','item-0-calories':'900','item-0-carbs':'70','item-0-protein':'20','item-0-fat':'12','item-0-estimated':'on','item-0-caloriesMin':'500','item-0-caloriesMax':'800'};
 assert.throws(()=>readAIReviewValues(formValues(values),draft),/추정 범위/);
 values['item-0-caloriesMax']='1000';
 const reviewed=readAIReviewValues(formValues(values),draft);
 assert.equal(reviewed.items[0].date,'2026-11-18');assert.equal(reviewed.items[0].slot,'식사②');
 assert.match(reviewed.items[0].loggedAt,/T/);assert.equal(reviewed.items[0].aiEstimate.caloriesMax,1000);
});

test('운동 검토에서 종목·머신을 고치고 세트를 삭제·추가할 수 있다',()=>{
 const draft={...base,type:'workout',parsedData:{date:'2026-11-18',title:'하체',exercises:[{name:'레그프레스',exerciseId:'leg-press',part:'하체',kind:'strength',sets:[{weight:40,unit:'kg',reps:15},{weight:60,unit:'kg',reps:12}]}]}};
 const values={date:'2026-11-18',title:'하체 2',gymName:'안산점','ex-0-include':'on','ex-0-name':'V스쿼트','ex-0-exerciseId':'','ex-0-part':'하체','ex-0-machineId':'machine-1','ex-0-weightBasis':'total','ex-0-repBasis':'total','ex-0-handCount':'0','set-0-1-weight':'65','set-0-1-unit':'kg','set-0-1-reps':'10','set-0-1-completedAt':'2026-11-18T11:20','set-0-2-weight':'70','set-0-2-unit':'kg','set-0-2-reps':'8','set-0-2-completedAt':'2026-11-18T11:24'};
 const reviewed=readAIReviewValues(formValues(values),draft,()=>['1','2']);
 assert.equal(reviewed.exercises[0].name,'V스쿼트');assert.equal(reviewed.exercises[0].exerciseId,'');assert.equal(reviewed.exercises[0].machineId,'machine-1');assert.equal(reviewed.exercises[0].sets.length,2);
 assert.equal(validateDraftRecords(draft,reviewed)[0].record.exercises[0].sets[1].reps,8);
});

test('내용 지문은 요청 ID와 무관하고 날짜·시각이 바뀌면 달라진다',()=>{
 const item={date:'2026-11-18',slot:'식사①',loggedAt:'2026-11-18T10:00:00+09:00',name:'현미밥',servingQty:200,servingUnit:'g',calories:300,carbs:65,protein:5,fat:2};
 const a=validateDraftRecords({...base,id:'first',type:'meal',parsedData:{items:[item]}})[0];
 const b=validateDraftRecords({...base,id:'second',type:'meal',parsedData:{items:[{...item,calories:310}]}})[0];
 assert.equal(a.record.id,b.record.id);assert.equal(recordIdentity(a.kind,a.record),recordIdentity(b.kind,b.record));
 const c=validateDraftRecords({...base,id:'third',type:'meal',parsedData:{items:[{...item,loggedAt:'2026-11-18T12:00:00+09:00'}]}})[0];
 assert.notEqual(a.record.id,c.record.id);
});

test('추정 음식 프리셋과 머신 별칭은 확정 기록에 보존된다',()=>{
 const food={...base,type:'food',parsedData:{name:'사진 속 베이글',servingQty:1,servingUnit:'개',calories:250,carbs:40,protein:8,fat:7,aiEstimate:{estimated:true,caloriesMin:190,caloriesMax:310,basis:'사진 추정'}}};
 const record=validateDraftRecords(food)[0].record;
 assert.equal(record.aiEstimate.caloriesMax,310);
 const machine={...base,type:'machine',parsedData:{name:'우리 헬스장 V스쿼트',aliases:['V스쿼트','하체 머신'],manufacturer:'Hammer Strength',model:'V Squat',unit:'kg'},evidence:{photos:[{role:'whole'},{role:'nameplate'}]}};
 assert.deepEqual(validateDraftRecords(machine)[0].record.aliases,['V스쿼트','하체 머신']);
});
