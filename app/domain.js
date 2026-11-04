import {EXERCISE_CATALOG} from './catalog.js';
export const VERSION=1;
export const uid=()=>globalThis.crypto?.randomUUID?.()??`id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const number=(v)=>{if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(v);return Number.isFinite(n)?n:null};
export const validDate=(s)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(`${s}T12:00:00`);return !Number.isNaN(d.getTime())&&`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`===s};
export const round=(n,p=1)=>Math.round((n+Number.EPSILON)*10**p)/10**p;
export function cleanBody(raw){const date=String(raw.date??'').trim();if(!validDate(date))throw Error('측정일을 확인해 주세요.');const out={id:raw.id||uid(),date,weight:number(raw.weight),bodyFatPct:number(raw.bodyFatPct),skeletalMuscle:number(raw.skeletalMuscle),bodyFatMass:number(raw.bodyFatMass),bmi:number(raw.bmi),score:number(raw.score),visceralFatLevel:number(raw.visceralFatLevel),bmr:number(raw.bmr),note:String(raw.note??'').trim(),source:String(raw.source??'manual'),createdAt:raw.createdAt||raw.updatedAt||new Date().toISOString(),updatedAt:raw.updatedAt||new Date().toISOString()};for(const k of ['weight','bodyFatPct','skeletalMuscle','bodyFatMass','bmi','score','visceralFatLevel','bmr'])if(out[k]!==null&&out[k]<0)throw Error(`${k} 값은 음수가 될 수 없습니다.`);if(out.bodyFatPct!==null&&out.bodyFatPct>100)throw Error('체지방률은 100% 이하여야 합니다.');if(out.weight===null&&out.bodyFatPct===null&&out.skeletalMuscle===null)throw Error('체중, 체지방률, 골격근량 중 하나를 입력해 주세요.');return out}
export function cleanMeal(raw){
 const date=String(raw.date??'');if(!validDate(date))throw Error('식사 날짜를 확인해 주세요.');
 const name=String(raw.name??'').trim();if(!name)throw Error('음식 이름을 입력해 주세요.');
 const servingQty=number(raw.servingQty)??1,servingUnit=String(raw.servingUnit||'회').trim();
 if(servingQty<=0||!servingUnit)throw Error('섭취량과 단위를 확인해 주세요.');
 const out={id:raw.id||uid(),date,slot:String(raw.slot||'간식'),name,servingQty,servingUnit,source:String(raw.source||'manual'),copyKey:String(raw.copyKey||''),calories:number(raw.calories),carbs:number(raw.carbs),protein:number(raw.protein),fat:number(raw.fat),note:String(raw.note??'').trim(),createdAt:raw.createdAt||raw.updatedAt||new Date().toISOString(),updatedAt:raw.updatedAt||new Date().toISOString()};
 for(const k of ['calories','carbs','protein','fat'])if(out[k]!==null&&out[k]<0)throw Error(`${k} 값은 음수가 될 수 없습니다.`);return out
}
export function cleanFoodPreset(raw){
 const name=String(raw.name??'').trim(),servingUnit=String(raw.servingUnit||'회').trim();
 if(!name||!servingUnit)throw Error('음식 이름과 단위를 입력해 주세요.');
 const out={id:raw.id||uid(),name,servingUnit,source:String(raw.source||'manual'),calories:number(raw.calories),carbs:number(raw.carbs),protein:number(raw.protein),fat:number(raw.fat)};
 for(const k of ['calories','carbs','protein','fat'])if(out[k]!==null&&out[k]<0)throw Error('영양값은 음수가 될 수 없습니다.');
 if(['calories','carbs','protein','fat'].every(k=>out[k]===null))throw Error('영양값을 하나 이상 입력해 주세요.');
 return out;
}
export function cleanExercise(raw){
 const name=String(raw.name??'').trim();if(!name)throw Error('운동 이름을 입력해 주세요.');
 const kind=raw.kind==='cardio'?'cardio':'strength',durationMin=number(raw.durationMin),distanceKm=number(raw.distanceKm);
 if(durationMin!==null&&durationMin<0||distanceKm!==null&&distanceKm<0)throw Error('유산소 시간과 거리를 확인해 주세요.');
 const sets=(raw.sets??[]).map(s=>({id:s.id||uid(),weight:number(s.weight),unit:s.unit||'kg',originalWeight:number(s.originalWeight??s.weight),originalUnit:s.originalUnit||s.unit||'kg',targetWeight:number(s.targetWeight),targetReps:number(s.targetReps),targetUnit:s.targetUnit||s.unit||'kg',reps:number(s.reps),type:String(s.type||'본세트'),rpe:number(s.rpe),completed:s.completed!==false}));
 if(kind==='strength'&&!sets.length)throw Error('세트를 하나 이상 입력해 주세요.');
 for(const s of sets){if(s.originalWeight===null||s.originalWeight<0||!['kg','lb'].includes(s.originalUnit))throw Error('원래 중량과 단위를 확인해 주세요.');if(!['kg','lb'].includes(s.targetUnit)||s.targetWeight!==null&&s.targetWeight<0||s.targetReps!==null&&(s.targetReps<0||!Number.isInteger(s.targetReps)))throw Error('목표 중량·반복·단위를 확인해 주세요.');if(!['kg','lb'].includes(s.unit))throw Error('중량 단위는 kg 또는 lb여야 합니다.');if(s.weight===null||s.reps===null||s.weight<0||s.reps<0||!Number.isInteger(s.reps))throw Error('중량과 반복 횟수를 확인해 주세요.');if(s.rpe!==null&&(s.rpe<0||s.rpe>10))throw Error('RPE는 0~10 사이여야 합니다.')}
 if(kind==='cardio'&&durationMin===null&&distanceKm===null)throw Error('유산소 시간 또는 거리를 입력해 주세요.');
 const known=EXERCISE_CATALOG.find(x=>x.id===raw.exerciseId)||EXERCISE_CATALOG.find(x=>x.name===name);
 return {id:raw.id||uid(),name,exerciseId:String(raw.exerciseId||known?.id||'')||null,machineId:String(raw.machineId||'')||null,primaryMuscleIds:cleanIds(raw.primaryMuscleIds??known?.primaryMuscleIds),secondaryMuscleIds:cleanIds(raw.secondaryMuscleIds??known?.secondaryMuscleIds),anatomyMapVersion:1,part:String(raw.part||known?.part||'기타'),kind,durationMin,distanceKm,supersetGroup:String(raw.supersetGroup||'').trim()||null,sets}
}
export function cleanWorkout(raw){const date=String(raw.date??'');if(!validDate(date))throw Error('운동 날짜를 확인해 주세요.');const exercises=(raw.exercises??[]).map(cleanExercise);if(!exercises.length)throw Error('운동 종목을 하나 이상 입력해 주세요.');const duration=number(raw.duration);if(duration!==null&&duration<0)throw Error('운동 시간은 음수가 될 수 없습니다.');const condition=number(raw.condition);if(condition!==null&&(condition<1||condition>5))throw Error('컨디션은 1~5 사이여야 합니다.');return {id:raw.id||uid(),sourceDraftId:String(raw.sourceDraftId||''),date,title:String(raw.title||'오늘의 운동').trim(),duration,condition,exercises,note:String(raw.note??'').trim(),createdAt:raw.createdAt||raw.updatedAt||new Date().toISOString(),updatedAt:raw.updatedAt||new Date().toISOString()}}
export const macroCalories=(m)=>({carbs:(m.carbs||0)*4,protein:(m.protein||0)*4,fat:(m.fat||0)*9});
export function mealTotals(meals){const t={calories:0,carbs:0,protein:0,fat:0};for(const m of meals)for(const k of Object.keys(t))t[k]+=m[k]||0;const e=macroCalories(t),sum=e.carbs+e.protein+e.fat,cp=sum?round(e.carbs/sum*100):0,pp=sum?round(e.protein/sum*100):0;return {...Object.fromEntries(Object.entries(t).map(([k,v])=>[k,round(v)])),percent:{carbs:cp,protein:pp,fat:sum?round(100-cp-pp):0}}}
export const estimate1RM=(weight,reps)=>reps>0?round(weight*(1+Math.min(reps,30)/30)):0;
export function workoutTotals(w){let volume=0,reps=0,sets=0,best1RM=0,cardioMinutes=0,distanceKm=0;const parts={};for(const ex of w.exercises||[]){if(ex.kind==='cardio'){cardioMinutes+=ex.durationMin||0;distanceKm+=ex.distanceKm||0;continue}for(const s of ex.sets||[]){if(s.completed===false)continue;const v=setWeightKg(s)*(s.reps||0);volume+=v;reps+=s.reps||0;sets++;best1RM=Math.max(best1RM,estimate1RM(setWeightKg(s),s.reps||0));parts[ex.part]=(parts[ex.part]||0)+v}}return {volume:round(volume),reps,sets,exercises:w.exercises?.length||0,best1RM,parts,cardioMinutes:round(cardioMinutes),distanceKm:round(distanceKm,2)}}
export const emptyDB=()=>({schemaVersion:VERSION,body:[],meals:[],foods:[],workouts:[],routines:[],machines:[],customExercises:[],favorites:[],recipes:[],dayStates:{},checkins:{},settings:{calorieGoal:2200,carbsGoal:250,proteinGoal:150,fatGoal:70,barbellWeightKg:20}});
export const LB_TO_KG=0.45359237;
export const setWeightKg=s=>{
 const hasOriginal=number(s?.originalWeight)!==null&&['kg','lb'].includes(s?.originalUnit);
 return (number(hasOriginal?s.originalWeight:s?.weight)||0)*((hasOriginal?s.originalUnit:s?.unit)==='lb'?LB_TO_KG:1);
};
export function convertSetUnit(set,newUnit){
 if(!['kg','lb'].includes(newUnit))throw Error('중량 단위는 kg 또는 lb여야 합니다.');
 const originalWeight=number(set.originalWeight??set.weight),originalUnit=set.originalUnit||set.unit||'kg';
 if(originalWeight===null||originalWeight<0||!['kg','lb'].includes(originalUnit))throw Error('원래 중량과 단위를 확인해 주세요.');
 const kg=originalWeight*(originalUnit==='lb'?LB_TO_KG:1);
 return {...set,originalWeight,originalUnit,unit:newUnit,weight:newUnit===originalUnit?originalWeight:round(newUnit==='lb'?kg/LB_TO_KG:kg,4)};
}
const cleanIds=items=>Array.isArray(items)?[...new Set(items.map(String).filter(Boolean))]:[];
export function cleanMachine(raw){
 const name=String(raw.name||raw.model||'이름 없는 머신').trim();
 const unit=raw.unit||'kg';if(!['kg','lb'].includes(unit))throw Error('머신 단위를 확인해 주세요.');
 const photoDataUrl=String(raw.photoDataUrl||'');if(photoDataUrl&&(photoDataUrl.length>2*1024*1024||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(photoDataUrl)))throw Error('머신 사진은 2 MB 이하의 PNG·JPEG·WebP로 선택해 주세요.');
 return {id:raw.id||uid(),name,photoDataUrl,exerciseId:String(raw.exerciseId||''),manufacturer:String(raw.manufacturer||'모름').trim(),model:String(raw.model||'모름').trim(),location:String(raw.location||'').trim(),resistance:String(raw.resistance||'모름').trim(),unit};
}
export function cleanCustomExercise(raw){
 const name=String(raw.name||'').trim();if(!name)throw Error('종목 이름을 입력해 주세요.');
 return {id:raw.id||uid(),name,part:String(raw.part||'기타'),kind:raw.kind==='cardio'?'cardio':'strength',equipment:String(raw.equipment||'기타'),aliases:cleanIds(raw.aliases),primaryMuscleIds:cleanIds(raw.primaryMuscleIds),secondaryMuscleIds:cleanIds(raw.secondaryMuscleIds),anatomyMapVersion:1};
}
export function cleanCheckin(raw){
 const out={};for(const k of ['sleep','energy','soreness']){const n=number(raw[k]);if(n!==null&&(n<1||n>5))throw Error('컨디션은 1~5 사이여야 합니다.');out[k]=n;}
 if(![undefined,null,'',true,false,'true','false'].includes(raw.pain))throw Error('통증 여부를 확인해 주세요.');out.pain=raw.pain===true||raw.pain==='true'?true:raw.pain===false||raw.pain==='false'?false:null;out.note=String(raw.note||'');return out;
}
export function dietState(db,date){
 const hasMeals=(db.meals||[]).some(x=>x.date===date),state=db.dayStates?.[date];
 if(state==='complete'&&!hasMeals)return 'unrecorded';
 if(state==='fasting'&&hasMeals)return 'partial';
 if(state==='unrecorded'&&hasMeals)return 'partial';
 return ['partial','complete','fasting','unrecorded'].includes(state)?state:hasMeals?'partial':'unrecorded';
}
export function setDietState(db,date,state){
 if(!validDate(date)||!['partial','complete','fasting','unrecorded'].includes(state))throw Error('식단 상태를 확인해 주세요.');
 const meals=(db.meals||[]).filter(x=>x.date===date);
 if((state==='fasting'||state==='unrecorded')&&meals.length)throw Error('식사 기록이 있는 날은 단식 또는 미기록으로 지정할 수 없습니다.');
 if(state==='complete'&&!meals.length)throw Error('식사 기록이 없습니다. 단식이라면 단식을 선택해 주세요.');
 return {...db,dayStates:{...db.dayStates,[date]:state}};
}
export function normalizeDB(raw){
 if(!raw||typeof raw!=='object'||raw.schemaVersion!==VERSION)throw Error('지원하지 않는 백업 형식입니다.');
 const db=emptyDB(),list=k=>{if(raw[k]!=null&&!Array.isArray(raw[k]))throw Error(k+' 백업 목록을 확인해 주세요.');return raw[k]||[]};
 db.body=list('body').map(cleanBody);db.meals=list('meals').map(cleanMeal);db.foods=list('foods').map(cleanFoodPreset);db.workouts=list('workouts').map(cleanWorkout);
 db.routines=list('routines').map(r=>({...r,exercises:(r.exercises||[]).map(cleanExercise)}));
 db.machines=list('machines').map(cleanMachine);db.customExercises=list('customExercises').map(cleanCustomExercise);db.favorites=cleanIds(list('favorites'));
 db.recipes=list('recipes').map(r=>{if(!String(r.name||'').trim()||!Array.isArray(r.items)||!r.items.length)throw Error('레시피 형식을 확인해 주세요.');return {id:r.id||uid(),name:String(r.name).trim(),items:r.items.map(x=>cleanMeal({...x,date:x.date||'2000-01-01'}))}});
 for(const k of ['dayStates','checkins'])if(raw[k]!=null&&(typeof raw[k]!=='object'||Array.isArray(raw[k])))throw Error(k+' 형식을 확인해 주세요.');
 for(const [date,state] of Object.entries(raw.dayStates||{})){if(!validDate(date)||!['partial','complete','fasting','unrecorded'].includes(state))throw Error('식단 상태 형식을 확인해 주세요.');db.dayStates[date]=state;}
 for(const [date,state] of Object.entries(raw.checkins||{})){if(!validDate(date)||!state||typeof state!=='object')throw Error('체크인 형식을 확인해 주세요.');db.checkins[date]=cleanCheckin(state);}
 for(const m of db.meals)if(['fasting','unrecorded'].includes(db.dayStates[m.date]))db.dayStates[m.date]='partial';
 db.settings={...db.settings,...raw.settings};if(!Number.isFinite(Number(db.settings.barbellWeightKg))||Number(db.settings.barbellWeightKg)<0)db.settings.barbellWeightKg=20;
 return db;
}
export function importBody(raw){if(raw?.type!=='myweightlog.body'||raw?.version!==1)throw Error('마웨로그 인바디 파일이 아닙니다.');return cleanBody({...raw.measurement,source:'import'})}
export function bodyImportFile(measurement){return {type:'myweightlog.body',version:1,measurement:cleanBody(measurement)}}
