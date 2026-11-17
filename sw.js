/* 青衿：缓存站点资源，便于再次打开和弱网使用。 */
const VER = "qingjin-v17";
const PRECACHE = [
  "./",
  "./index.html",
  "./favicon.svg",
  "./manifest.webmanifest",
  "./assets/style.css",
  "./assets/motion.css",
  "./assets/motion.js",
  "./assets/app.js",
  "./assets/academy-core.js",
  "./assets/academy-ui.js",
  "./assets/academy.css",
  "./assets/katex/katex.min.css",
  "./assets/katex/katex.min.js",
  "./assets/katex/contrib/auto-render.min.js",
  "./assets/katex/contrib/mhchem.min.js",
  "./data/meta.json",
  "./data/textbook.json",
  "./data/conclusions/math.json",
  "./data/conclusions/physics.json",
  "./data/conclusions/chemistry.json",
  "./data/conclusions/biology.json"
];

self.addEventListener("install", ev => {
  ev.waitUntil(caches.open(VER).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", ev => {
  ev.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k!==VER).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", ev => {
  const req = ev.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  ev.respondWith(
    caches.match(req).then(hit => {
      const fetched = fetch(req).then(res => {
        if (res && res.ok && res.type==="basic") {
          const copy = res.clone();
          caches.open(VER).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || fetched;
    })
  );
});
