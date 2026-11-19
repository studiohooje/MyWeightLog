import {mealTotals,workoutTotals} from './domain.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,d=0)=>Number(n||0).toLocaleString('ko-KR',{maximumFractionDigits:d});
const when=item=>item.loggedAt||item.createdAt||`${item.date}T12:00:00`;
const clock=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?'—':`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`};

export function mealGroups(meals=[]){
 const map=new Map();for(const meal of meals){const key=meal.mealGroupId||`legacy:${meal.slot||'식사'}`;if(!map.has(key))map.set(key,{key,at:when(meal),items:[]});const group=map.get(key);group.items.push(meal);if(when(meal)<group.at)group.at=when(meal)}
 return [...map.values()].sort((a,b)=>a.at.localeCompare(b.at));
}
export function workoutTitle(workout){const custom=String(workout.title||'').trim();if(custom&&custom!=='오늘의 운동')return custom;const names=(workout.exercises||[]).filter(e=>e.name&&((e.sets||[]).some(s=>s.completed!==false)||e.kind==='cardio')).map(e=>e.name);return names.length?`${names[0]}${names.length>1?` 외 ${names.length-1}종`:''}`:'운동 기록'}
export function renderHomeTimeline(db,date){
 const groups=mealGroups((db.meals||[]).filter(m=>m.date===date));const workouts=(db.workouts||[]).filter(w=>w.date===date);
 const events=[...groups.map((g,i)=>({type:'meal',at:g.at,group:g,index:i+1})),...workouts.map(w=>({type:'workout',at:when(w),workout:w}))].sort((a,b)=>a.at.localeCompare(b.at));
 const cards=events.map(item=>{
  if(item.type==='meal'){const g=item.group,m=mealTotals(g.items),names=g.items.map(x=>`${esc(x.name)} ${fmt(x.servingQty,1)}${esc(x.servingUnit||'회')}`).join(' · ');return `<article class="timeline-card"><div class="timeline-card-top"><strong>식사${item.index}</strong><time>${clock(g.at)}</time></div><p class="timeline-foods">${names}</p><div class="timeline-value"><strong>${fmt(m.calories)} <small>kcal</small></strong></div><div class="macrobar" aria-label="탄수화물 ${m.percent.carbs}%, 단백질 ${m.percent.protein}%, 지방 ${m.percent.fat}%"><i style="width:${m.percent.carbs}%"></i><i style="width:${m.percent.protein}%"></i><i style="width:${m.percent.fat}%"></i></div><p class="timeline-macros">탄수 ${fmt(m.carbs,1)}g · 단백질 ${fmt(m.protein,1)}g · 지방 ${fmt(m.fat,1)}g</p></article>`}
  const w=item.workout,t=workoutTotals(w),names=(w.exercises||[]).filter(e=>e.name).map(e=>e.name),preview=names.slice(0,3).map(esc).join(' · ');return `<article class="timeline-card"><div class="timeline-card-top"><span>운동</span><time>${clock(item.at)}</time></div><h3>${esc(workoutTitle(w))}</h3><p class="timeline-metrics">${t.exercises}종목 · ${t.sets}세트 · 볼륨 ${fmt(t.volume)}kg</p><p class="timeline-preview">${preview}${names.length>3?` 외 ${names.length-3}종`:''}</p><button class="text-button timeline-link" data-detail="${esc(w.id)}">전체 운동 보기 →</button></article>`
 }).join('');
 const body=(db.body||[]).filter(x=>x.date<=date).sort((a,b)=>b.date.localeCompare(a.date))[0];
 const mealTotal=mealTotals((db.meals||[]).filter(x=>x.date===date));
 const workoutSets=workouts.reduce((sum,w)=>sum+workoutTotals(w).sets,0);
 return `<section class="timeline-hero"><p class="timeline-date">MYWEIGHTLOG · ${esc(date)}</p><h2>가장 쉬운 건강 관리의 시작,<br><em>기록.</em></h2><p>한 끼, 한 세트씩 내 흐름을 알아가요.</p><div class="hero-glow" aria-hidden="true"></div></section><section class="section home-quick"><div class="section-title"><h3>빠른 기록</h3><small>지금 바로 남겨보세요</small></div><div class="actions"><button class="button" data-modal="batch">식사 기록 <span>↗</span></button><button class="button secondary" data-modal="workout">운동 기록 <span>↗</span></button><button class="button secondary" data-modal="body">몸 기록 <span>↗</span></button></div></section><section class="section home-overview"><div class="section-title"><h3>오늘 한눈에 보기</h3><small>기록이 쌓일수록 선명해져요</small></div><div class="home-stat-grid"><div class="home-stat"><small>체중</small><strong>${body?.weight?`${fmt(body.weight,1)}<span>kg</span>`:'—'}</strong><p>${body?'마지막 측정 '+esc(body.date):'첫 측정을 기다려요'}</p></div><div class="home-stat"><small>식단</small><strong>${fmt(mealTotal.calories)}<span>kcal</span></strong><p>${groups.length}번의 식사</p></div><div class="home-stat"><small>운동</small><strong>${workoutSets}<span>세트</span></strong><p>${workouts.length}번의 운동 기록</p></div></div></section><section class="section timeline-section"><div class="section-title"><h3>오늘의 타임라인</h3><button class="text-button" data-modal="quick">＋ 기록</button></div><div class="timeline-list">${cards||'<div class="card empty">첫 기록을 남기면 여기에 하루의 흐름이 쌓입니다.</div>'}</div></section>`;
}
