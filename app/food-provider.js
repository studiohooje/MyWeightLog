// Future nutrition database connector. Calls a server proxy, never a provider key from the client.
import {cleanFoodPreset} from './domain.js';

export function createFoodLookup({endpoint='',fetcher=globalThis.fetch}={}){
 if(!endpoint)return {available:false,search:async()=>{throw Error('음식 검색 API가 아직 연결되지 않았습니다. 직접 등록을 이용해 주세요.')}};
 const url=new URL(endpoint);
 if(url.protocol!=='https:')throw Error('음식 검색 연결은 HTTPS가 필요합니다.');
 return {available:true,async search(query,{limit=10}={}){
  const term=String(query||'').trim();
  if(term.length<2)throw Error('음식 이름을 두 글자 이상 입력해 주세요.');
  const requestUrl=new URL(url);requestUrl.searchParams.set('q',term);requestUrl.searchParams.set('limit',String(Math.max(1,Math.min(30,limit))));
  const response=await fetcher(requestUrl,{headers:{Accept:'application/json'},credentials:'include'});
  if(!response.ok)throw Error(`음식 검색에 실패했습니다 (${response.status}).`);
  const payload=await response.json();
  if(!Array.isArray(payload.items))throw Error('음식 검색 응답 형식이 올바르지 않습니다.');
  return payload.items.map(item=>cleanFoodPreset({...item,source:'provider'}));
 }};
}
