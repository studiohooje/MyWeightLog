import {firebaseConfig} from './firebase-config.js';
import {scopedKey,setStorageAccount,storageAccount} from './storage-scope.js';
import {cloudRecords,planSync,recordsToDB,validRecordKey} from './cloud-model.js';
import {STORAGE_KEY,RESTORE_PENDING_KEY} from './store.js';
let auth, authSDK, firestore, fsSDK;
export const cloudState = {configured:!!firebaseConfig,user:null,error:'',native:!!globalThis.Capacitor?.isNativePlatform?.(),conflicts:[]};
export async function initializeCloud() {
  if (!firebaseConfig || cloudState.native || typeof window === 'undefined') return;
  let timeout;
  try {
    const sdk = await Promise.race([Promise.all([
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js')
    ]),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('timeout')),8000)})]);
    clearTimeout(timeout);
    authSDK=sdk[1];fsSDK=sdk[2];
    const app=sdk[0].initializeApp(firebaseConfig);
    auth=authSDK.initializeAuth(app,{persistence:authSDK.browserSessionPersistence,popupRedirectResolver:authSDK.browserPopupRedirectResolver});
    await auth.authStateReady();
    cloudState.user=auth.currentUser;
    setStorageAccount(auth.currentUser?.uid || '');
    firestore=fsSDK.getFirestore(app);
    // Cross-tab auth changes never leave a previous user's records on the screen.
    authSDK.onAuthStateChanged(auth,user=>{if((user?.uid||'')!==storageAccount())location.reload();});
  } catch { cloudState.error='서버 연결을 준비하지 못했습니다. 로컬 기록은 계속 사용할 수 있습니다.'; }
  finally { clearTimeout(timeout); }
}
export async function cloudLogin() {
  if (!auth) throw Error(cloudState.native?'Android 앱 로그인은 아직 지원하지 않습니다. 공개 웹페이지를 Chrome에서 이용해 주세요.':'Firebase 연결 설정 또는 네트워크를 확인해 주세요.');
  const provider=new authSDK.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
  await authSDK.signInWithPopup(auth,provider);location.reload();
}
export async function cloudLogout() { if(auth)await authSDK.signOut(auth);location.reload(); }
export function syncMetadata() {
  const raw=localStorage.getItem(scopedKey('myweightlog.cloud.baseline'));
  if(!raw)return {};
  try{
    const value=JSON.parse(raw);
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!validRecordKey(k))||Object.values(value).some(x=>!x||!Number.isInteger(x.revision)||x.revision<1||!(x.payload===null||typeof x.payload==='string')))throw Error();
    return value;
  }catch{throw Error('동기화 기준 기록이 손상됐습니다. 원본을 보존하고 복구가 필요합니다.');}
}
export async function synchronize(db, save, choices={}) {
  const user=auth?.currentUser;
  if(!user||user.uid!==storageAccount())throw Error('먼저 로그인해 주세요.');
  const scope=storageAccount(), current=cloudRecords(db), baseline=syncMetadata();
  const originalRaw=localStorage.getItem(STORAGE_KEY), originalBaseline=localStorage.getItem(scopedKey('myweightlog.cloud.baseline'));
  const checkLocal=()=>{
    if(localStorage.getItem(STORAGE_KEY)!==originalRaw||localStorage.getItem(scopedKey('myweightlog.cloud.baseline'))!==originalBaseline||localStorage.getItem(RESTORE_PENDING_KEY))throw Error('다른 탭에서 기록이 변경됐습니다. 페이지를 새로 열고 다시 동기화해 주세요.');
  };
  const collection=fsSDK.collection(firestore,'users',scope,'records');
  const snapshot=await fsSDK.getDocsFromServer(collection), remote={};
  snapshot.forEach(doc=>{
    const value=doc.data();
    if(!validRecordKey(doc.id)||!Number.isInteger(value.revision)||value.revision<1||!(typeof value.payload==='string'||value.payload===null))throw Error('서버 기록 형식을 확인해 주세요.');
    remote[doc.id]={revision:value.revision,payload:value.payload};
  });
  const plan=planSync(current,remote,baseline,choices);
  cloudState.conflicts=plan.conflicts;
  if(plan.conflicts.length)return {conflicts:plan.conflicts};
  const next=recordsToDB(plan.merged,db);
  if(plan.writes.length>450)throw Error('한 번에 변경할 기록이 너무 많습니다. 현재 기록을 백업한 뒤 관리자에게 문의해 주세요.');
  // Preserve both original sides before any server write or local replacement.
  checkLocal();
  localStorage.setItem(scopedKey('myweightlog.cloud.before-sync'),JSON.stringify({date:new Date().toISOString(),local:db,remote}));
  if(plan.writes.length)await fsSDK.runTransaction(firestore,async tx=>{
    const refs=plan.writes.map(w=>fsSDK.doc(collection,w.key));
    const docs=await Promise.all(refs.map(ref=>tx.get(ref)));
    for(let i=0;i<docs.length;i++)if((docs[i].exists()?docs[i].data().revision:0)!==plan.writes[i].expectedRevision)throw Error('다른 기기에서 기록을 수정했습니다. 다시 동기화하고 변경 내용을 확인해 주세요.');
    for(let i=0;i<refs.length;i++){
      const w=plan.writes[i];
      tx.set(refs[i],{revision:w.expectedRevision+1,payload:w.payload,updatedAt:fsSDK.serverTimestamp()});
    }
  });
  if(auth.currentUser?.uid!==scope||storageAccount()!==scope)throw Error('계정이 변경되어 로컬 반영을 중단했습니다.');
  checkLocal();
  save(next);
  const mergedBaseline={...remote};
  for(const w of plan.writes)mergedBaseline[w.key]={payload:w.payload,revision:w.expectedRevision+1};
  localStorage.setItem(scopedKey('myweightlog.cloud.baseline'),JSON.stringify(mergedBaseline));
  localStorage.setItem(scopedKey('myweightlog.cloud.last-sync'),new Date().toISOString());
  cloudState.conflicts=[];
  return {db:next,conflicts:[]};
}
