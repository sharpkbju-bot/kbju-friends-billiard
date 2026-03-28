// share.js - 그리드 현상 해결 및 렌더링 최적화 버전
(function() {
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
                shareBtn.style.cssText = `
                    width: 100%; padding: 12px; background: linear-gradient(145deg, #6a11cb, #2575fc);
                    color: white; border: none; border-radius: 18px; font-weight: 800;
                    margin: 10px 0 20px 0; display: block; box-shadow: 0px 4px 15px rgba(0,0,0,0.2);
                    cursor: pointer; font-size: 12px;
                `;

                shareBtn.onclick = async () => {
                    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                    const targetColor = isDark ? '#1e1e1e' : '#ffffff'; //
                    
                    const canvas = await html2canvas(statsCard, {
                        backgroundColor: targetColor, // 회색 그리드 방지를 위해 배경색 명시
                        scale: 3, // 고해상도 렌더링으로 잔상 제거
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
                                clonedCard.style.border = 'none'; // 경계선 노이즈 제거
                                
                                const clonedBtn = clonedDoc.getElementById('custom-share-btn');
                                if(clonedBtn) clonedBtn.style.display = 'none';
                            }
                            const clonedRichArea = clonedDoc.getElementById('richFriendArea');
                            if(clonedRichArea) {
                                clonedRichArea.style.boxShadow = 'none';
                                clonedRichArea.style.border = 'none';
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
                };
                title.parentNode.insertBefore(shareBtn, title.nextSibling);
            }
        }, 500);
    };
})();
