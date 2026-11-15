import test from 'node:test';
import assert from 'node:assert/strict';
import {createFoodLookup} from '../food-provider.js';

test('연결 전에는 외부 음식 검색을 호출하지 않는다',async()=>{
 const lookup=createFoodLookup();assert.equal(lookup.available,false);
 await assert.rejects(lookup.search('베이글'),/연결되지/);
});
test('연결 후 서버 응답은 음식 프리셋 계약으로 검증한다',async()=>{
 let requested;
 const lookup=createFoodLookup({endpoint:'https://example.test/foods',fetcher:async url=>{requested=url;return {ok:true,json:async()=>({items:[{name:'베이글',servingUnit:'개',calories:230,carbs:42,protein:9,fat:3}]})}}});
 const rows=await lookup.search('베이글');assert.equal(requested.searchParams.get('q'),'베이글');assert.equal(rows[0].name,'베이글');
});
