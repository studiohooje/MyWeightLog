// General exercise names only. No third-party media or proprietary programs.
const strength={
 '가슴':['벤치프레스','인클라인 벤치프레스','덤벨 벤치프레스','클로즈그립 벤치프레스','원암 덤벨 체스트프레스','체스트 프레스','케이블 플라이','푸시업','딥스'],
 '등':['데드리프트','랫풀다운','풀업','바벨 로우','시티드 케이블 로우','원암 덤벨 로우','페이스 풀'],
 '하체':['스쿼트','프론트 스쿼트','고블릿 스쿼트','덤벨 프론트 스쿼트','불가리안 스플릿 스쿼트','덤벨 스텝업','레그 프레스','런지','루마니안 데드리프트','덤벨 루마니안 데드리프트','굿모닝','레그 익스텐션','레그 컬','카프 레이즈'],
 '어깨':['오버헤드 프레스','덤벨 숄더 프레스','사이드 레터럴 레이즈','리어 델트 플라이','프론트 레이즈'],
 '팔':['바벨 컬','덤벨 컬','해머 컬','덤벨 트라이셉스 익스텐션','덤벨 킥백','케이블 푸시다운','스컬 크러셔','오버헤드 트라이셉스 익스텐션'],
 '복근':['크런치','레그 레이즈','플랭크','케이블 크런치'],
 '전신':['버피','케틀벨 스윙','클린 앤 프레스','덤벨 슈트케이스 캐리']
};
const entries=[
 ...Object.entries(strength).flatMap(([part,names])=>names.map(name=>({name,part,kind:'strength'}))),
 ...['걷기','달리기','실내 자전거','야외 자전거','로잉 머신','스텝밀','줄넘기','수영','등산'].map(name=>({name,part:'유산소',kind:'cardio'}))
];
const primary={가슴:['chest'],등:['back'],하체:['quads','glutes'],어깨:['shoulders'],팔:['biceps','triceps'],복근:['abs'],전신:['back','quads'],유산소:[]};
const secondary={가슴:['triceps','shoulders'],등:['biceps'],하체:['hamstrings'],어깨:['triceps'],팔:[],복근:[],전신:['shoulders'],유산소:[]};
const muscleOverrides={
 '데드리프트':[['glutes','quads','hamstrings'],['erectors','traps','back']],
 '루마니안 데드리프트':[['hamstrings','glutes'],['erectors','adductors','traps']],
 '덤벨 루마니안 데드리프트':[['hamstrings','glutes'],['erectors','adductors','traps']],
 '굿모닝':[['hamstrings','glutes'],['erectors','adductors','traps']],
 '스쿼트':[['quads','glutes'],['hamstrings','abs']],
 '프론트 스쿼트':[['quads','glutes'],['hamstrings','abs']],
 '고블릿 스쿼트':[['quads','glutes'],['abs','back']],
 '덤벨 프론트 스쿼트':[['quads','glutes'],['abs']],
 '불가리안 스플릿 스쿼트':[['quads','glutes'],['hamstrings','abs','adductors']],
 '덤벨 스텝업':[['quads','glutes'],['hamstrings']],
 '덤벨 슈트케이스 캐리':[['forearms','abs'],['obliques','traps']],
 '벤치프레스':[['chest','triceps'],['shoulders']],
 '인클라인 벤치프레스':[['chest','triceps'],['shoulders']],
 '덤벨 벤치프레스':[['chest','triceps'],['shoulders']],
 '클로즈그립 벤치프레스':[['triceps','chest'],['shoulders']],
 '원암 덤벨 체스트프레스':[['chest','triceps'],['shoulders','abs']],
 '덤벨 트라이셉스 익스텐션':[['triceps'],['shoulders']],
 '덤벨 킥백':[['triceps'],[]],
 '페이스 풀':[['shoulders','back'],['biceps']],
 '레그 익스텐션':[['quads'],[]], '레그 컬':[['hamstrings'],[]], '카프 레이즈':[['calves'],[]],
 '바벨 컬':[['biceps'],[]], '덤벨 컬':[['biceps'],[]], '해머 컬':[['biceps'],[]],
 '케이블 푸시다운':[['triceps'],[]], '스컬 크러셔':[['triceps'],[]], '오버헤드 트라이셉스 익스텐션':[['triceps'],[]],
 '사이드 레터럴 레이즈':[['shoulders'],[]], '리어 델트 플라이':[['shoulders'],['back']], '프론트 레이즈':[['shoulders'],[]],
 '케이블 플라이':[['chest'],['shoulders']], '케틀벨 스윙':[['glutes','hamstrings'],['back']],
 '클린 앤 프레스':[['shoulders','quads'],['back','glutes']], '플랭크':[['abs'],[]]
};
const equipmentOverrides={
 '데드리프트':'바벨','루마니안 데드리프트':'바벨','굿모닝':'바벨','스쿼트':'바벨','프론트 스쿼트':'바벨',
 '벤치프레스':'바벨','인클라인 벤치프레스':'바벨','클로즈그립 벤치프레스':'바벨','바벨 로우':'바벨','바벨 컬':'바벨',
 '고블릿 스쿼트':'덤벨/케틀벨','불가리안 스플릿 스쿼트':'덤벨'
};
const aliases={
 '데드리프트':['바벨 데드리프트','컨벤셔널 데드리프트'],
 '루마니안 데드리프트':['바벨 루마니안 데드리프트','RDL'],
 '스쿼트':['바벨 백 스쿼트','백 스쿼트'],
 '프론트 스쿼트':['바벨 프론트 스쿼트'],
 '벤치프레스':['바벨 벤치프레스'],
 '인클라인 벤치프레스':['인클라인 바벨 벤치프레스'],
 '바벨 로우':['벤트오버 바벨 로우'],
 '불가리안 스플릿 스쿼트':['덤벨 불가리안 스플릿 스쿼트']
};
const oneHand=new Set(['원암 덤벨 로우','원암 덤벨 체스트프레스','덤벨 슈트케이스 캐리']);
const sourceUrls={
 '데드리프트':'https://www.nasm.org/resource-center/exercise-library/barbell-deadlift',
 '루마니안 데드리프트':'https://www.nasm.org/resource-center/exercise-library/romanian-deadlift-barbell',
 '덤벨 루마니안 데드리프트':'https://www.nasm.org/resource-center/exercise-library/dumbbell-romanian-deadlift',
 '굿모닝':'https://www.nasm.org/resource-center/exercise-library/good-mornings',
 '불가리안 스플릿 스쿼트':'https://www.nasm.org/resource-center/exercise-library/bulgarian-split-squat',
 '고블릿 스쿼트':'https://www.nasm.org/resource-center/blog/training/how-to-perform-goblet-squats',
 '덤벨 프론트 스쿼트':'https://www.nasm.org/resource-center/exercise-library/dumbbell-front-squat',
 '벤치프레스':'https://www.nasm.org/resource-center/exercise-library/barbell-bench-press',
 '인클라인 벤치프레스':'https://www.nasm.org/resource-center/exercise-library/incline-barbell-bench-press',
 '클로즈그립 벤치프레스':'https://www.nasm.org/resource-center/exercise-library/close-grip-bench-press',
 '바벨 컬':'https://www.nasm.org/resource-center/exercise-library/barbell-bicep-curl'
};
export const EXERCISE_CATALOG=Object.freeze(entries.map(x=>{
 const equipment=equipmentOverrides[x.name]||(/덤벨/.test(x.name)?'덤벨':/머신|프레스|풀다운|케이블|레그 컬|레그 익스텐션|스텝밀/.test(x.name)&&! /벤치|덤벨|오버헤드|클린/.test(x.name)?'머신':/푸시업|풀업|딥스|플랭크|크런치|버피/.test(x.name)?'맨몸':x.kind==='cardio'?'유산소':'프리웨이트');
 const dumbbell=equipment==='덤벨',hands=oneHand.has(x.name)?1:dumbbell?2:0;
 return {...x,id:'exercise:'+x.name,aliases:aliases[x.name]||[],equipment,
  weightBasis:dumbbell?'per-hand':'total',handCount:hands,repBasis:x.name==='불가리안 스플릿 스쿼트'?'per-side':'total',defaultWeight:0,
  weightDisplay:dumbbell?(hands===1?'한 손 기준':'한 손 기준 · 양손 각각'):'총중량',
  primaryMuscleIds:muscleOverrides[x.name]?.[0]||primary[x.part]||[],secondaryMuscleIds:muscleOverrides[x.name]?.[1]||secondary[x.part]||[],
  anatomyMapVersion:2,sourceUrl:sourceUrls[x.name]||''};
}));
export function searchExercises(query='',part=''){
 const q=String(query).trim().toLocaleLowerCase('ko');
 return EXERCISE_CATALOG.filter(x=>(!part||part==='전체'||x.part===part)&&(!q||[x.name,...x.aliases].some(name=>name.toLocaleLowerCase('ko').includes(q))));
}
const session=(title,names)=>({title,exercises:names.map(name=>{const x=EXERCISE_CATALOG.find(e=>e.name===name);return {exerciseId:x?.id,primaryMuscleIds:x?.primaryMuscleIds,secondaryMuscleIds:x?.secondaryMuscleIds,name,part:x?.part||'기타',kind:x?.kind||'strength',sets:[{weight:0,reps:8,type:'본세트',completed:true},{weight:0,reps:8,type:'본세트',completed:true},{weight:0,reps:8,type:'본세트',completed:true}]}})});
// Generic original templates. Zero weight explicitly means the user must choose a safe working load.
export const PROGRAM_TEMPLATES=Object.freeze([
 {id:'full-body',title:'전신 3회',description:'전신을 번갈아 기록하는 시작용 구성. 중량은 직접 결정하세요.',sessions:[session('전신 A',['스쿼트','벤치프레스','바벨 로우']),session('전신 B',['루마니안 데드리프트','오버헤드 프레스','랫풀다운']),session('전신 C',['레그 프레스','덤벨 벤치프레스','시티드 케이블 로우'])]},
 {id:'upper-lower',title:'상·하체 4회',description:'상체와 하체를 나누는 기록 틀입니다.',sessions:[session('상체 A',['벤치프레스','바벨 로우','오버헤드 프레스']),session('하체 A',['스쿼트','레그 컬','카프 레이즈']),session('상체 B',['덤벨 벤치프레스','랫풀다운','사이드 레터럴 레이즈']),session('하체 B',['루마니안 데드리프트','레그 프레스','런지'])]},
 {id:'push-pull-legs',title:'밀기·당기기·하체',description:'부위별 세션을 자유롭게 반복할 수 있는 기록 틀입니다.',sessions:[session('밀기',['벤치프레스','오버헤드 프레스','케이블 푸시다운']),session('당기기',['랫풀다운','시티드 케이블 로우','바벨 컬']),session('하체',['스쿼트','루마니안 데드리프트','레그 컬'])]}
]);
export function createRoutineFromProgram(programId,sessionIndex=0){
 const template=PROGRAM_TEMPLATES.find(x=>x.id===programId),selected=template?.sessions?.[sessionIndex];
 if(!selected)throw Error('프로그램 구성을 찾을 수 없습니다.');
 return structuredClone(selected);
}
