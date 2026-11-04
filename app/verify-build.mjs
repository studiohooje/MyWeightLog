import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const required=['index.html','app.js','app.css','domain.js','store.js','inbody.js','inbody-photo.js','insights.js','training.js','ai-adapter.js','sw.js','manifest.webmanifest','icon.svg','vendor/tesseract.min.js','vendor/worker.min.js','vendor/lang/kor.traineddata.gz','vendor/lang/eng.traineddata.gz','vendor/core/tesseract-core.wasm.js','vendor/core/tesseract-core.wasm'];
for(const f of required)await fs.access(path.join(root,f));
for(const f of (await fs.readdir(root)).filter(f=>f.endsWith('.js'))){
  const source=await fs.readFile(path.join(root,f),'utf8');
  for(const m of source.matchAll(/from ['"](\.\/[^'"]+)['"]/g))await fs.access(path.join(root,m[1]));
}
const sw=await fs.readFile(path.join(root,'sw.js'),'utf8');
for(const m of sw.matchAll(/'\.\/([^']+)'/g))if(m[1])await fs.access(path.join(root,m[1]));
const manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.webmanifest'),'utf8'));
if(manifest.display!=='standalone')throw Error('PWA display invalid');
console.log(`배포 파일 확인 완료: ${required.length}개 필수 파일, 모듈·오프라인 참조, PWA manifest`);


