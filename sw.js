/**
 * POS-APP Service Worker
 * ═══════════════════════════════════════════════════════════
 * วิธีบังคับให้ iPhone อัปเดต:
 *   → เปลี่ยน APP_VERSION ทุกครั้งที่ deploy index.html ใหม่
 *   → SW จะ detect ว่า cache name เปลี่ยน → ลบของเก่า → โหลดใหม่อัตโนมัติ
 * ═══════════════════════════════════════════════════════════
 */

// ⚠️ เปลี่ยนตัวเลขนี้ทุกครั้งที่ deploy เวอร์ชันใหม่
const APP_VERSION = '5.4.0';
const CACHE_NAME  = `pos-app-${APP_VERSION}`;

const PRECACHE = [
  './index.html',
  './manifest.json',
  './css/app.css',
  './js/db.js',
  './js/order.js',
  './js/manage.js',
  './js/promo.js',
  './js/report.js',
  './js/options.js',
  './js/staff.js',
  './js/inventory.js',
  './js/firebase.js',
  './js/sync.js',
  './js/auth.js',
  './js/init.js',
];

// ─── INSTALL ─────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => caches.open(CACHE_NAME).then(c => c.add('./index.html')))
  );
  self.skipWaiting();
});

// ─── ACTIVATE — ลบ cache เก่าทันที ───────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((n) => n.startsWith('pos-app-') && n !== CACHE_NAME)
          .map((n) => { console.log('[SW] ลบ cache เก่า:', n); return caches.delete(n); })
      ))
      .then(() => self.clients.claim())
  );
});

// ─── FETCH ───────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1) API → Network Only
  if (url.hostname.includes('workers.dev') ||
      url.hostname.includes('script.google.com') ||
      url.searchParams.has('action')) {
    event.respondWith(
      fetch(req).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // 2) HTML → Network-First (iPhone จะโหลดเวอร์ชันใหม่เสมอ)
  if (url.pathname === '/' || url.pathname.endsWith('/index.html')) {
    event.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 3) Static assets → Cache-First
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok && req.method === 'GET') {
          caches.open(CACHE_NAME).then((c) => c.put(req, res.clone()));
        }
        return res;
      }).catch(() => new Response('Not found', { status: 404 }));
    })
  );
});

// ─── MESSAGE ─────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'GET_VERSION') {
    event.source?.postMessage({ type: 'VERSION', version: APP_VERSION, cache: CACHE_NAME });
  }
});
