(function() {
    const script = document.createElement('script');
    script.src = "https://html2canvas.hertzen.com/dist/html2canvas.min.js";
    document.head.appendChild(script);

    script.onload = () => {
        const interval = setInterval(() => {
            // 1. index.html에 이미 작성되어 있는 버튼을 찾습니다.
            const existingBtn = document.getElementById('shareBtn');
            const statsCard = document.querySelector('.stats-card');

            if (existingBtn && statsCard) {
                clearInterval(interval);

                // 2. 새 버튼(custom-share-btn)을 만드는 코드를 모두 삭제하고, 
                // 기존 버튼(existingBtn)에 클릭 이벤트만 연결합니다.
                existingBtn.onclick = async () => {
                    const richArea = document.getElementById('richFriendArea');
                    const originalShadow = richArea ? richArea.style.boxShadow : '';

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
