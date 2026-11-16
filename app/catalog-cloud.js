import {firebaseConfig} from './firebase-config.js';
import {cloudState} from './cloud-sync.js';

export const CATALOG_KINDS=Object.freeze(['foods','exercises','machineModels','gymLocations','gymMachines']);
const ADMIN_UID='x65cKbgpsQVk6oj7JIDnLVFDYtN2';
const REQUEST_STATUSES=Object.freeze(['pending','in_review','approved','rejected','needs_info']);
const REQUEST_TYPES=Object.freeze(['food','exercise','machine']);
const cleanText=(value,max=160)=>String(value??'').trim().slice(0,max);
const stableId=id=>typeof id==='string'&&/^[\p{L}\p{N}._: -]{1,120}$/u.test(id);
const hasObject=value=>value&&typeof value==='object'&&!Array.isArray(value);
const finiteNonnegative=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))&&Number(value)>=0;

export function mergeCatalogItems(base=[],overrides=[]){
 const merged=new Map();
 for(const item of base)if(stableId(item?.id))merged.set(item.id,{...item});
 for(const item of overrides)if(stableId(item?.id)){
  if(item.hidden===true){merged.delete(item.id);continue}
  merged.set(item.id,{...(merged.get(item.id)||{}),...item});
 }
 return [...merged.values()];
}

export function validateCatalogItem(kind,item){
 if(!CATALOG_KINDS.includes(kind)||!hasObject(item)||!stableId(item.id))throw Error('공용 도감 종류와 ID를 확인해 주세요.');
 const name=cleanText(item.name||item.model);
 if(!name)throw Error('공용 도감 이름을 입력해 주세요.');
 if(kind==='foods'){
  if(!finiteNonnegative(item.servingQty)||Number(item.servingQty)===0||!['g','개','회'].includes(item.servingUnit))throw Error('음식의 기준량과 단위를 확인해 주세요.');
  for(const key of ['calories','carbs','protein','fat'])if(!finiteNonnegative(item[key]))throw Error(`${key} 영양값을 확인해 주세요.`);
 }
 if(kind==='machineModels'&&!cleanText(item.manufacturer))throw Error('제조사를 입력해 주세요.');
 return {...item,name,published:true};
}

export function validateCatalogRequest(input){
 if(!hasObject(input)||!REQUEST_TYPES.includes(input.type)||!['photo','manual'].includes(input.mode))throw Error('등록 요청 방식을 확인해 주세요.');
 const name=cleanText(input.name),manufacturer=cleanText(input.manufacturer),model=cleanText(input.model);
 if(input.mode==='manual'&&!name&&!manufacturer&&!model)throw Error('종목 이름 또는 머신 정보를 입력해 주세요.');
 const targetIds=Array.isArray(input.targetIds)?[...new Set(input.targetIds.filter(x=>typeof x==='string'&&/^[a-z]{2,24}$/.test(x)))].slice(0,24):[];
 const numeric={};
 for(const key of ['servingQty','calories','carbs','protein','fat']){
  const value=input[key];
  if(value==null||value===''){numeric[key]=null;continue}
  if(!finiteNonnegative(value)||(key==='servingQty'&&Number(value)===0))throw Error(`${key} 값을 확인해 주세요.`);
  numeric[key]=Number(value);
 }
 const servingUnit=cleanText(input.servingUnit,3);
 if(servingUnit&&!['g','개','회'].includes(servingUnit))throw Error('음식 기준 단위를 확인해 주세요.');
 return {type:input.type,mode:input.mode,name,manufacturer,model,gymName:cleanText(input.gymName),targetIds,note:cleanText(input.note,1000),servingUnit,...numeric};
}

let sdkPromise;
async function sdk(){
 if(!firebaseConfig)throw Error('Firebase 연결 설정이 없습니다.');
 if(!sdkPromise)sdkPromise=Promise.all([
  import('./vendor/firebase/firebase-app.js'),
  import('./vendor/firebase/firebase-auth.js'),
  import('./vendor/firebase/firebase-firestore.js'),
  import('./vendor/firebase/firebase-storage.js')
 ]).then(([app,auth,db,storage])=>({app,auth,db,storage})).catch(error=>{sdkPromise=null;throw error});
 return sdkPromise;
}
async function context(){
 const modules=await sdk();
 let app;
 try{app=modules.app.getApp()}catch{throw Error('계정 연결이 아직 준비되지 않았습니다.')}
 const auth=modules.auth.getAuth(app),user=auth.currentUser;
 if(!user)throw Error('공용 도감을 사용하려면 먼저 로그인해 주세요.');
 if(cloudState.approval!=='approved')throw Error('계정 이용 승인 후 공용 도감과 등록 요청을 사용할 수 있습니다.');
 return {...modules,app,user,firestore:modules.db.getFirestore(app)};
}

