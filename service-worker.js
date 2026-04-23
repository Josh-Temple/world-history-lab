const APP_SHELL_CACHE = 'world-history-lab-shell-v2';
const RUNTIME_CACHE = 'world-history-lab-runtime-v1';
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/pwa/manifest.webmanifest',
  '/pwa/register-sw.js',
  '/assets/pwa/icon.svg',
  '/assets/pwa/icon-maskable.svg',
  '/assets/pwa/apple-touch-icon.svg',
  '/styles/site.css',
  '/apps/timeline-trainer/',
  '/apps/timeline-trainer/index.html',
  '/apps/timeline-trainer/src/main.js',
  '/apps/timeline-trainer/src/App.js',
  '/apps/timeline-trainer/src/styles.css',
  '/apps/timeline-trainer/src/types.js',
  '/apps/timeline-trainer/src/data/loaders.js',
  '/apps/timeline-trainer/src/logic/question-generator.js',
  '/apps/event-recognition/',
  '/apps/event-recognition/index.html',
  '/apps/event-recognition/app.js',
  '/apps/event-recognition/styles.css',
  '/apps/causality-builder/',
  '/apps/causality-builder/index.html',
  '/apps/causality-builder/app.js',
  '/apps/causality-builder/styles.css',
  '/apps/causal-chain/',
  '/apps/causal-chain/index.html',
  '/apps/causal-chain/app.js',
  '/apps/causality-drill/',
  '/apps/causality-drill/index.html',
  '/apps/causality-drill/app.js',
  '/data/derived/causal_chains.json',
  '/apps/history-player/',
  '/apps/history-player/index.html',
  '/apps/map-quiz/',
  '/apps/map-quiz/index.html',
  '/apps/map-quiz/app.js',
  '/apps/graph-explorer/',
  '/apps/graph-explorer/index.html',
  '/apps/graph-explorer/app.js',
  '/apps/shared/data-store.js',
  '/apps/shared/header.js',
  '/apps/shared/data-access.js',
  '/derived/events.normalized.json',
  '/data/units/index.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((name) => ![APP_SHELL_CACHE, RUNTIME_CACHE].includes(name))
        .map((name) => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(request);
      } catch {
        const cache = await caches.open(APP_SHELL_CACHE);
        return (await cache.match('/index.html')) || Response.error();
      }
    })());
    return;
  }

  const isDataRequest = url.pathname.endsWith('.json');
  event.respondWith(isDataRequest ? networkFirst(request) : staleWhileRevalidate(request));
});

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || (await caches.match(request)) || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(APP_SHELL_CACHE);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached || (await networkPromise) || Response.error();
}
