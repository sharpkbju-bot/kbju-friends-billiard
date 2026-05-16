// Billiard World Service Worker v9.48
const CACHE_NAME = 'billiard-v9.48'; // 캐시 강제 갱신
const ASSETS = [
    'index.html?v=9.48',
    'style.css?v=9.48',
    'main.js?v=9.48',
    'manifest.json?v=9.48',
    'image_0.png?v=9.48',
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
