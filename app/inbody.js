// OCR 결과는 원본과 비교한 뒤 저장한다. 판독되지 않은 값은 null로 둔다.
function findAfter(text,pattern){const m=text.match(pattern);return m?Number(m[1]):null}
export function extractInbody(raw){const t=String(raw||'').replace(/,/g,'');const d=t.match(/(20\d{2})[.\-/]\s*(\d{1,2})[.\-/]\s*(\d{1,2})/);return {
  date:d?`${d[1]}-${d[2].padStart(2,'0')}-${d[3].padStart(2,'0')}`:null,
  weight:findAfter(t,/체중\s*(?:\(kg\))?\s*(\d+(?:\.\d+)?)/i),
  skeletalMuscle:findAfter(t,/골격근량\s*(?:\(kg\))?\s*(\d+(?:\.\d+)?)/i),
  bodyFatPct:findAfter(t,/체지방률\s*(?:\(%\))?\s*(\d+(?:\.\d+)?)/i),
  bodyFatMass:findAfter(t,/체지방량\s*(?:\(kg\))?\s*(\d+(?:\.\d+)?)/i),
  bmi:findAfter(t,/BMI\s*(?:\([^)]*\))?\s*(\d+(?:\.\d+)?)/i),
  score:findAfter(t,/인바디점수\s*(\d+(?:\.\d+)?)/i),
  visceralFatLevel:findAfter(t,/내장지방레벨\s*(\d+(?:\.\d+)?)/i),
  bmr:findAfter(t,/기초대사량\s*(\d+(?:\.\d+)?)/i)
}}
