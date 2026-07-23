/* My Watch Collection · service worker v3
   Estrategia: red-primero para la app (las actualizaciones llegan solas);
   caché como respaldo para funcionar sin internet. */
const CACHE = "mwc-v3";
const SHELL = ["./", "./index.html", "./manifest.json", "./icon-180.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (url.hostname.includes("script.google.com") || url.hostname.includes("drive.google.com")) return;
  if (e.request.method !== "GET") return;

  const esApp = e.request.mode === "navigate" || url.pathname.endsWith("/index.html") || url.pathname.endsWith("/");

  if (esApp) {
    // RED PRIMERO: siempre intenta traer la versión nueva; caché solo si no hay internet
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request).then(hit => hit || caches.match("./index.html")))
    );
  } else {
    // Iconos/manifest: caché primero (no cambian casi nunca)
    e.respondWith(
      caches.match(e.request).then(hit =>
        hit || fetch(e.request).then(res => {
          if (url.origin === location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, copy));
          }
          return res;
        }).catch(() => hit)
      )
    );
  }
});
