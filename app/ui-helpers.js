import {exercisePickerHTML,muscleMapHTML,machineIconHTML} from './exercise-ui.js';
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const val = value => value ?? '';
const option = (items, selected) => items.map(item => `<option ${item===selected?'selected':''}>${esc(item)}</option>`).join('');
const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;

export function mealFormHTML({meal, date, recent=[], presets=[]}) {
  const m=meal||{};
  const qty=num(m.servingQty)||1;
  const base=k=>m[k]==null?'':Math.round((m[k]/qty)*10)/10;
  const choices=[...presets.map((x,i)=>({key:`preset:${i}`,name:x.name})),...recent.map((x,i)=>({key:`recent:${i}`,name:x.name}))];
  return `<div class="gap"><p class="hint">한 번 먹는 양의 영양값을 입력하고 수량을 정하세요. 총 섭취량을 저장합니다.</p>
    ${choices.length?`<div class="chip-row" aria-label="음식 빠른 선택">${choices.slice(0,12).map(x=>`<button type="button" class="chip" data-food-choice="${x.key}">${esc(x.name)}</button>`).join('')}</div>`:''}
    <form id="meal-form" class="form-grid">
      <label class="field">날짜<input name="date" type="date" required value="${esc(m.date||date)}"></label>
      <label class="field">끼니<select name="slot">${option(['아침','점심','저녁','간식','보충제'],m.slot||'아침')}</select></label>
      <label class="field wide">음식 이름<input name="name" required value="${esc(m.name||'')}" placeholder="예: 현미밥 1공기"></label>
      <label class="field">수량<input name="servingQty" type="number" min="0.1" step="0.1" value="${esc(qty)}"></label>
      <label class="field">단위<input name="servingUnit" value="${esc(m.servingUnit||'회')}" placeholder="회, 개, 접시"></label>
      <label class="field">1회 칼로리 kcal<input name="calories" type="number" min="0" step="0.1" value="${esc(base('calories'))}"></label>
      <label class="field">1회 탄수화물 g<input name="carbs" type="number" min="0" step="0.1" value="${esc(base('carbs'))}"></label>
      <label class="field">1회 단백질 g<input name="protein" type="number" min="0" step="0.1" value="${esc(base('protein'))}"></label>
      <label class="field">1회 지방 g<input name="fat" type="number" min="0" step="0.1" value="${esc(base('fat'))}"></label>
      <label class="field wide">영양값 출처<select name="source">${[['manual','사용자 직접 입력'],['label','제품 영양 라벨'],['estimate','추정값']].map(([value,label])=>`<option value="${value}" ${(m.source||'manual')===value?'selected':''}>${label}</option>`).join('')}</select></label><label class="field wide">메모<input name="note" value="${esc(m.note||'')}"></label>
      <div id="meal-preview" class="alert wide" role="status"></div>
      <button class="button wide">${meal?'식사 수정 저장':'식사 저장'}</button>
    </form></div>`;
}

export function mealPreview(form, scaleNutrition) {
  if(!form)return;
  const data=Object.fromEntries(new FormData(form));
  const quantity=Number(data.servingQty);
  const box=document.getElementById('meal-preview');
  if(!box)return;
  if(!Number.isFinite(quantity)||quantity<=0){box.textContent='수량은 0보다 커야 합니다.';return}
  const scaled=scaleNutrition(Object.fromEntries(['calories','carbs','protein','fat'].map(k=>[k,data[k]===''?null:Number(data[k])])),quantity);
  box.textContent=`총 ${scaled.calories??'—'} kcal · 탄수화물 ${scaled.carbs??'—'} g · 단백질 ${scaled.protein??'—'} g · 지방 ${scaled.fat??'—'} g`;
}

