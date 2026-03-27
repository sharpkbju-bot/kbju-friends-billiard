// share.js - 다크모드 모서리 잔상(흰색 사각형) 방지 버전
(function() {
    const script = document.createElement('script');
    script.src = "https://html2canvas.hertzen.com/dist/html2canvas.min.js";
    document.head.appendChild(script);

    script.onload = () => {
        const interval = setInterval(() => {
            const statsCard = document.querySelector('.stats-card');
            if (statsCard) {
                clearInterval(interval);
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
                    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                    const richArea = document.getElementById('richFriendArea');
                    
                    // 캡처 시작
                    const canvas = await html2canvas(statsCard, {
                        // 핵심 수정: 배경색을 null로 설정하여 모서리 흰 잔상 제거
                        backgroundColor: null, 
                        scale: 2,
                        useCORS: true,
                        allowTaint: true,
                        scrollX: 0,
                        scrollY: -window.scrollY,
                        onclone: (clonedDoc) => {
                            const clonedCard = clonedDoc.querySelector('.stats-card');
                            if (clonedCard) {
                                // 캡처용 카드 배경색 강제 지정 (모서리 깨짐 방지)
                                clonedCard.style.backgroundColor = isDark ? '#1e1e1e' : '#ffffff';
                                clonedCard.style.borderRadius = '28px';
                                clonedCard.style.overflow = 'hidden'; // 자식 요소가 튀어나와 사각형으로 보이는 것 방지
                            }

                            const clonedRichArea = clonedDoc.getElementById('richFriendArea');
                            if(clonedRichArea) {
                                clonedRichArea.style.boxShadow = 'none';
                                clonedRichArea.style.border = 'none';
                                clonedRichArea.style.width = '100%';
                                clonedRichArea.style.margin = '20px 0 0 0';
                                // 다크모드일 때 물주 카드 배경색 보정
                                if(isDark) clonedRichArea.style.backgroundColor = 'rgba(50, 50, 50, 0.8)';
                            }
                            
                            // 테이블 행 모서리 잔상 제거
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

                const title = statsCard.querySelector('h2');
                title.parentNode.insertBefore(shareBtn, title.nextSibling);
            }
        }, 500);
    };
})();
