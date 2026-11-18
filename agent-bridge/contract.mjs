import {createHash} from 'node:crypto';

export const DRAFT_TYPES=Object.freeze(['meal','workout','body','food','machine','exercise']);
export const normalizeText=value=>String(value??'').normalize('NFKC').trim().toLocaleLowerCase('ko-KR').replace(/\s+/g,' ');
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const date=value=>{
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const parsed=new Date(`${value}T12:00:00`);
 return !Number.isNaN(parsed.getTime())&&`${parsed.getFullYear()}-${String(parsed.getMonth()+1).padStart(2,'0')}-${String(parsed.getDate()).padStart(2,'0')}`===value;
};
const nonnegative=value=>value==null||(typeof value==='number'&&Number.isFinite(value)&&value>=0);

export function draftId(uid,requestId){
 if(typeof uid!=='string'||!uid||typeof requestId!=='string'||!requestId.trim()||requestId.length>160)throw Error('계정과 요청 ID가 필요합니다.');
 return `ai-${createHash('sha256').update(`${uid}\0${requestId.trim()}`).digest('hex').slice(0,32)}`;
}
export function validateDraft(input){
 if(!object(input)||!DRAFT_TYPES.includes(input.type))throw Error('초안 종류는 meal, workout, body 중 하나여야 합니다.');
 if(typeof input.requestId!=='string'||!input.requestId.trim()||input.requestId.length>160)throw Error('재시도 중복 방지용 requestId가 필요합니다.');
 if(typeof input.originalUtterance!=='string'||!input.originalUtterance.trim()||input.originalUtterance.length>4000)throw Error('사용자 원문을 입력해 주세요.');
 const parsedData=input.parsedData;
 if(!object(parsedData))throw Error('parsedData가 필요합니다.');
 if(input.type==='meal'){
  if(!Array.isArray(parsedData.items)||!parsedData.items.length||parsedData.items.length>30)throw Error('식사에는 음식별 items가 1~30개 필요합니다.');
  for(const item of parsedData.items){
   if(!object(item)||!date(item.date)||!String(item.name||'').trim()||!Number.isFinite(Number(item.servingQty))||Number(item.servingQty)<=0||!String(item.servingUnit||'').trim())throw Error('음식별 날짜·이름·양·단위를 확인해 주세요.');
   for(const key of ['calories','carbs','protein','fat'])if(!nonnegative(item[key]))throw Error(`${key}는 음수가 될 수 없습니다.`);
  }
 }else if(input.type==='workout'){
  if(!date(parsedData.date)||!Array.isArray(parsedData.exercises)||!parsedData.exercises.length)throw Error('운동 날짜와 종목이 필요합니다.');
 }else if(input.type==='body'){
  if(!date(parsedData.date)||!['weight','bodyFatPct','skeletalMuscle','waistCm'].some(key=>nonnegative(parsedData[key])&&parsedData[key]!=null))throw Error('몸 기록 날짜와 측정값이 필요합니다.');
 }else if(input.type==='food'){
  if(!String(parsedData.name||'').trim()||!String(parsedData.servingUnit||'').trim()||!['calories','carbs','protein','fat'].some(key=>parsedData[key]!=null))throw Error('새 음식 이름·단위·영양값이 필요합니다.');
  for(const key of ['calories','carbs','protein','fat'])if(!nonnegative(parsedData[key]))throw Error(`${key}는 음수가 될 수 없습니다.`);
 }else if(input.type==='exercise'){
  if(!String(parsedData.name||'').trim())throw Error('새 운동의 이름이 필요합니다.');
 }else{
  const photos=input.evidence?.photos;
  if(!Array.isArray(photos)||!['whole','nameplate'].every(role=>photos.some(photo=>photo?.role===role)))throw Error('새 머신은 전체 사진과 명판 사진 두 장을 먼저 보여 달라고 요청하세요.');
  if(!String(parsedData.manufacturer||'').trim()||!String(parsedData.model||'').trim()||['모름','unknown','불명'].includes(normalizeText(parsedData.manufacturer))||['모름','unknown','불명'].includes(normalizeText(parsedData.model)))throw Error('머신 제조사·모델이 명확하지 않습니다. 사용자에게 알려 달라고 요청하세요.');
  if(!String(parsedData.name||'').trim())throw Error('머신 이름이 필요합니다.');
 }
 const uncertainty=object(input.uncertainty)?input.uncertainty:{};
 const evidence=object(input.evidence)?input.evidence:{};
 const result={type:input.type,sourceModel:String(input.sourceModel||'external-agent').slice(0,80),originalUtterance:input.originalUtterance.trim(),parsedData,uncertainty,evidence};
 if(Buffer.byteLength(JSON.stringify(result),'utf8')>100000)throw Error('초안이 너무 큽니다. 사진 원본은 포함하지 마세요.');
 return result;
}

export function firestoreValue(value){
 if(value===null||value===undefined)return {nullValue:null};
 if(typeof value==='string')return {stringValue:value};
 if(typeof value==='boolean')return {booleanValue:value};
 if(typeof value==='number'){if(!Number.isFinite(value))throw Error('유한한 숫자만 저장할 수 있습니다.');return Number.isInteger(value)?{integerValue:String(value)}:{doubleValue:value}}
 if(Array.isArray(value))return {arrayValue:{values:value.map(firestoreValue)}};
 if(object(value))return {mapValue:{fields:Object.fromEntries(Object.entries(value).map(([key,part])=>[key,firestoreValue(part)]))}};
 throw Error('지원하지 않는 데이터 형식입니다.');
}
export function fromFirestore(value){
 if(!value||typeof value!=='object')return null;
 if('nullValue'in value)return null;
 if('stringValue'in value)return value.stringValue;
 if('booleanValue'in value)return value.booleanValue;
 if('integerValue'in value)return Number(value.integerValue);
 if('doubleValue'in value)return value.doubleValue;
 if('timestampValue'in value)return value.timestampValue;
 if('arrayValue'in value)return (value.arrayValue.values||[]).map(fromFirestore);
 if('mapValue'in value)return Object.fromEntries(Object.entries(value.mapValue.fields||{}).map(([key,part])=>[key,fromFirestore(part)]));
 return null;
}
export const fromDocument=document=>Object.fromEntries(Object.entries(document?.fields||{}).map(([key,value])=>[key,fromFirestore(value)]));
