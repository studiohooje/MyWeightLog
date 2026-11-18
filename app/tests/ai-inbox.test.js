import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyDB} from '../domain.js';
import {renderAIInbox} from '../ai-inbox.js';
import {validateDraftRecords} from '../ai-drafts.js';

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
