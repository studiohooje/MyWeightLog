import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeCatalogItems,validateCatalogItem,validateCatalogRequest,loadSharedCatalog,isCatalogAdmin,compressRequestPhoto} from '../catalog-cloud.js';
import {machineFormHTML} from '../profile-forms.js';

test('공용 도감 수정값은 소스 기본값보다 우선하고 숨긴 항목은 제외한다',()=>{
 const baseline=[{id:'food:a',name:'베이글',calories:200},{id:'food:b',name:'빵',calories:150}];
 assert.deepEqual(mergeCatalogItems(baseline,[{id:'food:a',calories:210},{id:'food:b',hidden:true}]),[{id:'food:a',name:'베이글',calories:210}]);
 assert.equal(mergeCatalogItems(baseline,[])[0].calories,200);
});

test('음식 영양값과 등록 요청을 제출 전에 검증한다',()=>{
 const food=validateCatalogItem('foods',{id:'food:zerohack',name:'제로핵 베이글',servingQty:1,servingUnit:'개',calories:190,carbs:20,protein:10,fat:5});
 assert.equal(food.published,true);
 assert.throws(()=>validateCatalogItem('foods',{...food,protein:-1}),/protein/);
 assert.throws(()=>validateCatalogItem('foods',{...food,protein:null}),/protein/);
 assert.throws(()=>validateCatalogItem('foods',{...food,calories:''}),/calories/);
 assert.throws(()=>validateCatalogItem('foods',{...food,servingQty:0}),/기준량/);
 assert.deepEqual(validateCatalogRequest({type:'machine',mode:'photo',targetIds:['chest','chest','unknown-id!']}),{type:'machine',mode:'photo',name:'',manufacturer:'',model:'',gymName:'',targetIds:['chest'],note:'',servingUnit:'',servingQty:null,calories:null,carbs:null,protein:null,fat:null});
 assert.equal(validateCatalogRequest({type:'food',mode:'manual',name:'베이글',servingQty:'1',servingUnit:'개',calories:'190'}).calories,190);
 assert.throws(()=>validateCatalogRequest({type:'machine',mode:'manual'}),/정보/);
});

test('로그인 전 공용 도감 조회는 앱을 중단하지 않고 빈 목록과 오류를 돌려준다',async()=>{
 const data=await loadSharedCatalog();
 assert.deepEqual(data.foods,[]);assert.deepEqual(data.exercises,[]);assert.match(data.error,/로그인|준비/);
 assert.equal(isCatalogAdmin({uid:'someone-else'}),false);
});

test('머신 등록 사진은 작은 JPEG 데이터로 압축하고 파일 형식을 검사한다',async()=>{
 const oldBitmap=globalThis.createImageBitmap,oldDocument=globalThis.document;
 let closed=false;
 globalThis.createImageBitmap=async()=>({width:1200,height:800,close(){closed=true}});
 globalThis.document={createElement:()=>({getContext:()=>({drawImage(){}}),toDataURL:()=>`data:image/jpeg;base64,${'A'.repeat(120)}`})};
 try{
  const value=await compressRequestPhoto({type:'image/png',size:1024});
  assert.match(value,/^data:image\/jpeg;base64,/);
  assert.equal(closed,true);
  await assert.rejects(compressRequestPhoto({type:'text/plain',size:12}),/JPEG/);
 }finally{globalThis.createImageBitmap=oldBitmap;globalThis.document=oldDocument}
});

test('머신 별칭은 수정 화면에서 다시 보여준다',()=>{
 const html=machineFormHTML({name:'V스쿼트',aliases:['안산점 하체','브이 스쿼트']});
 assert.match(html,/name="aliases"/);
 assert.match(html,/안산점 하체, 브이 스쿼트/);
});
