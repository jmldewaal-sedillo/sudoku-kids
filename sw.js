// ============================================================
// SERVICE WORKER – Sudoku Kids & Crazy Grids
// Paths are relative, so the app works from any folder
// (e.g. https://example.com/sudoku/ or GitHub Pages).
// Bump CACHE_VERSION on every release so players get the update.
// ============================================================
const CACHE_VERSION = 'sudoku-kids-v3';

// Test copy (folder "test" or "…-test"): its own cache name, so the test and
// the live version never share or delete each other's files. TEST_BUILD is
// filled in by the test deploy (commit id), so every test push is a new version.
const TEST_BUILD = '';
const IS_TEST = /(^|\/)(test|[^/]+-test)(\/|$)/.test(self.location.pathname);
const CACHE_FAMILY = IS_TEST ? 'sudoku-kids-test-' : 'sudoku-kids-v';
const CACHE_NAME = IS_TEST ? CACHE_VERSION.replace('sudoku-kids-', CACHE_FAMILY) + (TEST_BUILD ? '-' + TEST_BUILD : '') : CACHE_VERSION;
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './puzzles.js',
  './i18n.js',
  './script.js',
  './manifest.json',
  './privacy.html',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// Install: fetch every file fresh from the server (never from the browser's
// HTTP cache, or a new version could be built from old files).
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS.map(url => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

// Activate: remove our own older caches. Other caches on this domain (the
// test copy, other apps) are left alone.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith(CACHE_FAMILY) && k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first for our own files; offline fallback to the start page.
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(request, { ignoreSearch: request.mode === 'navigate' }).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(() => {
        if (request.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      });
    })
  );
});
