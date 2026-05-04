const CACHE_NAME = 'hesnk-v1.2';
const ASSETS = ['/', '/index.html', '/manifest.json', '/icons/icon-192x192.png', '/icons/icon-512x512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => {
      return self.registration.showNotification('🆕 حصنك اليومي — تحديث جديد!', {
        body: 'في ميزات جديدة وتحسينات — افتح التطبيق وشوف 🌿',
        icon: '/icons/icon-192x192.png',
        dir: 'rtl', tag: 'app-update', vibrate: [200,100,200]
      });
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(c => c || fetch(e.request).catch(() => caches.match('/index.html'))));
});

self.addEventListener('push', e => {
  const d = e.data ? e.data.json() : {};
  e.waitUntil(self.registration.showNotification(d.title||'حصنك اليومي ✨',{body:d.body||'وقت الذكر 🌿',icon:'/icons/icon-192x192.png',vibrate:[200,100,200],dir:'rtl',tag:d.tag||'hesnk'}));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if(e.action==='dismiss') return;
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>{if(l.length>0)return l[0].focus();return clients.openWindow('/');}));
});
