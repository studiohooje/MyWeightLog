import {firebaseConfig} from './firebase-config.js';
import {cleanBody,cleanMeal,cleanWorkout,cleanFoodPreset,cleanMachine,cleanCustomExercise} from './domain.js';
import {stableJSON} from './cloud-model.js';
import {cloudState} from './cloud-sync.js';

const TYPES=new Set(['meal','workout','body','food','machine','exercise']);
const DRAFT_ID=/^[A-Za-z0-9_-]{1,100}$/;
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
    return raw.items.map((item,i)=>{
      const aiEstimate=item.aiEstimate||null;
      const m=cleanMeal({...item,id:`ai-${draft.id}-${i}`,mealGroupId:`ai-${draft.id}`,source:aiEstimate?.estimated?'ai-estimated':'ai-reviewed'});
      if(aiEstimate?.estimated)m.aiEstimate=aiEstimate;
      return {kind:'meals',record:m};
    });
  }
  if(draft.type==='workout')return [{kind:'workouts',record:cleanWorkout({...raw,id:`ai-${draft.id}`,sourceDraftId:`ai-${draft.id}`})}];
  if(draft.type==='body')return [{kind:'body',record:cleanBody({...raw,id:`ai-${draft.id}`,source:'ai-reviewed'})}];
  if(draft.type==='food')return [{kind:'foods',record:cleanFoodPreset({...raw,id:`ai-${draft.id}`,source:'ai-reviewed'})}];
  if(draft.type==='machine'){
    const roles=new Set((draft.evidence?.photos||[]).map(x=>x?.role));
    if(!roles.has('whole')||!roles.has('nameplate'))throw Error('머신 전체와 명판 사진 두 장을 AI에게 제공해 주세요.');
    if(!raw.manufacturer||!raw.model||['모름','unknown',''].includes(String(raw.manufacturer).trim().toLowerCase())||['모름','unknown',''].includes(String(raw.model).trim().toLowerCase()))throw Error('제조사와 모델을 확인한 뒤 등록해 주세요.');
    return [{kind:'machines',record:cleanMachine({...raw,id:`ai-${draft.id}`})}];
  }
  return [{kind:'customExercises',record:cleanCustomExercise({...raw,id:`ai-${draft.id}`})}];
}
export function validateDraftRecords(draft,reviewedData){return draftRecords(draft,reviewedData)}
export async function resolveAIDraft(draft,{action,reviewedData=null}={}){
  if(!DRAFT_ID.test(draft?.id)||!['confirm','reject'].includes(action))throw Error('AI 초안 처리 방식을 확인해 주세요.');
  const ctx=await context(),draftRef=ctx.fs.doc(ctx.db,'users',ctx.user.uid,'aiDrafts',draft.id);
  let finalRecordIds=[];
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
