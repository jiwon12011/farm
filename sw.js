// 서비스 워커: 셸 프리캐시 + 에셋 캐시 우선
const VER = 'bandi-v2';
const SHELL = [
  '.', 'index.html', 'manifest.json',
  'css/style.css',
  'js/main.js', 'js/data/crops.js', 'js/data/maps.js',
  'js/engine/assets.js', 'js/engine/input.js', 'js/engine/save.js',
  'js/systems/farming.js', 'js/systems/spirit.js', 'js/ui/ui.js',
  'assets/fonts/neodgm.woff2',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VER).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(VER).then(c => c.put(e.request, copy));
      }
      return res;
    }))
  );
});