export function isCatalogAdmin(user){return (user?.uid||'')===ADMIN_UID}

export async function loadSharedCatalog(){
 const result=Object.fromEntries(CATALOG_KINDS.map(kind=>[kind,[]]));
 if(!firebaseConfig)return {...result,error:'Firebase 연결 설정이 없습니다.'};
 let ctx;
 try{ctx=await context()}catch(error){return {...result,error:error.message}}
 try{
  await Promise.all(CATALOG_KINDS.map(async kind=>{
   const ref=ctx.db.collection(ctx.firestore,'catalog',kind,'items');
   const query=ctx.db.query(ref,ctx.db.where('published','==',true));
   const snapshot=await ctx.db.getDocsFromServer(query);
   result[kind]=snapshot.docs.map(doc=>({id:doc.id,...doc.data()}));
  }));
  return {...result,error:''};
 }catch(error){return {...result,error:`공용 도감을 불러오지 못했습니다: ${error.message||'연결 오류'}`}}
}

export async function saveSharedCatalogItem(kind,input){
 const item=validateCatalogItem(kind,input),ctx=await context();
 if(!isCatalogAdmin(ctx.user))throw Error('관리자 계정만 공용 도감을 수정할 수 있습니다.');
 const ref=ctx.db.doc(ctx.firestore,'catalog',kind,'items',item.id);
 await ctx.db.runTransaction(ctx.firestore,async tx=>{
  const before=await tx.get(ref);
  tx.set(ref,{...item,revision:(before.exists()?before.data().revision:0)+1,updatedAt:ctx.db.serverTimestamp()});
 });
 return item.id;
}

export async function submitCatalogRequest(input,photoFile){
 const request=validateCatalogRequest(input),ctx=await context();
 if(request.mode==='photo'||photoFile)throw Error('사진 등록 요청은 서버 사진 저장 준비 후 사용할 수 있습니다. 지금은 직접 입력으로 요청해 주세요.');
 if(request.mode==='photo'&&!photoFile)throw Error('사진 요청에는 머신 사진을 첨부해 주세요.');
 if(photoFile&&(!['image/jpeg','image/png','image/webp'].includes(photoFile.type)||photoFile.size>5*1024*1024||photoFile.size===0))throw Error('5MB 이하 JPEG·PNG·WebP 사진을 선택해 주세요.');
 const id=globalThis.crypto?.randomUUID?.()??`request-${Date.now()}`;
 const ref=ctx.db.doc(ctx.firestore,'catalogRequests',id);
 let photoRef=null,photoPath='';
 try{
  if(photoFile){
   photoPath=`catalogRequests/${ctx.user.uid}/${id}/photo`;
   photoRef=ctx.storage.ref(ctx.storage.getStorage(ctx.app),photoPath);
   await ctx.storage.uploadBytes(photoRef,photoFile,{contentType:photoFile.type});
  }
  await ctx.db.setDoc(ref,{...request,requesterUid:ctx.user.uid,photoPath,status:'pending',adminNote:'',createdAt:ctx.db.serverTimestamp(),updatedAt:ctx.db.serverTimestamp()});
  return id;
 }catch(error){
  if(photoRef)try{await ctx.storage.deleteObject(photoRef)}catch{}
  throw error;
 }
}

export async function listCatalogRequests({admin=false}={}){
 const ctx=await context();
 if(admin&&!isCatalogAdmin(ctx.user))throw Error('관리자 계정만 전체 요청을 볼 수 있습니다.');
 const ref=ctx.db.collection(ctx.firestore,'catalogRequests');
 const query=admin?ref:ctx.db.query(ref,ctx.db.where('requesterUid','==',ctx.user.uid));
 const snapshot=await ctx.db.getDocsFromServer(query);
 return snapshot.docs.map(doc=>({id:doc.id,...doc.data()}));
}

export async function reviewCatalogRequest(id,{status,note=''}){
 const ctx=await context();
 if(!isCatalogAdmin(ctx.user))throw Error('관리자 계정만 요청을 검토할 수 있습니다.');
 if(!stableId(id)||!REQUEST_STATUSES.includes(status)||status==='pending')throw Error('요청 상태를 확인해 주세요.');
 await ctx.db.updateDoc(ctx.db.doc(ctx.firestore,'catalogRequests',id),{status,adminNote:cleanText(note,1000),reviewerUid:ctx.user.uid,updatedAt:ctx.db.serverTimestamp()});
}

export async function catalogRequestPhoto(path){
 const ctx=await context();
 if(!path||!/^catalogRequests\/[^/]+\/[^/]+\/photo$/.test(path))throw Error('사진 경로를 확인해 주세요.');
 return ctx.storage.getDownloadURL(ctx.storage.ref(ctx.storage.getStorage(ctx.app),path));
}
