import test from 'node:test';
import assert from 'node:assert/strict';
import {workoutFormHTML} from '../ui-helpers.js';
import {exercisePickerHTML,muscleMapHTML} from '../exercise-ui.js';
import {latestEstimate,suggestSets} from '../training.js';

test('workout editor preserves original lb input, machine selection and set contracts',()=>{
 const html=workoutFormHTML({draft:[{name:'랫풀다운',exerciseId:'lat',machineId:'machine-a',part:'등',sets:[{weight:100,unit:'lb',reps:10,completed:false}]}],catalog:[{id:'lat',name:'랫풀다운',part:'등',primaryMuscleIds:['back']}],machines:[{id:'machine-a',manufacturer:'내 기구',model:'A'}],checkin:{pain:false,energy:3}});
 assert.match(html,/data-set="unit"[^>]*><option >kg<\/option><option selected>lb/);
 assert.match(html,/value="100" aria-label="중량"/);
 assert.match(html,/value="machine-a" selected/);
 assert.match(html,/data-step-set="0:0:weight:2.5"/);
 assert.match(html,/name="pain"/);
 assert.match(html,/value="false" selected/);
 assert.match(html,/주 타깃과 보조 타깃 보기/);
});
test('atlas exposes labeled targets and selectable parts without relying on color',()=>{
 const html=muscleMapHTML(['chest'],['triceps'],{interactive:true});
 assert.match(html,/가슴 주 타깃/);assert.match(html,/삼두 보조 타깃/);assert.match(html,/data-filter-part="가슴"/);assert.match(html,/tabindex="0"/);assert.match(html,/주: 가슴/);
});
test('favorite picker filters by stable id and escapes custom names',()=>{
 const html=exercisePickerHTML({catalog:[{id:'a',name:'<unsafe>',part:'가슴'},{id:'b',name:'두 번째',part:'등'}],favorites:['a'],selection:{tab:'favorites'}});
 assert.match(html,/data-pick-exercise="a"/);assert.doesNotMatch(html,/data-pick-exercise="b"/);assert.match(html,/&lt;unsafe&gt;/);
});
test('training estimates normalize lb and generated suggestions explicitly use kg',()=>{
 const estimate=latestEstimate([{exercises:[{name:'벤치',sets:[{weight:100,unit:'lb',reps:10}]}]}],'벤치');
 assert.equal(estimate,60.5);assert.equal(suggestSets('basic',estimate)[0].unit,'kg');
});
