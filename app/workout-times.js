export function setGap(sets=[],index){
 if(index<1)return '';
 const previous=Date.parse(sets[index-1]?.completedAt||''),current=Date.parse(sets[index]?.completedAt||'');
 if(!Number.isFinite(previous)||!Number.isFinite(current)||current<previous)return '';
 const minutes=Math.round((current-previous)/60000);
 return ` · 이전 세트 기록 후 ${minutes}분`;
}
