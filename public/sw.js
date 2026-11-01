/**
 * MUETY Storefront Service Worker
 * Offline Resilience & Asset Cache Authority
 * 
 * SECURITY DIRECTIVE:
 * - Strictly NEVER cache user authentication, cart, checkout, or admin routes.
 * - Stale-while-revalidate for public static images and fonts.
 * - Network-first for navigation HTML documents.
 */

const CACHE_NAME = 'muety-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/muety-logo-opt.png',
  '/diwali_hero_banner_mobile.webp',
  '/diwali_hero_banner.webp'
];

// Sensitive URLs that must NEVER be intercepted or cached
const EXCLUDED_PATTERNS = [
  /\/api\//,
  /\/admin/,
  /\/checkout/,
  /\/cart/,
  /\/__\/auth\//,
  /firestore\.googleapis\.com/,
  /identitytoolkit\.googleapis\.com/,
  /securetoken\.googleapis\.com/,
  /api\.razorpay\.com/,
  /connect\.facebook\.net/
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = request.url;

  // 1. Only intercept GET requests
  if (request.method !== 'GET') {
    return;
  }

  // 2. Bypass excluded patterns (Auth, Admin, API, Checkout, Cart, Razorpay, Meta Pixel)
  if (EXCLUDED_PATTERNS.some((pattern) => pattern.test(url))) {
    return;
  }

  // 3. Navigation requests: Network-First with Cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html') as Promise<Response>)
    );
    return;
  }

  // 4. Static assets (images, fonts, scripts): Stale-While-Revalidate
  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'style' ||
    request.destination === 'script'
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }
});

