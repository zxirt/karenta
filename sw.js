/**
 * Karenta Auto Serasi — Service Worker (Production Grade)
 * Strategy: Network-First untuk HTML/manifest, Stale-While-Revalidate untuk assets
 * Cache versioning: bump CACHE_VERSION setiap deploy baru
 */

// ── SELF-UNREGISTER jika SW ini ternyata dimuat dari blob URL ──
if (self.location.protocol === 'blob:') {
  console.warn('[SW] Detected blob: URL — unregistering self immediately');
  self.registration.unregister();
}

// !! BUMP INI SETIAP DEPLOY — paksa browser hapus cache lama !!
const CACHE_VERSION = 'v5';
const CACHE_STATIC  = `karenta-static-${CACHE_VERSION}`;
const CACHE_FONTS   = `karenta-fonts-${CACHE_VERSION}`;

const MAX_CACHE_SIZE = 50 * 1024 * 1024;

const SCOPE = self.registration.scope;
const PRECACHE_URLS = [
  SCOPE,
  SCOPE + 'index.html',
  SCOPE + 'manifest.json',
];

// URL yang TIDAK boleh di-cache — selalu network
const SKIP_CACHE_PATTERNS = [
  /firebasedatabase\.app/,
  /googleapis\.com\/identitytoolkit/,
  /securetoken\.googleapis\.com/,
  /chrome-extension:\/\//,
  /\.map$/,
];

// CDN yang boleh di-cache (font, lib statis)
const CDN_CACHE_PATTERNS = [
  /fonts\.googleapis\.com/,
  /fonts\.gstatic\.com/,
  /cdnjs\.cloudflare\.com/,
  /gstatic\.com\/firebasejs/,
];

// ── INSTALL ──
self.addEventListener('install', event => {
  // skipWaiting langsung agar SW baru segera aktif & hapus cache lama
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(err => {
        console.warn('[SW] Install cache failed (non-fatal):', err);
        return self.skipWaiting();
      })
  );
});

// ── ACTIVATE — hapus SEMUA cache lama tanpa terkecuali ──
self.addEventListener('activate', event => {
  const allowedCaches = [CACHE_STATIC, CACHE_FONTS];
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(
          keys
            .filter(key => !allowedCaches.includes(key))
            .map(key => {
              console.log('[SW] Deleting old cache:', key);
              return caches.delete(key);
            })
        )
      ),
      self.clients.claim(),
    ])
  );
});

// ── FETCH ──
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Jangan cache Firebase & auth
  if (SKIP_CACHE_PATTERNS.some(p => p.test(request.url))) return;

  // CDN assets — stale-while-revalidate
  if (CDN_CACHE_PATTERNS.some(p => p.test(request.url))) {
    event.respondWith(staleWhileRevalidate(request, CACHE_FONTS));
    return;
  }

  // HTML + manifest.json — SELALU network-first agar CSP & config terbaru langsung terpakai
  const isAppShell = url.pathname.endsWith('.html')
    || url.pathname.endsWith('/')
    || url.pathname.endsWith('/karenta')
    || url.pathname.endsWith('/karenta/')
    || url.pathname.endsWith('manifest.json');  // <-- penting: manifest juga network-first

  if (isAppShell) {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  // Assets lain (JS, CSS, gambar) — stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request, CACHE_STATIC));
});

// ── STRATEGI: Stale-While-Revalidate ──
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then(async response => {
      if (response.ok) {
        await enforceCacheSize(cache, MAX_CACHE_SIZE);
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || await networkPromise || offlineFallback(request);
}

// ── STRATEGI: Network-First dengan Fallback ──
async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_STATIC);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || offlineFallback(request);
  }
}

// ── OFFLINE FALLBACK ──
function offlineFallback(request) {
  const acceptsHTML = request.headers.get('Accept')?.includes('text/html');
  if (acceptsHTML) {
    return new Response(
      `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline — Karenta</title>
  <style>
    body { font-family: sans-serif; display: flex; align-items: center; justify-content: center;
           min-height: 100vh; margin: 0; background: #0b0b14; color: #eeeef5; }
    .box { text-align: center; padding: 2rem; }
    .icon { font-size: 48px; margin-bottom: 1rem; }
    h1 { font-size: 1.4rem; margin-bottom: 0.5rem; }
    p { color: #a0a0bc; font-size: 0.9rem; }
    button { margin-top: 1.5rem; padding: 10px 24px; background: #f0a500; border: none;
             border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
  </style>
</head>
<body>
  <div class="box">
    <div class="icon">📡</div>
    <h1>Tidak Ada Koneksi</h1>
    <p>Pastikan internet aktif lalu coba lagi.</p>
    <button onclick="location.reload()">Coba Lagi</button>
  </div>
</body>
</html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
  return new Response('Offline', { status: 503 });
}

// ── CACHE SIZE ENFORCEMENT ──
async function enforceCacheSize(cache, maxBytes) {
  try {
    const keys = await cache.keys();
    if (keys.length < 50) return;
    if (keys.length > 200) {
      const toDelete = keys.slice(0, 20);
      await Promise.all(toDelete.map(k => cache.delete(k)));
    }
  } catch { /* non-fatal */ }
}

// ── MESSAGE HANDLER ──
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
  }
  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
    );
  }
});
