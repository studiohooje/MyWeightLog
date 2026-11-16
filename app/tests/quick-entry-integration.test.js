import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyDB,cleanMeal,cleanMachine} from '../domain.js';
import {EXERCISE_CATALOG} from '../catalog.js';

test('실제 앱 버튼에서 빠른 식사와 연속 운동 세트를 같은 저장소에 남긴다',async()=>{
 const disk=new Map(),events=new Map(),fields=new Map(),toasts=[];
 const root={innerHTML:'',addEventListener:(type,fn)=>events.set(type,fn)};
 const old=Object.fromEntries(['localStorage','document','navigator','location','setTimeout','clearTimeout'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 const leg=EXERCISE_CATALOG.find(x=>x.name==='레그 프레스');
 const seed=emptyDB();seed.settings.gyms=['헬스플러스 안산점'];seed.machines=[cleanMachine({name:'안산 레그프레스',manufacturer:'테스트',model:'LP-A',location:'헬스플러스 안산점',exerciseId:leg.id})];seed.meals=[cleanMeal({date:'2026-11-12',name:'현미밥',servingQty:200,servingUnit:'g',calories:330,carbs:72,protein:7,fat:2})];
 disk.set('myweightlog.v1',JSON.stringify(seed));
 globalThis.localStorage={getItem:k=>disk.get(k)??null,setItem:(k,v)=>disk.set(k,v),removeItem:k=>disk.delete(k)};
 globalThis.document={getElementById:id=>id==='app'?root:fields.get(id)||null,querySelector:()=>null,createElement:()=>({textContent:'',remove(){}}),body:{append:el=>toasts.push(el.textContent)}};
 Object.defineProperty(globalThis,'navigator',{value:{},configurable:true});globalThis.location={protocol:'file:'};globalThis.setTimeout=()=>0;globalThis.clearTimeout=()=>{};
 try{
  await import('../app.js?quick-integration');
  const click=async(dataset={},id='')=>events.get('click')({target:{closest:()=>({dataset,id})}});
  await click({modal:'batch'});assert.match(root.innerHTML,/빠른 식사 기록/);assert.match(root.innerHTML,/modal-backdrop quick-palette/);assert.match(root.innerHTML,/음식 빠른 검색/);
  const search={id:'q-food-search',value:'제로핵',selectionStart:3};const beforeComposition=root.innerHTML;
  events.get('compositionstart')({target:search});events.get('input')({target:search});assert.equal(root.innerHTML,beforeComposition);
  events.get('compositionend')({target:search});assert.match(root.innerHTML,/제로핵/);
  search.value='';events.get('input')({target:search});
  await click({qFood:'현미밥|g'});fields.set('q-qty',{value:'210'});await click({},'q-confirm-food');await click({},'q-save-meal');
  let db=JSON.parse(disk.get('myweightlog.v1'));assert.equal(db.meals.length,2);assert.equal(db.meals[1].servingQty,210);assert.equal(db.meals[1].calories,346.5);
  await click({modal:'workout'});assert.match(root.innerHTML,/빠른 완료 세트 기록/);assert.match(root.innerHTML,/modal-backdrop quick-palette/);assert.match(root.innerHTML,/운동 빠른 검색/);
  await click({qEx:leg.id});assert.match(root.innerHTML,/LP-A/);assert.match(root.innerHTML,/주·보조 근육 그림 보기/);assert.match(root.innerHTML,/quick-mini-back-back/);
  await click({},'q-first-set');fields.set('q-set-weight',{value:'120'});fields.set('q-set-reps',{value:'10'});fields.set('q-set-time',{value:'2026-11-13T13:40'});await click({},'q-save-set');
  await click({},'q-repeat-set');db=JSON.parse(disk.get('myweightlog.v1'));assert.equal(db.workouts.length,1);assert.equal(db.workouts[0].exercises[0].sets.length,2);assert.equal(db.workouts[0].exercises[0].machineId,seed.machines[0].id);assert.equal(db.workouts[0].exercises[0].sets[0].completedAt,'2026-11-13T13:40');assert.equal(toasts.some(x=>x.includes('실패')),false);
  await click({},'close');await click({modal:'workout'});assert.match(root.innerHTML,/2세트 · 저장됨/);
  await click({},'q-new-workout');
  const bulgarian=EXERCISE_CATALOG.find(x=>x.name==='불가리안 스플릿 스쿼트');
  await click({qEx:bulgarian.id});
  assert.match(root.innerHTML,/중량은 한 손 기준 · 양손 각각/);
  assert.match(root.innerHTML,/한쪽 다리 기준/);
  await click({},'q-first-set');
  assert.match(root.innerHTML,/value="0"/);
 }finally{for(const [k,descriptor]of Object.entries(old)){if(descriptor)Object.defineProperty(globalThis,k,descriptor);else delete globalThis[k]}}
});
