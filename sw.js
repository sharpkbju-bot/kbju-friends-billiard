// Billiard World Service Worker v9.10
const CACHE_NAME = 'billiard-v9.10'; // 캐시 버전 업데이트로 UI 강제 갱신 유도
const ASSETS = [
    'index.html?v=9.10',
    'style.css?v=9.10',
    'main.js?v=9.10',
    'manifest.json?v=9.10',
    'image_0.png?v=9.10',
    'image_1.png'
];

self.addEventListener('install', (e) => {
    self.skipWaiting(); 
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key); 
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((res) => {
            return res || fetch(e.request);
        })
    );
});
