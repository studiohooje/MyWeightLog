import {scopedKey,onStorageScopeChange} from './storage-scope.js';
import {emptyDB,normalizeDB} from './domain.js';
export let STORAGE_KEY=scopedKey('myweightlog.v1');
export let RESTORE_PENDING_KEY=scopedKey('myweightlog.restore.pending');
onStorageScopeChange(()=>{STORAGE_KEY=scopedKey('myweightlog.v1');RESTORE_PENDING_KEY=scopedKey('myweightlog.restore.pending');status={blocked:false,reason:''};loadedRaw=undefined;});
let status={blocked:false,reason:''};
let loadedRaw;
export function getLoadedRaw(){return loadedRaw}
export function getStorageStatus(){return {...status}}
export function getRecoveryRaw(){return localStorage.getItem(STORAGE_KEY)}
export function load(){
 try{
  if(localStorage.getItem(RESTORE_PENDING_KEY))throw Error('중단된 복원을 먼저 복구해 주세요.');
  const raw=localStorage.getItem(STORAGE_KEY),db=raw?normalizeDB(JSON.parse(raw)):emptyDB();
  loadedRaw=raw;
  status={blocked:false,reason:''};return db;
 }catch(error){status={blocked:true,reason:error.message||'저장소를 읽을 수 없습니다.'};return emptyDB()}
}
export function save(db){
 if(status.blocked||localStorage.getItem(RESTORE_PENDING_KEY))throw Error('기존 기록 보호를 위해 저장을 잠갔습니다. 원본을 내려받고 백업을 복원해 주세요.');
 const raw=localStorage.getItem(STORAGE_KEY);
 if(raw){try{normalizeDB(JSON.parse(raw))}catch(error){status={blocked:true,reason:error.message};throw Error('기존 기록을 읽을 수 없어 저장하지 않았습니다. 원본 복구가 필요합니다.')}}
 const encoded=JSON.stringify(db);localStorage.setItem(STORAGE_KEY,encoded);loadedRaw=encoded;return db;
}
export function recoverValidatedDB(db){
 const valid=normalizeDB(db),encoded=JSON.stringify(valid);localStorage.setItem(STORAGE_KEY,encoded);loadedRaw=encoded;
 status={blocked:false,reason:''};return valid;
}
export function add(db,kind,item){const next={...db,[kind]:[...(db[kind]||[]),item]};return save(next)}
export function remove(db,kind,id){const next={...db,[kind]:db[kind].filter(x=>x.id!==id)};return save(next)}
export function replace(db,kind,item){const next={...db,[kind]:db[kind].map(x=>x.id===item.id?item:x)};return save(next)}
