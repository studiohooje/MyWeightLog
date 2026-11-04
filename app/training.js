import {estimate1RM,round,setWeightKg} from './domain.js';
const plate=(n)=>Math.max(0,Math.round(n/2.5)*2.5);
export function latestEstimate(workouts,name){let best=0;for(const w of workouts||[])for(const e of w.exercises||[])if(e.kind!=='cardio'&&e.name.trim().toLowerCase()===String(name).trim().toLowerCase())for(const s of e.sets||[])if(s.completed!==false)best=Math.max(best,estimate1RM(setWeightKg(s),s.reps||0));return best}
export function lastExerciseRecord(workouts,name,beforeDate=null){
 const q=String(name||'').trim().toLocaleLowerCase('ko');if(!q)return null;
 const sessions=[...(workouts||[])].filter(w=>!beforeDate||w.date<beforeDate).sort((a,b)=>b.date.localeCompare(a.date)||String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
 for(const w of sessions){const ex=(w.exercises||[]).find(e=>e.name.trim().toLocaleLowerCase('ko')===q);if(ex)return {date:w.date,title:w.title,exercise:structuredClone(ex)}}
 return null;
}
export const setIntensityPct=(weight,oneRM)=>Number.isFinite(oneRM)&&oneRM>0?Math.round((Number(weight)||0)/oneRM*100):null;
export function plateLoadPerSide(totalWeightKg,barbellWeightKg=20){
 const total=Number(totalWeightKg),bar=Number(barbellWeightKg);
 if(!Number.isFinite(total)||!Number.isFinite(bar)||total<0||bar<0)throw Error('중량을 확인해 주세요.');
 if(total<bar)throw Error('총 중량이 바벨 중량보다 작습니다.');
 return round((total-bar)/2,2);
}
export const SET_MODES=Object.freeze([
 {id:'basic',label:'기본 3×8'},
 {id:'build-up',label:'점진적 증량'},
 {id:'start-heavy',label:'무겁게 시작'},
 {id:'5x5',label:'5×5'},
 {id:'top-set',label:'탑세트'},
 {id:'back-off',label:'백오프'}
]);
// Transparent, conservative local templates. They do not claim to reproduce BurnFit's model.
const modeSets={
 'basic':[{pct:.7,reps:8},{pct:.7,reps:8},{pct:.7,reps:8}],
 'build-up':[{pct:.5,reps:10,type:'워밍업'},{pct:.6,reps:8},{pct:.7,reps:6},{pct:.75,reps:5}],
 'start-heavy':[{pct:.8,reps:4},{pct:.75,reps:6},{pct:.7,reps:8}],
 '5x5':Array.from({length:5},()=>({pct:.75,reps:5})),
 'top-set':[{pct:.5,reps:8,type:'워밍업'},{pct:.7,reps:5,type:'워밍업'},{pct:.85,reps:3}],
 'back-off':[{pct:.7,reps:8},{pct:.7,reps:8},{pct:.7,reps:8}],
 'top-backoff':[{pct:.85,reps:3},{pct:.7,reps:8},{pct:.7,reps:8}],
 'warmup':[{pct:.4,reps:10,type:'워밍업'},{pct:.6,reps:5,type:'워밍업'},{pct:.75,reps:5}]
};
export function suggestSets(mode,oneRM){
 if(!Number.isFinite(oneRM)||oneRM<=0)throw Error('이 종목의 과거 중량 기록이 있어야 제안할 수 있습니다.');
 const defs=modeSets[mode];if(!defs)throw Error('알 수 없는 세트 구성입니다.');
 return defs.map(x=>({weight:plate(oneRM*x.pct),unit:'kg',reps:x.reps,type:x.type||'본세트',rpe:null,completed:true}));
}
