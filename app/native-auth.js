// The native bridge is injected by Capacitor. This module never loads a web OAuth UI.
// Provider tokens are returned only to Firebase JS signInWithCredential; never persist or log them.
export function isNative() {
  return globalThis.Capacitor?.getPlatform?.() === 'android';
}

export function nativeAuthAvailable() {
  return isNative() && !!globalThis.Capacitor?.isPluginAvailable?.('FirebaseAuthentication');
}

function plugin() {
  if (!nativeAuthAvailable() || typeof globalThis.Capacitor.registerPlugin !== 'function') {
    throw Error('Android 로그인 모듈이 포함된 최신 앱으로 업데이트해 주세요.');
  }
  return globalThis.Capacitor.registerPlugin('FirebaseAuthentication');
}

export async function signInNativeGoogle() {
  const result = await plugin().signInWithGoogle({skipNativeAuth:true, useCredentialManager:true});
  const idToken = result?.credential?.idToken;
  if (typeof idToken !== 'string' || !idToken) throw Error('Google 인증 결과를 확인하지 못했습니다. 다시 로그인해 주세요.');
  return {idToken};
}

export async function signOutNativeGoogle() {
  if (nativeAuthAvailable()) await plugin().signOut();
}

export const nativeGoogleSignIn = signInNativeGoogle;
export const nativeGoogleSignOut = signOutNativeGoogle;
