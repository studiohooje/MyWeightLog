import {emptyDB, normalizeDB} from './domain.js';
export const LISTS = ['body','meals','foods','workouts','routines','machines','customExercises','recipes'];
const MAPS = ['dayStates','checkins','settings'];
export function validRecordKey(key) {
  return typeof key==='string' && /^(body|meals|foods|workouts|routines|machines|customExercises|recipes|favorites|dayStates|checkins|settings)~.+$/.test(key);
}
export function stableJSON(value) {
  if (Array.isArray(value)) return `[${value.map(stableJSON).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${stableJSON(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
const clone = x => JSON.parse(JSON.stringify(x));
export function cloudRecords(db) {
  const records = {};
  const add = (kind,id,value) => {
    const key = `${kind}~${encodeURIComponent(id)}`;
    if (!id || new TextEncoder().encode(key).length > 1400 || Object.hasOwn(records,key)) throw Error('동기화할 기록 ID가 중복되거나 너무 깁니다.');
    const payload = stableJSON(value);
    if (new TextEncoder().encode(payload).length > 800000) throw Error('동기화할 기록 하나가 너무 큽니다. 사진은 로컬에 보관해 주세요.');
    records[key] = payload;
  };
  for (const kind of LISTS) for (const item of db[kind] || []) {
    const value = clone(item); if (kind === 'machines') delete value.photoDataUrl;
    add(kind,item.id,value);
  }
  for (const id of db.favorites || []) add('favorites',id,true);
  for (const kind of MAPS) for (const [id,value] of Object.entries(db[kind] || {})) add(kind,id,value);
  return records;
}
export function recordsToDB(records, local = emptyDB()) {
  const out = emptyDB();
  for (const [key,payload] of Object.entries(records)) {
    if(!validRecordKey(key))throw Error('서버에 알 수 없는 기록이 있습니다.');
    if (payload == null) continue;
    const pos = key.indexOf('~'), kind = key.slice(0,pos), id = decodeURIComponent(key.slice(pos+1));
    const value = JSON.parse(payload);
    if (LISTS.includes(kind)) {
      if (value.id !== id) throw Error('서버 기록 ID가 일치하지 않습니다.');
      if (kind === 'machines') value.photoDataUrl = local.machines?.find(x=>x.id===id)?.photoDataUrl || '';
      out[kind].push(value);
    } else if (kind === 'favorites') out.favorites.push(id);
    else if (MAPS.includes(kind) && !['__proto__','prototype','constructor'].includes(id)) out[kind][id] = value;
    else throw Error('서버에 알 수 없는 기록이 있습니다.');
  }
  return normalizeDB(out);
}
// Missing entries represent deletion. Remote tombstones retain their revision permanently.
export function planSync(local, remote, baseline = {}, choices = {}) {
  const merged = {}, writes = [], conflicts = [];
  for (const key of new Set([...Object.keys(local),...Object.keys(remote),...Object.keys(baseline)])) {
    const l = local[key] ?? null, r = remote[key]?.payload ?? null, b = baseline[key]?.payload ?? null;
    let value;
    if (l === r) value = l;
    else if (l === b) value = r;
    else if (r === b && !(r===null && remote[key]?.revision>0 && !baseline[key])) value = l;
    else if (choices[key]?.side === 'local' && choices[key].local === l && choices[key].remote === r) value = l;
    else if (choices[key]?.side === 'remote' && choices[key].local === l && choices[key].remote === r) value = r;
    else { conflicts.push({key,local:l,remote:r}); continue; }
    if (value !== null) merged[key] = value;
    if (value !== r) writes.push({key,payload:value,expectedRevision:remote[key]?.revision || 0});
  }
  return {merged,writes,conflicts};
}
