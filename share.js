// share.js - 버튼 중복 생성 방지 및 위치 최적화 버전 (v5.60) / [v9.10] 곡선 모서리 무결성 캡처 패치 적용
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
                    const isDark = document.documentElement.getAttribute('data-theme') === 'dark' || document.documentElement.getAttribute('data-theme') === 'navy';
                    shareBtn.style.display = 'none';

                    // 1. 투명한 최외곽 컨테이너 생성
                    const ghostWrapper = document.createElement('div');
                    ghostWrapper.style.position = 'absolute';
                    ghostWrapper.style.top = '-9999px';
                    ghostWrapper.style.left = '0';
                    ghostWrapper.style.width = '360px'; 
                    ghostWrapper.style.background = 'transparent'; 
                    ghostWrapper.style.padding = '0';
                    ghostWrapper.style.zIndex = '-9999';
                    
                    // 2. 모서리를 깎아줄 배경 컨테이너 생성
                    const innerWrapper = document.createElement('div');
                    const t = document.documentElement.getAttribute('data-theme') || 'yellow'; 
                    let captureBg = '#fdfbe7';
                    if (t === 'dark' || t === 'navy') captureBg = t === 'dark' ? '#3c3c41' : '#0a192f'; 
                    else if (t === 'yellowgreen') captureBg = '#f0ffe6'; 
                    else if (t === 'purple') captureBg = '#f3e6ff'; 
                    else if (t === 'green') captureBg = '#e1faeb'; 
                    else if (t === 'pink') captureBg = '#ffebeb'; 
                    else if (t === 'gray') captureBg = '#f0f0f0'; 

                    innerWrapper.style.background = captureBg;
                    innerWrapper.style.padding = '20px';
                    innerWrapper.style.borderRadius = '20px'; // 둥근 모서리 보정
                    innerWrapper.style.overflow = 'hidden'; // 곡선 밖으로 튀어나가는 배경 숨김
                    innerWrapper.style.boxSizing = 'border-box';

                    // 3. 캡처 대상 복제 및 기존 onclone 로직 직접 적용
                    const clone = statsCard.cloneNode(true);
                    clone.style.width = '100%';
                    clone.style.margin = '0';
                    clone.style.transform = 'none';
                    clone.style.boxSizing = 'border-box';
                    clone.style.backgroundColor = isDark ? '#1e1e1e' : '#ffffff';

                    const clonedBtn = clone.querySelector('#custom-share-btn');
                    if(clonedBtn) clonedBtn.style.display = 'none';

                    const clonedRichArea = clone.querySelector('#richFriendArea');
                    if(clonedRichArea) {
                        clonedRichArea.style.boxShadow = 'none';
                        clonedRichArea.style.border = 'none';
                        clonedRichArea.style.width = '100%';
                        clonedRichArea.style.margin = '20px 0 0 0';
                        if(isDark) clonedRichArea.style.backgroundColor = 'rgba(50, 50, 50, 0.8)';
                    }
                    
                    const rows = clone.querySelectorAll('.stats-table tr');
                    rows.forEach(row => {
                        row.style.backgroundColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.4)';
                    });

                    // 4. DOM 조립
                    innerWrapper.appendChild(clone);
                    ghostWrapper.appendChild(innerWrapper);
                    document.body.appendChild(ghostWrapper);

                    try {
                        await new Promise(r => setTimeout(r, 300));
                        
                        // 5. 배경을 투명(null)으로 처리하여 둥근 캡처본 생성
                        const canvas = await html2canvas(ghostWrapper, {
                            backgroundColor: null, 
                            scale: 2,
                            useCORS: true,
                            logging: false
                        });

                        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
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
                    } catch (err) {
                        alert("캡처 중 오류가 발생했습니다.");
                    } finally {
                        document.body.removeChild(ghostWrapper);
                        shareBtn.style.display = 'block';
                    }
                };

                // 전적 카드 제목(h2) 바로 아래에 버튼 삽입
                title.parentNode.insertBefore(shareBtn, title.nextSibling);
            }
        }, 500);
    };
})();
