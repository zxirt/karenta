/**
 * Karenta Auto Serasi — Service Worker (Production Grade)
 * Strategy: Stale-While-Revalidate untuk assets, Network-First untuk API
 * Cache versioning: bump CACHE_VERSION setiap deploy baru
 */

const CACHE_VERSION = 'v5';
const CACHE_STATIC  = `karenta-static-${CACHE_VERSION}`;
// Also nuke old cache names explicitly — ADD current version here before bumping CACHE_VERSION
const OLD_CACHES = ['karenta-v2','karenta-static-v3','karenta-fonts-v3','karenta-static-v4','karenta-fonts-v4'];
const CACHE_FONTS   = `karenta-fonts-${CACHE_VERSION}`;

// Maksimum ukuran cache (bytes) — 50MB
const MAX_CACHE_SIZE = 50 * 1024 * 1024;

// URL yang harus di-cache saat install
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
];

// Pattern URL yang tidak boleh di-cache
const SKIP_CACHE_PATTERNS = [
  /firebasedatabase\.app/,
  /googleapis\.com\/identitytoolkit/,
  /securetoken\.googleapis\.com/,
  /chrome-extension:\/\//,
];

// Pattern CDN yang bisa di-cache (font, library statis)
const CDN_CACHE_PATTERNS = [
  /fonts\.googleapis\.com/,
  /fonts\.gstatic\.com/,
  /cdnjs\.cloudflare\.com/,
  /gstatic\.com\/firebasejs/,
];

// ── INSTALL ──
self.addEventListener('install', event => {
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

// ── ACTIVATE — bersihkan cache lama ──
self.addEventListener('activate', event => {
  const allowedCaches = [CACHE_STATIC, CACHE_FONTS];

  event.waitUntil(
    Promise.all([
      // Hapus semua cache versi lama
      caches.keys().then(keys =>
        Promise.all(
          keys
            .filter(key => !allowedCaches.includes(key))
            .map(key => {
              console.log('[SW] Deleting old cache:', key);
              return caches.delete(key);
            })
            .concat(OLD_CACHES.map(k => caches.delete(k)))
        )
      ),
      // Claim semua client segera
      self.clients.claim(),
    ])
  );
});

// ── FETCH ──
self.addEventListener('fetch', event => {
  const { request } = event;

  // Hanya handle GET
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip Firebase & auth endpoints — selalu network
  if (SKIP_CACHE_PATTERNS.some(p => p.test(request.url))) {
    return; // biarkan browser handle langsung
  }

  // CDN assets — stale-while-revalidate dengan cache FONTS
  if (CDN_CACHE_PATTERNS.some(p => p.test(request.url))) {
    event.respondWith(staleWhileRevalidate(request, CACHE_FONTS));
    return;
  }

  // App shell (halaman utama) — network-first dengan fallback cache
  if (url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  // Assets lain — stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request, CACHE_STATIC));
});

// ── STRATEGI: Stale-While-Revalidate ──
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Revalidate di background (tidak ditunggu)
  const networkPromise = fetch(request)
    .then(async response => {
      if (response.ok) {
        await enforceCacheSize(cache, MAX_CACHE_SIZE);
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  // Return cache langsung jika ada, sambil update di background
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
    if (keys.length < 50) return; // skip kalau masih sedikit

    // Estimasi kasar — hapus 10 entry terlama jika terlalu banyak
    if (keys.length > 200) {
      const toDelete = keys.slice(0, 20);
      await Promise.all(toDelete.map(k => cache.delete(k)));
    }
  } catch {
    // non-fatal
  }
}

// ── MESSAGE HANDLER (dari app: paksa update) ──
self.addEventListener('message', event => {
  // PATCHED: jangan return true — cegah "message channel closed" warning
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
    );
    return;
  }
});
