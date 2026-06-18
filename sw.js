const CACHE_NAME = 'minijob-finder-v3';
const CORE_ASSETS = [
  './', './index.html', './manifest.json', './assets/css/style.css',
  './assets/js/core.js', './assets/js/device.js', './assets/js/theme.js', './assets/js/navigation.js', './assets/js/auth.js', './assets/js/jobs.js', './assets/js/map.js', './assets/js/chat.js', './assets/js/profile.js', './assets/js/features.js', './assets/js/app-init.js'
,
  './impressum.html'
,
  './datenschutz.html'
,
  './assets/js/social.js'
,
  './assets/js/quality.js'
,
  './assets/js/cookies.js'
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
    const copy = resp.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => null); return resp;
  }).catch(() => caches.match(event.request).then(resp => resp || caches.match('./index.html'))));
});
