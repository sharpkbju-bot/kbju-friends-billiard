// share.js - 버튼 중복 생성 방지 및 위치 최적화 버전 (v5.60) / [v9.11] 오리지널 도화지 캡처 기법(여백+배경) 적용
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
                    const theme = document.documentElement.getAttribute('data-theme') || 'yellow'; 
                    const isDark = (theme === 'dark' || theme === 'navy');
                    
                    // 1. 현재 테마에 맞는 배경색 추출 (main.js의 getCaptureBgColor 로직과 동일)
                    let captureBgColor = '#fdfbe7';
                    if (theme === 'dark') captureBgColor = '#3c3c41';
                    else if (theme === 'navy') captureBgColor = '#0a192f';
                    else if (theme === 'yellowgreen') captureBgColor = '#f0ffe6'; 
                    else if (theme === 'purple') captureBgColor = '#f3e6ff'; 
                    else if (theme === 'green') captureBgColor = '#e1faeb'; 
                    else if (theme === 'pink') captureBgColor = '#ffebeb'; 
                    else if (theme === 'gray') captureBgColor = '#f0f0f0';

                    shareBtn.style.display = 'none';

                    // 2. 다른 카드들처럼 '앱 배경색'으로 채워진 넉넉한 도화지 생성
                    const ghostWrapper = document.createElement('div');
                    ghostWrapper.style.position = 'absolute';
                    ghostWrapper.style.top = '-9999px';
                    ghostWrapper.style.left = '0';
                    ghostWrapper.style.width = '360px'; 
                    ghostWrapper.style.background = captureBgColor;
                    ghostWrapper.style.padding = '20px'; // 여백 20px 부여
                    ghostWrapper.style.borderRadius = '15px'; // 도화지 자체의 모서리 둥글게
                    ghostWrapper.style.zIndex = '-9999';
                    ghostWrapper.style.letterSpacing = 'normal';
                    ghostWrapper.style.wordBreak = 'keep-all';
                    ghostWrapper.style.boxSizing = 'border-box';

                    // 3. 전적 카드 복제 및 기존 onclone 로직 직접 적용
                    const clone = statsCard.cloneNode(true);
                    clone.style.width = '100%';
                    clone.style.margin = '0 auto';
                    clone.style.transform = 'none';
                    clone.style.animation = 'none';
                    clone.style.boxSizing = 'border-box';
                    clone.style.backgroundColor = isDark ? '#1e1e1e' : '#ffffff';
                    clone.style.borderRadius = '28px'; // 카드의 곡률 설정
                    clone.style.overflow = 'hidden';

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

                    // 4. DOM 조립 (도화지 위에 카드 올리기)
                    ghostWrapper.appendChild(clone);
                    document.body.appendChild(ghostWrapper);

                    try {
                        await new Promise(r => setTimeout(r, 300));
                        
                        // 5. 배경색 옵션을 명시하여 캡처 진행 (투명 버그 원천 차단)
                        const canvas = await html2canvas(ghostWrapper, {
                            backgroundColor: captureBgColor, 
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
