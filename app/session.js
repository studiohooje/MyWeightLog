import {scopedKey} from './storage-scope.js';
const key=()=>scopedKey('myweightlog.draft.v1');
export function readSession(){
 const raw=localStorage.getItem(key());if(!raw||raw===localStorage.getItem(scopedKey('myweightlog.draft.before-restore')))return null;
 try{const x=JSON.parse(raw);if(x.version!==1||!Array.isArray(x.exercises)||!x.meta||typeof x.meta!=='object'||Array.isArray(x.meta)||x.exercises.some(e=>!e||typeof e!=='object'||!Array.isArray(e.sets)))throw Error();return {...x,id:x.id||x.updatedAt||'legacy-draft'}}
 catch{throw Error('임시 운동 기록을 읽지 못했습니다. 원본은 유지됩니다. 설정에서 원본을 내보내세요.')}
}
export function writeSession(session){const prior=readSession();localStorage.setItem(key(),JSON.stringify({...session,id:session.id||prior?.id||globalThis.crypto?.randomUUID?.()||`draft-${Date.now()}`,version:1,updatedAt:new Date().toISOString()}))}
export function clearSession(){localStorage.removeItem(key())}
export function rawSession(){return localStorage.getItem(key())}
