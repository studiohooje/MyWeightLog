import assert from 'node:assert/strict';

const host=process.env.FIRESTORE_EMULATOR_HOST;
if(!host)throw Error('FIRESTORE_EMULATOR_HOST가 필요합니다.');
const project=process.env.GCLOUD_PROJECT||'demo-myweightlog';
const base=`http://${host}/v1/projects/${project}/databases/(default)/documents`;
const token=uid=>{
 const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
 const now=Math.floor(Date.now()/1000);
 return `${encode({alg:'none',typ:'JWT'})}.${encode({sub:uid,user_id:uid,email:`${uid}@example.com`,iat:now,exp:now+3600})}.`;
};
const get=async(path,uid)=>{
 const headers=uid?{Authorization:`Bearer ${token(uid)}`}:{},response=await fetch(`${base}/${path}`,{headers});
 return response.status;
};
const stringValue=value=>({stringValue:value});
const commit=async(uid,path,fields,transforms=[],exists=false,mask=null)=>{
 const response=await fetch(`${base}:commit`,{
  method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token(uid)}`},
  body:JSON.stringify({writes:[{update:{name:`projects/${project}/databases/(default)/documents/${path}`,fields},...(mask?{updateMask:{fieldPaths:mask}}:{}),currentDocument:{exists},updateTransforms:transforms.map(fieldPath=>({fieldPath,setToServerValue:'REQUEST_TIME'}))}]})
 });
 return {status:response.status,body:await response.text()};
};
const user='user-a',other='user-b';
const own=await get(`users/${user}/records/missing`,user);
const cross=await get(`users/${user}/records/missing`,other);
const guest=await get(`users/${user}/records/missing`);
assert.equal(own,403,`미승인 본인 읽기 결과: ${own}`);
assert.equal(cross,403,`타인 읽기 결과: ${cross}`);
assert.equal(guest,403,`비로그인 읽기 결과: ${guest}`);
const admin='x65cKbgpsQVk6oj7JIDnLVFDYtN2';
const profilePath=`users/${user}`;
const profile={uid:stringValue(user),email:stringValue(`${user}@example.com`),status:stringValue('pending')};
const applied=await commit(user,profilePath,profile,['createdAt','updatedAt','consentAt']);
assert.equal(applied.status,200,`가입 신청: ${applied.status} ${applied.body}`);
assert.equal(await get(profilePath,user),200);
assert.equal(await get(profilePath,other),403);
assert.equal(await get(`users/${user}/records/missing`,user),403);
const catalogPath='catalog/foods/items/food:test';
const item={id:stringValue('food:test'),name:stringValue('테스트 음식'),published:{booleanValue:true},revision:{integerValue:'1'}};
const deniedCatalog=await commit(user,catalogPath,item,['updatedAt']);
assert.equal(deniedCatalog.status,403,`일반 사용자 도감 쓰기: ${deniedCatalog.status} ${deniedCatalog.body}`);
const savedCatalog=await commit(admin,catalogPath,item,['updatedAt']);
assert.equal(savedCatalog.status,200,`관리자 도감 쓰기: ${savedCatalog.status} ${savedCatalog.body}`);
assert.equal(await get(catalogPath,user),403);
const approve=await commit(admin,profilePath,{status:stringValue('approved'),reviewerUid:stringValue(admin)},['reviewedAt','updatedAt'],true,['status','reviewerUid','reviewedAt','updatedAt']);
assert.equal(approve.status,200,`관리자 승인: ${approve.status} ${approve.body}`);
assert.equal(await get(`users/${user}/records/missing`,user),404);
assert.equal(await get(catalogPath,user),200);
assert.equal(await get(catalogPath),403);
const requestPath='catalogRequests/request-1';
const requestFields={type:stringValue('machine'),mode:stringValue('manual'),name:stringValue('레그프레스'),manufacturer:stringValue('테스트'),model:stringValue('LP-1'),gymName:stringValue('테스트 지점'),targetIds:{arrayValue:{values:[stringValue('quads')]}},note:stringValue(''),servingUnit:stringValue(''),servingQty:{nullValue:null},calories:{nullValue:null},carbs:{nullValue:null},protein:{nullValue:null},fat:{nullValue:null},requesterUid:stringValue(user),photoPath:stringValue(''),wholePhotoDataUrl:stringValue(''),nameplatePhotoDataUrl:stringValue(''),status:stringValue('pending'),adminNote:stringValue('')};
const savedRequest=await commit(user,requestPath,requestFields,['createdAt','updatedAt']);
assert.equal(savedRequest.status,200,`본인 요청 생성: ${savedRequest.status} ${savedRequest.body}`);
assert.equal(await get(requestPath,user),200);
assert.equal(await get(requestPath,other),403);
assert.equal(await get(requestPath,admin),200);
const reject=await commit(admin,profilePath,{status:stringValue('rejected'),reviewerUid:stringValue(admin)},['reviewedAt','updatedAt'],true,['status','reviewerUid','reviewedAt','updatedAt']);
assert.equal(reject.status,200,`관리자 반려: ${reject.status} ${reject.body}`);
assert.equal(await get(`users/${user}/records/missing`,user),403);
assert.equal(await get(catalogPath,user),403);
assert.equal(await get(requestPath,user),403);
console.log('Firestore 규칙: 미신청·대기·반려 사용자의 서버 기록·도감 차단, 승인 사용자만 본인 기록 허용');
console.log('Firestore 규칙: 관리자만 승인 상태 변경 및 공용 도감 작성, 요청자·관리자만 요청 열람');
