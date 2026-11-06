import test from 'node:test';
import assert from 'node:assert/strict';
import {isNative,nativeAuthAvailable,signInNativeGoogle,signOutNativeGoogle} from '../native-auth.js';

test('native Google auth uses Credential Manager, exposes only provider ID token and clears provider state',async()=>{
  const original=globalThis.Capacitor,calls=[];
  globalThis.Capacitor={getPlatform:()=> 'android',isPluginAvailable:name=>name==='FirebaseAuthentication',registerPlugin:name=>{
    assert.equal(name,'FirebaseAuthentication');
    return {signInWithGoogle:async options=>{calls.push(options);return {credential:{idToken:'synthetic-id-token',accessToken:'synthetic-access-token'},user:{uid:'synthetic'}}},signOut:async()=>calls.push('out')};
  }};
  try{
    assert.equal(isNative(),true);assert.equal(nativeAuthAvailable(),true);
    assert.deepEqual(await signInNativeGoogle(),{idToken:'synthetic-id-token'});
    assert.deepEqual(calls[0],{skipNativeAuth:true,useCredentialManager:true});
    await signOutNativeGoogle();assert.equal(calls[1],'out');
  }finally{globalThis.Capacitor=original}
});

test('web and old native binaries cannot invoke Google native bridge',async()=>{
  const original=globalThis.Capacitor;
  try{
    globalThis.Capacitor=undefined;assert.equal(nativeAuthAvailable(),false);
    await assert.rejects(signInNativeGoogle,/최신 앱/);
    globalThis.Capacitor={getPlatform:()=> 'android',isPluginAvailable:()=>false};
    await assert.rejects(signInNativeGoogle,/최신 앱/);
    await signOutNativeGoogle();
  }finally{globalThis.Capacitor=original}
});

test('missing provider token does not create a false signed-in result',async()=>{
  const original=globalThis.Capacitor;
  globalThis.Capacitor={getPlatform:()=> 'android',isPluginAvailable:()=>true,registerPlugin:()=>({signInWithGoogle:async()=>({credential:{}})})};
  try{await assert.rejects(signInNativeGoogle,/인증 결과/)}finally{globalThis.Capacitor=original}
});
