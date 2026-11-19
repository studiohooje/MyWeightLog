import {firebaseConfig} from './firebase-config.js';
import {cleanBody,cleanMeal,cleanWorkout,cleanFoodPreset,cleanMachine,cleanCustomExercise} from './domain.js';
import {stableJSON} from './cloud-model.js';
import {cloudState} from './cloud-sync.js';

const TYPES=new Set(['meal','workout','body','food','machine','exercise']);
const DRAFT_ID=/^[A-Za-z0-9_-]{1,100}$/;
const normalize=value=>String(value??'').normalize('NFKC').trim().toLocaleLowerCase('ko-KR').replace(/\s+/g,' ');
const numeric=value=>value==null||String(value).trim()===''?null:Number(value);
const minute=value=>{const time=Date.parse(String(value||''));return Number.isFinite(time)?new Date(time).toISOString().slice(0,16):String(value||'').slice(0,16)};
export function recordIdentity(kind,record){
 if(kind==='meals')return stableJSON([kind,record.date,minute(record.loggedAt),normalize(record.slot),normalize(record.name),numeric(record.servingQty),normalize(record.servingUnit)]);
 if(kind==='workouts')return stableJSON([kind,record.date,normalize(record.title),normalize(record.gymName),(record.exercises||[]).map(ex=>[normalize(ex.name),ex.machineId||'',(ex.sets||[]).map(set=>[numeric(set.originalWeight??set.weight),set.originalUnit||set.unit||'kg',numeric(set.reps),minute(set.completedAt)])])]);
 if(kind==='body')return stableJSON([kind,record.date,...['weight','bodyFatPct','skeletalMuscle','waistCm','bodyFatMass','bmi','score','visceralFatLevel','bmr'].map(key=>numeric(record[key]))]);
 if(kind==='foods')return stableJSON([kind,normalize(record.name),numeric(record.servingQty),normalize(record.servingUnit)]);
 if(kind==='machines')return stableJSON([kind,normalize(record.manufacturer),normalize(record.model),normalize(record.location)]);
 return stableJSON([kind,normalize(record.name),normalize(record.equipment)]);
}
function fingerprint(value){let hash=0xcbf29ce484222325n;for(const byte of new TextEncoder().encode(value)){hash^=BigInt(byte);hash=BigInt.asUintN(64,hash*0x100000001b3n)}return hash.toString(16).padStart(16,'0')}
const evidenceFor=(item,draft)=>{const source=item?.aiEvidence||draft.evidence||{};return {source:source.source||'',sourceUrl:source.sourceUrl||source.url||source.sources?.[0]?.url||'',servingBasis:source.servingBasis||'',note:source.note||''}};
function finalized(records){const identities=new Set();for(const entry of records){const key=recordIdentity(entry.kind,entry.record);if(identities.has(key))throw Error('초안 안에 같은 내용의 기록이 두 번 있습니다. 음식·세트의 시각이나 양을 확인해 주세요.');identities.add(key);entry.record.id=`ai-${fingerprint(key)}`}return records}
let sdkPromise;
async function context(){
  if(!firebaseConfig)throw Error('Firebase 연결이 필요합니다.');
  if(!sdkPromise)sdkPromise=Promise.all([
    import('./vendor/firebase/firebase-app.js'),
    import('./vendor/firebase/firebase-auth.js'),
    import('./vendor/firebase/firebase-firestore.js')
  ]).then(([app,auth,fs])=>({app,auth,fs}));
  const sdk=await sdkPromise;
  const app=sdk.app.getApp(),user=sdk.auth.getAuth(app).currentUser;
  if(!user)throw Error('먼저 본인 계정으로 로그인해 주세요.');
  if(cloudState.approval!=='approved')throw Error('계정 이용 승인 후 AI 검토함을 사용할 수 있습니다.');
  return {...sdk,user,db:sdk.fs.getFirestore(app)};
}
export async function pairLocalAgent(port,code){
  const n=Number(port),secret=String(code??'').trim();
  if(!Number.isInteger(n)||n<1024||n>65535||!/^\d{8}$/.test(secret))throw Error('연결 도구에 표시된 포트와 8자리 코드를 입력해 주세요.');
  const ctx=await context(),idToken=await ctx.auth.getIdToken(ctx.user,true);
  const response=await fetch(`http://127.0.0.1:${n}/pair`,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({code:secret,uid:ctx.user.uid,idToken}),
    credentials:'omit',referrerPolicy:'no-referrer'
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok||result.ok!==true)throw Error(result.error||'로컬 AI 도구 연결에 실패했습니다. 포트·코드와 도구 실행 상태를 확인해 주세요.');
  return result;
}
export async function listAIDrafts(){
  const ctx=await context();
  const ref=ctx.fs.collection(ctx.db,'users',ctx.user.uid,'aiDrafts');
  const docs=await ctx.fs.getDocsFromServer(ref);
  return docs.docs.map(x=>({id:x.id,...x.data()})).filter(x=>TYPES.has(x.type)).sort((a,b)=>{
    const ta=a.createdAt?.toMillis?.()??0,tb=b.createdAt?.toMillis?.()??0;
    return tb-ta;
  });
}
function draftRecords(draft,reviewedData){
  if(!draft||!DRAFT_ID.test(draft.id)||!TYPES.has(draft.type))throw Error('AI 초안 형식이 올바르지 않습니다.');
  const raw=reviewedData??draft.parsedData;
  if(!raw||typeof raw!=='object')throw Error('AI가 작성한 수치가 없습니다.');
  if(draft.type==='meal'){
    if(!Array.isArray(raw.items)||raw.items.length<1||raw.items.length>30)throw Error('식사 음식은 1~30개여야 합니다.');
    return finalized(raw.items.map((item,i)=>{
      const aiEstimate=item.aiEstimate||null;
      const m=cleanMeal({...item,id:`ai-${draft.id}-${i}`,mealGroupId:`ai-${draft.id}`,source:aiEstimate?.estimated?'ai-estimated':'ai-reviewed',aiEvidence:evidenceFor(item,draft)});
      return {kind:'meals',record:m};
    }));
  }
  if(draft.type==='workout')return finalized([{kind:'workouts',record:cleanWorkout({...raw,id:`ai-${draft.id}`,sourceDraftId:`ai-${draft.id}`})}]);
  if(draft.type==='body')return finalized([{kind:'body',record:cleanBody({...raw,id:`ai-${draft.id}`,source:'ai-reviewed'})}]);
  if(draft.type==='food')return finalized([{kind:'foods',record:cleanFoodPreset({...raw,id:`ai-${draft.id}`,source:'ai-reviewed',aiEvidence:evidenceFor(raw,draft)})}]);
  if(draft.type==='machine'){
    const roles=new Set((draft.evidence?.photos||[]).map(x=>x?.role));
    if(!roles.has('whole')||!roles.has('nameplate'))throw Error('머신 전체와 명판 사진 두 장을 AI에게 제공해 주세요.');
    if(!raw.manufacturer||!raw.model||['모름','unknown',''].includes(String(raw.manufacturer).trim().toLowerCase())||['모름','unknown',''].includes(String(raw.model).trim().toLowerCase()))throw Error('제조사와 모델을 확인한 뒤 등록해 주세요.');
    return finalized([{kind:'machines',record:cleanMachine({...raw,id:`ai-${draft.id}`})}]);
  }
  return finalized([{kind:'customExercises',record:cleanCustomExercise({...raw,id:`ai-${draft.id}`})}]);
}
export function validateDraftRecords(draft,reviewedData){return draftRecords(draft,reviewedData)}
export async function resolveAIDraft(draft,{action,reviewedData=null}={}){
  if(!DRAFT_ID.test(draft?.id)||!['confirm','reject'].includes(action))throw Error('AI 초안 처리 방식을 확인해 주세요.');
  const ctx=await context(),draftRef=ctx.fs.doc(ctx.db,'users',ctx.user.uid,'aiDrafts',draft.id);
  let finalRecordIds=[];
  if(action==='confirm'){
    const proposed=draftRecords(draft,reviewedData),identities=new Set(proposed.map(entry=>recordIdentity(entry.kind,entry.record)));
    const snapshot=await ctx.fs.getDocsFromServer(ctx.fs.collection(ctx.db,'users',ctx.user.uid,'records'));
    for(const doc of snapshot.docs){const separator=doc.id.indexOf('~');if(separator<0)continue;const kind=doc.id.slice(0,separator),payload=doc.data().payload;if(typeof payload!=='string')continue;let existing;try{existing=JSON.parse(payload)}catch{continue}if(identities.has(recordIdentity(kind,existing)))throw Error('같은 내용의 기존 기록이 있습니다. 기존 기록을 수정하거나 초안의 날짜·시각·항목을 확인해 주세요.');}
  }
  await ctx.fs.runTransaction(ctx.db,async tx=>{
    const snap=await tx.get(draftRef);
    if(!snap.exists())throw Error('초안을 찾을 수 없습니다.');
    const current={id:snap.id,...snap.data()};
    if(current.status!=='pending')throw Error('이미 처리된 초안입니다. 목록을 새로고침해 주세요.');
    if(action==='reject'){
      tx.update(draftRef,{status:'rejected',reviewedData:{},finalRecordIds:[],reviewedAt:ctx.fs.serverTimestamp(),updatedAt:ctx.fs.serverTimestamp()});
      return;
    }
    const records=draftRecords(current,reviewedData);
    const refs=records.map(({kind,record})=>ctx.fs.doc(ctx.db,'users',ctx.user.uid,'records',`${kind}~${encodeURIComponent(record.id)}`));
    const existing=await Promise.all(refs.map(ref=>tx.get(ref)));
    if(existing.some(x=>x.exists()))throw Error('같은 AI 초안의 기록이 이미 있습니다. 목록을 새로고침해 주세요.');
    records.forEach(({record},i)=>tx.set(refs[i],{revision:1,payload:stableJSON(record),updatedAt:ctx.fs.serverTimestamp()}));
    finalRecordIds=records.map(({record})=>record.id);
    tx.update(draftRef,{status:'confirmed',reviewedData:reviewedData??current.parsedData,finalRecordIds,reviewedAt:ctx.fs.serverTimestamp(),updatedAt:ctx.fs.serverTimestamp()});
  });
  return finalRecordIds;
}