export function workoutFormHTML({draft,meta={},routine=false,latest=()=>null,estimate=()=>0,catalog=[],barbellWeightKg=20,machines=[],favorites=[],recentExercises=[],selection={},checkin={},routines=[]}) {
 const modes=[['basic','기본'],['build-up','빌드업'],['start-heavy','고중량 시작'],['5x5','5×5'],['top-set','탑세트'],['back-off','백오프']];
 const rating=(name,label,value)=>`<label class="field">${label}<select name="${name}"><option value="">미입력</option>${[1,2,3,4,5].map(n=>`<option value="${n}" ${Number(value)===n?'selected':''}>${n}</option>`).join('')}</select></label>`;
 return `<form id="workout-form" class="gap"><div class="form-grid">
 ${routine?'':`<label class="field">날짜<input name="date" type="date" required value="${esc(meta.date||'')}"></label><label class="field">운동 시간 분<input name="duration" type="number" min="0" value="${esc(val(meta.duration))}"></label>`}
 <label class="field wide">${routine?'루틴 이름':'운동 제목'}<input name="title" required value="${esc(meta.title||'')}"></label>
 ${routine?'':`${rating('condition','오늘 컨디션 · 1 낮음 / 5 좋음',meta.condition)}${rating('sleep','수면 만족도 · 1 낮음 / 5 좋음',checkin.sleep)}${rating('energy','에너지 · 1 낮음 / 5 좋음',checkin.energy)}${rating('soreness','근육통 · 1 없음 / 5 심함',checkin.soreness)}<label class="field wide">통증·부상 우려<select name="pain"><option value="">미확인</option><option value="false" ${checkin.pain===false?'selected':''}>없음</option><option value="true" ${checkin.pain===true?'selected':''}>있음 · 증량 제안 제외</option></select></label>`}
 </div>${exercisePickerHTML({catalog,favorites,recentExercises,selection,routines})}
 ${routine?'':`<div class="plate-calc"><label class="field">바벨 총 중량 kg<input id="plate-total" type="number" min="${barbellWeightKg}" step="0.5" placeholder="예: 60"></label><button type="button" class="button secondary" id="plate-calc">한쪽 원판 계산</button><span id="plate-result" class="hint">바벨 ${barbellWeightKg} kg 기준</span></div>`}
 <datalist id="exercise-catalog">${catalog.map(x=>`<option value="${esc(x.name)}">${esc(x.part)}</option>`).join('')}</datalist>
 <div id="exercise-list">${draft.map((ex,ei)=>{
 const prev=latest(ex.name,ex),isCardio=ex.kind==='cardio',oneRM=estimate(ex.name,ex),definition=catalog.find(x=>x.id===ex.exerciseId||x.name===ex.name)||{},primary=ex.primaryMuscleIds?.length?ex.primaryMuscleIds:definition.primaryMuscleIds||[],secondary=ex.secondaryMuscleIds?.length?ex.secondaryMuscleIds:definition.secondaryMuscleIds||[];
 return `<section class="exercise" data-ei="${ei}"><div class="row"><span class="eyebrow">종목 ${ei+1}</span><div class="exercise-order"><button type="button" data-move-ex="${ei}:-1" ${ei===0?'disabled':''} aria-label="종목 위로">↑</button><button type="button" data-move-ex="${ei}:1" ${ei===draft.length-1?'disabled':''} aria-label="종목 아래로">↓</button><button type="button" data-remove-ex="${ei}" aria-label="종목 삭제">삭제</button></div></div><div class="form-grid">
 <label class="field wide">종목 검색·직접 입력<input data-ex="name" list="exercise-catalog" value="${esc(ex.name)}" placeholder="예: 벤치프레스"></label>
 <label class="field">부위<select data-ex="part">${option(['가슴','등','하체','어깨','팔','복근','전신','유산소','기타'],ex.part||'가슴')}</select></label>
 <label class="field">종류<select data-ex="kind"><option value="strength" ${isCardio?'':'selected'}>근력</option><option value="cardio" ${isCardio?'selected':''}>유산소</option></select></label>
 <label class="field wide">머신·장비 프로필<select data-ex="machineId"><option value="">미지정 / 모름 / 프리웨이트</option>${machines.filter(m=>!m.exerciseId||m.exerciseId===ex.exerciseId||m.id===ex.machineId).map(m=>`<option value="${esc(m.id)}" ${m.id===ex.machineId?'selected':''}>${esc(m.name||[m.manufacturer,m.model].filter(Boolean).join(' ')||'사용자 머신')}</option>`).join('')}</select></label>
 <button type="button" class="text-button wide" data-new-machine="${ei}">＋ 머신 제조사·모델 등록</button>
 <label class="field wide">슈퍼세트 그룹<input data-ex="supersetGroup" value="${esc(ex.supersetGroup||'')}" placeholder="같은 그룹에 A 입력 · 선택사항"></label>
 ${isCardio?`<label class="field">운동 시간 분<input data-ex="durationMin" type="number" min="0" step="1" value="${esc(val(ex.durationMin))}"></label><label class="field">거리 km<input data-ex="distanceKm" type="number" min="0" step="0.01" value="${esc(val(ex.distanceKm))}"></label>`:''}</div>
 ${primary.length?`<details class="exercise-targets"><summary>주 타깃과 보조 타깃 보기</summary>${muscleMapHTML(primary,secondary,{key:`exercise-${ei}`})}</details>`:''}
 ${prev?`<div class="previous-record"><p>지난 기록: ${esc(prev)}${oneRM?` · 추정 1RM ${oneRM} kg`:''}</p><button type="button" class="text-button" data-apply-previous="${ei}">지난 세트 적용</button></div>`:''}
 ${isCardio?'<p class="hint">유산소는 시간·거리로 기록합니다.</p>':`<p class="hint">${routine?'목표 세트를 정하세요. 실제 완료 기록과 분리됩니다.':'입력값은 직접 수정할 수 있습니다. 수행한 세트만 완료로 표시하세요.'}</p>${ex.sets.map((s,si)=>`<div class="set-row set-card" data-si="${si}"><div class="set-card-head"><strong>${si+1}세트</strong>${s.targetWeight!=null||s.targetReps!=null?`<small>목표 ${esc(s.targetWeight??'—')} ${esc(s.targetUnit||s.unit||'kg')} × ${esc(s.targetReps??'—')}회</small>`:''}<label class="set-complete"><input data-set="completed" type="checkbox" ${s.completed===false?'':'checked'} aria-label="${si+1}세트 완료"><span>${routine?'목표':'완료'}</span></label></div>
 <div class="set-input-grid"><label class="field">중량<div class="step-input"><button type="button" data-step-set="${ei}:${si}:weight:-2.5" aria-label="중량 2.5 줄이기">−</button><input data-set="weight" type="number" inputmode="decimal" min="0" step="any" value="${esc(val(s.weight))}" aria-label="중량"><button type="button" data-step-set="${ei}:${si}:weight:2.5" aria-label="중량 2.5 늘리기">＋</button></div></label>
 <label class="field">단위<select data-set="unit" aria-label="중량 단위">${option(['kg','lb'],s.unit||'kg')}</select></label>
 <label class="field">횟수<div class="step-input"><button type="button" data-step-set="${ei}:${si}:reps:-1" aria-label="횟수 줄이기">−</button><input data-set="reps" type="number" inputmode="numeric" min="0" step="1" value="${esc(val(s.reps))}" aria-label="반복 횟수"><button type="button" data-step-set="${ei}:${si}:reps:1" aria-label="횟수 늘리기">＋</button></div></label>
 <label class="field">RPE<select data-set="rpe" aria-label="RPE"><option value="">미입력</option>${[5,6,7,7.5,8,8.5,9,9.5,10].map(n=>`<option value="${n}" ${Number(s.rpe)===n?'selected':''}>${n}</option>`).join('')}${s.rpe!=null&&![5,6,7,7.5,8,8.5,9,9.5,10].includes(Number(s.rpe))?`<option selected value="${esc(s.rpe)}">${esc(s.rpe)}</option>`:''}</select></label></div>
 <div class="set-card-footer"><select data-set="type" aria-label="세트 유형">${option(['본세트','워밍업','드롭세트','맨몸'],s.type||'본세트')}</select><button type="button" data-copy-set="${ei}:${si}">복사</button><button type="button" data-remove-set="${ei}:${si}" aria-label="${si+1}세트 삭제">삭제</button></div></div>`).join('')}
 <div class="chip-row">${modes.map(([key,label])=>`<button type="button" class="chip" data-assist="${ei}:${key}">${label}</button>`).join('')}</div><div class="actions"><button class="button secondary" type="button" data-add-set="${ei}">세트 추가</button><button class="button secondary" type="button" data-timer="90">휴식 90초</button></div>`}</section>`
 }).join('')}</div><button class="button secondary" type="button" id="add-ex">＋ 직접 종목 추가</button>
 ${routine?'':`<label class="field">운동 메모<input name="note" value="${esc(meta.note||'')}"></label>`}<button class="button">${routine?'루틴 저장':'운동 완료·저장'}</button></form>`;
}

