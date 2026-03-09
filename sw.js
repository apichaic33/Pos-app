/**
 * POS-APP Service Worker v1
 * - Cache-first สำหรับ static assets
 * - Network-first สำหรับ API calls (Worker/GAS)
 */

const CACHE_NAME = 'pos-app-v5';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
];

// ── Install: cache static files ──────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // ถ้า cache บางไฟล์ไม่ได้ ก็ไม่ crash
        return cache.add('./index.html');
      });
    })
  );
  self.skipWaiting();
});

// ── Activate: clear old caches ───────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== CACHE_NAME)
          .map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: strategy by request type ─────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API calls → Network-first (ไม่ cache Worker/GAS responses)
  if (
    url.hostname.includes('workers.dev') ||
    url.hostname.includes('script.google.com') ||
    url.pathname.includes('exec')
  ) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'offline' }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // Static assets → Cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache successful GET responses
        if (
          response.ok &&
          event.request.method === 'GET' &&
          !url.pathname.includes('icon')
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
