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
  import('./vendor/firebase/firebase-firestore.js')
 ]).then(([app,auth,db])=>({app,auth,db})).catch(error=>{sdkPromise=null;throw error});
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

export async function compressRequestPhoto(file){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size===0||file.size>10*1024*1024)throw Error('10MB 이하 JPEG·PNG·WebP 사진을 선택해 주세요.');
 if(typeof createImageBitmap!=='function'||typeof document==='undefined')throw Error('이 브라우저에서 사진 압축을 지원하지 않습니다. 다른 브라우저에서 다시 시도해 주세요.');
 const bitmap=await createImageBitmap(file);
 try{
  for(const size of [640,560,480,400,320]){
   const ratio=Math.min(1,size/Math.max(bitmap.width,bitmap.height));
   const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));
   canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
   for(const quality of [.7,.55,.4]){const data=canvas.toDataURL('image/jpeg',quality);if(data.length<=180000)return data}
  }
 }finally{bitmap.close()}
 throw Error('사진을 충분히 줄일 수 없습니다. 다른 사진을 선택해 주세요.');
}

export async function submitCatalogRequest(input,photos={}){
 const request=validateCatalogRequest(input),ctx=await context();
 if(request.mode==='photo'&&request.type!=='machine')throw Error('사진 등록 요청은 머신에만 사용할 수 있습니다.');
 if(request.mode==='photo'&&(!photos?.whole||!photos?.nameplate))throw Error('머신 전체 사진과 명판 사진 두 장을 선택해 주세요.');
 const wholePhotoDataUrl=request.mode==='photo'?await compressRequestPhoto(photos.whole):'';
 const nameplatePhotoDataUrl=request.mode==='photo'?await compressRequestPhoto(photos.nameplate):'';
 const id=globalThis.crypto?.randomUUID?.()??`request-${Date.now()}`;
 const ref=ctx.db.doc(ctx.firestore,'catalogRequests',id);
 await ctx.db.setDoc(ref,{...request,requesterUid:ctx.user.uid,photoPath:'',wholePhotoDataUrl,nameplatePhotoDataUrl,status:'pending',adminNote:'',createdAt:ctx.db.serverTimestamp(),updatedAt:ctx.db.serverTimestamp()});
 return id;
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
 if(!stableId(path))throw Error('사진 요청 ID를 확인해 주세요.');
 const snapshot=await ctx.db.getDocFromServer(ctx.db.doc(ctx.firestore,'catalogRequests',path));
 if(!snapshot.exists())throw Error('사진 요청을 찾지 못했습니다.');
 const item=snapshot.data();
 if(!isCatalogAdmin(ctx.user)&&item.requesterUid!==ctx.user.uid)throw Error('내 사진 요청만 볼 수 있습니다.');
 return {whole:item.wholePhotoDataUrl||'',nameplate:item.nameplatePhotoDataUrl||''};
}
