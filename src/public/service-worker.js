const CACHE_NAME = "hs-cell-v4";

/* Instalação */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

/* Ativação - limpa caches antigos */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

/* Fetch - sempre busca online primeiro */
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});