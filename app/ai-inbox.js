import {validateDraftRecords} from './ai-drafts.js';

const h=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>v==null?'':String(v);
const stamp=v=>v?.toDate?.()?.toLocaleString('ko-KR')||String(v||'');
const label={meal:'식단',workout:'운동',body:'몸·인바디',food:'새 음식',machine:'새 머신',exercise:'새 운동 종목'};
const metric={weight:'체중 kg',bodyFatPct:'체지방률 %',skeletalMuscle:'골격근량 kg',waistCm:'허리둘레 cm',bodyFatMass:'체지방량 kg',bmi:'BMI',score:'인바디 점수',visceralFatLevel:'내장지방 레벨',bmr:'기초대사량 kcal'};
const nutrient={calories:'칼로리 kcal',carbs:'탄수화물 g',protein:'단백질 g',fat:'지방 g'};
function evidenceSummary(e){if(!e||typeof e!=='object')return '';const parts=[e.source,e.note];if(Array.isArray(e.photos)&&e.photos.length)parts.push(`사진 ${e.photos.length}장 확인 정보`);return parts.filter(Boolean).map(x=>h(x)).join(' · ')}
function estimate(item,uncertainty){
  const e=item.aiEstimate||uncertainty||{};
  if(!e.estimated)return '';
  const range=e.caloriesMin!=null&&e.caloriesMax!=null?`${e.caloriesMin}~${e.caloriesMax} kcal`:'범위 미제공';
  const macros=[['carbs','탄수화물'],['protein','단백질'],['fat','지방']].filter(([key])=>e[`${key}Min`]!=null&&e[`${key}Max`]!=null).map(([key,label])=>`${label} ${e[`${key}Min`]}~${e[`${key}Max`]} g`);
  return `<details class="ai-estimate" title="추정 범위 ${h(range)}"><summary>약 ${h(item.calories)} kcal · 추정</summary><p>추정 범위 ${h(range)}${macros.length?` · ${h(macros.join(' · '))}`:''} · ${h(e.basis||'사진·대화 근거')}</p><p>정확하지 않을 수 있습니다. 분량과 영양값을 확인해 주세요.</p></details>`;
}
function mealEditor(draft){
  const items=draft.parsedData?.items||[];
  return `<div class="ai-items">${items.map((item,i)=>`<fieldset class="ai-item"><legend>음식 ${i+1}</legend><label class="field">음식 이름<input name="item-${i}-name" value="${h(item.name)}" required></label><div class="form-grid"><label class="field">분량<input name="item-${i}-servingQty" type="number" min="0.01" step="any" value="${h(num(item.servingQty))}" required></label><label class="field">단위<select name="item-${i}-servingUnit">${['g','개','회'].map(unit=>`<option value="${unit}" ${item.servingUnit===unit?'selected':''}>${unit}</option>`).join('')}</select></label></div><div class="form-grid">${Object.entries(nutrient).map(([key,text])=>`<label class="field">${text}<input name="item-${i}-${key}" type="number" min="0" step="any" value="${h(num(item[key]))}"></label>`).join('')}</div>${estimate(item,draft.uncertainty)}</fieldset>`).join('')}</div>`;
}
function workoutEditor(draft){
  const w=draft.parsedData||{};
  return `<label class="field">운동일<input name="date" type="date" value="${h(w.date)}" required></label><label class="field">운동날 이름<input name="title" value="${h(w.title||'오늘의 운동')}"></label><div class="ai-items">${(w.exercises||[]).map((ex,i)=>`<fieldset class="ai-item"><legend>${h(ex.name||`운동 ${i+1}`)}</legend><p class="hint">${h(ex.machineName||ex.machineId||'머신 미지정')} · ${h(ex.part||'부위 미지정')}</p>${(ex.sets||[]).map((set,j)=>`<div class="form-grid ai-set"><label class="field">${j+1}세트 중량<input name="set-${i}-${j}-weight" type="number" min="0" step="any" value="${h(num(set.weight))}" required></label><label class="field">단위<select name="set-${i}-${j}-unit">${['kg','lb'].map(unit=>`<option value="${unit}" ${set.unit===unit?'selected':''}>${unit}</option>`).join('')}</select></label><label class="field">반복<input name="set-${i}-${j}-reps" type="number" min="0" step="1" value="${h(num(set.reps))}" required></label></div>`).join('')}</fieldset>`).join('')}</div>`;
}
function bodyEditor(draft){const b=draft.parsedData||{};return `<label class="field">측정일<input name="date" type="date" value="${h(b.date)}" required></label><div class="form-grid">${Object.entries(metric).map(([key,text])=>`<label class="field">${text}<input name="${key}" type="number" min="0" step="any" value="${h(num(b[key]))}"></label>`).join('')}</div>`}
function catalogEditor(draft){const p=draft.parsedData||{};
  if(draft.type==='food')return `<label class="field">음식 이름<input name="name" required value="${h(p.name)}"></label><div class="form-grid"><label class="field">기준량<input name="servingQty" type="number" min="0.01" step="any" required value="${h(num(p.servingQty))}"></label><label class="field">단위<select name="servingUnit">${['g','개','회'].map(unit=>`<option value="${unit}" ${p.servingUnit===unit?'selected':''}>${unit}</option>`).join('')}</select></label></div><div class="form-grid">${Object.entries(nutrient).map(([key,text])=>`<label class="field">${text}<input name="${key}" type="number" min="0" step="any" value="${h(num(p[key]))}"></label>`).join('')}</div>${estimate(p,draft.uncertainty)}`;
  if(draft.type==='machine')return `<p class="hint">전체 사진과 명판 사진을 AI 대화에 제공한 뒤 제조사·모델을 확인한 초안만 등록할 수 있습니다. 원본 사진은 마웨로그 서버에 저장되지 않습니다.</p><label class="field">머신 별칭<input name="name" required value="${h(p.name)}"></label><div class="form-grid"><label class="field">제조사<input name="manufacturer" required value="${h(p.manufacturer)}"></label><label class="field">모델<input name="model" required value="${h(p.model)}"></label><label class="field">헬스장·지점<input name="location" value="${h(p.location)}"></label><label class="field">중량 단위<select name="unit">${['kg','lb'].map(unit=>`<option value="${unit}" ${p.unit===unit?'selected':''}>${unit}</option>`).join('')}</select></label></div><label class="field">연결 운동 ID<input name="exerciseId" value="${h(p.exerciseId)}"></label>`;
  return `<label class="field">운동 이름<input name="name" required value="${h(p.name)}"></label><div class="form-grid"><label class="field">주 부위<input name="part" value="${h(p.part)}"></label><label class="field">장비<input name="equipment" value="${h(p.equipment)}"></label><label class="field">종류<select name="kind">${['strength','cardio'].map(kind=>`<option value="${kind}" ${p.kind===kind?'selected':''}>${kind==='cardio'?'유산소':'근력'}</option>`).join('')}</select></label></div><p class="hint">주·보조 타깃은 AI가 조사한 초안에 포함됩니다. 확정 전 근육 지도를 확인해 주세요.</p>`;
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
  return `<div class="page-head"><div><span class="eyebrow">AI REVIEW</span><h2>AI 기록 검토함</h2><p>AI가 작성한 초안을 확인하고 확정하면 내 기록에 저장됩니다.</p></div><button class="button secondary" id="ai-inbox-refresh">새로고침</button></div>${error?`<div class="alert">${h(error)}</div>`:''}${loading?'<div class="card empty">초안을 불러오는 중입니다.</div>':!pending.length?'<div class="card empty">검토할 AI 초안이 없습니다. 연결된 AI에게 기록을 부탁해 보세요.</div>':`<div class="ai-draft-list">${pending.map(d=>`<article class="card ai-draft"><div class="ai-draft-head"><div><span class="eyebrow">${h(label[d.type]||d.type)}</span><h3>${h(d.type==='meal'?`${d.parsedData?.items?.[0]?.slot||'식사'} · ${d.parsedData?.items?.length||0}개 음식`:d.type==='workout'?d.parsedData?.title||'운동 초안':d.type==='body'?`${d.parsedData?.date||''} 측정`:d.parsedData?.name||'신규 항목')}</h3></div><time>${h(stamp(d.createdAt))}</time></div>${d.originalUtterance?`<blockquote>${h(d.originalUtterance)}</blockquote>`:''}${duplicateWarning(d,db)}${evidenceSummary(d.evidence)?`<p class="hint">근거: ${evidenceSummary(d.evidence)}</p>`:''}<form class="ai-review-form" data-ai-draft="${h(d.id)}">${d.type==='meal'?mealEditor(d):d.type==='workout'?workoutEditor(d):d.type==='body'?bodyEditor(d):catalogEditor(d)}<div class="actions"><button class="button" type="submit">확인한 기록 확정</button><button class="button secondary" type="button" data-ai-reject="${h(d.id)}">초안 버리기</button></div></form></article>`).join('')}</div>`}<section class="section"><h3 class="section-title">최근 처리</h3><div class="card">${drafts.filter(d=>d.status!=='pending').slice(0,8).map(d=>`<div class="record"><strong>${h(label[d.type]||d.type)} · ${h(d.status==='confirmed'?'확정':'버림')}</strong><small>${h(stamp(d.updatedAt))}</small></div>`).join('')||'<p class="hint">처리한 초안이 없습니다.</p>'}</div></section>`;
}
export function readAIReview(form,draft){
  const data=structuredClone(draft.parsedData||{}),f=new FormData(form);
  if(draft.type==='meal'){
    if(!Array.isArray(data.items))throw Error('음식 초안 형식을 확인해 주세요.');
    data.items.forEach((item,i)=>{
      item.name=String(f.get(`item-${i}-name`)||'').trim();
      item.servingQty=f.get(`item-${i}-servingQty`);
      item.servingUnit=f.get(`item-${i}-servingUnit`);
      for(const key of Object.keys(nutrient))item[key]=f.get(`item-${i}-${key}`);
    });
  }else if(draft.type==='workout'){
    data.date=f.get('date');data.title=f.get('title');
    (data.exercises||[]).forEach((ex,i)=>(ex.sets||[]).forEach((set,j)=>{
      set.weight=f.get(`set-${i}-${j}-weight`);set.originalWeight=set.weight;set.unit=f.get(`set-${i}-${j}-unit`);set.originalUnit=set.unit;set.reps=f.get(`set-${i}-${j}-reps`);
    }));
  }else if(draft.type==='body'){
    data.date=f.get('date');for(const key of Object.keys(metric))data[key]=f.get(key);
  }else if(draft.type==='food'){
    data.name=f.get('name');data.servingQty=f.get('servingQty');data.servingUnit=f.get('servingUnit');
    for(const key of Object.keys(nutrient))data[key]=f.get(key);
  }else if(draft.type==='machine'){
    for(const key of ['name','manufacturer','model','location','unit','exerciseId'])data[key]=f.get(key);
  }else if(draft.type==='exercise'){
    for(const key of ['name','part','equipment','kind'])data[key]=f.get(key);
  }
  validateDraftRecords(draft,data);
  return data;
}
