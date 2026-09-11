const CACHE_NAME = 'minijob-finder-v5';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/css/style.css',
  './assets/js/config/core.js',
  './assets/js/config/backend.js',
  './assets/js/ui/device.js',
  './assets/js/ui/theme.js',
  './assets/js/ui/navigation.js',
  './assets/js/utils/cookies.js',
  './assets/js/utils/social.js',
  './assets/js/services/auth.js',
  './assets/js/services/chat.js',
  './assets/js/services/notifications.js',
  './assets/js/features/jobs.js',
  './assets/js/features/map.js',
  './assets/js/features/profile.js',
  './assets/js/features/features.js',
  './assets/js/features/quality.js',
  './assets/js/app-init.js',
  './impressum.html',
  './datenschutz.html'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).catch(() => null));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).then(resp => {
    const copy = resp.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => null);
    return resp;
  }).catch(() => caches.match(event.request).then(resp => resp || caches.match('./index.html'))));
});
const CACHE_NAME = 'minijob-finder-v4';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/css/style.css',
  './assets/js/config/core.js',
  './assets/js/config/backend.js',
  './assets/js/ui/device.js',
  './assets/js/ui/theme.js',
  './assets/js/ui/navigation.js',
  './assets/js/utils/cookies.js',
  './assets/js/utils/social.js',
  './assets/js/services/auth.js',
  './assets/js/services/chat.js',
  './assets/js/services/notifications.js',
  './assets/js/features/jobs.js',
  './assets/js/features/map.js',
  './assets/js/features/profile.js',
  './assets/js/features/features.js',
  './assets/js/features/quality.js',
  './assets/js/app-init.js',
  './impressum.html',
  './datenschutz.html'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).catch(() => null));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).then(resp => {
    const copy = resp.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => null);
    return resp;
  }).catch(() => caches.match(event.request).then(resp => resp || caches.match('./index.html'))));
});
