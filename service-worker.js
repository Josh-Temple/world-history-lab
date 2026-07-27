importScripts("/pwa/cache-policy.js");

const APP_SHELL_CACHE = "world-history-lab-shell-v6";
const RUNTIME_CACHE = "world-history-lab-runtime-v2";
const NETWORK_TIMEOUT_MS = 10000;
const REQUIRED_SHELL_URLS = ["/", "/index.html", "/pwa/cache-policy.js", "/pwa/register-sw.js"];
const OPTIONAL_SHELL_URLS = [
  "/pwa/manifest.webmanifest", "/styles/site.css", "/apps/shared/app-boot.js",
  "/apps/session-runner/index.html", "/apps/session-runner/app.js",
  "/apps/timeline-trainer/index.html", "/apps/timeline-trainer/src/main.js",
  "/apps/event-recognition/index.html", "/apps/event-recognition/app.js",
  "/apps/people-recognition/index.html", "/apps/people-recognition/app.js",
  "/apps/causality-drill/index.html", "/apps/causality-drill/app.js",
  "/apps/event-comparison/index.html", "/apps/event-comparison/app.js",
  "/apps/comparison-trainer/index.html", "/apps/comparison-trainer/main.js",
  "/apps/map-quiz/index.html", "/apps/map-quiz/app.js",
  "/apps/dashboard/index.html", "/apps/dashboard/main.js",
  "/apps/overview/index.html", "/derived/events.normalized.json", "/data/units/index.json"
];

async function fetchAndCache(cache, url, required) {
  try {
    const request = new Request(url, { cache: "reload" });
    const response = await fetch(request);
    if (!WHLCachePolicy.isCacheableResponse(request, response)) throw new Error(`invalid ${response.status} ${response.headers.get("content-type") || "MIME"}`);
    await cache.put(request, response.clone());
  } catch (error) {
    console.error("[service-worker] shell fetch failed", { url, required, error: String(error) });
    if (required) throw error;
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_SHELL_CACHE);
    for (const url of REQUIRED_SHELL_URLS) await fetchAndCache(cache, url, true);
    await Promise.all(OPTIONAL_SHELL_URLS.map((url) => fetchAndCache(cache, url, false)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keep = new Set([APP_SHELL_CACHE, RUNTIME_CACHE]);
    await Promise.all((await caches.keys()).filter((name) => name.startsWith("world-history-lab-") && !keep.has(name)).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  const kind = WHLCachePolicy.resourceKind(request);
  if (["document", "script", "json"].includes(kind)) event.respondWith(networkFirst(request));
  else event.respondWith(staleWhileRevalidate(request));
});

async function fetchWithTimeout(request) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
  try { return await fetch(request, { signal: controller.signal }); }
  finally { clearTimeout(timeout); }
}

async function validCached(request) {
  const response = await caches.match(request, { ignoreSearch: false });
  return WHLCachePolicy.isCacheableResponse(request, response) ? response : null;
}

async function networkFirst(request) {
  try {
    const response = await fetchWithTimeout(request);
    if (!WHLCachePolicy.isCacheableResponse(request, response)) return response;
    const cache = await caches.open(RUNTIME_CACHE);
    await cache.put(request, response.clone());
    return response;
  } catch {
    return (await validCached(request)) || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cached = await validCached(request);
  const network = fetch(request).then(async (response) => {
    if (WHLCachePolicy.isCacheableResponse(request, response)) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);
  return cached || (await network) || Response.error();
}
