const CACHE='myweightlog-shell-v10-cloud';
const FILES=['./storage-scope.js','./firebase-config.js','./cloud-model.js','./cloud-sync.js','./cloud-ui.js','./','./index.html','./app.css','./app.js','./domain.js','./store.js','./inbody.js','./inbody-photo.js','./insights.js','./training.js','./catalog.js','./nutrition.js','./reports.js','./ui-helpers.js','./ai-adapter.js','./backup.js','./session.js','./meal-batch.js','./model-features.js','./exercise-ui.js','./atlas-art.js','./profile-forms.js','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('myweightlog-')&&k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;e.respondWith(caches.match(e.request).then(x=>x||fetch(e.request)))});



