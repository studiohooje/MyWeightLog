import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyDB,cleanBody} from '../domain.js';
import {load,save,getStorageStatus,STORAGE_KEY,RESTORE_PENDING_KEY} from '../store.js';
import {createBackup,validateBackup,restoreBackup,recoverInterruptedRestore} from '../backup.js';

function setup(){const disk=new Map();let failOnce=false;globalThis.localStorage={getItem:k=>disk.get(k)??null,setItem:(k,v)=>{if(k===STORAGE_KEY&&failOnce){failOnce=false;throw Error('quota')}disk.set(k,v)},removeItem:k=>disk.delete(k)};load();return {disk,fail:()=>{failOnce=true}}}
function adapter(initial=[]){let items=initial,journal=null;return {readAll:async()=>items,replaceAll:async value=>{items=value},writeJournal:async value=>{journal=value},readJournal:async()=>journal,clearJournal:async()=>{journal=null}}}
const photo=()=>({id:'photo-one',date:'2026-11-01',blob:new Blob([new Uint8Array([137,80,78,71,1,2,3])],{type:'image/png'})});
const dbWithRecord=()=>({...emptyDB(),body:[cleanBody({id:'body-one',date:'2026-11-01',weight:70})]});

test('corrupt local record remains byte-identical and all ordinary writes are blocked',()=>{
 const {disk}=setup();disk.set(STORAGE_KEY,'{broken');assert.equal(load().body.length,0);assert.equal(getStorageStatus().blocked,true);assert.throws(()=>save(emptyDB()),/잠갔/);assert.equal(disk.get(STORAGE_KEY),'{broken');
});
test('live disk corruption also blocks a save after successful initial load',()=>{
 const {disk}=setup();disk.set(STORAGE_KEY,'{broken');assert.throws(()=>save(emptyDB()),/읽을 수 없어/);assert.equal(disk.get(STORAGE_KEY),'{broken');
});
test('combined backup round trips photo bytes, id, date and record counts',async()=>{
 setup();const source=adapter([photo()]),file=await createBackup(dbWithRecord(),{photos:source});
 assert.equal(file.manifest.photos,1);assert.equal(file.manifest.counts.body,1);
 const parsed=await validateBackup(JSON.parse(JSON.stringify(file)));assert.equal(parsed.db.body[0].weight,70);assert.equal(parsed.photos[0].date,'2026-11-01');assert.deepEqual(new Uint8Array(await parsed.photos[0].blob.arrayBuffer()),new Uint8Array(await photo().blob.arrayBuffer()));
 const target=adapter();const db=await restoreBackup(file,{photos:target});assert.equal(db.body.length,1);assert.equal((await target.readAll())[0].id,'photo-one');assert.equal(localStorage.getItem(RESTORE_PENDING_KEY),null);
});
test('tampered record, photo and count are rejected before any existing state changes',async()=>{
 const {disk}=setup();save(dbWithRecord());const before=disk.get(STORAGE_KEY),photos=adapter([photo()]);
 const file=await createBackup(dbWithRecord(),{photos});
 for(const mutate of [x=>x.data.body[0].weight=999,x=>x.photos[0].data='AQID',x=>x.manifest.photos=2]){
  const bad=structuredClone(file);mutate(bad);await assert.rejects(()=>restoreBackup(bad,{photos}));assert.equal(disk.get(STORAGE_KEY),before);assert.equal((await photos.readAll()).length,1);
 }
});
test('legacy numeric backup retains existing photos',async()=>{
 setup();const photos=adapter([photo()]);const info=await validateBackup(emptyDB());assert.equal(info.legacy,true);assert.equal(info.summary.photos,null);await restoreBackup(emptyDB(),{photos});assert.equal((await photos.readAll()).length,1);
});
test('quota failure after photo replacement rolls back exact raw record and old photos',async()=>{
 const env=setup(),old=dbWithRecord();save(old);const before=env.disk.get(STORAGE_KEY),photos=adapter([photo()]),file=await createBackup(emptyDB(),{photos:adapter()});env.fail();
 await assert.rejects(()=>restoreBackup(file,{photos}),/기존 기록과 사진을 유지/);assert.equal(env.disk.get(STORAGE_KEY),before);assert.equal((await photos.readAll())[0].id,'photo-one');assert.equal(localStorage.getItem(RESTORE_PENDING_KEY),null);
});
test('durable interrupted-restore journal prevents writes and restores both stores',async()=>{
 const {disk}=setup(),photos=adapter(),before=JSON.stringify(dbWithRecord());await photos.writeJournal({raw:before,photos:[photo()]});disk.set(STORAGE_KEY,JSON.stringify(emptyDB()));disk.set(RESTORE_PENDING_KEY,'1');load();assert.equal(getStorageStatus().blocked,true);assert.throws(()=>save(emptyDB()));assert.equal(await recoverInterruptedRestore({photos}),true);assert.equal(disk.get(STORAGE_KEY),before);assert.equal((await photos.readAll()).length,1);assert.equal(load().body.length,1);assert.equal(getStorageStatus().blocked,false);
});
test('duplicate record IDs are rejected rather than silently merged',async()=>{
 setup();const db=dbWithRecord();db.body.push({...db.body[0]});await assert.rejects(()=>validateBackup(db),/중복 ID/);
});
test('photo metadata tampering is detected even when image bytes have not changed',async()=>{
 setup();const file=await createBackup(emptyDB(),{photos:adapter([photo()])});file.photos[0].date='2026-10-31';await assert.rejects(()=>validateBackup(file),/사진 목록/);
});
test('failed rollback retains durable journal and write lock until recovery succeeds',async()=>{
 const env=setup();save(dbWithRecord());const original=env.disk.get(STORAGE_KEY),photos=adapter([photo()]),replace=photos.replaceAll;
 const file=await createBackup(emptyDB(),{photos:adapter()});let calls=0;
 photos.replaceAll=async value=>{calls++;if(calls===2)throw Error('device unavailable');return replace(value)};env.fail();
 await assert.rejects(()=>restoreBackup(file,{photos}),/자동 복구도 완료되지 않아/);assert.equal(localStorage.getItem(RESTORE_PENDING_KEY),'1');assert.ok(await photos.readJournal());load();assert.throws(()=>save(emptyDB()),/잠갔/);
 await recoverInterruptedRestore({photos});assert.equal(env.disk.get(STORAGE_KEY),original);assert.equal((await photos.readAll()).length,1);load();assert.equal(getStorageStatus().blocked,false);
});
