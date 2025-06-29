const CACHE_NAME = "cardioucm-cache-v1";

// Archivos esenciales para el modo offline
const urlsToCache = [
  "/",
  "/index.html",
  "/site.webmanifest",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png",
  "/favicon.ico",
  "/apple-touch-icon.png"
];

// Instala y guarda en caché los archivos
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Activa y elimina cachés antiguas si las hay
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Intercepta peticiones y responde desde caché o red
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(event.request).catch(() => {
          // Podrías servir un archivo offline.html si lo agregas
        })
      );
    })
  );
});
