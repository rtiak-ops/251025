const CACHE_NAME = 'bizflow-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-512.png'
];

// インストール時に基本的な資材をキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// リクエスト時にキャッシュがあれば返し、なければネットワークへ（Network First for API, Cache First for Assets）
self.addEventListener('fetch', (event) => {
  // APIリクエストは常にネットワーク優先
  if (event.request.url.includes('/api/') || event.request.url.includes('/ai/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        // オフラインかつキャッシュがない場合のフォールバック（任意）
        return undefined;
      });
    })
  );
});
