
// share.js - index.html을 수정하지 않고 기능을 추가하는 스크립트
(function() {
    // 1. 이미지 캡처 라이브러리 로드
    const script = document.createElement('script');
    script.src = "https://html2canvas.hertzen.com/dist/html2canvas.min.js";
    document.head.appendChild(script);

    script.onload = () => {
        // 2. 버튼을 넣을 위치(통계 카드) 찾기
        const interval = setInterval(() => {
            const statsCard = document.querySelector('.stats-card');
            if (statsCard) {
                clearInterval(interval); // 위치 찾으면 반복 중단
                
                // 중복 생성 방지
                if (document.getElementById('custom-share-btn')) return;

                const shareBtn = document.createElement('button');
                shareBtn.id = 'custom-share-btn';
                shareBtn.innerHTML = "📸 전적 스크린샷 공유";
                shareBtn.style.cssText = `
                    width: 95%; padding: 14px; background: linear-gradient(145deg, #6a11cb, #2575fc);
                    color: white; border: none; border-radius: 18px; font-weight: 800;
                    margin: 0 auto 20px auto; display: block; box-shadow: 4px 4px 15px rgba(0,0,0,0.15);
                    cursor: pointer; font-size: 14px;
                `;

                shareBtn.onclick = async () => {
                    // 웰컴 화면이나 로딩바가 스샷에 찍히지 않도록 처리
                    const canvas = await html2canvas(statsCard, {
                        backgroundColor: (document.documentElement.getAttribute('data-theme') === 'dark') ? '#222' : '#fff',
                        scale: 2,
                        logging: false
                    });

                    canvas.toBlob(async (blob) => {
                        const file = new File([blob], 'billiard_rank.png', { type: 'image/png' });
                        if (navigator.share) {
                            try {
                                await navigator.share({ files: [file], title: '당구 전적', text: '오늘의 결과입니다!' });
                            } catch (e) { /* 취소 시 무시 */ }
                        } else {
                            alert("공유 기능을 사용할 수 없는 브라우저입니다. 이미지를 저장하세요.");
                            const link = document.createElement('a');
                            link.href = URL.createObjectURL(blob);
                            link.download = 'billiard_rank.png';
                            link.click();
                        }
                    }, 'image/png');
                };

                // '📊 멤버별 누적 전적' 제목 아래에 삽입
                const title = statsCard.querySelector('h2');
                title.parentNode.insertBefore(shareBtn, title.nextSibling);
            }
        }, 500); // 0.5초마다 stats-card가 생성되었는지 확인
    };
})();
