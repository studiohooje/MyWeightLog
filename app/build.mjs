import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),out=path.join(root,'dist');await fs.rm(out,{recursive:true,force:true});await fs.mkdir(path.join(out,'vendor','core'),{recursive:true});await fs.mkdir(path.join(out,'vendor','lang'),{recursive:true});
for(const f of ['storage-scope.js','firebase-config.js','cloud-model.js','cloud-sync.js','cloud-ui.js','index.html','app.css','app.js','domain.js','store.js','inbody.js','inbody-photo.js','insights.js','training.js','ai-adapter.js','backup.js','session.js','meal-batch.js','model-features.js','exercise-ui.js','atlas-art.js','profile-forms.js','manifest.webmanifest','icon.svg','sw.js'])await fs.copyFile(path.join(root,f),path.join(out,f));
for(const f of ['catalog.js','nutrition.js','reports.js','ui-helpers.js'])if(await fs.stat(path.join(root,f)).catch(()=>null))await fs.copyFile(path.join(root,f),path.join(out,f));
for(const f of ['tesseract.min.js','worker.min.js'])await fs.copyFile(path.join(root,'node_modules','tesseract.js','dist',f),path.join(out,'vendor',f));
const core=path.join(root,'node_modules','tesseract.js-core');for(const f of await fs.readdir(core))if(/^tesseract-core.*\.(wasm|js)$/.test(f))await fs.copyFile(path.join(core,f),path.join(out,'vendor','core',f));
for(const lang of ['kor','eng'])await fs.copyFile(path.join(root,'node_modules','@tesseract.js-data',lang,'4.0.0',`${lang}.traineddata.gz`),path.join(out,'vendor','lang',`${lang}.traineddata.gz`));
console.log(`배포용 웹 앱 생성: ${out}`);




await fs.cp(path.join(root,'licenses'),path.join(out,'licenses'),{recursive:true});
await fs.copyFile(path.join(root,'THIRD_PARTY_NOTICES.md'),path.join(out,'THIRD_PARTY_NOTICES.md'));
for(const f of ['tesseract.min.js.LICENSE.txt','worker.min.js.LICENSE.txt'])await fs.copyFile(path.join(root,'node_modules','tesseract.js','dist',f),path.join(out,'vendor',f));
