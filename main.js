// Billiard World Pro v5.60 - Robust Programming
const GAS_URL = "https://script.google.com/macros/s/AKfycbwUNoKWNmos1-kmkBoL1WDhSuJv80JDe0hINOpDM9KkEgLug6WK8vUpsk_pottrTj7dOA/exec";
const players = ["경배", "원석", "정석", "진웅", "창한", "경석"];
let gameLogs = [];
let selectedDateStr = new Date().toLocaleDateString('sv-SE');

/**
 * 1. 초강력 캡처 로직 (captureAndShare)
 * 브라우저의 zoom 설정이나 transform 상태와 상관없이 규격화된 이미지를 생성합니다.
 */
async function captureAndShare(targetId, btnId, fileName) {
    const target = document.getElementById(targetId);
    const btn = document.getElementById(btnId);
    if (!target) return;
    
    if (btn) btn.style.visibility = 'hidden'; // 버튼 숨김 (레이아웃 유지 위해 visibility 사용)
    
    // 캡처용 옵션 설정
    const options = {
        backgroundColor: '#0f172a', // 배경색 명시 (투명화 방지)
        scale: 2, // 고해상도
        logging: false,
        useCORS: true,
        allowTaint: true,
        onclone: (clonedDoc) => {
            // [중요] 복제된 문서에서 zoom과 확대 스타일을 강제로 초기화하여 좌표 어긋남 방지
            const clonedBody = clonedDoc.getElementById('app-body');
            const clonedTarget = clonedDoc.getElementById(targetId);
            
            if (clonedBody) {
                clonedBody.style.zoom = "1.0";
                clonedBody.style.transform = "none";
                clonedBody.style.width = "auto";
            }
            if (clonedTarget) {
                clonedTarget.style.padding = "20px";
                clonedTarget.style.margin = "0";
                // 캡처 시 불필요한 그림자나 블러 제거 (렌더링 오류 방지)
                clonedTarget.style.boxShadow = "none";
                clonedTarget.style.backdropFilter = "none"; 
            }
        }
    };

    try {
        const canvas = await html2canvas(target, options);
        canvas.toBlob(async (blob) => {
            const file = new File([blob], fileName, { type: 'image/png' });
            if (navigator.share) {
                await navigator.share({ files: [file], title: 'Billiard World Record' });
            } else {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = fileName;
                link.click();
            }
        }, 'image/png');
    } catch (err) {
        alert("캡처 중 오류가 발생했습니다.");
    } finally {
        if (btn) btn.style.visibility = 'visible';
    }
}

// 탭 전환 시스템
function switchTab(targetId, el) {
    document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(targetId).classList.add('active');
    el.classList.add('active');
    window.scrollTo(0, 0);
}

// 확대 모드 대응 (캡처에 영향을 주지 않는 방식)
function changeZoom(val) {
    document.body.style.zoom = val;
}

/**
 * 2. 승점 및 전적 로직 (v5.60 요구사항 완벽 반영)
 */
function getEarnedScore(idx, pCount) {
    if (idx === pCount - 1 && pCount > 1) return 0;
    if (pCount === 2 && idx === 0) return 2;
    if (pCount === 3) return idx === 0 ? 3 : (idx === 1 ? 1 : 0);
    if (pCount === 4) return idx === 0 ? 4 : (idx === 1 ? 3 : (idx === 2 ? 2 : 0));
    if (pCount === 5) return idx === 0 ? 5 : (idx === 1 ? 4 : (idx === 2 ? 3 : (idx === 3 ? 1 : 0)));
    return 0;
}

function getTier(score) {
    if (score >= 60) return { name: "챌린저", icon: "👑", color: "#fb923c" };
    if (score >= 50) return { name: "플래티넘", icon: "💎", color: "#2dd4bf" };
    if (score >= 40) return { name: "골드", icon: "🥇", color: "#facc15" };
    if (score >= 30) return { name: "실버", icon: "🥈", color: "#94a3b8" };
    return { name: "브론즈", icon: "🥉", color: "#a8a29e" };
}

// 월별 상세 검색 (Robust UI 적용)
async function searchRecords() {
    const mon = document.getElementById('searchDateRange').value;
    const player = document.getElementById('searchPlayer').value;
    if(!mon || !player) return alert("검색월과 선수를 선택하세요.");

    const filtered = gameLogs.filter(g => g.dateStr.startsWith(mon) && g.ranks.includes(player));
    const sArea = document.getElementById('searchSummaryArea');
    const lArea = document.getElementById('searchHistoryListArea');
    const shareBtn = document.getElementById('btn-share-search');

    if(filtered.length === 0) {
        sArea.innerHTML = "<p style='text-align:center; padding:20px;'>기록이 없습니다.</p>";
        shareBtn.style.display = 'none';
        return;
    }

    let stats = { w: 0, l: 0, s: 0 };
    filtered.forEach(g => {
        const actual = g.ranks.filter(n => n.trim() !== "");
        const rIdx = actual.indexOf(player);
        if(rIdx === 0) stats.w++;
        if(rIdx === actual.length - 1) stats.l++;
        stats.s += getEarnedScore(rIdx, actual.length);
    });

    const tier = getTier(stats.s);
    const avg = (stats.s / filtered.length).toFixed(2);

    sArea.innerHTML = `
        <div class="summary-grid">
            <div class="summary-box"><span class="summary-label">참여</span><span class="summary-val">${filtered.length}전</span></div>
            <div class="summary-box"><span class="summary-label">승률</span><span class="summary-val">${((stats.w/filtered.length)*100).toFixed(0)}%</span></div>
            <div class="summary-box"><span class="summary-label">평균승점</span><span class="summary-val">${avg}</span></div>
            <div class="summary-box"><span class="summary-label">티어</span><span class="summary-val">${tier.icon} ${tier.name}</span></div>
        </div>
    `;
    
    shareBtn.style.display = 'block';
    // 리스트 렌더링 생략 (기존 로직 동일)
}

// 캡처 실행 함수들
function shareToday() { captureAndShare('capture-mvp', 'btn-share-today', 'today_mvp.png'); }
function shareRank() { captureAndShare('capture-rank', 'btn-share-rank', 'leaderboard.png'); }
function shareDefense() { captureAndShare('capture-defense', 'btn-share-defense', 'defense_rank.png'); }
function shareSearch() { captureAndShare('capture-search', 'btn-share-search', 'search_result.png'); }

// 초기화 및 공통 로직 (기존 saveGame, pickRandomOrder 등 유지하되 UI 선택자만 변경)
window.onload = () => {
    flatpickr("#searchDateRange", { dateFormat: "Y-m", locale: "ko" });
    setTimeout(() => { document.getElementById('welcome-screen').style.display='none'; }, 2500);
    // fetchData() 호출 등...
};
