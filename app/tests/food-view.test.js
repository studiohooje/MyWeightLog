import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyDB,cleanMeal} from '../domain.js';
import {renderFoodPage} from '../food-view.js';

test('확정된 AI 식단에 영양 근거를 표시하고 안전한 출처 URL만 링크한다',()=>{
 const db=emptyDB(),date='2026-11-18';
 db.meals=[cleanMeal({date,name:'예시 음식',calories:200,servingQty:1,servingUnit:'개',loggedAt:'2026-11-18T10:00:00+09:00',aiEvidence:{source:'제품 라벨',servingBasis:'1개',sourceUrl:'https://example.com/label'}})];
 const html=renderFoodPage(db,date);
 assert.match(html,/영양 근거: 제품 라벨 · 1개/);
 assert.match(html,/href="https:\/\/example.com\/label"/);
 db.meals[0].aiEvidence.sourceUrl='javascript:alert(1)';
 assert.doesNotMatch(renderFoodPage(db,date),/href="javascript:/);
});
