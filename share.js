// share.js - 기존 코드를 수정하지 않고 기능을 추가하기 위한 외부 스크립트
(function() {
    // html2canvas 라이브러리 동적 로드 (이미지 캡처용)
    const script = document.createElement('script');
    script.src = "https://html2canvas.hertzen.com/dist/html2canvas.min.js";
    document.head.appendChild(script);

    script.onload = () => {
        // 통계 카드(stats-card) 상단에 공유 버튼을 동적으로 삽입
        const statsCard = document.querySelector('.stats-card');
        if (statsCard) {
            const shareBtn = document.createElement('button');
            shareBtn.innerHTML = "📸 전적 스크린샷 공유";
            shareBtn.style.cssText = `
                width: 100%;
                padding: 12px;
                background: linear-gradient(145deg, #6a11cb, #2575fc);
                color: white;
                border: none;
                border-radius: 15px;
                font-weight: 800;
                margin-bottom: 15px;
                box-shadow: 4px 4px 10px rgba(0,0,0,0.2);
                cursor: pointer;
            `;

            // 버튼 클릭 시 실행될 로직
            shareBtn.onclick = async () => {
                const canvas = await html2canvas(statsCard, {
                    backgroundColor: null,
                    useCORS: true,
                    scale: 2 // 화질 향상
                });

                canvas.toBlob(async (blob) => {
                    const file = new File([blob], 'billiard_stats.png', { type: 'image/png' });
                    if (navigator.share) {
                        try {
                            await navigator.share({
                                files: [file],
                                title: '당구 전적 공유',
                                text: '오늘의 당구 전적입니다!'
                            });
                        } catch (err) {
                            console.log('공유 취소 또는 오류');
                        }
                    } else {
                        alert("이 브라우저에서는 공유 기능을 지원하지 않습니다. 이미지를 길게 눌러 저장하세요.");
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.download = 'billiard_stats.png';
                        link.click();
                    }
                });
            };

            // 기존 카드 제목(h2) 바로 뒤에 버튼 삽입
            const title = statsCard.querySelector('h2');
            title.parentNode.insertBefore(shareBtn, title.nextSibling);
        }
    };
})();
