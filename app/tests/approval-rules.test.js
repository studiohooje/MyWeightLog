import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment, assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import {collection,doc,getDoc,getDocs,setDoc,updateDoc,serverTimestamp} from 'firebase/firestore';

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
    await assertSucceeds(setDoc(record(pending,pendingUid),{revision:1,payload:'{}',updatedAt:serverTimestamp()}));
    await assertSucceeds(getDoc(record(pending,pendingUid)));
    await assertFails(getDoc(record(member,pendingUid)));
    await assertFails(getDoc(record(admin,pendingUid)));
    await assertFails(updateDoc(profile(pending,pendingUid),{status:'approved'}));

    await assertSucceeds(updateDoc(profile(admin,pendingUid),{
      status:'rejected',reviewerUid:adminUid,reviewedAt:serverTimestamp(),updatedAt:serverTimestamp()
    }));
    await assertFails(getDoc(record(pending,pendingUid)));
    await assertFails(setDoc(record(pending,pendingUid),{revision:2,payload:'{}',updatedAt:serverTimestamp()}));
    assert.equal((await getDoc(profile(pending,pendingUid))).data().status,'rejected');
  }finally{await env.cleanup()}
});
