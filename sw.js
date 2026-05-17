// Billiard World Service Worker v9.53
const CACHE_NAME = 'billiard-v9.53'; // 캐시 강제 갱신
const ASSETS = [
    'index.html?v=9.53',
    'style.css?v=9.53',
    'main.js?v=9.53',
    'manifest.json?v=9.53',
    'image_0.png?v=9.53',
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
