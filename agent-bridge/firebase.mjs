import {draftId,firestoreValue,fromDocument,normalizeText,validateDraft} from './contract.mjs';

const API_KEY='AIzaSyC6T7zkxawqql3qz1JYl_Ye9nbtBNef1hE';
const PROJECT='myweightlog-b7ae7';
const base=`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const documentName=(uid,path)=>`projects/${PROJECT}/databases/(default)/documents/users/${encodeURIComponent(uid)}/${path}`;

async function responseJSON(response){
 const body=await response.json().catch(()=>({}));
 if(!response.ok){const message=body?.error?.message||`HTTP ${response.status}`;const error=Error(`마웨로그 서버 요청 실패: ${message}`);error.status=response.status;throw error}
 return body;
}
export async function verifyUserToken(token,uid,{fetcher=fetch}={}){
 if(typeof token!=='string'||token.length<100||typeof uid!=='string'||!uid)throw Error('계정 연결 정보가 올바르지 않습니다.');
 const url=`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`;
 const data=await responseJSON(await fetcher(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:token})}));
 if(data.users?.[0]?.localId!==uid)throw Error('마웨로그 로그인 계정이 일치하지 않습니다.');
 const segment=token.split('.')[1];
 let claims;try{claims=JSON.parse(Buffer.from(segment,'base64url').toString('utf8'))}catch{throw Error('로그인 토큰 형식이 올바르지 않습니다.')}
 if(claims.aud!==PROJECT||Number(claims.exp)*1000<Date.now()+30000)throw Error('마웨로그 로그인 시간이 만료됐습니다. 다시 연결해 주세요.');
 return {uid,expiresAt:new Date(Number(claims.exp)*1000).toISOString()};
}

export class FirestoreBridge{
 constructor({fetcher=fetch}={}){this.fetcher=fetcher;this.session=null}
 setSession(session){this.session=session}
 clearSession(){this.session=null}
 requireSession(){if(!this.session)throw Error('마웨로그 앱에서 AI 연결을 먼저 완료해 주세요.');if(Date.parse(this.session.expiresAt)<Date.now()+10000){this.clearSession();throw Error('AI 연결 시간이 만료됐습니다. 앱에서 다시 연결해 주세요.')}return this.session}
 async request(url,options={}){const session=this.requireSession();const response=await this.fetcher(url,{...options,headers:{Authorization:`Bearer ${session.idToken}`,...options.headers}});if(response.status===401){this.clearSession();throw Error('AI 연결 시간이 만료됐습니다. 앱에서 다시 연결해 주세요.')}return responseJSON(response)}
 async listCollection(path,{pageSize=300,max=1500}={}){
  const out=[];let token='';
  do{
   const url=new URL(`${base}/${path}`);url.searchParams.set('pageSize',String(Math.min(pageSize,max-out.length)));if(token)url.searchParams.set('pageToken',token);
   const result=await this.request(url.toString());out.push(...(result.documents||[]).map(doc=>({documentId:doc.name.split('/').at(-1),...fromDocument(doc)})));token=result.nextPageToken||'';
  }while(token&&out.length<max);
  return out;
 }
 async listPublishedCatalog(kind){
  const body={structuredQuery:{from:[{collectionId:'items'}],where:{fieldFilter:{field:{fieldPath:'published'},op:'EQUAL',value:{booleanValue:true}}},limit:500}};
  const result=await this.request(`${base}/catalog/${encodeURIComponent(kind)}:runQuery`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  return (Array.isArray(result)?result:[]).filter(row=>row.document).map(row=>({id:row.document.name.split('/').at(-1),...fromDocument(row.document)}));
 }
 async searchRecords({query='',kind='all',limit=20}={}){
  const {uid}=this.requireSession();const term=normalizeText(query);
  if(term.length<2)throw Error('검색어는 두 글자 이상 입력해 주세요.');
  const kinds=['foods','machines','customExercises','meals','workouts'];if(kind!=='all'&&!kinds.includes(kind))throw Error('검색 종류를 확인해 주세요.');
  const [records,sharedFoods,sharedExercises,sharedMachines]=await Promise.all([
   this.listCollection(`users/${encodeURIComponent(uid)}/records`),
   kind==='all'||kind==='foods'?this.listPublishedCatalog('foods'):[],
   kind==='all'||kind==='customExercises'?this.listPublishedCatalog('exercises'):[],
   kind==='all'||kind==='machines'?this.listPublishedCatalog('machineModels'):[]
  ]);
  const result=[];
  for(const row of records){const split=row.documentId.indexOf('~');if(split<0)continue;const category=row.documentId.slice(0,split);if(!kinds.includes(category)||kind!=='all'&&kind!==category||typeof row.payload!=='string')continue;let entry;try{entry=JSON.parse(row.payload)}catch{continue}const values=[entry.name,entry.title,entry.model,entry.manufacturer,entry.gymName,...(entry.aliases||[])].map(normalizeText);if(values.some(value=>value.includes(term)))result.push({kind:category,scope:'mine',id:entry.id,name:entry.name||entry.title||entry.model,manufacturer:entry.manufacturer||'',model:entry.model||'',gymName:entry.gymName||'',aliases:entry.aliases||[],servingUnit:entry.servingUnit,calories:entry.calories,carbs:entry.carbs,protein:entry.protein,fat:entry.fat});}
  for(const [category,entries] of [['foods',sharedFoods],['customExercises',sharedExercises],['machines',sharedMachines]])for(const entry of entries){const values=[entry.name,entry.model,entry.manufacturer,...(entry.aliases||[])].map(normalizeText);if(values.some(value=>value.includes(term)))result.push({kind:category,scope:'shared',id:entry.id,name:entry.name,manufacturer:entry.manufacturer||'',model:entry.model||'',servingQty:entry.servingQty,servingUnit:entry.servingUnit,calories:entry.calories,carbs:entry.carbs,protein:entry.protein,fat:entry.fat});}
  return {results:result.slice(0,Math.min(50,Math.max(1,Number(limit)||20))),truncated:result.length>limit,checked:records.length};
 }
 async createDraft(input){
  const {uid}=this.requireSession();const draft=validateDraft(input),id=draftId(uid,input.requestId);
  const fields={id,requestId:id,type:draft.type,status:'pending',schemaVersion:1,sourceModel:draft.sourceModel,originalUtterance:draft.originalUtterance,parsedData:draft.parsedData,uncertainty:draft.uncertainty,evidence:draft.evidence};
  const name=documentName(uid,`aiDrafts/${id}`);
  const body={writes:[{update:{name,fields:Object.fromEntries(Object.entries(fields).map(([key,value])=>[key,firestoreValue(value)]))},currentDocument:{exists:false},updateTransforms:[{fieldPath:'createdAt',setToServerValue:'REQUEST_TIME'},{fieldPath:'updatedAt',setToServerValue:'REQUEST_TIME'}]}]};
  try{await this.request(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:commit`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})}
  catch(error){if(error.status!==409&&error.status!==400)throw error;const existing=await this.request(`${base}/users/${encodeURIComponent(uid)}/aiDrafts/${id}`).catch(()=>null);if(!existing)throw error;const data=fromDocument(existing);if(data.requestId!==id)throw error;return {id,status:data.status,duplicate:true}}
  return {id,status:'pending',duplicate:false};
 }
 async listDrafts({limit=20}={}){const {uid}=this.requireSession();const rows=await this.listCollection(`users/${encodeURIComponent(uid)}/aiDrafts`,{max:300});return rows.sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))).slice(0,Math.min(50,Math.max(1,Number(limit)||20))).map(row=>({id:row.id,type:row.type,status:row.status,createdAt:row.createdAt,originalUtterance:row.originalUtterance}));}
}
