// Billiard World Service Worker v9.02
const CACHE_NAME = 'billiard-v9.02'; // 캐시 버전 업데이트로 강제 갱신 유도
const ASSETS = [
    'index.html?v=9.01',
    'style.css?v=9.01',
    'main.js?v=9.01',
    'manifest.json?v=9.01',
    'image_0.png?v=9.01',
    'image_1.png'
];

self.addEventListener('install', (e) => {
    self.skipWaiting(); // 새로운 서비스 워커가 즉시 활성화되도록 설정
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
                        return caches.delete(key); // 과거 버전의 캐시를 삭제하여 용량 확보 및 충돌 방지
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
