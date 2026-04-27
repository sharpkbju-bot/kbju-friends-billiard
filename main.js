const GAS_URL = "https://script.google.com/macros/s/AKfycbwUNoKWNmos1-kmkBoL1WDhSuJv80JDe0hINOpDM9KkEgLug6WK8vUpsk_pottrTj7dOA/exec";
const players = ["경배", "원석", "정석", "진웅", "창한", "경석"];
let gameLogs = [];
let currentViewDate = new Date();
let selectedDateStr = new Date().toLocaleDateString('sv-SE');
let selectedPlayersForLottery = [];
let searchFlatpickr;

// Activity Ring Helper [cite: v5.60 Feature]
function createActivityRing(percent, color, label) {
    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;
    return `
        <div class="ring-item">
            <svg width="80" height="80" viewBox="0 0 100 100">
                <circle class="ring-bg" cx="50" cy="50" r="${radius}" stroke-width="10" fill="transparent" stroke="#eee" />
                <circle class="ring-fill" cx="50" cy="50" r="${radius}" stroke-width="10" fill="transparent" 
                        stroke="${color}" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" 
                        stroke-linecap="round" transform="rotate(-90 50 50)" />
                <text x="50" y="55" text-anchor="middle" font-size="18" font-weight="900" fill="${color}">${percent}%</text>
            </svg>
            <div class="ring-label">${label}</div>
        </div>`;
}

function searchRecords() {
    const mon = document.getElementById('searchDateRange').value;
    const player = document.getElementById('searchPlayer').value;
    if(!mon || !player) return alert("검색월과 선수를 선택해줘!");

    const filtered = gameLogs.filter(g => g.dateStr.startsWith(mon) && g.ranks.includes(player));
    const sArea = document.getElementById('searchSummaryArea');
    const lArea = document.getElementById('searchHistoryListArea');

    if(filtered.length === 0) {
        sArea.innerHTML = "<div style='text-align:center; padding:20px;'>기록 없음</div>";
        sArea.style.display = 'block'; lArea.style.display = 'none';
        return;
    }

    let r = [0,0,0,0,0], totalS = 0;
    filtered.forEach(g => {
        const act = g.ranks.filter(n => n.trim() !== "");
        const idx = act.indexOf(player);
        if(idx === act.length-1 && act.length > 1) r[4]++; else if(idx < 4) r[idx]++;
        totalS += getEarnedScore(idx, act.length);
    });

    const winRate = Math.round((r[0]/filtered.length)*100);
    const safetyRate = Math.round(((filtered.length - r[4])/filtered.length)*100);
    const avgScore = (totalS/filtered.length).toFixed(2);
    const avgRate = Math.min(100, Math.round((parseFloat(avgScore)/3)*100));

    sArea.innerHTML = `
        <div class="summary-box" style="background:#f9f9f9; padding:15px; border-radius:15px; border:1px solid #ddd;">
            <div style="text-align:center; font-weight:800; margin-bottom:15px;">${player} - ${mon} 통계</div>
            <div class="rings-container" style="display:flex; justify-content:space-around; margin-bottom:20px;">
                ${createActivityRing(winRate, '#2196f3', '승률')}
                ${createActivityRing(avgRate, '#ff4757', '득점')}
                ${createActivityRing(safetyRate, '#27ae60', '생존')}
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; text-align:center; font-size:13px; font-weight:800;">
                <div style="background:white; padding:10px; border-radius:10px;">총 승점<br><span style="color:#2196f3; font-size:16px;">${totalS}점</span></div>
                <div style="background:white; padding:10px; border-radius:10px;">평균 승점<br><span style="color:#ff4757; font-size:16px;">${avgScore}</span></div>
            </div>
        </div>`;
    
    sArea.style.display = 'block';
    document.getElementById('search-share-btn').style.display = 'block';
}

function getEarnedScore(idx, pCount) {
    if (idx === pCount - 1 && pCount > 1) return 0;
    if (pCount === 2 && idx === 0) return 2;
    if (pCount === 3) return idx === 0 ? 3 : (idx === 1 ? 1 : 0);
    if (pCount === 4) return idx === 0 ? 4 : (idx === 1 ? 3 : (idx === 2 ? 2 : 0));
    if (pCount === 5) return idx === 0 ? 5 : (idx === 1 ? 4 : (idx === 2 ? 3 : (idx === 3 ? 1 : 0)));
    return 0;
}

function formatDate(d) { const date = new Date(d); return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0'); }

async function fetchData() {
    document.getElementById('loading').style.display = 'flex';
    try {
        const res = await fetch(`${GAS_URL}?t=${Date.now()}`);
        gameLogs = (await res.json()).map(g => ({...g, dateStr: formatDate(g.date)}));
        renderCalendar();
    } catch(e) { alert("데이터 로드 실패"); }
    finally { document.getElementById('loading').style.display = 'none'; }
}

window.onload = () => {
    searchFlatpickr = flatpickr("#searchDateRange", { plugins: [new monthSelectPlugin({shorthand: true, dateFormat: "Y-m"})], locale: "ko" });
    fetchData();
    setTimeout(() => { document.getElementById('welcome-screen').style.opacity = '0'; setTimeout(() => document.getElementById('welcome-screen').style.display='none', 800); }, 2500);
};

// ... other necessary functions like changeMonth, renderCalendar, pickRandomOrder, saveGame go here (standard v5.60 logic)
