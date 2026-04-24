// Billiard World Pro v5.60 - Final Logic
const GAS_URL = "https://script.google.com/macros/s/AKfycbwUNoKWNmos1-kmkBoL1WDhSuJv80JDe0hINOpDM9KkEgLug6WK8vUpsk_pottrTj7dOA/exec";
const players = ["경배", "원석", "정석", "진웅", "창한", "경석"];
let gameLogs = [];
let selectedDateStr = new Date().toLocaleDateString('sv-SE');
let selectedPlayersForLottery = [];
let editMode = false;
let editRound = null;

// 1. 데이터 통신 및 초기화
async function fetchData() {
    showLoading(true, "Cloud 동기화 중...");
    try {
        const response = await fetch(`${GAS_URL}?t=${new Date().getTime()}`);
        const rawData = await response.json();
        gameLogs = rawData.map(g => ({ ...g, dateStr: formatDate(g.date) }));
        renderAll();
    } catch (e) {
        console.error("Fetch Error:", e);
        showToast("데이터 연결 실패");
    } finally {
        showLoading(false);
        updateDateDisplay();
    }
}

function renderAll() {
    renderStats();
    renderDefenseStats();
    renderGameList();
    renderTodayMVP();
}

// 2. UI 제어 (탭 전환 및 확대)
function switchTab(targetId, el) {
    document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(targetId).classList.add('active');
    el.classList.add('active');
    window.scrollTo(0, 0);
}

function changeZoom(val) {
    document.body.style.zoom = val;
}

function updateDateDisplay() {
    document.getElementById('current-date-display').innerText = `📅 ${selectedDateStr}`;
}

// 3. 기록 입력 로직
function togglePlayerSelection(el, name) {
    if (selectedPlayersForLottery.includes(name)) {
        selectedPlayersForLottery = selectedPlayersForLottery.filter(p => p !== name);
        el.classList.remove('active');
    } else {
        const limit = parseInt(document.getElementById('playerCount').value);
        if (selectedPlayersForLottery.length >= limit) return showToast(`인원 초과 (${limit}명)`);
        selectedPlayersForLottery.push(name);
        el.classList.add('active');
    }
    updateInputFields();
}

function updateInputFields(preFill = null) {
    const count = parseInt(document.getElementById('playerCount').value);
    const area = document.getElementById('inputArea');
    area.innerHTML = "";
    
    let target = preFill || (selectedPlayersForLottery.length === count ? selectedPlayersForLottery : players);
    
    for(let i=1; i<=count; i++) {
        const label = i === 1 ? "1위🥇" : (i === count ? "꼴찌💀" : `${i}위`);
        area.innerHTML += `
            <div class="input-row">
                <label>${label}</label>
                <select id="rank${i}">
                    <option value="">선택</option>
                    ${target.map(p => `<option value="${p}" ${preFill && preFill[i-1] === p ? 'selected' : ''}>${p}</option>`).join('')}
                </select>
            </div>`;
    }
}

async function saveGame() {
    const count = parseInt(document.getElementById('playerCount').value);
    const ranks = [];
    for(let i=1; i<=count; i++) {
        const val = document.getElementById('rank'+i).value;
        if(!val) return showToast("모든 순위를 선택하세요.");
        ranks.push(val);
    }
    if(new Set(ranks).size !== ranks.length) return showToast("중복 선수가 있습니다.");

    showLoading(true, "저장 중...");
    const payload = { 
        action: editMode ? "UPDATE" : "SAVE", 
        date: selectedDateStr, 
        ranks: [ranks[0]||"", ranks[1]||"", ranks[2]||"", ranks[3]||"", ranks[4]||""],
        round: editRound
    };

    try {
        await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        cancelEdit();
        fetchData();
        showToast("저장 완료");
        switchTab('sec-home', document.querySelector('.nav-item:first-child'));
    } catch (e) {
        showLoading(false);
        showToast("저장 실패");
    }
}

