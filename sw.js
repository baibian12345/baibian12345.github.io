/* 生活管家 · Service Worker
   策略：同源资源「网络优先」，拿到新的就换缓存 —— 保证你升级后一打开就是新版；
   断网时才回落到缓存，所以离线也能用。
   v2.0.0 起：页面已用 CSP 的 connect-src 'none' 掐断所有跨域请求，
   这里对非同源请求直接放行、不缓存，也不做任何代理。 */
const CACHE = "life-keeper-2.2.1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-180.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ASSETS); })
      .catch(function () {})
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then(function (res) {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
        }
        return res;
      })
      .catch(function () {
        return caches.match(req).then(function (m) {
          if (m) return m;
          if (req.mode === "navigate") return caches.match("./index.html");
          return undefined;
        });
      })
  );
});
