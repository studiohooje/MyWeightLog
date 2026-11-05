let account = '';
const listeners = new Set();
export function scopedKey(base) { return account ? `${base}.user.${encodeURIComponent(account)}` : base; }
export function storageAccount() { return account; }
export function setStorageAccount(uid = '') {
  if (typeof uid !== 'string' || uid.length > 128) throw Error('계정 식별자가 올바르지 않습니다.');
  account = uid;
  for (const fn of listeners) fn();
}
export function onStorageScopeChange(fn) { listeners.add(fn); }
export function photoDatabaseName() { return scopedKey('myweightlog.photos'); }
