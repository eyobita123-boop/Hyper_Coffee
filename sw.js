// ============================================================
//  HYPER COFFEE — Service Worker v2.0
//  Cache-first with network fallback for critical assets,
//  navigation handling for clean URLs, and offline fallback.
// ============================================================

const CACHE_NAME = 'hyper-coffee-v2';
const OFFLINE_PAGE = 'index.html';

// ============================================================
//  PRECACHE ASSETS
//  (All critical files needed for offline browsing)
// ============================================================
const PRECACHE_ASSETS = [
  // HTML pages
  'index.html',
  'order.html',
  'training.html',
  'events.html',
  'journal.html',

  // Styles & scripts
  'assets/style.css',
  'assets/site.js',

  // External resources (fonts & icons)
  'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',

  // Optional: key images (adjust as needed)
  'assets/images/hyperlogo.png',
  // Add more critical images if needed (e.g., hero background, gallery thumbnails)
];

// ============================================================
//  INSTALL: Cache all assets
// ============================================================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Precaching assets…');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

// ============================================================
//  ACTIVATE: Clean old caches
// ============================================================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
    .then(() => {
      console.log('[SW] New cache activated, old ones cleaned.');
      return self.clients.claim(); // Take control of all pages
    })
  );
});

// ============================================================
//  FETCH: Cache-first with network fallback
//  (Navigation requests are handled specially for clean URLs)
// ============================================================
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // ====== 1. Navigation requests (HTML) – handle clean URLs ======
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Clone response to cache it for next time
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          // Fallback: try to serve cached page for this path
          return caches.match(request)
            .then(cached => {
              if (cached) return cached;
              // If not cached, serve offline page (index.html)
              return caches.match(OFFLINE_PAGE);
            });
        })
    );
    return;
  }

  // ====== 2. Static assets – cache-first ======
  // For CSS, JS, fonts, images, etc.
  const isStatic = (
    request.url.includes('/assets/') ||
    request.url.includes('fonts.googleapis.com') ||
    request.url.includes('cdnjs.cloudflare.com')
  );

  if (isStatic) {
    event.respondWith(
      caches.match(request)
        .then(cached => {
          if (cached) {
            // Return cached resource
            return cached;
          }
          // If not cached, fetch and cache for next time
          return fetch(request)
            .then(response => {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
              return response;
            })
            .catch(() => {
              // Optional: return a fallback image/asset if offline
              // For simplicity, we return a generic error response
              return new Response('Resource not available offline.', { status: 404 });
            });
        })
    );
    return;
  }

  // ====== 3. Everything else – network-first ======
  // API calls, external resources, etc.
  event.respondWith(
    fetch(request)
      .then(response => {
        // Cache a copy for offline use (optional)
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return response;
      })
      .catch(() => {
        // If offline and not cached, show a fallback
        return caches.match(request)
          .then(cached => cached || new Response('Please check your internet connection.', { status: 503 }));
      })
  );
});
