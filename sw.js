const CACHE_NAME = 'hesn-v4';

const BASE = '/hesnak-alyawmy/';

const ASSETS = [
  BASE,
  BASE + 'index.html',
  BASE + 'manifest.json',
  BASE + 'icons/icon-192x192.png',
  BASE + 'icons/icon-512x512.png'
];

// INSTALL
self.addEventListener('install', event => {

  event.waitUntil(

    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
  );

  self.skipWaiting();
});

// ACTIVATE
self.addEventListener('activate', event => {

  event.waitUntil(

    caches.keys().then(keys =>

      Promise.all(

        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

// FETCH
self.addEventListener('fetch', event => {

  event.respondWith(

    caches.match(event.request)
      .then(response => {

        return response ||

          fetch(event.request).catch(() =>

            caches.match(BASE + 'index.html')
          );
      })
  );
});

// NOTIFICATION CLICK
self.addEventListener('notificationclick', event => {

  event.notification.close();

  event.waitUntil(

    clients.openWindow(BASE)
  );
});
