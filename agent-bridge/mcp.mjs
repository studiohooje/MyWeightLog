import http from 'node:http';
import {randomInt,timingSafeEqual} from 'node:crypto';
import {createInterface} from 'node:readline';
import {FirestoreBridge,verifyUserToken} from './firebase.mjs';

const bridge=new FirestoreBridge();
const code=String(randomInt(0,100000000)).padStart(8,'0');
const issuedAt=Date.now();let attempts=0;
const origins=new Set(['https://studiohooje.github.io','http://localhost:4173','http://127.0.0.1:4173','capacitor://localhost','http://localhost']);
const respond=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(body))};
const httpServer=http.createServer(async(req,res)=>{
 const origin=req.headers.origin||'';
 if(origin&&origins.has(origin)){
  res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Access-Control-Allow-Private-Network','true');
 }
 if(req.method==='OPTIONS'){respond(res,origin&&!origins.has(origin)?403:204,{});return}
 if(req.url!=='/pair'||req.method!=='POST'){respond(res,404,{error:'not found'});return}
 if(origin&&!origins.has(origin)){respond(res,403,{error:'허용되지 않은 앱 주소입니다.'});return}
 if(attempts>=5||Date.now()-issuedAt>10*60*1000){respond(res,429,{error:'연결 코드가 만료됐습니다. 도구를 다시 시작해 주세요.'});return}
 let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>12000){respond(res,413,{error:'요청이 너무 큽니다.'});return}}
 let data;try{data=JSON.parse(raw)}catch{respond(res,400,{error:'요청 형식이 올바르지 않습니다.'});return}
 const supplied=String(data.code||'');const same=supplied.length===code.length&&timingSafeEqual(Buffer.from(supplied),Buffer.from(code));
 if(!same){attempts++;respond(res,403,{error:'연결 코드를 확인해 주세요.'});return}
 try{const user=await verifyUserToken(data.idToken,data.uid);bridge.setSession({...user,idToken:data.idToken});respond(res,200,{ok:true,uid:user.uid,expiresAt:user.expiresAt})}
 catch(error){attempts++;respond(res,403,{error:error.message})}
});
httpServer.listen(0,'127.0.0.1',()=>{
 const port=httpServer.address().port;
 process.stderr.write(`마웨로그 AI 연결: 앱 설정에서 포트 ${port}, 코드 ${code} 입력 (10분 유효). 같은 컴퓨터의 브라우저에서 연결하세요.\n`);
});

const TOOLS=[
 {name:'mwl_connection_status',description:'현재 사용자별 마웨로그 연결 상태를 확인합니다.',inputSchema:{type:'object',properties:{}}},
 {name:'mwl_search_records',description:'로그인한 사용자의 기존 음식·머신·운동과 공용 도감을 검색합니다. 신규 등록 전에 반드시 호출하세요.',inputSchema:{type:'object',properties:{query:{type:'string'},kind:{type:'string',enum:['all','foods','machines','customExercises','meals','workouts']},limit:{type:'integer'}},required:['query']}},
 {name:'mwl_create_draft',description:'사용자 본인의 검토함에 식사·운동·몸 기록 또는 신규 음식·운동·머신 초안을 만듭니다. 확정 기록은 만들지 않습니다. 새 머신은 전체·명판 사진 두 장과 제조사·모델 식별이 필요합니다. requestId를 재시도에 재사용하면 중복을 막습니다.',inputSchema:{type:'object',properties:{type:{type:'string',enum:['meal','workout','body','food','machine','exercise']},requestId:{type:'string'},sourceModel:{type:'string'},originalUtterance:{type:'string'},parsedData:{type:'object'},uncertainty:{type:'object'},evidence:{type:'object'}},required:['type','requestId','originalUtterance','parsedData']}},
 {name:'mwl_list_drafts',description:'로그인한 사용자의 최근 AI 검토함 초안을 확인합니다.',inputSchema:{type:'object',properties:{limit:{type:'integer'}}}}
];
const handlers={
 mwl_connection_status:()=>{try{const {uid,expiresAt}=bridge.requireSession();return {connected:true,uid,expiresAt}}catch(error){return {connected:false,message:error.message}}},
 mwl_search_records:args=>bridge.searchRecords(args),
 mwl_create_draft:args=>bridge.createDraft(args),
 mwl_list_drafts:args=>bridge.listDrafts(args)
};
const send=value=>process.stdout.write(`${JSON.stringify(value)}\n`);
const protocol='2025-03-26';
createInterface({input:process.stdin,crlfDelay:Infinity}).on('line',async line=>{
 let msg;try{msg=JSON.parse(line)}catch{return}
 if(!msg||typeof msg!=='object'||!msg.method)return;
 const id=msg.id;
 try{
  if(msg.method==='notifications/initialized')return;
  if(msg.method==='initialize'){if(id!==undefined)send({jsonrpc:'2.0',id,result:{protocolVersion:protocol,capabilities:{tools:{listChanged:false}},serverInfo:{name:'myweightlog-agent-bridge',version:'2.0.1-beta'}}});return}
  if(msg.method==='tools/list'){if(id!==undefined)send({jsonrpc:'2.0',id,result:{tools:TOOLS}});return}
  if(msg.method==='tools/call'){
   const name=msg.params?.name;if(!Object.hasOwn(handlers,name))throw Error('지원하지 않는 도구입니다.');
   try{const result=await handlers[name](msg.params?.arguments||{});send({jsonrpc:'2.0',id,result:{content:[{type:'text',text:JSON.stringify(result)}]}})}
   catch(error){send({jsonrpc:'2.0',id,result:{isError:true,content:[{type:'text',text:error.message}]}})}return;
  }
  if(id!==undefined)send({jsonrpc:'2.0',id,error:{code:-32601,message:'Method not found'}});
 }catch(error){if(id!==undefined)send({jsonrpc:'2.0',id,error:{code:-32603,message:error.message}})}
});
process.stdin.on('end',()=>httpServer.close());
