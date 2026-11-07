import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),out=path.join(root,'dist');await fs.rm(out,{recursive:true,force:true});await fs.mkdir(path.join(out,'vendor','core'),{recursive:true});await fs.mkdir(path.join(out,'vendor','lang'),{recursive:true});
for(const f of ['native-auth.js','storage-scope.js','firebase-config.js','cloud-model.js','cloud-sync.js','cloud-ui.js','index.html','app.css','app.js','timeline-view.js','food-view.js','domain.js','store.js','inbody.js','inbody-photo.js','insights.js','training.js','ai-adapter.js','backup.js','session.js','meal-batch.js','model-features.js','exercise-ui.js','atlas-art.js','profile-forms.js','manifest.webmanifest','icon.svg','sw.js'])await fs.copyFile(path.join(root,f),path.join(out,f));
for(const f of ['catalog.js','nutrition.js','nutrition-goals.js','workout-times.js','reports.js','ui-helpers.js'])if(await fs.stat(path.join(root,f)).catch(()=>null))await fs.copyFile(path.join(root,f),path.join(out,f));
for(const f of ['tesseract.min.js','worker.min.js'])await fs.copyFile(path.join(root,'node_modules','tesseract.js','dist',f),path.join(out,'vendor',f));
const core=path.join(root,'node_modules','tesseract.js-core');for(const f of await fs.readdir(core))if(/^tesseract-core.*\.(wasm|js)$/.test(f))await fs.copyFile(path.join(core,f),path.join(out,'vendor','core',f));
for(const lang of ['kor','eng'])await fs.copyFile(path.join(root,'node_modules','@tesseract.js-data',lang,'4.0.0',`${lang}.traineddata.gz`),path.join(out,'vendor','lang',`${lang}.traineddata.gz`));





await fs.mkdir(path.join(out,'vendor','firebase'),{recursive:true});
for(const f of ['firebase-app.js','firebase-auth.js','firebase-firestore.js','NOTICE.txt','LICENSE.txt'])await fs.copyFile(path.join(root,'vendor','firebase',f),path.join(out,'vendor','firebase',f));

console.log(`배포용 웹 앱 생성: ${out}`);
await fs.cp(path.join(root,'vendor','capacitor'),path.join(out,'vendor','capacitor'),{recursive:true});
