const CACHE_NAME = 'nourish-shell-v1';
const APP_BASE = new URL('./', self.registration.scope);
const APP_SHELL = [
  './', 'index.html', 'styles.css', 'app.js', 'nutrition.js', 'storage.js',
  'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png',
  'icons/icon-512.png', 'icons/icon-maskable-512.png',
].map((path) => new URL(path, APP_BASE).href);
const APP_SHELL_URLS = new Set(APP_SHELL);
const APP_INDEX_URL = new URL('index.html', APP_BASE).href;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith('nourish-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key)),
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  const appNavigation = request.mode === 'navigate'
    && url.origin === APP_BASE.origin
    && (url.pathname === APP_BASE.pathname || url.pathname === new URL(APP_INDEX_URL).pathname);
  const shellAsset = APP_SHELL_URLS.has(url.href);
  if (request.method !== 'GET' || (!shellAsset && !appNavigation)) return;
  event.respondWith(fetch(request).then(async (response) => {
    if (response.ok && shellAsset) {
      const copy = response.clone();
      await caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
    }
    return response;
  }).catch(async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (appNavigation) {
      const app = await caches.match(APP_INDEX_URL);
      if (app) return app;
    }
    return new Response('This page is not available offline.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }));
});