function photoDB(){return new Promise((resolve,reject)=>{if(!globalThis.indexedDB)return reject(Error('이 기기에서는 사진 보관 기능을 사용할 수 없습니다.'));const req=indexedDB.open('myweightlog.photos',2);req.onupgradeneeded=()=>{for(const name of ['progress','recovery'])if(!req.result.objectStoreNames.contains(name))req.result.createObjectStore(name,{keyPath:'id'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
export async function saveProgressPhoto(file,date){if(!file?.type?.startsWith('image/'))throw Error('사진 파일을 선택해 주세요.');if(file.size>10*1024*1024)throw Error('사진은 10 MB 이하로 선택해 주세요.');const db=await photoDB();const item={id:globalThis.crypto?.randomUUID?.()||`${Date.now()}`,date,blob:file};await new Promise((resolve,reject)=>{const tx=db.transaction('progress','readwrite');tx.objectStore('progress').put(item);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close();return item.id}
export async function listProgressPhotos(){const db=await photoDB();const items=await new Promise((resolve,reject)=>{const req=db.transaction('progress').objectStore('progress').getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});db.close();return items.sort((a,b)=>a.date.localeCompare(b.date)).map(x=>({id:x.id,date:x.date,type:x.blob.type,url:URL.createObjectURL(x.blob)}))}
export async function deleteProgressPhoto(id){const db=await photoDB();await new Promise((resolve,reject)=>{const tx=db.transaction('progress','readwrite');tx.objectStore('progress').delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}
