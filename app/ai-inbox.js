import {validateDraftRecords} from './ai-drafts.js';
import {MUSCLE_LABELS} from './exercise-ui.js';

const h=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>v==null?'':String(v);
const stamp=v=>v?.toDate?.()?.toLocaleString('ko-KR')||String(v||'');
const label={meal:'식단',workout:'운동',body:'몸·인바디',food:'새 음식',machine:'새 머신',exercise:'새 운동 종목'};
const metric={weight:'체중 kg',bodyFatPct:'체지방률 %',skeletalMuscle:'골격근량 kg',waistCm:'허리둘레 cm',bodyFatMass:'체지방량 kg',bmi:'BMI',score:'인바디 점수',visceralFatLevel:'내장지방 레벨',bmr:'기초대사량 kcal'};
const nutrient={calories:'칼로리 kcal',carbs:'탄수화물 g',protein:'단백질 g',fat:'지방 g'};
const dateTimeValue=value=>{const raw=String(value||'');if(!raw)return '';const date=new Date(raw);if(Number.isNaN(date.getTime()))return '';const n=x=>String(x).padStart(2,'0');return `${date.getFullYear()}-${n(date.getMonth()+1)}-${n(date.getDate())}T${n(date.getHours())}:${n(date.getMinutes())}`};
function evidenceSummary(e){if(!e||typeof e!=='object')return '';const parts=[e.source,e.note];if(Array.isArray(e.photos)&&e.photos.length)parts.push(`사진 ${e.photos.length}장 확인 정보`);return parts.filter(Boolean).map(x=>h(x)).join(' · ')}
function estimate(item,uncertainty){
  const e=item.aiEstimate||uncertainty||{};
  if(!e.estimated)return '';
  const range=e.caloriesMin!=null&&e.caloriesMax!=null?`${e.caloriesMin}~${e.caloriesMax} kcal`:'범위 미제공';
  const macros=[['carbs','탄수화물'],['protein','단백질'],['fat','지방']].filter(([key])=>e[`${key}Min`]!=null&&e[`${key}Max`]!=null).map(([key,label])=>`${label} ${e[`${key}Min`]}~${e[`${key}Max`]} g`);
  return `<details class="ai-estimate" title="추정 범위 ${h(range)}"><summary>약 ${h(item.calories)} kcal · 추정</summary><p>추정 범위 ${h(range)}${macros.length?` · ${h(macros.join(' · '))}`:''} · ${h(e.basis||'사진·대화 근거')}</p><p>정확하지 않을 수 있습니다. 분량과 영양값을 확인해 주세요.</p></details>`;
}
function estimateEditor(prefix,item,uncertainty){
 const e=item.aiEstimate||uncertainty||{};
 return `<details class="ai-estimate-edit"><summary>추정 여부·범위 확인</summary><label class="field"><input type="checkbox" name="${prefix}-estimated" ${e.estimated?'checked':''}> 추정값으로 표시</label><p class="hint">중앙값을 수정했다면 범위도 함께 확인해 주세요. 범위 밖의 값은 저장되지 않습니다.</p><div class="form-grid">${Object.entries(nutrient).map(([key,text])=>`<label class="field">${text} 최솟값<input name="${prefix}-${key}Min" type="number" min="0" step="any" value="${h(num(e[`${key}Min`]))}"></label><label class="field">${text} 최댓값<input name="${prefix}-${key}Max" type="number" min="0" step="any" value="${h(num(e[`${key}Max`]))}"></label>`).join('')}</div><label class="field">추정 근거<input name="${prefix}-basis" value="${h(e.basis||'')}"></label></details>`;
}
function mealEditor(draft){
  const items=draft.parsedData?.items||[];
  return `<div class="ai-items">${items.map((item,i)=>`<fieldset class="ai-item"><legend>음식 ${i+1}</legend><div class="form-grid"><label class="field">식사 날짜<input name="item-${i}-date" type="date" value="${h(item.date)}" required></label><label class="field">식사 번호<input name="item-${i}-slot" value="${h(item.slot||'식사①')}" required></label><label class="field">먹은 시각<input name="item-${i}-loggedAt" type="datetime-local" value="${h(dateTimeValue(item.loggedAt))}" required></label></div><label class="field">음식 이름<input name="item-${i}-name" value="${h(item.name)}" required></label><div class="form-grid"><label class="field">분량<input name="item-${i}-servingQty" type="number" min="0.01" step="any" value="${h(num(item.servingQty))}" required></label><label class="field">단위<select name="item-${i}-servingUnit">${['g','개','회'].map(unit=>`<option value="${unit}" ${item.servingUnit===unit?'selected':''}>${unit}</option>`).join('')}</select></label></div><div class="form-grid">${Object.entries(nutrient).map(([key,text])=>`<label class="field">${text}<input name="item-${i}-${key}" type="number" min="0" step="any" value="${h(num(item[key]))}"></label>`).join('')}</div>${estimate(item,draft.uncertainty)}${estimateEditor(`item-${i}`,item,draft.uncertainty)}</fieldset>`).join('')}</div>`;
}
function setRow(i,j,set={}){
 const prefix=`set-${i}-${j}`;
 return `<div class="form-grid ai-set" data-ai-set="${j}"><label class="field">${j+1}세트 중량<input name="${prefix}-weight" type="number" min="0" step="any" value="${h(num(set.originalWeight??set.weight))}" required></label><label class="field">단위<select name="${prefix}-unit">${['kg','lb'].map(unit=>`<option value="${unit}" ${(set.originalUnit||set.unit||'kg')===unit?'selected':''}>${unit}</option>`).join('')}</select></label><label class="field">반복<input name="${prefix}-reps" type="number" min="0" step="1" value="${h(num(set.reps))}" required></label><label class="field">완료 시각<input name="${prefix}-completedAt" type="datetime-local" value="${h(dateTimeValue(set.completedAt))}"></label><button type="button" class="button secondary" data-ai-set-remove="${i}" aria-label="${j+1}세트 삭제">세트 삭제</button></div>`;
}
function workoutEditor(draft,db){
 const w=draft.parsedData||{};
 return `<div class="form-grid"><label class="field">운동일<input name="date" type="date" value="${h(w.date)}" required></label><label class="field">운동날 이름<input name="title" value="${h(w.title||'오늘의 운동')}"></label><label class="field">헬스장<input name="gymName" value="${h(w.gymName||'')}"></label></div><div class="ai-items">${(w.exercises||[]).map((ex,i)=>`<fieldset class="ai-item" data-ai-exercise="${i}" data-ai-next-set="${(ex.sets||[]).length}"><legend>운동 ${i+1}</legend><label class="field"><input type="checkbox" name="ex-${i}-include" checked> 이 종목 기록하기</label><div class="form-grid"><label class="field">종목 이름<input name="ex-${i}-name" value="${h(ex.name)}" required></label><label class="field">운동 ID<input name="ex-${i}-exerciseId" value="${h(ex.exerciseId||'')}" placeholder="카탈로그 ID, 없으면 비움"></label><label class="field">주 부위<input name="ex-${i}-part" value="${h(ex.part||'기타')}"></label><label class="field">머신<select name="ex-${i}-machineId"><option value="">미지정 / 프리웨이트</option>${(db.machines||[]).map(m=>`<option value="${h(m.id)}" ${ex.machineId===m.id?'selected':''}>${h([m.name,m.manufacturer,m.model,m.location].filter(Boolean).join(' · '))}</option>`).join('')}${ex.machineId&&!(db.machines||[]).some(m=>m.id===ex.machineId)?`<option value="${h(ex.machineId)}" selected>초안에 지정된 머신 ${h(ex.machineId)}</option>`:''}</select></label><label class="field">중량 기준<select name="ex-${i}-weightBasis"><option value="total" ${ex.weightBasis!=='per-hand'?'selected':''}>전체 중량</option><option value="per-hand" ${ex.weightBasis==='per-hand'?'selected':''}>한 손 기준</option></select></label><label class="field">반복 기준<select name="ex-${i}-repBasis"><option value="total" ${ex.repBasis!=='per-side'?'selected':''}>전체 반복</option><option value="per-side" ${ex.repBasis==='per-side'?'selected':''}>한쪽당 반복</option></select></label></div><label class="field">한 손 기준 들고 있는 덤벨 수<input name="ex-${i}-handCount" type="number" min="0" max="2" step="1" value="${h(num(ex.handCount??0))}"></label><div class="ai-sets">${(ex.sets||[]).map((set,j)=>setRow(i,j,set)).join('')}</div><button type="button" class="button secondary" data-ai-set-add="${i}">＋ 세트 추가</button>${ex.kind==='cardio'?`<div class="form-grid"><label class="field">유산소 시간 분<input name="ex-${i}-durationMin" type="number" min="0" step="any" value="${h(num(ex.durationMin))}"></label><label class="field">거리 km<input name="ex-${i}-distanceKm" type="number" min="0" step="any" value="${h(num(ex.distanceKm))}"></label></div>`:''}</fieldset>`).join('')}</div>`;
}
const wiredRoots=new WeakSet();
export function wireAIReview(root){
 if(!root||wiredRoots.has(root))return;
 wiredRoots.add(root);
 root.addEventListener('click',event=>{
  const add=event.target.closest?.('[data-ai-set-add]');
  if(add){const ex=add.closest('[data-ai-exercise]'),i=Number(ex?.dataset.aiExercise),j=Number(ex?.dataset.aiNextSet);if(!ex||!Number.isInteger(i)||!Number.isInteger(j))return;const rows=ex.querySelector('.ai-sets');if(rows.children.length>=30){globalThis.alert?.('한 종목은 최대 30세트까지 검토할 수 있습니다.');return}const last=rows.lastElementChild;const weight=last?.querySelector('[name$="-weight"]')?.value??'',reps=last?.querySelector('[name$="-reps"]')?.value??'',unit=last?.querySelector('[name$="-unit"]')?.value??'kg';rows.insertAdjacentHTML('beforeend',setRow(i,j,{weight,reps,unit}));ex.dataset.aiNextSet=String(j+1);rows.lastElementChild?.querySelector('input')?.focus();return}
  const remove=event.target.closest?.('[data-ai-set-remove]');if(remove){remove.closest('.ai-set')?.remove()}
 });
}
function bodyEditor(draft){const b=draft.parsedData||{};return `<label class="field">측정일<input name="date" type="date" value="${h(b.date)}" required></label><div class="form-grid">${Object.entries(metric).map(([key,text])=>`<label class="field">${text}<input name="${key}" type="number" min="0" step="any" value="${h(num(b[key]))}"></label>`).join('')}</div>`}
function catalogEditor(draft){const p=draft.parsedData||{};
  if(draft.type==='food')return `<label class="field">음식 이름<input name="name" required value="${h(p.name)}"></label><div class="form-grid"><label class="field">기준량<input name="servingQty" type="number" min="0.01" step="any" required value="${h(num(p.servingQty))}"></label><label class="field">단위<select name="servingUnit">${['g','개','회'].map(unit=>`<option value="${unit}" ${p.servingUnit===unit?'selected':''}>${unit}</option>`).join('')}</select></label></div><div class="form-grid">${Object.entries(nutrient).map(([key,text])=>`<label class="field">${text}<input name="${key}" type="number" min="0" step="any" value="${h(num(p[key]))}"></label>`).join('')}</div>${estimate(p,draft.uncertainty)}${estimateEditor('food',p,draft.uncertainty)}`;
  if(draft.type==='machine')return `<p class="hint">전체 사진과 명판 사진을 AI 대화에 제공한 뒤 제조사·모델을 확인한 초안만 등록할 수 있습니다. 원본 사진은 마웨로그 서버에 저장되지 않습니다.</p><label class="field">머신 별칭<input name="name" required value="${h(p.name)}"></label><label class="field">추가 별칭 (쉼표 구분)<input name="aliases" value="${h((p.aliases||[]).join(', '))}" placeholder="예: 우리 헬스장 V스쿼트"></label><div class="form-grid"><label class="field">제조사<input name="manufacturer" required value="${h(p.manufacturer)}"></label><label class="field">모델<input name="model" required value="${h(p.model)}"></label><label class="field">헬스장·지점<input name="location" value="${h(p.location)}"></label><label class="field">중량 단위<select name="unit">${['kg','lb'].map(unit=>`<option value="${unit}" ${p.unit===unit?'selected':''}>${unit}</option>`).join('')}</select></label></div><label class="field">연결 운동 ID<input name="exerciseId" value="${h(p.exerciseId)}"></label>`;
  return `<label class="field">운동 이름<input name="name" required value="${h(p.name)}"></label><div class="form-grid"><label class="field">주 부위<input name="part" value="${h(p.part)}"></label><label class="field">장비<input name="equipment" value="${h(p.equipment)}"></label><label class="field">종류<select name="kind">${['strength','cardio'].map(kind=>`<option value="${kind}" ${p.kind===kind?'selected':''}>${kind==='cardio'?'유산소':'근력'}</option>`).join('')}</select></label></div>${[['primaryMuscleIds','주 타깃'],['secondaryMuscleIds','보조 타깃']].map(([key,text])=>`<fieldset class="ai-item"><legend>${text}</legend><div class="chip-row">${Object.entries(MUSCLE_LABELS).map(([id,name])=>`<label class="chip"><input type="checkbox" name="${key}" value="${id}" ${(p[key]||[]).includes(id)?'checked':''}> ${name}</label>`).join('')}</div></fieldset>`).join('')}`;
}
function duplicateWarning(draft,db){
  const p=draft.parsedData||{},date=draft.type==='meal'?p.items?.[0]?.date:p.date;
  if(!date&&['meal','workout','body'].includes(draft.type))return '';
  const list=draft.type==='meal'?db.meals:draft.type==='workout'?db.workouts:draft.type==='body'?db.body:db[draft.type==='food'?'foods':draft.type==='machine'?'machines':'customExercises'];
  const same=(list||[]).filter(x=>date?x.date===date:String(x.name||'').trim().toLocaleLowerCase()===String(p.name||'').trim().toLocaleLowerCase());
  if(!same.length)return '';
  const names=same.slice(0,3).map(x=>x.name||x.title||`${x.weight??'—'} kg`).join(', ');
  return `<p class="ai-duplicate">같은 날짜의 기존 기록 ${same.length}건: ${h(names)}. 중복 여부를 확인해 주세요.</p>`;
}
export function renderAIInbox(drafts,db,{error='',loading=false}={}){
  const pending=drafts.filter(d=>d.status==='pending');
  return `<div class="page-head"><div><span class="eyebrow">AI REVIEW</span><h2>AI 기록 검토함</h2><p>AI가 작성한 초안을 확인하고 확정하면 내 기록에 저장됩니다.</p></div><button class="button secondary" id="ai-inbox-refresh">새로고침</button></div>${error?`<div class="alert">${h(error)}</div>`:''}${loading?'<div class="card empty">초안을 불러오는 중입니다.</div>':!pending.length?'<div class="card empty">검토할 AI 초안이 없습니다. 연결된 AI에게 기록을 부탁해 보세요.</div>':`<div class="ai-draft-list">${pending.map(d=>`<article class="card ai-draft"><div class="ai-draft-head"><div><span class="eyebrow">${h(label[d.type]||d.type)}</span><h3>${h(d.type==='meal'?`${d.parsedData?.items?.[0]?.slot||'식사'} · ${d.parsedData?.items?.length||0}개 음식`:d.type==='workout'?d.parsedData?.title||'운동 초안':d.type==='body'?`${d.parsedData?.date||''} 측정`:d.parsedData?.name||'신규 항목')}</h3></div><time>${h(stamp(d.createdAt))}</time></div>${d.originalUtterance?`<blockquote>${h(d.originalUtterance)}</blockquote>`:''}${duplicateWarning(d,db)}${evidenceSummary(d.evidence)?`<p class="hint">근거: ${evidenceSummary(d.evidence)}</p>`:''}<form class="ai-review-form" data-ai-draft="${h(d.id)}">${d.type==='meal'?mealEditor(d):d.type==='workout'?workoutEditor(d,db):d.type==='body'?bodyEditor(d):catalogEditor(d)}<div class="actions"><button class="button" type="submit">확인한 기록 확정</button><button class="button secondary" type="button" data-ai-reject="${h(d.id)}">초안 버리기</button></div></form></article>`).join('')}</div>`}<section class="section"><h3 class="section-title">최근 처리</h3><div class="card">${drafts.filter(d=>d.status!=='pending').slice(0,8).map(d=>`<div class="record"><strong>${h(label[d.type]||d.type)} · ${h(d.status==='confirmed'?'확정':'버림')}</strong><small>${h(stamp(d.updatedAt))}</small></div>`).join('')||'<p class="hint">처리한 초안이 없습니다.</p>'}</div></section>`;
}
const dateTimeISO=value=>{const raw=String(value||'');if(!raw)return '';const d=new Date(raw);if(Number.isNaN(d.getTime()))throw Error('기록 시각을 확인해 주세요.');return d.toISOString()};
function readEstimate(f,prefix,item){
 if(f.get(`${prefix}-estimated`)!=='on')return {estimated:false};
 const estimate={estimated:true,basis:String(f.get(`${prefix}-basis`)||'').trim()};
 for(const key of Object.keys(nutrient)){
  const central=f.get(prefix==='food'?key:`${prefix}-${key}`),min=f.get(`${prefix}-${key}Min`),max=f.get(`${prefix}-${key}Max`);
  if((String(min||'').trim()==='')!==(String(max||'').trim()===''))throw Error(`${nutrient[key]} 추정 범위의 최솟값과 최댓값을 모두 입력해 주세요.`);
  if(String(min||'').trim()==='')continue;
  const a=Number(min),b=Number(max),c=Number(central);
  if(!Number.isFinite(a)||!Number.isFinite(b)||a<0||b<a||String(central||'').trim()===''||c<a||c>b)throw Error(`${nutrient[key]} 수정값이 추정 범위를 벗어났습니다. 범위를 함께 수정해 주세요.`);
  estimate[`${key}Min`]=a;estimate[`${key}Max`]=b;
 }
 if(item.aiEstimate?.note)estimate.note=item.aiEstimate.note;
 return estimate;
}
export function readAIReviewValues(f,draft,setIndices=()=>[]){
  const data=structuredClone(draft.parsedData||{});
  if(draft.type==='meal'){
    if(!Array.isArray(data.items))throw Error('음식 초안 형식을 확인해 주세요.');
    data.items.forEach((item,i)=>{
      item.date=f.get(`item-${i}-date`);item.slot=String(f.get(`item-${i}-slot`)||'').trim();item.loggedAt=dateTimeISO(f.get(`item-${i}-loggedAt`));
      item.name=String(f.get(`item-${i}-name`)||'').trim();
      item.servingQty=f.get(`item-${i}-servingQty`);
      item.servingUnit=f.get(`item-${i}-servingUnit`);
      for(const key of Object.keys(nutrient))item[key]=f.get(`item-${i}-${key}`);
      item.aiEstimate=readEstimate(f,`item-${i}`,item);
    });
  }else if(draft.type==='workout'){
    data.date=f.get('date');data.title=f.get('title');data.gymName=f.get('gymName');
    data.exercises=(data.exercises||[]).flatMap((ex,i)=>{
      if(f.get(`ex-${i}-include`)!=='on')return [];
      const previousName=ex.name,previousId=ex.exerciseId;
      ex.name=String(f.get(`ex-${i}-name`)||'').trim();ex.exerciseId=String(f.get(`ex-${i}-exerciseId`)||'').trim();
      if(ex.name!==previousName&&ex.exerciseId===previousId){ex.exerciseId='';ex.primaryMuscleIds=[];ex.secondaryMuscleIds=[]}
      ex.part=String(f.get(`ex-${i}-part`)||'').trim();ex.machineId=String(f.get(`ex-${i}-machineId`)||'').trim();ex.weightBasis=f.get(`ex-${i}-weightBasis`);ex.repBasis=f.get(`ex-${i}-repBasis`);ex.handCount=Number(f.get(`ex-${i}-handCount`)||0);
      if(ex.kind==='cardio'){ex.durationMin=f.get(`ex-${i}-durationMin`);ex.distanceKm=f.get(`ex-${i}-distanceKm`)}
      ex.sets=setIndices(i).map(j=>{
        const previous=ex.sets?.[Number(j)]||{};
        const weight=f.get(`set-${i}-${j}-weight`),unit=f.get(`set-${i}-${j}-unit`),reps=f.get(`set-${i}-${j}-reps`);
        return {...previous,weight,originalWeight:weight,unit,originalUnit:unit,reps,completedAt:dateTimeISO(f.get(`set-${i}-${j}-completedAt`)),completed:true};
      });
      return [ex];
    });
  }else if(draft.type==='body'){
    data.date=f.get('date');for(const key of Object.keys(metric))data[key]=f.get(key);
  }else if(draft.type==='food'){
    data.name=f.get('name');data.servingQty=f.get('servingQty');data.servingUnit=f.get('servingUnit');
    for(const key of Object.keys(nutrient))data[key]=f.get(key);
    data.aiEstimate=readEstimate(f,'food',data);
  }else if(draft.type==='machine'){
    for(const key of ['name','manufacturer','model','location','unit','exerciseId'])data[key]=f.get(key);
    data.aliases=String(f.get('aliases')||'').split(',').map(x=>x.trim()).filter(Boolean);
  }else if(draft.type==='exercise'){
    for(const key of ['name','part','equipment','kind'])data[key]=f.get(key);
    data.primaryMuscleIds=f.getAll('primaryMuscleIds');data.secondaryMuscleIds=f.getAll('secondaryMuscleIds').filter(id=>!data.primaryMuscleIds.includes(id));
  }
  validateDraftRecords(draft,data);
  return data;
}
export function readAIReview(form,draft){return readAIReviewValues(new FormData(form),draft,i=>Array.from(form.querySelectorAll(`[data-ai-exercise="${i}"] [data-ai-set]`)).map(row=>row.dataset.aiSet))}
