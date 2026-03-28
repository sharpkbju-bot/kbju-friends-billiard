// share.js - 그리드 현상 해결 및 렌더링 최적화 버전
(function() {
    // html2canvas 라이브러리 로드 (기존 로직 유지)
    const script = document.createElement('script');
    script.src = "https://html2canvas.hertzen.com/dist/html2canvas.min.js";
    document.head.appendChild(script);

    script.onload = () => {
        const interval = setInterval(() => {
            const statsCard = document.querySelector('.stats-card');
            const title = statsCard ? statsCard.querySelector('h2') : null;

            if (statsCard && title) {
                if (document.getElementById('custom-share-btn')) {
                    clearInterval(interval);
                    return;
                }
                clearInterval(interval);

                const shareBtn = document.createElement('button');
                shareBtn.id = 'custom-share-btn';
                shareBtn.innerHTML = "📸 전적 스크린샷 공유";
                // 사용자님의 기존 버튼 스타일 유지
                shareBtn.style.cssText = `
                    width: 100%; padding: 12px; background: linear-gradient(145deg, #6a11cb, #2575fc);
                    color: white; border: none; border-radius: 18px; font-weight: 800;
                    margin: 10px 0 20px 0; display: block; box-shadow: 0px 4px 15px rgba(0,0,0,0.2);
                    cursor: pointer; font-size: 12px;
                `;

                shareBtn.onclick = async () => {
                    // 다크모드 여부 확인 로직 유지
                    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                    const targetColor = isDark ? '#1e1e1e' : '#ffffff';
                    
                    // 그리드 현상을 방지하기 위한 핵심 수정 사항
                    const canvas = await html2canvas(statsCard, {
                        backgroundColor: targetColor, // 배경색을 명시하여 회색 그리드 방지
                        scale: 3, // 해상도를 높여 선명도 확보
                        useCORS: true,
                        allowTaint: true,
                        scrollX: 0,
                        scrollY: -window.scrollY,
                        onclone: (clonedDoc) => {
                            const clonedCard = clonedDoc.querySelector('.stats-card');
                            if (clonedCard) {
                                clonedCard.style.backgroundColor = targetColor;
                                clonedCard.style.borderRadius = '28px';
                                clonedCard.style.overflow = 'hidden';
                                clonedCard.style.border = 'none'; // 미세한 잔상 제거
                                
                                const clonedBtn = clonedDoc.getElementById('custom-share-btn');
                                if(clonedBtn) clonedBtn.style.display = 'none';
                            }
                            // 기존 테이블 행 배경 설정 유지
                            const rows = clonedDoc.querySelectorAll('.stats-table tr');
                            rows.forEach(row => {
                                row.style.backgroundColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.4)';
                            });
                        }
                    });

                    canvas.toBlob(async (blob) => {
                        const file = new File([blob], 'billiard_rank.png', { type: 'image/png' });
                        if (navigator.share) {
                            try {
                                await navigator.share({ files: [file], title: '당구 전적', text: '오늘의 결과입니다!' });
                            } catch (e) { }
                        } else {
                            const link = document.createElement('a');
                            link.href = URL.createObjectURL(blob);
                            link.download = 'billiard_rank.png';
                            link.click();
                        }
                    }, 'image/png');
                };

                title.parentNode.insertBefore(shareBtn, title.nextSibling);
            }
        }, 500);
    };
})();
