import test from 'node:test';
import assert from 'node:assert/strict';

test('식단 수량 계산과 수정, 프로그램 운동 저장과 수정을 화면 이벤트로 수행한다',async()=>{
 const data=new Map(),events=new Map();
 const root={innerHTML:'',addEventListener:(type,handler)=>events.set(type,handler)};
 globalThis.localStorage={removeItem:key=>data.delete(key),getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
 globalThis.document={
  getElementById:id=>id==='app'?root:null,
  querySelector:()=>null,
  createElement:()=>({textContent:'',remove(){}}),
  body:{append(){}},
 };
 Object.defineProperty(globalThis,'navigator',{value:{},configurable:true});
 globalThis.location={protocol:'file:'};
 const previousFormData=globalThis.FormData;
 globalThis.FormData=class {constructor(form){this.form=form}*[Symbol.iterator](){yield* Object.entries(this.form.values)}};
 try{
  await import('../app.js');
  const click=async dataset=>events.get('click')({target:{closest:()=>({dataset})}});
  const submit=values=>events.get('submit')({preventDefault(){},target:{id:values._id,values}});
  await click({modal:'meal'});
  assert.match(root.innerHTML,/1회 칼로리/);
  submit({_id:'meal-form',date:'2026-11-01',slot:'점심',name:'테스트 식사',servingQty:'2',servingUnit:'접시',calories:'200',carbs:'20',protein:'10',fat:'4',note:''});
  let db=JSON.parse(data.get('myweightlog.v1'));
  assert.equal(db.meals[0].calories,400);
  assert.equal(db.meals[0].carbs,40);
  await click({mealEdit:db.meals[0].id});
  assert.match(root.innerHTML,/식사 수정 저장/);
  submit({_id:'meal-form',date:'2026-11-01',slot:'저녁',name:'수정한 식사',servingQty:'1',servingUnit:'접시',calories:'250',carbs:'25',protein:'12',fat:'5',note:''});
  db=JSON.parse(data.get('myweightlog.v1'));
  assert.equal(db.meals.length,1);
  assert.equal(db.meals[0].name,'수정한 식사');
  assert.equal(db.meals[0].calories,250);
  await click({program:'full-body:0'});
  assert.match(root.innerHTML,/스쿼트/);
  for(let i=0;i<3;i++)events.get('change')({target:{dataset:{set:'completed'},checked:true,closest:selector=>selector==='[data-ei]'?{dataset:{ei:String(i)}}:{dataset:{si:'0'},querySelector:()=>null}}});
  submit({_id:'workout-form',date:'2026-11-01',duration:'40',title:'전신 A',condition:'4',note:'확인'});
  db=JSON.parse(data.get('myweightlog.v1'));
  assert.equal(db.workouts.length,1);
  assert.equal(db.workouts[0].exercises.length,3);
  await click({workEdit:db.workouts[0].id});
  submit({_id:'workout-form',date:'2026-11-01',duration:'45',title:'수정 운동',condition:'3',note:'재확인'});
  db=JSON.parse(data.get('myweightlog.v1'));
  assert.equal(db.workouts.length,1);
  assert.equal(db.workouts[0].title,'수정 운동');
 }finally{globalThis.FormData=previousFormData}
});
