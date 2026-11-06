import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyDB,cleanBody,cleanMachine} from '../domain.js';
import {cloudRecords,recordsToDB,planSync,stableJSON} from '../cloud-model.js';
import {setStorageAccount,scopedKey,photoDatabaseName} from '../storage-scope.js';
import {save,load,STORAGE_KEY,RESTORE_PENDING_KEY,getLoadedRaw} from '../store.js';
import {writeSession,readSession} from '../session.js';
const entry=(payload,revision=1)=>({payload,revision});
test('independent records merge without losing either device',()=>{
 const plan=planSync({a:'local'},{b:entry('remote')});
 assert.deepEqual(plan.merged,{a:'local',b:'remote'});assert.equal(plan.writes.length,1);assert.equal(plan.conflicts.length,0);
});
test('remote edits and deletions propagate when local is unchanged',()=>{
 const plan=planSync({a:'old',b:'old'},{a:entry('new',2),b:entry(null,2)},{a:entry('old'),b:entry('old')});
 assert.deepEqual(plan.merged,{a:'new'});assert.equal(plan.writes.length,0);
});
test('local deletion becomes versioned tombstone rather than document delete',()=>{
 const plan=planSync({}, {a:entry('old',4)}, {a:entry('old',4)});
 assert.deepEqual(plan.writes,[{key:'a',payload:null,expectedRevision:4}]);
});
test('a first-time client cannot silently resurrect a known server deletion',()=>{
 const plan=planSync({a:'old copied record'}, {a:entry(null,3)}, {});
 assert.equal(plan.conflicts.length,1);assert.equal(plan.writes.length,0);
});
test('concurrent edit and delete conflict retains both sides',()=>{
 const plan=planSync({a:'new'}, {a:entry(null,2)}, {a:entry('old')});
 assert.deepEqual(plan.conflicts,[{key:'a',local:'new',remote:null}]);assert.equal(plan.writes.length,0);
});
test('explicit conflict choice is valid only for the exact reviewed versions',()=>{
 const base={a:entry('base')},remote={a:entry('server',2)};
 assert.equal(planSync({a:'local'},remote,base,{a:{side:'local',local:'local',remote:'server'}}).writes[0].payload,'local');
 assert.equal(planSync({a:'local'},remote,base,{a:{side:'remote',local:'local',remote:'server'}}).merged.a,'server');
 assert.equal(planSync({a:'changed'},remote,base,{a:{side:'local',local:'local',remote:'server'}}).conflicts.length,1);
});
test('machine image never enters cloud records and remote update preserves local photo',()=>{
 const db=emptyDB();db.machines=[cleanMachine({id:'m1',name:'머신',photoDataUrl:'data:image/jpeg;base64,YQ=='})];
 const records=cloudRecords(db);assert.ok(!records['machines~m1'].includes('photoDataUrl'));
 assert.equal(recordsToDB(records,db).machines[0].photoDataUrl,'data:image/jpeg;base64,YQ==');
 assert.equal(recordsToDB(records).machines[0].photoDataUrl,'');
});
test('cloud roundtrip retains stable IDs and map/list types',()=>{
 const db=emptyDB();db.body=[cleanBody({id:'b/1',date:'2026-11-04',weight:70})];db.favorites=['fav'];db.dayStates={'2026-11-04':'fasting'};
 assert.deepEqual(recordsToDB(cloudRecords(db)),db);
});
test('duplicate identifiers and oversized payload refuse upload',()=>{
 const db=emptyDB();const body=cleanBody({id:'b1',date:'2026-11-04',weight:70});db.body=[body,body];assert.throws(()=>cloudRecords(db),/중복/);
 db.body=[{...body,note:'x'.repeat(800001)}];assert.throws(()=>cloudRecords(db),/너무 큽니다/);
});
test('canonical payload comparison ignores property insertion order',()=>{
 assert.equal(stableJSON({a:1,b:{c:2,d:3}}),stableJSON({b:{d:3,c:2},a:1}));
});
test('guest and account data, drafts, recovery and photo stores stay isolated',()=>{
 const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k)};
 setStorageAccount('');const db=emptyDB();db.body=[cleanBody({id:'guest',date:'2026-11-04',weight:70})];save(db);writeSession({meta:{},exercises:[]});
 assert.equal(STORAGE_KEY,'myweightlog.v1');assert.equal(photoDatabaseName(),'myweightlog.photos');
 setStorageAccount('userA');assert.equal(load().body.length,0);assert.equal(readSession(),null);assert.match(RESTORE_PENDING_KEY,/userA$/);assert.match(photoDatabaseName(),/userA$/);
 save({...emptyDB(),body:[cleanBody({id:'A',date:'2026-11-04',weight:71})]});writeSession({meta:{title:'A'},exercises:[]});
 setStorageAccount('userB');assert.equal(load().body.length,0);assert.equal(readSession(),null);assert.match(scopedKey('myweightlog.draft.before-restore'),/userB$/);
 setStorageAccount('userA');assert.equal(load().body[0].id,'A');assert.equal(readSession().meta.title,'A');
 setStorageAccount('');assert.equal(load().body[0].id,'guest');assert.ok(readSession());
});
test('last loaded snapshot detects another tab editing before synchronization',()=>{
 const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k)};
 setStorageAccount('snapshot-user');load();assert.equal(getLoadedRaw(),null);
 save(emptyDB());const original=getLoadedRaw();assert.equal(original,memory.get(STORAGE_KEY));
 memory.set(STORAGE_KEY,JSON.stringify({...emptyDB(),settings:{calorieGoal:1234}}));
 assert.notEqual(getLoadedRaw(),localStorage.getItem(STORAGE_KEY));
 load();assert.equal(getLoadedRaw(),localStorage.getItem(STORAGE_KEY));
 setStorageAccount('');assert.equal(getLoadedRaw(),undefined);
});
