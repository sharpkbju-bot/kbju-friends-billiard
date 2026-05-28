// Billiard World Service Worker v10.00
const CACHE_NAME = 'billiard-v10.00'; // 캐시 강제 갱신
const ASSETS = [
    'index.html?v=10.00',
    'style.css?v=10.00',
    'main.js?v=10.00',
    'manifest.json?v=10.00',
    'image_0.png?v=10.00',
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
