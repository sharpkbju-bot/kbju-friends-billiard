// share.js - 버튼 중복 방지 및 확대모드 캡처 렌더링 오류 개선 버전 (v5.51)
(function() {
    const script = document.createElement('script');
    script.src = "https://html2canvas.hertzen.com/dist/html2canvas.min.js";
    document.head.appendChild(script);

    script.onload = () => {
        const interval = setInterval(() => {
            const statsCard = document.querySelector('.stats-card');
            const title = statsCard ? statsCard.querySelector('h2') : null;

            if (statsCard && title) {
                // 중복 체크: 이미 커스텀 버튼이 있다면 중단
                if (document.getElementById('custom-share-btn')) {
                    clearInterval(interval);
                    return;
                }

                clearInterval(interval);

                const shareBtn = document.createElement('button');
                shareBtn.id = 'custom-share-btn';
                shareBtn.innerHTML = "📸 전적 스크린샷 공유";
                shareBtn.style.cssText = `
                    width: 100%; padding: 12px; background: linear-gradient(145deg, #6a11cb, #2575fc);
                    color: white; border: none; border-radius: 18px; font-weight: 800;
                    margin: 10 auto 20px 0; display: block; box-shadow: 0px 4px 15px rgba(0,0,0,0.2);
                    cursor: pointer; font-size: 12px;
                `;

                shareBtn.onclick = async () => {
                    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                    const richArea = document.getElementById('richFriendArea');
                    
                    // v5.51: 누적 전적도 캡처 전 줌(zoom) 효과 임시 해제하여 겹침 방지
                    const isZoomed = document.body.classList.contains('zoom-active');
                    const originalZoom = document.body.style.zoom;
                    
                    if (isZoomed) {
                        document.body.style.zoom = '1';
                        document.body.classList.remove('zoom-active');
                        await new Promise(r => setTimeout(r, 150));
                    }
                    
                    try {
                        const canvas = await html2canvas(statsCard, {
                            backgroundColor: null, 
                            scale: 2,
                            useCORS: true,
                            allowTaint: true,
                            scrollX: 0,
                            scrollY: -window.scrollY,
                            onclone: (clonedDoc) => {
                                const clonedCard = clonedDoc.querySelector('.stats-card');
                                if (clonedCard) {
                                    clonedCard.style.backgroundColor = isDark ? '#1e1e1e' : '#ffffff';
                                    clonedCard.style.borderRadius = '28px';
                                    clonedCard.style.overflow = 'hidden';
                                    // 캡처본에서는 버튼 숨기기
                                    const clonedBtn = clonedDoc.getElementById('custom-share-btn');
                                    if(clonedBtn) clonedBtn.style.display = 'none';
                                }

                                const clonedRichArea = clonedDoc.getElementById('richFriendArea');
                                if(clonedRichArea) {
                                    clonedRichArea.style.boxShadow = 'none';
                                    clonedRichArea.style.border = 'none';
                                    clonedRichArea.style.width = '100%';
                                    clonedRichArea.style.margin = '20px 0 0 0';
                                    if(isDark) clonedRichArea.style.backgroundColor = 'rgba(50, 50, 50, 0.8)';
                                }
                                
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
                    } catch (err) {
                        console.error('Capture failed', err);
                    } finally {
                        // v5.51: 캡처 종료 후 줌 상태 복구
                        if (isZoomed) {
                            document.body.style.zoom = originalZoom;
                            document.body.classList.add('zoom-active');
                        }
                    }
                };

                // 전적 카드 제목(h2) 바로 아래에 버튼 삽입
                title.parentNode.insertBefore(shareBtn, title.nextSibling);
            }
        }, 500);
    };
})();
