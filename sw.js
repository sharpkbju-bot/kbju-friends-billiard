// Billiard World Service Worker v9.03
const CACHE_NAME = 'billiard-v9.03'; // 캐시 버전 업데이트로 레이아웃 교정 사항 강제 갱신 유도
const ASSETS = [
    'index.html?v=9.03',
    'style.css?v=9.03',
    'main.js?v=9.03',
    'manifest.json?v=9.03',
    'image_0.png?v=9.03',
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
                        return caches.delete(key); // 구버전 캐시 삭제를 통한 정합성 유지
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
