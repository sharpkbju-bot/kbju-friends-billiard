// share.js - 중복 버튼 생성 방지 및 기존 버튼 연결 버전
(function() {
    const script = document.createElement('script');
    script.src = "https://html2canvas.hertzen.com/dist/html2canvas.min.js";
    document.head.appendChild(script);

    script.onload = () => {
        const interval = setInterval(() => {
            // HTML에 이미 존재하는 버튼을 찾습니다.
            const existingBtn = document.getElementById('shareBtn');
            const statsCard = document.querySelector('.stats-card');

            if (existingBtn && statsCard) {
                clearInterval(interval);

                // 새로 버튼을 만들지 않고, HTML에 있는 기존 버튼(shareBtn)에 기능을 연결합니다.
                existingBtn.onclick = async () => {
                    const richArea = document.getElementById('richFriendArea');
                    const originalShadow = richArea ? richArea.style.boxShadow : '';

                    // 캡처 시 스타일 보정
                    if(richArea) richArea.style.boxShadow = 'none';

                    html2canvas(statsCard, {
                        useCORS: true,
                        backgroundColor: null,
                        scale: 2,
                        onclone: (clonedDoc) => {
                            const clonedRichArea = clonedDoc.getElementById('richFriendArea');
                            if(clonedRichArea) {
                                clonedRichArea.style.boxShadow = 'none';
                                clonedRichArea.style.border = 'none';
                                clonedRichArea.style.width = '100%';
                                clonedRichArea.style.margin = '20px 0 0 0';
                            }
                        }
                    }).then(canvas => {
                        // 원래 스타일 복구
                        if(richArea) richArea.style.boxShadow = originalShadow;

                        canvas.toBlob(async (blob) => {
                            const file = new File([blob], 'billiard_rank.png', { type: 'image/png' });
                            if (navigator.share) {
                                try {
                                    await navigator.share({ 
                                        files: [file], 
                                        title: '당구 전적', 
                                        text: '오늘의 결과입니다!' 
                                    });
                                } catch (e) { }
                            } else {
                                const link = document.createElement('a');
                                link.href = URL.createObjectURL(blob);
                                link.download = 'billiard_rank.png';
                                link.click();
                            }
                        }, 'image/png');
                    });
                };
            }
        }, 500);
    };
})();
