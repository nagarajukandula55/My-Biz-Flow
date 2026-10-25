const CACHE = "mbf-shell-v1";
const STATIC_ASSETS = ["/", "/downloads", "/logo-mark.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  const url = new URL(request.url);
  // Never cache partner/admin pages or API responses: they can contain tenant data.
  if (url.pathname.startsWith("/partner/") || url.pathname.startsWith("/admin/") || url.pathname.startsWith("/api/")) return;
  event.respondWith(fetch(request).catch(() => caches.match(request).then((cached) => cached || caches.match("/"))));
});
