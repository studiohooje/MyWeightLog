import test from 'node:test';
import assert from 'node:assert/strict';
import {readSession,writeSession,clearSession,rawSession} from '../session.js';

const KEY='myweightlog.draft.v1';
const draft=()=>({editId:'workout-existing',timerEnds:1793570000123,meta:{date:'2026-11-01',title:'이어할 운동',note:'원본 메모'},exercises:[{id:'e1',exerciseId:'bench-press',machineId:'machine-one',name:'벤치프레스',sets:[{id:'s1',weight:'100.125',unit:'lb',reps:'8',rpe:'7.5',completed:false,targetWeight:95,targetUnit:'lb',targetReps:10}]}]});
function storage(initial=[]){const disk=new Map(initial);let failWrite=false;globalThis.localStorage={getItem:k=>disk.get(k)??null,setItem:(k,v)=>{if(failWrite)throw Error('QuotaExceededError');disk.set(k,v)},removeItem:k=>disk.delete(k)};return {disk,failWrites:()=>{failWrite=true}}}

test('session round trip retains original weight/unit, editing identity, targets and timer deadline',()=>{
 storage();const original=draft();writeSession(original);const restored=readSession();
 assert.equal(restored.editId,'workout-existing');assert.equal(restored.timerEnds,1793570000123);assert.deepEqual(restored.meta,original.meta);assert.deepEqual(restored.exercises,original.exercises);assert.equal(restored.version,1);assert.ok(Number.isFinite(Date.parse(restored.updatedAt)));
 restored.exercises[0].sets[0].weight='999';assert.equal(readSession().exercises[0].sets[0].weight,'100.125');
});
test('corrupt or unsupported session remains byte-identical for raw export',()=>{
 for(const raw of ['{broken',JSON.stringify({version:9,exercises:[],meta:{}}),JSON.stringify({version:1,exercises:{},meta:{}})]){
  const {disk}=storage([[KEY,raw]]);assert.throws(()=>readSession(),/원본은 유지/);assert.equal(rawSession(),raw);assert.equal(disk.get(KEY),raw);
 }
});
test('failed session save keeps last durable draft and surfaces failure to caller',()=>{
 const env=storage();writeSession(draft());const before=rawSession();env.failWrites();
 assert.throws(()=>writeSession({...draft(),meta:{title:'저장 실패한 새 값'}}),/Quota/);assert.equal(rawSession(),before);assert.equal(readSession().meta.title,'이어할 운동');
});
test('explicit draft deletion leaves primary records and restore archive intact',()=>{
 const env=storage([['myweightlog.v1','records'],['myweightlog.draft.before-restore','archive']]);writeSession(draft());clearSession();assert.equal(readSession(),null);assert.equal(env.disk.get('myweightlog.v1'),'records');assert.equal(env.disk.get('myweightlog.draft.before-restore'),'archive');
});

let fixtureId=0;
async function appFixture(initial=[]){
 const previous=new Map(['localStorage','document','navigator','location','FormData','confirm','setTimeout','clearTimeout'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 const env=storage(initial),events=new Map(),toasts=[],root={innerHTML:'',addEventListener:(type,handler)=>events.set(type,handler)};
 globalThis.document={getElementById:id=>id==='app'?root:null,querySelector:()=>null,createElement:()=>({textContent:'',remove(){}}),body:{append:el=>toasts.push(el.textContent)},addEventListener(){}};
 Object.defineProperty(globalThis,'navigator',{value:{},configurable:true});globalThis.location={protocol:'file:'};
 globalThis.FormData=class{constructor(form){this.form=form}*[Symbol.iterator](){yield* Object.entries(this.form.values)}getAll(k){return [this.form.values[k]].filter(Boolean)}};
 globalThis.confirm=()=>false;globalThis.setTimeout=()=>0;globalThis.clearTimeout=()=>{};
 await import(`../app.js?session-safety=${++fixtureId}`);
 return {...env,events,toasts,root,click:async(dataset={},id='')=>events.get('click')({target:{closest:()=>({dataset,id})}}),submit:(id,values)=>events.get('submit')({preventDefault(){},target:{id,values}}),close(){for(const [key,descriptor]of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key]}}};
}
test('app resumes durable workout and cancellation protects it from program replacement',async()=>{
 const original=draft();original.timerEnds=0;const fixture=await appFixture([[KEY,JSON.stringify({...original,version:1})]]);
 try{
  await fixture.click({modal:'workout'});assert.match(fixture.root.innerHTML,/이어할 운동/);assert.match(fixture.root.innerHTML,/100\.125/);const before=fixture.disk.get(KEY);
  await fixture.click({program:'full-body:0'});assert.equal(fixture.disk.get(KEY),before);assert.match(fixture.root.innerHTML,/이어할 운동/);
  globalThis.confirm=()=>true;await fixture.click({program:'full-body:0'});const replaced=JSON.parse(fixture.disk.get(KEY));assert.notEqual(replaced.meta.title,'이어할 운동');assert.equal(replaced.editId,null);
 }finally{fixture.close()}
});
test('successful workout completion clears draft; later render cannot recreate completed draft',async()=>{
 const fixture=await appFixture();
 try{
  await fixture.click({program:'full-body:0'});assert.ok(fixture.disk.has(KEY));
  fixture.submit('workout-form',{date:'2026-11-01',duration:'40',title:'저장 완료 운동',condition:'4',note:''});
  assert.equal(JSON.parse(fixture.disk.get('myweightlog.v1')).workouts.length,1);assert.equal(fixture.disk.has(KEY),false);
  await fixture.click({page:'home'});await fixture.click({page:'workout'});assert.equal(fixture.disk.has(KEY),false);
 }finally{fixture.close()}
});

test('committed draft cannot be resumed as a duplicate when draft removal fails',async()=>{
 const fixture=await appFixture();
 try{
  await fixture.click({program:'full-body:0'});
  globalThis.localStorage.removeItem=()=>{throw Error('remove blocked')};
  fixture.submit('workout-form',{date:'2026-11-02',title:'정리 실패에도 한 번만 저장',duration:'10'});
  const db=JSON.parse(fixture.disk.get('myweightlog.v1'));
  assert.equal(db.workouts.length,1);assert.equal(db.workouts[0].sourceDraftId,readSession().id);
  await fixture.click({modal:'workout'});
  assert.equal(JSON.parse(fixture.disk.get('myweightlog.v1')).workouts.length,1);
  assert.match(fixture.toasts.join(' '),/이미 저장된 운동/);
 }finally{fixture.close()}
});

test('restore archive disables stale draft even if source deletion fails',()=>{
 const env=storage();writeSession(draft());const raw=rawSession();
 env.disk.set('myweightlog.draft.before-restore',raw);
 assert.equal(readSession(),null);assert.equal(rawSession(),raw);
 writeSession({...draft(),editId:null});assert.notEqual(rawSession(),raw);assert.ok(readSession());
 assert.equal(env.disk.get('myweightlog.draft.before-restore'),raw);
});

test('malformed exercise structure is preserved and cannot silently be overwritten',()=>{
 const raw=JSON.stringify({version:1,meta:{},exercises:[null]});storage([[KEY,raw]]);
 assert.throws(()=>writeSession(draft()),/원본은 유지/);assert.equal(rawSession(),raw);
});
