/* 青衿：缓存站点资源，便于再次打开和弱网使用。 */
const VER = "qingjin-v18";
const PRECACHE = [
  "./",
  "./index.html",
  "./favicon.svg",
  "./manifest.webmanifest",
  "./assets/academy-core.js",
  "./assets/academy-ui.js",
  "./assets/academy.css",
  "./assets/app.js",
  "./assets/katex/contrib/auto-render.min.js",
  "./assets/katex/contrib/mhchem.min.js",
  "./assets/katex/fonts/KaTeX_AMS-Regular.woff",
  "./assets/katex/fonts/KaTeX_AMS-Regular.woff2",
  "./assets/katex/fonts/KaTeX_Caligraphic-Bold.woff",
  "./assets/katex/fonts/KaTeX_Caligraphic-Bold.woff2",
  "./assets/katex/fonts/KaTeX_Caligraphic-Regular.woff",
  "./assets/katex/fonts/KaTeX_Caligraphic-Regular.woff2",
  "./assets/katex/fonts/KaTeX_Fraktur-Bold.woff",
  "./assets/katex/fonts/KaTeX_Fraktur-Bold.woff2",
  "./assets/katex/fonts/KaTeX_Fraktur-Regular.woff",
  "./assets/katex/fonts/KaTeX_Fraktur-Regular.woff2",
  "./assets/katex/fonts/KaTeX_Main-Bold.woff",
  "./assets/katex/fonts/KaTeX_Main-Bold.woff2",
  "./assets/katex/fonts/KaTeX_Main-BoldItalic.woff",
  "./assets/katex/fonts/KaTeX_Main-BoldItalic.woff2",
  "./assets/katex/fonts/KaTeX_Main-Italic.woff",
  "./assets/katex/fonts/KaTeX_Main-Italic.woff2",
  "./assets/katex/fonts/KaTeX_Main-Regular.woff",
  "./assets/katex/fonts/KaTeX_Main-Regular.woff2",
  "./assets/katex/fonts/KaTeX_Math-BoldItalic.woff",
  "./assets/katex/fonts/KaTeX_Math-BoldItalic.woff2",
  "./assets/katex/fonts/KaTeX_Math-Italic.woff",
  "./assets/katex/fonts/KaTeX_Math-Italic.woff2",
  "./assets/katex/fonts/KaTeX_SansSerif-Bold.woff",
  "./assets/katex/fonts/KaTeX_SansSerif-Bold.woff2",
  "./assets/katex/fonts/KaTeX_SansSerif-Italic.woff",
  "./assets/katex/fonts/KaTeX_SansSerif-Italic.woff2",
  "./assets/katex/fonts/KaTeX_SansSerif-Regular.woff",
  "./assets/katex/fonts/KaTeX_SansSerif-Regular.woff2",
  "./assets/katex/fonts/KaTeX_Script-Regular.woff",
  "./assets/katex/fonts/KaTeX_Script-Regular.woff2",
  "./assets/katex/fonts/KaTeX_Size1-Regular.woff",
  "./assets/katex/fonts/KaTeX_Size1-Regular.woff2",
  "./assets/katex/fonts/KaTeX_Size2-Regular.woff",
  "./assets/katex/fonts/KaTeX_Size2-Regular.woff2",
  "./assets/katex/fonts/KaTeX_Size3-Regular.woff",
  "./assets/katex/fonts/KaTeX_Size3-Regular.woff2",
  "./assets/katex/fonts/KaTeX_Size4-Regular.woff",
  "./assets/katex/fonts/KaTeX_Size4-Regular.woff2",
  "./assets/katex/fonts/KaTeX_Typewriter-Regular.woff",
  "./assets/katex/fonts/KaTeX_Typewriter-Regular.woff2",
  "./assets/katex/katex.min.css",
  "./assets/katex/katex.min.js",
  "./assets/motion.css",
  "./assets/motion.js",
  "./assets/style.css",
  "./data/_counts.json",
  "./data/conclusions/biology.json",
  "./data/conclusions/chemistry.json",
  "./data/conclusions/chinese.json",
  "./data/conclusions/english.json",
  "./data/conclusions/geography.json",
  "./data/conclusions/history.json",
  "./data/conclusions/math.json",
  "./data/conclusions/physics.json",
  "./data/conclusions/politics.json",
  "./data/exams.json",
  "./data/formulas.json",
  "./data/knowledge/biology.json",
  "./data/knowledge/chemistry.json",
  "./data/knowledge/chinese.json",
  "./data/knowledge/english.json",
  "./data/knowledge/geography.json",
  "./data/knowledge/history.json",
  "./data/knowledge/math.json",
  "./data/knowledge/physics.json",
  "./data/knowledge/politics.json",
  "./data/meta.json",
  "./data/methods/biology.json",
  "./data/methods/chemistry.json",
  "./data/methods/chinese.json",
  "./data/methods/english.json",
  "./data/methods/geography.json",
  "./data/methods/history.json",
  "./data/methods/math.json",
  "./data/methods/physics.json",
  "./data/methods/politics.json",
  "./data/poetry.json",
  "./data/questions/biology.json",
  "./data/questions/chemistry.json",
  "./data/questions/chinese.json",
  "./data/questions/english.json",
  "./data/questions/geography.json",
  "./data/questions/history.json",
  "./data/questions/math.json",
  "./data/questions/physics.json",
  "./data/questions/politics.json",
  "./data/textbook.json",
  "./data/words.json",
  "./data/writing.json"
];

self.addEventListener("install", ev => {
  ev.waitUntil(caches.open(VER).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", ev => {
  ev.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("qingjin-") && k!==VER).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", ev => {
  const req = ev.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  ev.respondWith(
    caches.open(VER).then(cache => cache.match(req)).then(hit => {
      const fetched = fetch(req).then(res => {
        if (res && res.ok && res.type==="basic") {
          const copy = res.clone();
          caches.open(VER).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit || new Response("离线资源尚未准备，请联网打开一次后重试。",{status:503,headers:{"Content-Type":"text/plain;charset=utf-8"}}));
      return hit || fetched;
    })
  );
});
