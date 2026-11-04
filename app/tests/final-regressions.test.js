import test from 'node:test';import assert from 'node:assert/strict';
import {emptyDB,cleanMeal,dietState} from '../domain.js';
import {periodReport} from '../reports.js';
import {muscleMapHTML,anatomySvg} from '../exercise-ui.js';
test('approved technical atlas separates general target from actual record load',()=>{
 const target=muscleMapHTML(['chest'],['triceps'],{key:'test'});
 assert.match(target,/data-atlas-design="technical-03"/);assert.match(target,/가슴 주 타깃/);assert.match(target,/삼두 보조 타깃/);
 const load=muscleMapHTML([],[],{mode:'load',loads:[{muscleId:'chest',score:7,sets:12}],key:'load'});
 assert.match(load,/가슴 부담 큼/);assert.match(load,/삼두 자료 없음/);assert.doesNotMatch(load,/가슴 주 타깃/);
 assert.match(anatomySvg(['chest'],[],{side:'front'}),/xmlns="http:\/\/www.w3.org\/2000\/svg"/);
});
test('completed days cannot turn missing nutrients or removed records into zero intake',()=>{
 const db=emptyDB();db.meals=[cleanMeal({date:'2026-11-01',name:'열량만 확인',calories:500})];db.dayStates={'2026-11-01':'complete','2026-11-02':'complete'};
 assert.equal(dietState(db,'2026-11-02'),'unrecorded');const r=periodReport(db,2,new Date('2026-11-02T12:00:00'));
 assert.equal(r.averageCalories,500);assert.equal(r.averageProtein,null);assert.equal(r.averageDays.calories,1);assert.equal(r.averageDays.protein,0);
 db.dayStates['2026-11-02']='fasting';const f=periodReport(db,2,new Date('2026-11-02T12:00:00'));assert.equal(f.averageCalories,250);assert.equal(f.averageProtein,0);assert.equal(f.averageDays.protein,1);
});
