// share.js - 꼴찌 카드 캡처 오류 보정 버전
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
                    // 캡처 전: 꼴찌 카드의 안쪽 그림자(inner-shadow)가 캡처 시 깨지는 현상 방지
                    const richArea = document.getElementById('richFriendArea');
                    const originalShadow = richArea ? richArea.style.boxShadow : '';
                    if(richArea) richArea.style.boxShadow = 'none'; // 캡처 시에만 그림자 제거

                    const canvas = await html2canvas(statsCard, {
                        backgroundColor: (document.documentElement.getAttribute('data-theme') === 'dark') ? '#222' : '#fff',
                        scale: 2,
                        useCORS: true,
                        allowTaint: true,
                        scrollX: 0,
                        scrollY: -window.scrollY, // 현재 스크롤 위치 보정
                        onclone: (clonedDoc) => {
                            // 복제된 문서에서 스타일 강제 고정 (양옆 깨짐 방지)
                            const clonedRichArea = clonedDoc.getElementById('richFriendArea');
                            if(clonedRichArea) {
                                clonedRichArea.style.boxShadow = 'none';
                                clonedRichArea.style.border = 'none';
                                clonedRichArea.style.width = '100%';
                                clonedRichArea.style.margin = '20px 0 0 0';
                            }
                        }
                    });

                    // 캡처 후: 원래 스타일 복구
                    if(richArea) richArea.style.boxShadow = originalShadow;

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