// 4. 전적 및 랭킹 렌더링
function renderStats() {
    let stats = {};
    players.forEach(p => stats[p] = { played: 0, win: 0, last: 0, score: 0 });
    
    gameLogs.forEach(g => {
        const actual = g.ranks.filter(n => n && n.trim() !== "");
        actual.forEach((name, idx) => {
            if(stats[name]) {
                stats[name].played++;
                stats[name].score += getEarnedScore(idx, actual.length);
                if(idx === 0) stats[name].win++;
                if(idx === actual.length - 1 && actual.length > 1) stats[name].last++;
            }
        });
    });

    const sorted = [...players].sort((a,b) => (stats[b].score/stats[b].played || 0) - (stats[a].score/stats[a].played || 0));
    
    document.getElementById('statsBody').innerHTML = sorted.map(p => {
        const s = stats[p];
        const avg = s.played > 0 ? (s.score/s.played).toFixed(2) : "0.00";
        const wr = s.played > 0 ? ((s.win/s.played)*100).toFixed(0) : "0";
        const tier = getTier(s.score);
        return `<tr onclick="showMemberDetail('${p}')">
                    <td style="color:${tier.color}; text-align:left; padding-left:10px;">${tier.icon} ${p}</td>
                    <td>${s.played}</td>
                    <td style="color:var(--rank1)">${s.win}</td>
                    <td style="color:var(--rankL)">${s.last}</td>
                    <td><span style="color:var(--accent)">${avg}</span> <small>(${wr}%)</small></td>
                </tr>`;
    }).join('');
}

function renderDefenseStats() {
    let def = {};
    players.forEach(p => def[p] = { totalNextRank: 0, count: 0 });

    gameLogs.forEach(g => {
        if (g.startOrder && g.startOrder.length > 0) {
            const order = g.startOrder;
            const actual = g.ranks.filter(n => n && n.trim() !== "");
            for (let i = 0; i < order.length; i++) {
                const nextP = order[(i + 1) % order.length];
                const nextIdx = actual.indexOf(nextP);
                if (nextIdx !== -1 && def[order[i]]) {
                    def[order[i]].totalNextRank += (nextIdx + 1);
                    def[order[i]].count++;
                }
            }
        }
    });

    const active = players.filter(p => def[p].count > 0).sort((a,b) => (def[b].totalNextRank/def[b].count) - (def[a].totalNextRank/def[a].count));
    document.getElementById('defenseBody').innerHTML = active.map((p, i) => `
        <tr>
            <td>${i+1}위</td>
            <td style="color:var(--accent)">${p}</td>
            <td>${def[p].count}전</td>
            <td style="color:var(--rank1)">${(def[p].totalNextRank/def[p].count).toFixed(2)}위</td>
        </tr>`).join('');
}

// 5. 검색 로직 (v5.60 사양 반영)
async function searchRecords() {
    const mon = document.getElementById('searchDateRange').value;
    const player = document.getElementById('searchPlayer').value;
    if(!mon || !player) return showToast("검색월과 선수를 선택하세요.");

    const filtered = gameLogs.filter(g => g.dateStr.startsWith(mon) && g.ranks.includes(player));
    const sArea = document.getElementById('searchSummaryArea');
    const lArea = document.getElementById('searchHistoryListArea');

    if(filtered.length === 0) {
        sArea.innerHTML = "<p style='padding:20px; text-align:center;'>기록이 없습니다.</p>";
        lArea.innerHTML = "";
        document.getElementById('btn-share-search').style.display = 'none';
        return;
    }

    let r = [0,0,0,0,0]; let totalS = 0;
    filtered.forEach(g => {
        const actual = g.ranks.filter(n => n.trim() !== "");
        const idx = actual.indexOf(player);
        if(idx === actual.length - 1 && actual.length > 1) r[4]++; else if(idx < 4) r[idx]++;
        totalS += getEarnedScore(idx, actual.length);
    });

    const tier = getTier(totalS);
    const avg = (totalS / filtered.length).toFixed(2);

    sArea.innerHTML = `
        <div class="summary-grid">
            <div class="summary-box"><span class="summary-label">참여/1위</span><span class="summary-val">${filtered.length}전 / ${r[0]}승</span></div>
            <div class="summary-box"><span class="summary-label">승점(평균)</span><span class="summary-val">${totalS} <small>(${avg})</small></span></div>
            <div class="summary-box"><span class="summary-label">티어</span><span class="summary-val" style="color:${tier.color}">${tier.icon}${tier.name}</span></div>
            <div class="summary-box"><span class="summary-label">승률</span><span class="summary-val">${((r[0]/filtered.length)*100).toFixed(0)}%</span></div>
        </div>`;
    
    document.getElementById('btn-share-search').style.display = 'block';
    
    lArea.innerHTML = `<div style="margin-top:20px;">` + filtered.map(g => {
        const actual = g.ranks.filter(n => n.trim() !== "");
        const idx = actual.indexOf(player);
        const color = idx === 0 ? 'var(--rank1)' : (idx === actual.length-1 ? 'var(--rankL)' : 'var(--text)');
        return `<div class="game-item">
                    <span style="font-size:12px; color:var(--text-dim)">${g.dateStr}</span>
                    <span style="color:${color}">${idx+1}위</span>
                </div>`;
    }).join('') + `</div>`;
}

