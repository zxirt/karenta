/* Karenta PWA Service Worker v4.1 — Fixed for GitHub Pages CSP + Firebase */
const SW_VERSION  = 'karenta-v4.1';
const STATIC_CACHE  = 'karenta-static-v4.1';
const DYNAMIC_CACHE = 'karenta-dynamic-v4.1';

// Core static assets to pre-cache at install time
const STATIC_ASSETS = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// CDN resources to attempt caching (failures are silently ignored)
const CDN_URLS = [
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
];

// ── Domains that must NEVER be intercepted by the SW ──
// Firebase Auth, Realtime DB, Storage, and Google Identity use
// long-lived WebSocket/SSE connections — intercepting them breaks auth.
const BYPASS_HOSTNAMES = [
  'firebasedatabase.app',
  'firebaseio.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebaseinstallations.googleapis.com',
  'fcmregistrations.googleapis.com',
  'firebase.googleapis.com',
  'apis.google.com',
];

// ═══════════════════════════════════════
// INSTALL
// ═══════════════════════════════════════
self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      // Cache static assets (required)
      const staticCache = await caches.open(STATIC_CACHE);
      await staticCache.addAll(STATIC_ASSETS).catch(() => {});

      // Cache CDN resources (best-effort, non-blocking)
      const dynCache = await caches.open(DYNAMIC_CACHE);
      await Promise.allSettled(
        CDN_URLS.map(url =>
          fetch(url, { mode: 'cors', credentials: 'omit' })
            .then(res => { if(res.ok) dynCache.put(url, res); })
            .catch(() => {}) // Silently ignore CDN fetch failures
        )
      );

      // Take control immediately without waiting for tabs to close
      await self.skipWaiting();
    })()
  );
});

// ═══════════════════════════════════════
// ACTIVATE
// ═══════════════════════════════════════
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      // Delete ALL old caches from previous SW versions
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(k => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
          .map(k => caches.delete(k))
      );
      // Claim all open clients immediately
      await self.clients.claim();
    })()
  );
});

// ═══════════════════════════════════════
// FETCH — Intercept strategy
// ═══════════════════════════════════════
self.addEventListener('fetch', event => {
  const req = event.request;

  // Only handle GET requests
  if(req.method !== 'GET') return;

  let hostname = '';
  try { hostname = new URL(req.url).hostname; } catch { return; }

  // ── BYPASS: Firebase + Google Auth endpoints ──
  // These use long-poll / WebSocket — NEVER cache or intercept them
  if(BYPASS_HOSTNAMES.some(h => hostname.includes(h))) return;

  // ── BYPASS: chrome-extension and non-http(s) schemes ──
  if(!req.url.startsWith('http')) return;

  // ── Google Fonts CSS (network-first, short cache) ──
  if(hostname === 'fonts.googleapis.com'){
    event.respondWith(networkFirst(req));
    return;
  }

  // ── Font files from gstatic (cache-first, long-lived) ──
  if(hostname === 'fonts.gstatic.com'){
    event.respondWith(cacheFirst(req, DYNAMIC_CACHE));
    return;
  }

  // ── Firebase SDK + XLSX from CDN (stale-while-revalidate) ──
  if(hostname === 'www.gstatic.com' || hostname === 'cdnjs.cloudflare.com'){
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // ── Own-origin files (index.html, manifest, icons, SW) ──
  if(req.url.startsWith(self.location.origin)){
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // ── Everything else: network-first with cache fallback ──
  event.respondWith(networkFirst(req));
});

// ═══════════════════════════════════════
// CACHE STRATEGIES
// ═══════════════════════════════════════

async function cacheFirst(request, cacheName = DYNAMIC_CACHE) {
  try {
    const cached = await caches.match(request);
    if(cached) return cached;
    const response = await fetch(request);
    if(response && response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('', { status: 503 });
  }
}

async function networkFirst(request, cacheName = DYNAMIC_CACHE) {
  try {
    const response = await fetch(request);
    if(response && response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if(cached) return cached;
    // Return offline page for navigation requests
    if(request.mode === 'navigate'){
      const offlinePage = await caches.match('./index.html');
      if(offlinePage) return offlinePage;
    }
    return new Response('', { status: 503 });
  }
}

async function staleWhileRevalidate(request) {
  const cache  = await caches.open(STATIC_CACHE);
  const cached = await caches.match(request);

  // Revalidate in background regardless of hit/miss
  const fetchPromise = fetch(request).then(response => {
    if(response && response.ok){
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  // Return cached immediately if available, else wait for network
  if(cached) return cached;
  const fresh = await fetchPromise;
  if(fresh) return fresh;

  // Last resort for navigation: offline index.html
  if(request.mode === 'navigate'){
    const offlinePage = await caches.match('./index.html');
    if(offlinePage) return offlinePage;
  }

  return new Response('', { status: 503 });
}

// ═══════════════════════════════════════
// MESSAGES from main thread
// ═══════════════════════════════════════
self.addEventListener('message', event => {
  // Respond to explicit messages only — do NOT use implicit return true
  // (returning true from a message listener causes "message channel closed" errors)
  if(!event.data) return;

  if(event.data.type === 'SKIP_WAITING'){
    self.skipWaiting();
    // Explicitly respond if a port is provided
    if(event.ports && event.ports[0]){
      event.ports[0].postMessage({ done: true });
    }
  }

  if(event.data.type === 'GET_VERSION'){
    if(event.ports && event.ports[0]){
      event.ports[0].postMessage({ version: SW_VERSION });
    }
  }
});

// ═══════════════════════════════════════
// PUSH NOTIFICATIONS (optional)
// ═══════════════════════════════════════
self.addEventListener('push', event => {
  let data = { title: 'Karenta', body: 'Notifikasi baru' };
  try { data = event.data ? event.data.json() : data; } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body   : data.body,
      icon   : './icons/icon-192.png',
      badge  : './icons/icon-72.png',
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // Focus an existing tab if one is open
      for(const client of list){
        if(client.url.includes(self.location.origin) && 'focus' in client){
          return client.focus();
        }
      }
      // Otherwise open a new tab
      return clients.openWindow('./index.html');
    })
  );
});
