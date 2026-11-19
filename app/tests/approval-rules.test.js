import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment, assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import {collection,doc,getDoc,getDocs,setDoc,updateDoc,serverTimestamp,runTransaction} from 'firebase/firestore';

const projectId='myweightlog-approval-rules-test';
const adminUid='x65cKbgpsQVk6oj7JIDnLVFDYtN2';
const memberUid='approved-member';
const pendingUid='pending-member';
const otherUid='other-member';
const host=process.env.FIRESTORE_EMULATOR_HOST;

test('approval gates server health records and shared catalogs', {skip:!host}, async()=>{
  const rules=await readFile(new URL('../firestore.rules',import.meta.url),'utf8');
  const [emulatorHost,portText]=host.split(':');
  const env=await initializeTestEnvironment({projectId,firestore:{host:emulatorHost,port:Number(portText),rules}});
  try{
    const admin=env.authenticatedContext(adminUid,{email:'studiohooje@gmail.com'}).firestore();
    const pending=env.authenticatedContext(pendingUid,{email:'pending@example.test'}).firestore();
    const member=env.authenticatedContext(memberUid,{email:'approved@example.test'}).firestore();
    const other=env.authenticatedContext(otherUid,{email:'other@example.test'}).firestore();
    const guest=env.unauthenticatedContext().firestore();
    const profile=(db,uid)=>doc(db,'users',uid);
    const record=(db,uid)=>doc(db,'users',uid,'records','settings');
    const catalog=db=>doc(db,'catalog','foods','items','test-food');

    await assertFails(getDoc(profile(guest,pendingUid)));
    await assertSucceeds(setDoc(profile(pending,pendingUid),{
      uid:pendingUid,email:'pending@example.test',status:'pending',
      consentAt:serverTimestamp(),createdAt:serverTimestamp(),updatedAt:serverTimestamp()
    }));
    await assertFails(setDoc(profile(other,otherUid),{
      uid:otherUid,email:'forged@example.test',status:'approved',
      consentAt:serverTimestamp(),createdAt:serverTimestamp(),updatedAt:serverTimestamp()
    }));
    await assertSucceeds(getDoc(profile(pending,pendingUid)));
    await assertFails(getDocs(collection(pending,'users')));
    await assertFails(getDoc(record(pending,pendingUid)));
    await assertFails(setDoc(record(pending,pendingUid),{revision:1,payload:'{}',updatedAt:serverTimestamp()}));
    await assertFails(getDoc(catalog(pending)));
    await assertFails(getDocs(collection(pending,'catalogRequests')));

    await assertSucceeds(getDocs(collection(admin,'users')));
    await assertSucceeds(updateDoc(profile(admin,pendingUid),{
      status:'approved',reviewerUid:adminUid,reviewedAt:serverTimestamp(),updatedAt:serverTimestamp()
    }));
    await assertSucceeds(setDoc(profile(member,memberUid),{
      uid:memberUid,email:'approved@example.test',status:'pending',
      consentAt:serverTimestamp(),createdAt:serverTimestamp(),updatedAt:serverTimestamp()
    }));
    await assertSucceeds(updateDoc(profile(admin,memberUid),{
      status:'approved',reviewerUid:adminUid,reviewedAt:serverTimestamp(),updatedAt:serverTimestamp()
    }));
    await assertSucceeds(setDoc(record(pending,pendingUid),{revision:1,payload:'{}',updatedAt:serverTimestamp()}));
    await assertSucceeds(getDoc(record(pending,pendingUid)));
    await assertFails(getDoc(record(member,pendingUid)));
    await assertFails(getDoc(record(admin,pendingUid)));
    const requestId='machine-photo-request';
    const requestRef=(db)=>doc(db,'catalogRequests',requestId);
    const image='data:image/jpeg;base64,AA==';
    const requestData={type:'machine',mode:'photo',name:'레그프레스',manufacturer:'예시 제조사',model:'LP-1',gymName:'예시 지점',targetIds:[],note:'',servingQty:null,servingUnit:'',calories:null,carbs:null,protein:null,fat:null,requesterUid:memberUid,photoPath:'',wholePhotoDataUrl:image,nameplatePhotoDataUrl:image,status:'pending',adminNote:'',createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
    await assertFails(setDoc(requestRef(member),{...requestData,nameplatePhotoDataUrl:''}));
    await assertFails(setDoc(requestRef(member),{...requestData,nameplatePhotoDataUrl:'data:text/html;base64,AA=='}));
    await assertSucceeds(setDoc(requestRef(member),requestData));
    await assertSucceeds(getDoc(requestRef(member)));
    await assertSucceeds(getDoc(requestRef(admin)));
    await assertFails(getDoc(requestRef(pending)));
    await assertFails(getDoc(requestRef(other)));
    const draftId='draft-account-boundary';
    const draft=(db,uid)=>doc(db,'users',uid,'aiDrafts',draftId);
    const draftData={id:draftId,requestId:draftId,type:'meal',status:'pending',schemaVersion:1,sourceModel:'test',originalUtterance:'식사 기록',parsedData:{items:[]},uncertainty:{},evidence:{},createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
    await assertSucceeds(setDoc(draft(member,memberUid),draftData));
    await assertSucceeds(setDoc(draft(pending,pendingUid),draftData));
    await assertSucceeds(getDoc(draft(pending,pendingUid)));
    await assertFails(getDoc(draft(member,pendingUid)));
    await assertFails(getDoc(draft(pending,memberUid)));
    await assertFails(getDoc(draft(admin,pendingUid)));
    await assertFails(setDoc(draft(pending,pendingUid),{...draftData,status:'confirmed'}));
    await assertSucceeds(updateDoc(draft(pending,pendingUid),{status:'confirmed',reviewedData:{items:[]},finalRecordIds:['meal-1'],reviewedAt:serverTimestamp(),updatedAt:serverTimestamp()}));
    await assertFails(updateDoc(draft(pending,pendingUid),{status:'rejected',reviewedAt:serverTimestamp(),updatedAt:serverTimestamp()}));
    const transactionDraft='draft-transaction';
    const aiRef=doc(member,'users',memberUid,'aiDrafts',transactionDraft);
    const mealRef=doc(member,'users',memberUid,'records','meals~ai-draft-transaction-0');
    await assertSucceeds(setDoc(aiRef,{...draftData,id:transactionDraft,requestId:transactionDraft}));
    await assertSucceeds(runTransaction(member,async tx=>{
      const current=await tx.get(aiRef),existing=await tx.get(mealRef);
      assert.equal(current.data().status,'pending');assert.equal(existing.exists(),false);
      tx.set(mealRef,{revision:1,payload:'{"id":"ai-draft-transaction-0"}',updatedAt:serverTimestamp()});
      tx.update(aiRef,{status:'confirmed',reviewedData:{items:[]},finalRecordIds:['ai-draft-transaction-0'],reviewedAt:serverTimestamp(),updatedAt:serverTimestamp()});
    }));
    assert.equal((await getDoc(aiRef)).data().status,'confirmed');
    assert.equal((await getDoc(mealRef)).exists(),true);
    await assertFails(updateDoc(profile(pending,pendingUid),{status:'approved'}));

    await assertSucceeds(updateDoc(profile(admin,pendingUid),{
      status:'rejected',reviewerUid:adminUid,reviewedAt:serverTimestamp(),updatedAt:serverTimestamp()
    }));
    await assertFails(getDoc(record(pending,pendingUid)));
    await assertFails(setDoc(record(pending,pendingUid),{revision:2,payload:'{}',updatedAt:serverTimestamp()}));
    assert.equal((await getDoc(profile(pending,pendingUid))).data().status,'rejected');
  }finally{await env.cleanup()}
});