// 6. 캡처 시스템 (Robust)
async function captureAndShare(targetId, btnId, fileName) {
    const target = document.getElementById(targetId);
    const btn = document.getElementById(btnId);
    if (!target) return;
    if (btn) btn.style.display = 'none';

    try {
        const canvas = await html2canvas(target, {
            backgroundColor: '#0f172a', scale: 2, useCORS: true,
            onclone: (clonedDoc) => {
                const b = clonedDoc.getElementById('app-body');
                if (b) { b.style.zoom = "1.0"; b.style.transform = "none"; }
            }
        });
        canvas.toBlob(async (blob) => {
            const file = new File([blob], fileName, { type: 'image/png' });
            if (navigator.share) await navigator.share({ files: [file] });
            else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fileName; a.click(); }
        });
    } catch (e) { alert("캡처 실패"); }
    finally { if (btn) btn.style.display = 'block'; }
}

function shareToday() { captureAndShare('capture-mvp', 'btn-share-today', 'today.png'); }
function shareRank() { captureAndShare('capture-rank', 'btn-share-rank', 'rank.png'); }
function shareDefense() { captureAndShare('capture-defense', 'btn-share-defense', 'defense.png'); }
function shareSearch() { captureAndShare('capture-search', 'btn-share-search', 'search.png'); }

// 7. 유틸리티 함수
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

function renderTodayMVP() {
    const todayGames = gameLogs.filter(g => g.dateStr === selectedDateStr);
    const area = document.getElementById('mvpArea');
    if(todayGames.length === 0) { area.innerHTML = "<p style='text-align:center; color:var(--text-dim);'>오늘의 경기 기록이 없습니다.</p>"; return; }
    
    let stats = {};
    todayGames.forEach(g => {
        const actual = g.ranks.filter(n => n && n.trim() !== "");
        actual.forEach((name, idx) => {
            if(!stats[name]) stats[name] = { win: 0, play: 0, last: 0 };
            stats[name].play++;
            if(idx === 0) stats[name].win++;
            if(idx === actual.length - 1) stats[name].last++;
        });
    });

    const active = Object.keys(stats);
    const winner = active.reduce((a, b) => stats[a].win > stats[b].win ? a : b);
    
    area.innerHTML = `
        <div class="mvp-badge"><span class="mvp-title">🔥 승부사</span><span class="mvp-player">${winner}</span><span class="mvp-value">${stats[winner].win}승</span></div>
        <div class="mvp-badge"><span class="mvp-title">🛡️ 생존자</span><span class="mvp-player">${active.reduce((a,b) => stats[a].last < stats[b].last ? a : b)}</span><span class="mvp-value">생존 성공</span></div>
    `;
}

function renderGameList() {
    const todayGames = gameLogs.filter(g => g.dateStr === selectedDateStr);
    const area = document.getElementById('dayGameList');
    if(todayGames.length === 0) { area.innerHTML = ""; return; }

    area.innerHTML = todayGames.map((g, i) => {
        const names = g.ranks.filter(n => n && n.trim() !== "");
        return `<div class="game-item">
                    <span style="font-size:12px; color:var(--text-dim)">${i+1}G</span>
                    <div class="game-info-name">${names.join(' → ')}</div>
                </div>`;
    }).join('');
}

function formatDate(date) { const d = new Date(date); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function showLoading(v, t) { document.getElementById('loadingText').innerText = t; document.getElementById('loading').style.display = v ? 'flex' : 'none'; }
function showToast(m) { const t = document.getElementById('toast'); t.innerText = m; t.style.display = 'block'; setTimeout(() => t.style.display = 'none', 2000); }
function closeModal() { document.getElementById('common-modal').style.display = 'none'; }
function cancelEdit() { editMode = false; editRound = null; document.getElementById('editBadge').style.display = 'none'; updateInputFields(); }

window.onload = () => {
    flatpickr("#searchDateRange", { plugins: [], locale: "ko", dateFormat: "Y-m" });
    setTimeout(() => { document.getElementById('welcome-screen').style.opacity = '0'; setTimeout(() => document.getElementById('welcome-screen').style.display='none', 800); }, 2500);
    fetchData();
};
