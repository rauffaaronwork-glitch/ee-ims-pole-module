// Service worker: lets the app install, and keeps the last-seen pages and
// assets so the app still opens with a weak or no signal in the field.
// Network first, so students always get the newest version when online.
const CACHE = "pole-scanner-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  // only same-origin GETs; never cache the AI or data APIs, or dev hot-reload
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.includes("webpack-hmr") || url.pathname.startsWith("/_next/data")) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && (req.mode === "navigate" || url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icons"))) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(async () => (await caches.match(req)) || (req.mode === "navigate" ? caches.match("/student/poles/scan") : Response.error())),
  );
});
