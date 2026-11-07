const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const positive=value=>Math.max(0,Number(value)||0);
const round=value=>Math.round(value*10)/10;

export function goalSettingsHTML(settings={}){
 const s=settings,mode=s.goalMode==='ratio'?'ratio':'grams';
 return `<section class="card nutrition-settings"><h3>일일 식단 목표</h3><p class="hint">g 또는 열량 비율로 설정하세요. 비율 모드에서는 목표 칼로리로 g을 계산합니다.</p><form id="goal-form" class="form-grid"><label class="field">목표 설정 방식<select name="goalMode"><option value="grams" ${mode==='grams'?'selected':''}>탄단지 g 직접 입력</option><option value="ratio" ${mode==='ratio'?'selected':''}>탄단지 열량 비율 %</option></select></label><label class="field">목표 칼로리 kcal<input name="calorieGoal" type="number" min="0" value="${esc(s.calorieGoal??2200)}"></label><label class="field">탄수화물 g<input name="carbsGoal" type="number" min="0" step="any" value="${esc(s.carbsGoal??250)}"></label><label class="field">단백질 g<input name="proteinGoal" type="number" min="0" step="any" value="${esc(s.proteinGoal??150)}"></label><label class="field">지방 g<input name="fatGoal" type="number" min="0" step="any" value="${esc(s.fatGoal??70)}"></label><div class="field wide"><strong>탄단지 목표 열량 비율</strong><p class="hint">비율 모드에서는 세 값을 합쳐 100%로 입력합니다.</p></div><label class="field">탄수화물 %<input name="carbsPctGoal" type="number" min="0" max="100" step="any" value="${esc(s.carbsPctGoal??40)}"></label><label class="field">단백질 %<input name="proteinPctGoal" type="number" min="0" max="100" step="any" value="${esc(s.proteinPctGoal??30)}"></label><label class="field">지방 %<input name="fatPctGoal" type="number" min="0" max="100" step="any" value="${esc(s.fatPctGoal??30)}"></label><label class="field wide">바벨 자체 중량 kg<input name="barbellWeightKg" type="number" min="0" step="0.5" value="${esc(s.barbellWeightKg??20)}"></label><button class="button wide">목표 저장</button></form></section>`;
}

export function saveGoalSettings(settings={},data={}){
 const mode=data.goalMode==='ratio'?'ratio':'grams';
 const out={...settings,goalMode:mode,calorieGoal:positive(data.calorieGoal),barbellWeightKg:positive(data.barbellWeightKg),carbsPctGoal:positive(data.carbsPctGoal),proteinPctGoal:positive(data.proteinPctGoal),fatPctGoal:positive(data.fatPctGoal)};
 if(mode==='ratio'){
  const sum=out.carbsPctGoal+out.proteinPctGoal+out.fatPctGoal;
  if(Math.abs(sum-100)>0.001)throw Error('탄단지 목표 비율의 합계를 100%로 맞춰 주세요.');
  out.carbsGoal=round(out.calorieGoal*out.carbsPctGoal/100/4);
  out.proteinGoal=round(out.calorieGoal*out.proteinPctGoal/100/4);
  out.fatGoal=round(out.calorieGoal*out.fatPctGoal/100/9);
 }else{
  out.carbsGoal=positive(data.carbsGoal);out.proteinGoal=positive(data.proteinGoal);out.fatGoal=positive(data.fatGoal);
 }
 return out;
}
