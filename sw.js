const CACHE='chronicle-v2';const ASSETS=['./','index.html','styles.css','lessons-bahamian.js','lessons-caribbean.js','lessons-world.js','lessons-american.js','app.js','manifest.webmanifest','icons/icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
