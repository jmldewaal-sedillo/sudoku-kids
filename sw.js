// ============================================================
// SERVICE WORKER – Sudoku Kids & Crazy Grids
// Paths are relative, so the app works from any folder
// (e.g. https://example.com/sudoku/ or GitHub Pages).
// Bump CACHE_VERSION on every release so players get the update.
// ============================================================
const CACHE_VERSION = 'sudoku-kids-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './puzzles.js',
  './i18n.js',
  './script.js',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first for our own files; offline fallback to the start page.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
