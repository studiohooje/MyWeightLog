import {normalizeDB,validDate} from './domain.js';
import {STORAGE_KEY,RESTORE_PENDING_KEY,recoverValidatedDB} from './store.js';

const TYPE='myweightlog.backup',VERSION=1,MAX_PHOTO=10*1024*1024;
let restoring=false;
const clone=value=>JSON.parse(JSON.stringify(value));
async function hash(bytes){if(!globalThis.crypto?.subtle)throw Error('안전한 백업 검증을 사용할 수 없습니다. HTTPS 또는 앱에서 실행해 주세요.');return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('')}
const textHash=value=>hash(new TextEncoder().encode(JSON.stringify(value)));
function encode(bytes){let result='';for(let i=0;i<bytes.length;i+=32768)result+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(result)}
function decode(value){if(typeof value!=='string'||value.length>Math.ceil(MAX_PHOTO/3)*4+4||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))throw Error('사진 인코딩이 손상됐습니다.');return Uint8Array.from(atob(value),c=>c.charCodeAt(0))}
function counts(db){return Object.fromEntries(Object.entries(db).filter(([,v])=>Array.isArray(v)).map(([k,v])=>[k,v.length]))}
function validateDB(raw){
 const db=normalizeDB(raw);
 for(const [key,items] of Object.entries(raw))if(Array.isArray(items)){
  const ids=items.map(x=>x?.id).filter(Boolean);if(new Set(ids).size!==ids.length)throw Error(`${key}: 중복 ID가 있는 백업입니다.`);
 }
 return db;
}
function openPhotos(){return new Promise((resolve,reject)=>{
 if(!globalThis.indexedDB)return reject(Error('사진 저장소를 사용할 수 없습니다.'));
 const request=indexedDB.open('myweightlog.photos',2);
 request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('progress'))db.createObjectStore('progress',{keyPath:'id'});if(!db.objectStoreNames.contains('recovery'))db.createObjectStore('recovery',{keyPath:'id'})};
 let blocked=false;request.onsuccess=()=>{if(blocked){request.result.close();return}resolve(request.result)};request.onerror=()=>reject(request.error);request.onblocked=()=>{blocked=true;reject(Error('다른 마웨로그 탭을 닫고 다시 시도해 주세요.'))};
})}
async function transaction(stores,mode,operation){const db=await openPhotos();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(stores,mode);let result;try{result=operation(tx)}catch(error){tx.abort();reject(error);return}tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error||Error('사진 저장 실패'));tx.onabort=()=>reject(tx.error||Error('사진 저장 취소'))})}finally{db.close()}}
async function read(store,key){let result;await transaction([store],'readonly',tx=>{const req=key===undefined?tx.objectStore(store).getAll():tx.objectStore(store).get(key);req.onsuccess=()=>{result=req.result}});return result}
export const photoStorage={
 readAll:()=>read('progress'),
 replaceAll:items=>transaction(['progress'],'readwrite',tx=>{const s=tx.objectStore('progress');s.clear();items.forEach(x=>s.put(x))}),
 writeJournal:value=>transaction(['recovery'],'readwrite',tx=>tx.objectStore('recovery').put({id:'restore',...value})),
 readJournal:()=>read('recovery','restore'),
 clearJournal:()=>transaction(['recovery'],'readwrite',tx=>tx.objectStore('recovery').delete('restore'))
};
export async function createBackup(db,{photos=photoStorage}={}){
 validateDB(db);const data=clone(db),items=await photos.readAll(),encoded=[];
 for(const item of items){const bytes=new Uint8Array(await item.blob.arrayBuffer());if(bytes.length>MAX_PHOTO)throw Error('10 MB를 초과하는 사진은 백업할 수 없습니다.');encoded.push({id:item.id,date:item.date,type:item.blob.type,size:bytes.length,sha256:await hash(bytes),data:encode(bytes)})}
 const file={type:TYPE,version:VERSION,exportedAt:new Date().toISOString(),manifest:{counts:counts(data),photos:encoded.length,dataSha256:await textHash(data),photoManifestSha256:await textHash(encoded.map(({data,...meta})=>meta))},data,photos:encoded};
 await validateBackup(file);return file;
}
export async function validateBackup(raw){
 if(raw?.type!==TYPE){const db=validateDB(raw);return {db,photos:null,legacy:true,summary:{...counts(db),photos:null,message:'이전 형식: 숫자 기록을 교체하고 현재 사진은 유지합니다.'}}}
 if(raw.version!==VERSION||!raw.manifest||!Array.isArray(raw.photos))throw Error('지원하지 않는 통합 백업 형식입니다.');
 if(await textHash(raw.data)!==raw.manifest.dataSha256)throw Error('기록 해시가 맞지 않습니다. 손상된 백업입니다.');
 if(await textHash(raw.photos.map(({data,...meta})=>meta))!==raw.manifest.photoManifestSha256)throw Error('사진 목록이 손상됐습니다.');
 const db=validateDB(raw.data),actual=counts(raw.data);
 if(JSON.stringify(actual)!==JSON.stringify(raw.manifest.counts)||raw.photos.length!==raw.manifest.photos)throw Error('백업 건수가 일치하지 않습니다.');
 const photos=[],ids=new Set();
 for(const p of raw.photos){
  if(typeof p.id!=='string'||!p.id||ids.has(p.id)||!validDate(p.date)||!/^image\/[a-z0-9.+-]+$/i.test(p.type))throw Error('사진 메타데이터가 올바르지 않습니다.');
  ids.add(p.id);const bytes=decode(p.data);if(!bytes.length||bytes.length!==p.size||await hash(bytes)!==p.sha256)throw Error('사진 크기 또는 해시가 맞지 않습니다.');
  photos.push({id:p.id,date:p.date,blob:new Blob([bytes],{type:p.type})});
 }
 return {db,photos,legacy:false,summary:{...actual,photos:photos.length,message:'기록과 사진 전체를 백업 내용으로 교체합니다.'}};
}
export async function recoverInterruptedRestore({photos=photoStorage}={}){
 if(!localStorage.getItem(RESTORE_PENDING_KEY))return false;
 const journal=await photos.readJournal();if(!journal)throw Error('복원 복구 자료가 없습니다. 기존 원본과 백업을 보존해 주세요.');
 await photos.replaceAll(journal.photos);
 if(journal.raw===null)localStorage.removeItem(STORAGE_KEY);else localStorage.setItem(STORAGE_KEY,journal.raw);
 localStorage.removeItem(RESTORE_PENDING_KEY);await photos.clearJournal();return true;
}
async function restore(raw,{photos=photoStorage}={}){
 const checked=await validateBackup(raw);
 if(localStorage.getItem(RESTORE_PENDING_KEY))throw Error('중단된 복원을 먼저 복구해 주세요.');
 const previousRaw=localStorage.getItem(STORAGE_KEY),previousPhotos=await photos.readAll();
 await photos.writeJournal({raw:previousRaw,photos:previousPhotos});
 localStorage.setItem(RESTORE_PENDING_KEY,'1');
 try{
  if(checked.photos!==null)await photos.replaceAll(checked.photos);
  const db=recoverValidatedDB(checked.db);
  localStorage.removeItem(RESTORE_PENDING_KEY);
  await photos.clearJournal().catch(()=>{});return db;
 }catch(error){
  try{await recoverInterruptedRestore({photos})}catch(rollback){throw Error(`복원 실패. 자동 복구도 완료되지 않아 저장을 잠갔습니다: ${rollback.message}`)}
  throw Error(`복원하지 않았습니다. 기존 기록과 사진을 유지했습니다: ${error.message}`);
 }
}
export async function restoreBackup(raw,options={}){
 if(restoring)throw Error('복원 작업이 진행 중입니다. 완료 후 다시 시도해 주세요.');
 restoring=true;
 try{return globalThis.navigator?.locks?await navigator.locks.request('myweightlog.restore',()=>restore(raw,options)):await restore(raw,options)}finally{restoring=false}
}
