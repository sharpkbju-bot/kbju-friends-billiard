// 캐시 버전을 v5.00으로 올려 이전 캐시를 초기화합니다.
const CACHE_NAME = 'billiard-v5.00';

// 설치 시 캐시 저장 (설치 버튼 활성화의 핵심)
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        './',
        './index.html',
        './style.css',      // 새로 분리된 스타일 파일 추가
        './main.js',        // 새로 분리된 스크립트 파일 추가
        './manifest.json',
        './image_0.png',    // 오프라인 아이콘 로딩을 위해 추가
        './image_1.jpg'     // 오프라인 배경 로딩을 위해 추가
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        // 현재 캐시 버전과 다르면 기존 캐시 삭제 (최신 업데이트 강제 적용)
        if (key !== CACHE_NAME) return caches.delete(key);
      }));
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});