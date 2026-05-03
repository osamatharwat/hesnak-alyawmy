const CACHE_NAME = 'hisn-v2';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800;900&display=swap'
];

// ===== INSTALL =====
self.addEventListener('install', e => {

  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
  );

  self.skipWaiting();
});

// ===== ACTIVATE =====
self.addEventListener('activate', e => {

  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );

  self.clients.claim();
});

// ===== FETCH - Offline First =====
self.addEventListener('fetch', e => {

  e.respondWith(

    caches.match(e.request).then(cached => {

      return cached ||

        fetch(e.request).catch(() =>
          caches.match('./index.html')
        );
    })
  );
});

// ===== PUSH NOTIFICATIONS =====
self.addEventListener('push', e => {

  const data = e.data ? e.data.json() : {};

  e.waitUntil(

    self.registration.showNotification(
      data.title || 'حصنك اليومي ✨',
      {
        body: data.body || 'وقت الذكر والدعاء 🌿',

        icon: './icons/icon-192x192.png',

        badge: './icons/icon-96x96.png',

        vibrate: [200, 100, 200],

        dir: 'rtl',

        lang: 'ar',

        tag: data.tag || 'hesnk-reminder',

        requireInteraction: false,

        actions: [
          {
            action: 'open',
            title: 'افتح التطبيق 🌿'
          },
          {
            action: 'dismiss',
            title: 'لاحقاً'
          }
        ]
      }
    )
  );
});

// ===== NOTIFICATION CLICK =====
self.addEventListener('notificationclick', e => {

  e.notification.close();

  if (e.action === 'dismiss') return;

  e.waitUntil(

    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(list => {

      if (list.length > 0) {

        return list[0].focus();
      }

      return clients.openWindow('./');
    })
  );
});

// ===== PERIODIC CHECK =====
self.addEventListener('periodicsync', e => {

  if (e.tag === 'hesnk-check') {

    e.waitUntil(checkAndNotify());
  }
});

// ===== LOCAL REMINDERS =====
async function checkAndNotify() {

  const now = new Date();

  const h = now.getHours();

  const m = now.getMinutes();

  const d = now.getDay();

  if (h === 6 && m === 0) {

    await self.registration.showNotification(
      '🌅 صباح الأذكار!',
      {
        body: 'ابدأ يومك بذكر الله يا بطل 🌿',

        icon: './icons/icon-192x192.png',

        dir: 'rtl',

        tag: 'morning-reminder'
      }
    );
  }

  if (h === 17 && m === 0) {

    await self.registration.showNotification(
      '🌙 أذكار المساء!',
      {
        body: 'اختم يومك بذكر الله وتنام محصن 🤍',

        icon: './icons/icon-192x192.png',

        dir: 'rtl',

        tag: 'evening-reminder'
      }
    );
  }

  if (d === 5 && h === 13 && m === 0) {

    await self.registration.showNotification(
      '📖 يوم الجمعة المبارك!',
      {
        body: 'سورة الكهف نور بين الجمعتين ✨',

        icon: './icons/icon-192x192.png',

        dir: 'rtl',

        tag: 'friday-reminder'
      }
    );
  }
}
