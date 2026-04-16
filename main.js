let scoreModalTimeout = null;
let hideScoreModalTimeout = null;
let graphCountdownInterval = null; // 카운트다운용 인터벌 추가

const GAS_URL = "https://script.google.com/macros/s/AKfycbwUNoKWNmos1-kmkBoL1WDhSuJv80JDe0hINOpDM9KkEgLug6WK8vUpsk_pottrTj7dOA/exec"; 
const players = ["경배", "원석", "정석", "진웅", "창한", "경석"];
let gameLogs = [];
let currentViewDate = new Date();
let selectedDateStr = new Date().toLocaleDateString('sv-SE');
let editMode = false;
let editRound = null;
let isPercentMode = false;

let selectedPlayersForLottery = [];
let searchFlatpickr; 
let animationStep = 0;
let lastDrawnPlayers = []; 
let currentStartOrder = []; 

const playerThemes = {
    "경배": { emoji: "👑", color: "#1A237E" },
    "원석": { emoji: "🎯", color: "#50C878" },
    "정석": { emoji: "🎱", color: "#9B59B6" },
    "진웅": { emoji: "🔥", color: "#F39C12" },
    "창한": { emoji: "💎", color: "#E74C3C" },
    "경석": { emoji: "🍀", color: "#1ABC9c" } 
};

function getEarnedScore(idx, pCount) {
    if (idx === pCount - 1 && pCount > 1) return 0;
    if (pCount === 2 && idx === 0) return 2;
    if (pCount === 3) return idx === 0 ? 3 : (idx === 1 ? 1 : 0);
    if (pCount === 4) return idx === 0 ? 4 : (idx === 1 ? 3 : (idx === 2 ? 2 : 0));
    if (pCount === 5) return idx === 0 ? 5 : (idx === 1 ? 4 : (idx === 2 ? 3 : (idx === 3 ? 1 : 0)));
    return 0;
}

function generateNamesHTML(names) {
    return names.map((name, i) => {
        const color = i === 0 ? 'var(--rank1)' : (i === names.length - 1 ? 'var(--rankL)' : 'var(--text-color)');
        return `<span style="color:${color};display:inline;">${name}</span>`;
    }).join('<span style="display:inline;">→</span>');
}

async function captureAndShare(targetId, btnId, fileName, shareTitle, shareText) {
    const target = document.getElementById(targetId);
    if (!target) return;
    const shareBtn = document.getElementById(btnId);
    if (shareBtn) shareBtn.style.display = 'none';
    
    const bgColor = getCaptureBgColor();
    const originalBg = target.style.background;
    const originalPadding = target.style.padding;
    const originalFilter = target.style.backdropFilter;
    
    target.style.background = bgColor;
    target.style.padding = '15px';
    target.style.backdropFilter = 'none'; 

    try {
        await new Promise(r => setTimeout(r, 150));
        const canvas = await html2canvas(target, { 
            backgroundColor: bgColor, 
            scale: 2, 
            logging: false, 
            useCORS: true,
            windowWidth: document.documentElement.scrollWidth,
            windowHeight: document.documentElement.scrollHeight,
            scrollY: -window.scrollY,
            onclone: (clonedDoc) => {
                const clonedTarget = clonedDoc.getElementById(targetId);
                if (clonedTarget) {
                    clonedTarget.style.borderRadius = '12px';
                }
            }
        });
        
        canvas.toBlob(async (blob) => {
            const file = new File([blob], fileName, { type: 'image/png' });
            if (navigator.share) {
                try { 
                    await navigator.share({ files: [file], title: shareTitle, text: shareText }); 
                } catch (e) { 
                    console.log('Share failed', e); 
                }
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
        target.style.background = originalBg;
        target.style.padding = originalPadding;
        target.style.backdropFilter = originalFilter;
        if (shareBtn) shareBtn.style.display = 'block';
    }
}

function getPlayerColor(name) {
    const theme = document.documentElement.getAttribute('data-theme');
    if (name === "경배" && theme === "navy") return "#5D4037"; 
    return playerThemes[name] ? playerThemes[name].color : 'var(--text-color)';
}

function getGraphColor(name) {
    const theme = document.documentElement.getAttribute('data-theme');
    const isDark = theme === 'dark' || theme === 'navy';
    if (name === '경배') return isDark ? '#64b5f6' : '#1A237E';
    if (name === '원석') return isDark ? '#2ecc71' : '#50C878';
    if (name === '정석') return isDark ? '#ba68c8' : '#9B59B6';
    if (name === '진웅') return isDark ? '#ffb74d' : '#F39C12';
    if (name === '창한') return isDark ? '#ff8a80' : '#E74C3C';
    if (name === '경석') return isDark ? '#4dd0e1' : '#1ABC9c';
    return '#95a5a6';
}

function getTier(score) {
    if (score >= 60) return { name: "챌린저", icon: "👑", color: "#e67e22" };
    if (score >= 50) return { name: "플래티넘", icon: "💎", color: "#1abc9c" };
    if (score >= 40) return { name: "골드", icon: "🥇", color: "#f1c40f" };
    if (score >= 30) return { name: "실버", icon: "🥈", color: "#95a5a6" };
    return { name: "브론즈", icon: "🥉", color: "#cd7f32" };
}

function showInfoModal(type) {
    let title = ""; 
    let desc = ""; 
    let icon = "";
    
    if (type === 'score') {
        icon = "📊"; 
        title = "인원별 차등 승점 기준";
        desc = "• <b>2인</b>: 1위(+2), 꼴찌(0)<br>• <b>3인</b>: 1위(+3), 2위(+1), 꼴찌(0)<br>• <b>4인</b>: 1위(+4), 2위(+3), 3위(+2), 꼴찌(0)<br>• <b>5인</b>: 1위(+5), 2위(+4), 3위(+3), 4위(+1), 꼴찌(0)";
    } else if (type === 'tier') {
        icon = "🏅"; 
        title = "랭킹 티어(계급) 기준";
        desc = "👑<b>챌린저</b>: 60+ &nbsp;💎<b>플래티넘</b>: 50+<br>🥇<b>골드</b>: 40+ &nbsp;&nbsp;🥈<b>실버</b>: 30+ &nbsp;🥉<b>브론즈</b>: 30미만";
    } else if (type === 'condition') {
        icon = "🌡️"; 
        title = "최근 컨디션 분석 기준";
        desc = "• ☀️<b>최상</b>: 1위 비율 30%↑<br>• ⛅<b>보통</b>: 1위 비율 30 이하. 안정적인 보통 순위<br>• ⚡<b>도깨비</b>: 1위 30%↑ & 꼴찌 30%↑<br>• 🌧️<b>비상</b>: 꼴찌 비율 30%↑";
    }
    
    const descEl = document.getElementById('info-modal-desc');
    const currentTheme = document.documentElement.getAttribute('data-theme');
    
    if (currentTheme === 'navy') {
        descEl.style.color = '#5D4037';
    } else {
        descEl.style.color = ''; 
    }
    
    document.getElementById('info-modal-icon').innerHTML = icon;
    document.getElementById('info-modal-title').innerHTML = title;
    descEl.innerHTML = desc;
    document.getElementById('info-modal').style.display = 'flex';
}

function closeInfoModal() { 
    document.getElementById('info-modal').style.display = 'none'; 
}

function showLastGameResult() {
    if (!gameLogs || gameLogs.length === 0) { 
        setTimeout(showLastGameResult, 500); 
        return; 
    }
    
    const latestDate = gameLogs.reduce((max, game) => (game.dateStr > max ? game.dateStr : max), gameLogs[0].dateStr);
    const gamesOnLatestDate = gameLogs.filter(g => g.dateStr === latestDate);
    const lastGame = gamesOnLatestDate[gamesOnLatestDate.length - 1];
    const actualRanks = lastGame.ranks.filter(n => n && n.trim() !== "");
    
    let html = `<div style="font-size:40px; margin-bottom:10px;">🏆</div>
                <h2 style="font-size:18px; font-weight:900; color:var(--text-color); margin:0 0 5px 0;">LAST GAME RECORD</h2>
                <div style="font-size:15px; font-weight:800; color:var(--sub-text); margin-bottom: 20px;">[ ${lastGame.dateStr} ]</div>
                <div style="display:flex; flex-direction:column; gap:8px; font-weight:900;">`;
    
    actualRanks.forEach((name, i) => {
        const rankLabel = (i === 0) ? "1위🥇" : (i === actualRanks.length - 1 ? "꼴찌💀" : `${i + 1}위`);
        const rankColor = (i === 0) ? 'var(--rank1)' : (i === actualRanks.length - 1 ? 'var(--rankL)' : 'var(--text-color)');
        html += `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.4); padding:12px 20px; border-radius:15px; border:1px solid rgba(0,0,0,0.05); box-shadow: inset 1px 1px 3px rgba(255,255,255,0.7);">
                    <span style="color:${rankColor}; font-size:${i === 0 ? '16px' : '14px'}; font-weight:${i === 0 ? '900' : '800'};">${rankLabel}</span>
                    <span style="color:${rankColor}; font-size:${i === 0 ? '22px' : '16px'}; font-weight:${i === 0 ? '900' : '800'};">${name}</span>
                 </div>`;
    });
    
    html += `</div>`;
    
    const modal = document.getElementById('last-game-modal'); 
    const content = document.getElementById('last-game-content');
    
    if(!modal || !content) return;
    
    content.innerHTML = html; 
    modal.style.display = 'flex'; 
    content.style.animation = 'scaleUpPopup 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
    
    setTimeout(() => { 
        if(modal.style.display !== 'none') { 
            content.style.animation = 'scaleDownPopup 0.4s ease-in forwards'; 
            setTimeout(() => { modal.style.display = 'none'; }, 400); 
        } 
    }, 3000);
}

function focusOnDrawCard() { 
    setTimeout(() => { 
        const el = document.getElementById('drawCardArea'); 
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
    }, 150); 
}

function togglePlayerSelection(el, name) {
    if (selectedPlayersForLottery.includes(name)) { 
        selectedPlayersForLottery = selectedPlayersForLottery.filter(p => p !== name); 
        el.classList.remove('active'); 
    } else {
        const limit = parseInt(document.getElementById('playerCount').value);
        if (selectedPlayersForLottery.length >= limit) { 
            alert(`게임 가능 인원 ${limit}명. 초과 불가`); 
            return; 
        }
        selectedPlayersForLottery.push(name); 
        el.classList.add('active');
    }
    if(!editMode) updateInputFields();
}

function resetPlayerSelection() { 
    selectedPlayersForLottery = []; 
    document.querySelectorAll('.player-chip').forEach(el => el.classList.remove('active')); 
    if(!editMode) updateInputFields(); 
    
    // 순위 저장 버튼 깜빡임 해제 기능 추가 (요청사항 1 반영)
    const saveBtn = document.getElementById('mainBtn');
    if (saveBtn) saveBtn.classList.remove('flash-save-active');
}

function pickRandomOrder() {
    const realTodayStr = formatDate(new Date()); 
    if (selectedDateStr > realTodayStr) return alert("미래에서 온거야? 날짜를 잘 확인혀!"); 
    
    const limit = parseInt(document.getElementById('playerCount').value);
    if (selectedPlayersForLottery.length !== limit) return alert(`게임 참여 ${limit}명을 선택해!(현재 ${selectedPlayersForLottery.length}명)`);
    
    let pool = [...selectedPlayersForLottery]; 
    const firstIdx = Math.floor(Math.random() * pool.length);
    const firstPlayer = pool.splice(firstIdx, 1)[0]; 
    const remaining = pool.sort(() => Math.random() - 0.5);
    
    lastDrawnPlayers = [firstPlayer, ...remaining]; 
    currentStartOrder = [...lastDrawnPlayers];
    
    const resultArea = document.getElementById('order-result'); 
    const confirmBtn = document.querySelector('#order-modal button');
    const p1Color = getPlayerColor(firstPlayer);
    
    const finalHtml = `<div style="background: rgba(128, 128, 128, 0.1); border-radius: 15px; padding: 15px; margin-bottom: 20px; border: 2.5px dashed ${p1Color};">
                           <div style="font-size: 14px; color: ${p1Color}; margin-bottom:5px;">🎯 이 게임의 초구는 바로 너!</div>
                           <div style="font-size: 26px; color: ${p1Color}; font-weight: 900;">1번 : ${firstPlayer}</div>
                       </div>
                       <div style="font-size: 17px; opacity: 0.9; line-height: 2.2; font-weight: 800;">
                           ${remaining.map((p, idx) => `<div style="color: ${getPlayerColor(p)};">${idx + 2}번 : ${p}</div>`).join('')}
                       </div>`;
                       
    if (confirmBtn) confirmBtn.style.display = 'none';
    document.getElementById('order-modal').style.display = 'flex';
    
    function finishAnimation() {
        resultArea.innerHTML = finalHtml; 
        if (confirmBtn) confirmBtn.style.display = 'block';
        lastDrawnPlayers.forEach((name, idx) => { 
            const selectEl = document.getElementById('rank' + (idx + 1)); 
            if (selectEl) selectEl.value = name; 
        });
        checkDuplicates();
    }
    
    if (animationStep === 0) {
        resultArea.innerHTML = `<div style="padding: 30px 0;"><div style="font-size: 14px; color: var(--sub-text); margin-bottom: 10px;">초구의 영광은 누구에게?</div><div id="slotName" style="font-size: 32px; font-weight: 900; color: var(--rank1); letter-spacing: 2px;">🎰</div></div>`;
        let start = Date.now(); 
        let slotName = document.getElementById('slotName'); 
        let counter = 0;
        
        function runSlot() {
            let elapsed = Date.now() - start;
            if (elapsed < 3000) { 
                const p = selectedPlayersForLottery[counter % selectedPlayersForLottery.length]; 
                slotName.innerText = p; 
                slotName.style.color = getPlayerColor(p); 
                counter++; 
                setTimeout(runSlot, 50 + Math.pow(elapsed / 3000, 3) * 400); 
            } else {
                finishAnimation();
            }
        }
        runSlot();
    } else if (animationStep === 1) {
        resultArea.innerHTML = `<div style="padding: 30px 0; text-align: left;">
                                    <div style="font-size: 14px; font-weight: 800; color: var(--sub-text); margin-bottom: 12px; text-align: center; animation: flash 0.5s infinite alternate;">나도 초구 한번 쳐보자! 🎱</div>
                                    <div style="width: 100%; height: 10px; background: rgba(0,0,0,0.1); border-radius: 10px; position: relative;">
                                        <div id="billiardGauge" style="width: 0%; height: 100%; background: linear-gradient(90deg, var(--rank1), var(--accent)); border-radius: 10px; transition: width 3s cubic-bezier(0.2, 0.8, 0.2, 1);"></div>
                                        <div id="billiardBall" style="font-size: 26px; position: absolute; top: -14px; left: 0%; transition: left 3s cubic-bezier(0.2, 0.8, 0.2, 1), transform 3s cubic-bezier(0.2, 0.8, 0.2, 1); transform: translateX(-50%) rotate(0deg);">🎱</div>
                                    </div>
                                </div>`;
        setTimeout(() => { 
            const gauge = document.getElementById('billiardGauge'); 
            const ball = document.getElementById('billiardBall'); 
            if(gauge && ball) { 
                gauge.style.width = '100%'; 
                ball.style.left = '100%'; 
                ball.style.transform = 'translateX(-50%) rotate(1080deg)'; 
            } 
        }, 50);
        setTimeout(finishAnimation, 3000);
    } else {
        resultArea.innerHTML = `<div style="padding: 30px 0; display: flex; flex-direction: column; align-items: center;">
                                    <div style="font-size: 55px; animation: heartbeat 0.3s infinite alternate;">🎱</div>
                                    <div style="margin-top: 20px; font-size: 15px; font-weight: 900; color: var(--accent); animation: flash 0.5s infinite alternate;">두근두근... 초구는 누구?</div>
                                </div>`;
        setTimeout(finishAnimation, 3000);
    }
    animationStep = (animationStep + 1) % 3;
}

function closeOrderModal() { 
    document.getElementById('order-modal').style.display = 'none'; 
    if (lastDrawnPlayers && lastDrawnPlayers.length > 0) { 
        showPlayersGraph(lastDrawnPlayers); 
        lastDrawnPlayers = []; 
    } 
}

function showPlayersGraph(players) {
    const container = document.getElementById('graph-container'); 
    const legendArea = document.getElementById('graph-legend');
    
    let legendHtml = ""; 
    let svg = `<svg width="100%" height="100%" viewBox="-15 -10 130 120" preserveAspectRatio="none" style="overflow: visible; font-family: inherit;">`;
    const yLabels = ["1위", "2위", "3위", "4위", "꼴찌"];
    
    for(let i=0; i<=4; i++) { 
        let y = i * 25; 
        svg += `<line x1="0" y1="${y}" x2="100" y2="${y}" stroke="rgba(150,150,150,0.25)" stroke-width="1" stroke-dasharray="3,3" />
                <text x="-4" y="${y + 3}" font-size="7" font-weight="900" fill="var(--sub-text)" text-anchor="end">${yLabels[i]}</text>`; 
    }
    
    players.forEach(playerName => {
        const pColor = getGraphColor(playerName); 
        legendHtml += `<div style="display:flex; align-items:center; gap:4px;">
                           <span style="display:inline-block; width:10px; height:3px; background-color:${pColor}; border-radius:2px;"></span>
                           <span style="color:var(--text-color);">${playerName}</span>
                       </div>`;
                       
        const allPersonalGames = gameLogs.filter(g => g.ranks.includes(playerName)).sort((a, b) => (new Date(b.dateStr) - new Date(a.dateStr)) || ((parseInt(b.round) || 0) - (parseInt(a.round) || 0)));
        if (allPersonalGames.length === 0) return; 
        
        const recent10Games = allPersonalGames.slice(0, 10).reverse();
        let points = []; 
        let stepX = recent10Games.length > 1 ? 100 / (recent10Games.length - 1) : 50;
        
        recent10Games.forEach((g, i) => { 
            const actual = g.ranks.filter(n => n.trim() !== ""); 
            const rIdx = actual.indexOf(playerName); 
            let isLast = (rIdx === actual.length - 1 && actual.length > 1); 
            let yRank = isLast ? 5 : (rIdx + 1); 
            points.push({x: recent10Games.length === 1 ? 50 : i * stepX, y: (yRank - 1) * 25}); 
        });
        
        if (points.length > 0) {
            let pathD = `M ${points[0].x} ${points[0].y}`; 
            for(let i=0; i<points.length - 1; i++) {
                pathD += ` C ${points[i].x + (points[i+1].x - points[i].x) / 2} ${points[i].y}, ${points[i].x + (points[i+1].x - points[i].x) / 2} ${points[i+1].y}, ${points[i+1].x} ${points[i+1].y}`;
            }
            svg += `<path d="${pathD}" fill="none" stroke="${pColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.85" />`;
            points.forEach((p) => { 
                svg += `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="${pColor}" stroke="var(--card-bg)" stroke-width="1.5" />`; 
            });
        }
    });
    
    container.innerHTML = svg + `</svg>`; 
    legendArea.innerHTML = legendHtml; 
    document.getElementById('graph-modal').style.display = 'flex';

    // 카운트다운 로직 (요청사항 2 반영)
    let timeLeft = 10;
    const countdownEl = document.getElementById('graph-countdown-text');
    if (countdownEl) countdownEl.innerText = `${timeLeft}초 후 자동으로 닫힙니다.`;

    if (graphCountdownInterval) clearInterval(graphCountdownInterval);
    graphCountdownInterval = setInterval(() => {
        timeLeft--;
        if (countdownEl) countdownEl.innerText = `${timeLeft}초 후 자동으로 닫힙니다.`;
        if (timeLeft <= 0) {
            clearInterval(graphCountdownInterval);
            closeGraphModal();
        }
    }, 1000);
}

function closeGraphModal() { 
    document.getElementById('graph-modal').style.display = 'none'; 
    if (graphCountdownInterval) { 
        clearInterval(graphCountdownInterval); 
        graphCountdownInterval = null; 
    } 
    
    // 안내 문구 원복
    const countdownEl = document.getElementById('graph-countdown-text');
    if (countdownEl) countdownEl.innerText = "10초 후 자동으로 닫힙니다.";

    // 순위 저장 버튼 깜빡임 추가
    const saveBtn = document.getElementById('mainBtn');
    if (saveBtn) {
        saveBtn.classList.add('flash-save-active');
    }
}

function closePlayerScoreModal() {
    const modal = document.getElementById('player-score-modal'); 
    const content = document.getElementById('player-score-content');
    
    if (scoreModalTimeout) clearTimeout(scoreModalTimeout); 
    if (hideScoreModalTimeout) clearTimeout(hideScoreModalTimeout);
    if(!modal || !content) return; 
    
    content.style.animation = 'scaleDownPopup 0.3s ease-in forwards'; 
    hideScoreModalTimeout = setTimeout(() => { 
        modal.style.display = 'none'; 
        content.style.animation = 'none'; 
    }, 300); 
}

function changeAppTheme() { 
    const theme = document.getElementById('themeSelect').value; 
    document.documentElement.setAttribute('data-theme', theme); 
    localStorage.setItem('appTheme', theme); 
    renderStats(); 
}

function formatDate(dateInput) { 
    const d = new Date(dateInput); 
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); 
}

async function fetchData() {
    showLoading(true, "Cloud 동기화 중");
    try {
        const response = await fetch(`${GAS_URL}?t=${new Date().getTime()}`);
        const rawData = await response.json();
        gameLogs = rawData.map(g => ({ ...g, dateStr: formatDate(g.date) }));
        renderAll(); 
    } catch (e) { 
        console.error("Fetch error"); 
    } finally { 
        showLoading(false); 
        document.getElementById('selectedDateTitle').innerText = `📅 ${selectedDateStr}`; 
    }
}

function renderAll() { 
    renderCalendar(); 
    renderStats(); 
    renderGameList(); 
    analyzeStrategy(); 
}

function isHoliday(year, month, day) {
    const dStr = `${month + 1}-${day}`; 
    const fixed = ["1-1", "3-1", "5-1", "5-5", "6-6", "7-17", "8-15", "10-3", "10-9", "12-25"];
    const variable2026 = ["2-16", "2-17", "2-18", "2-19", "3-2", "5-24", "5-25", "6-3", "8-17", "9-24", "9-25", "9-26", "10-5"];
    return fixed.includes(dStr) || (year === 2026 && variable2026.includes(dStr));
}

function renderCalendar() {
    const grid = document.getElementById('calendarGrid'); 
    grid.innerHTML = "";
    const year = currentViewDate.getFullYear(); 
    const month = currentViewDate.getMonth();
    const realTodayStr = formatDate(new Date()); 
    
    document.getElementById('monthDisplay').innerText = `${year}년 ${month + 1}월`;
    
    ["일","월","화","수","목","금","토"].forEach((d, idx) => { 
        let color = "#95a5a6"; 
        if(idx === 0) color = "#e67e22"; 
        if(idx === 6) color = "#5dade2"; 
        grid.innerHTML += `<div class="weekday" style="color:${color}">${d}</div>`; 
    });
    
    const firstDay = new Date(year, month, 1).getDay(); 
    const lastDate = new Date(year, month + 1, 0).getDate();
    
    for (let i = 0; i < firstDay; i++) {
        grid.innerHTML += `<div></div>`;
    }
    
    for (let d = 1; d <= lastDate; d++) {
        const dStr = formatDate(new Date(year, month, d)); 
        const dayOfWeek = new Date(year, month, d).getDay();
        let dayClass = (dayOfWeek === 0 || isHoliday(year, month, d)) ? "sun holiday" : (dayOfWeek === 6 ? "sat" : "");
        grid.innerHTML += `<div class="day ${dayClass} ${dStr === selectedDateStr ? 'selected' : ''} ${dStr === realTodayStr ? 'today' : ''} ${gameLogs.some(g => g.dateStr === dStr) ? 'has-record' : ''}" onclick="selectDate('${dStr}')">${d}</div>`;
    }
}

function selectDate(dateStr) {
    if(editMode) cancelEdit();
    selectedDateStr = dateStr;
    document.getElementById('selectedDateTitle').innerText = `📅 ${dateStr}`;
    renderCalendar();
    renderGameList();
    
    const hasRecord = gameLogs.some(g => g.dateStr === dateStr);
    if (hasRecord) {
        setTimeout(() => {
            const recordTarget = document.getElementById('record-header-wrap');
            if (recordTarget) recordTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }
}

function checkDuplicates() { 
    const selects = Array.from(document.querySelectorAll('#inputArea select')); 
    const values = selects.map(s => s.value); 
    selects.forEach(s => s.classList.remove('duplicate-error')); 
    values.forEach((v, i) => { 
        if(v && values.filter(x => x === v).length > 1) selects[i].classList.add('duplicate-error'); 
    }); 
}

function updateInputFields(preFill = null) {
    if(preFill) document.getElementById('playerCount').value = preFill.length;
    const count = parseInt(document.getElementById('playerCount').value); 
    const inputArea = document.getElementById('inputArea');
    inputArea.innerHTML = ""; 
    
    let targetPlayers = (preFill) ? preFill.filter(n => n.trim() !== "") : (selectedPlayersForLottery.length === count ? selectedPlayersForLottery : players);
    let html = ''; 
    
    for(let i=1; i<=count; i++) { 
        const label = i === count ? "꼴찌💀" : (i === 1 ? "1위🥇" : `${i}위`); 
        html += `<div class="input-row">
                    <label>${label}</label>
                    <select id="rank${i}" onchange="checkDuplicates()">
                        <option value="">선택</option>
                        ${targetPlayers.map(p => `<option value="${p}" ${preFill && preFill[i-1] === p ? 'selected' : ''}>${p}</option>`).join('')}
                    </select>
                 </div>`; 
    }
    inputArea.innerHTML = html; 
    
    if(!preFill && !editMode && selectedPlayersForLottery.length === 0) {
        document.querySelectorAll('.player-chip').forEach(el => el.classList.remove('active'));
    }
}

function resetInputs() { 
    if(editMode) cancelEdit(); 
    else { 
        document.getElementById('playerCount').value = "3"; 
        resetPlayerSelection(); 
        updateInputFields(); 
    } 
    
    // 순위 저장 버튼 깜빡임 해제
    const saveBtn = document.getElementById('mainBtn');
    if (saveBtn) saveBtn.classList.remove('flash-save-active');
}

async function saveGame() {
    // 순위 저장 버튼 깜빡임 해제
    const saveBtn = document.getElementById('mainBtn');
    if (saveBtn) saveBtn.classList.remove('flash-save-active');

    const today = formatDate(new Date()); 
    if (selectedDateStr > today) return alert("미래에서 온거야? 날짜를 잘 확인혀!"); 
    
    const count = parseInt(document.getElementById('playerCount').value); 
    const ranks = [];
    
    for(let i=1; i<=count; i++) { 
        const val = document.getElementById('rank'+i).value; 
        if(!val) return alert("참 참여 친구의 순위를 모두 선택해줘!"); 
        ranks.push(val); 
    }
    
    if(new Set(ranks).size !== ranks.length) return alert("누가 쌍둥인겨? 잘 선택혀!(중복)");
    
    showLoading(true, "저장 중");
    const payload = { 
        action: editMode ? "UPDATE" : "SAVE", 
        date: selectedDateStr, 
        ranks: [ranks[0] || "", ranks[1] || "", ranks[2] || "", ranks[3] || "", ranks[4] || ""], 
        round: editRound, 
        startOrder: currentStartOrder.length > 0 ? currentStartOrder : null 
    };
    
    try { 
        await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) }); 
        cancelEdit(); 
        currentStartOrder = []; 
        document.getElementById('playerCount').value = "3"; 
        resetPlayerSelection(); 
        updateInputFields(); 
        await fetchData(); 
    } catch (e) { 
        alert("오류 발생!"); 
        showLoading(false); 
    }
}

function analyzeStrategy() {
    const me = document.getElementById('strategyPlayer').value; 
    const resArea = document.getElementById('strategyResultArea');
    const shareBtn = document.getElementById('strategy-share-btn');
    
    if(!me) { 
        resArea.style.display = 'none'; 
        shareBtn.style.display = 'none'; 
        return; 
    }
    
    let stats = {};
    gameLogs.forEach(g => {
        if(!g.startOrder || !g.startOrder.includes(me)) return;
        const order = g.startOrder; 
        const myIdx = order.indexOf(me); 
        const preP = order[(myIdx - 1 + order.length) % order.length];
        const actual = g.ranks.filter(n => n.trim() !== ""); 
        const myRank = actual.indexOf(me); 
        
        if(myRank === -1) return;
        if(!stats[preP]) stats[preP] = {c:0, w:0, l:0, s:0}; 
        
        stats[preP].c++; 
        if(myRank === 0) stats[preP].w++; 
        if(myRank === actual.length - 1 && actual.length > 1) stats[preP].l++; 
        stats[preP].s += (myRank + 1);
    });
    
    const sorted = Object.keys(stats).sort((a,b) => (stats[a].s/stats[a].c) - (stats[b].s/stats[b].c));
    
    if(sorted.length === 0) { 
        resArea.innerHTML = `<div class="empty-search-msg" style="text-align:center; padding:20px; font-weight:800; color:var(--sub-text);">분석 가능한 추첨 기록이 없습니다.</div>`; 
        shareBtn.style.display = 'none'; 
    } else {
        let html = "<table class='stats-table strategy-table'><thead><tr><th>앞 주자</th><th>경기</th><th>평균</th><th style='color:var(--rank1);'>1위</th><th style='color:var(--rankL);'>꼴찌</th></tr></thead><tbody>";
        sorted.forEach(p => { 
            const s = stats[p]; 
            html += `<tr>
                        <td style='color:${getPlayerColor(p)}; font-weight:900;'>${p}</td>
                        <td>${s.c}전</td>
                        <td>${(s.s/s.c).toFixed(1)}위</td>
                        <td style='color:var(--rank1);'>${((s.w/s.c)*100).toFixed(0)}%</td>
                        <td style='color:var(--rankL);'>${((s.l/s.c)*100).toFixed(0)}%</td>
                     </tr>`; 
        });
        resArea.innerHTML = html + "</tbody></table><div class='strategy-footer-text' style='color:var(--sub-text); margin-top:10px; font-weight:800; text-align:center;'>※ 특정 선수 뒤에서의 게임 순위 분석입니다.</div>";
        shareBtn.style.display = 'block';
    }
    resArea.style.display = 'block';
}

function shareStrategyResult() {
    const player = document.getElementById('strategyPlayer').value;
    captureAndShare('strategy-capture-area', 'strategy-share-btn', `${player}_strategy.png`, `${player}의 상성 분석`, `${player} 선수의 순번별 성적 분석 결과입니다!`);
}

function confirmReset(step) {
    const el = document.getElementById('resetSteps');
    if(step === 1) { 
        el.innerHTML = `<div style="color:#e67e22; font-weight:900; margin-bottom:10px;">[1단계] 정말 삭제할거야?</div><div id="confirm-buttons-wrap"><button class="save-btn" style="background:var(--edit);" onclick="confirmReset(2)">OK</button><button class="save-btn btn-cancel" onclick="cancelReset()">취소</button></div>`; 
        document.getElementById('exitBtn').style.display = 'none'; 
    } else if(step === 2) {
        el.innerHTML = `<div style="color:var(--accent); font-weight:900; margin-bottom:10px;">[2단계] 데이터가 모두 삭제돼!</div><div id="confirm-buttons-wrap"><button class="save-btn" style="background:var(--accent);" onclick="confirmReset(3)">OK</button><button class="save-btn btn-cancel" onclick="cancelReset()">취소</button></div>`;
    } else {
        el.innerHTML = `<div style="color:#000; font-weight:900; margin-bottom:10px;">[최종 확인] 복구 불가! 진짜 삭제!</div><div id="confirm-buttons-wrap"><button class="save-btn" style="background:#000; color:#fff;" onclick="executeReset()">OK</button><button class="save-btn btn-cancel" onclick="cancelReset()">취소</button></div>`;
    }
}

function cancelReset() { 
    document.getElementById('resetSteps').innerHTML = `<button class="reset-btn" onclick="confirmReset(1)">⚠️ 모든 데이터 초기화 (복구 불가)</button>`; 
    document.getElementById('exitBtn').style.display = 'block'; 
}

async function executeReset() { 
    showLoading(true, "초기화 중"); 
    try { 
        await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "RESET" }) }); 
        location.reload(); 
    } catch(e) { 
        showLoading(false); 
    } 
}

function toggleAllMode() { 
    isPercentMode = !isPercentMode; 
    renderStats(); 
}

function renderStats() {
    let stats = {}; 
    players.forEach(p => stats[p] = { played: 0, ranks: [0,0,0,0,0], score: 0 });
    
    gameLogs.forEach(g => {
        const actual = g.ranks.filter(n => n.trim() !== "");
        actual.forEach((name, idx) => { 
            if(stats[name]) { 
                stats[name].played++; 
                stats[name].score += getEarnedScore(idx, actual.length); 
                if (idx === actual.length - 1 && actual.length > 1) {
                    stats[name].ranks[4]++; 
                } else if (idx < 4) {
                    stats[name].ranks[idx]++; 
                }
            } 
        });
    });
    
    const sortedByWin = [...players].sort((a,b) => (stats[b].score/stats[b].played || 0) - (stats[a].score/stats[a].played || 0) || stats[b].ranks[0] - stats[a].ranks[0]);
    const maxC = { r0: 0, r4: 0 }; 
    
    players.forEach(p => { 
        maxC.r0 = Math.max(maxC.r0, stats[p].ranks[0]); 
        maxC.r4 = Math.max(maxC.r4, stats[p].ranks[4]); 
    });
    
    let currentRank = 1;
    document.getElementById('statsBody').innerHTML = sortedByWin.map((p, index) => {
        if (index > 0 && (stats[p].score/stats[p].played !== stats[sortedByWin[index-1]].score/stats[sortedByWin[index-1]].played || stats[p].ranks[0] !== stats[sortedByWin[index-1]].ranks[0])) {
            currentRank = index + 1;
        }
        
        const winRate = stats[p].played > 0 ? ((stats[p].ranks[0] / stats[p].played) * 100).toFixed(1) : "0.0";
        let nameStyle = "font-weight:900; cursor:pointer; text-decoration: underline;";
        
        if (stats[p].ranks[4] === maxC.r4 && maxC.r4 > 0) {
            nameStyle += `color:darkred;`; 
        } else if (stats[p].ranks[0] === maxC.r0 && maxC.r0 > 0) {
            nameStyle += `color:darkblue;`; 
        } else {
            nameStyle += `color:#8e44ad;`;
        }
        
        const getVal = (val, total) => isPercentMode ? (total === 0 ? '0%' : ((val/total)*100).toFixed(0) + '%') : val;
        
        return `<tr>
                    <td style="${nameStyle}" onclick="renderMemberHistory('${p}', '${currentRank}')">
                        <span style="font-size:11px;">${getTier(stats[p].score).icon}</span> ${p}
                    </td>
                    <td style="color:#5D4037;">${stats[p].played}</td>
                    <td style="color:var(--rank1);">${getVal(stats[p].ranks[0], stats[p].played)}</td>
                    <td style="color:var(--rank2);">${getVal(stats[p].ranks[1], stats[p].played)}</td>
                    <td style="color:var(--rank3);">${getVal(stats[p].ranks[2], stats[p].played)}</td>
                    <td style="color:var(--rank4);">${getVal(stats[p].ranks[3], stats[p].played)}</td>
                    <td style="color:var(--rankL);">${getVal(stats[p].ranks[4], stats[p].played)}</td>
                    <td><span class="win-rate-pill">${winRate}%</span></td>
                </tr>`;
    }).join('');
    
    const rich = document.getElementById('richFriendArea'); 
    if(maxC.r4 > 0) { 
        const losers = players.filter(p => stats[p].ranks[4] === maxC.r4); 
        rich.style.display = 'block'; 
        rich.innerHTML = `💸 야! 또 나냐? 다들 카드까봐!<br><span style="font-size:16px; color:var(--rankL); font-weight:900;">${losers.join(', ')}</span>`; 
    } else {
        rich.style.display = 'none';
    }
}

function closeMemberHistory() {
    const area = document.getElementById('memberHistoryArea');
    area.style.display = 'none';
    const statsCard = document.querySelector('.stats-card');
    if (statsCard) {
        statsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function renderMemberHistory(name, rank = "") {
    const area = document.getElementById('memberHistoryArea');
    const allPersonal = gameLogs.filter(g => g.ranks.includes(name)).sort((a, b) => (new Date(b.dateStr) - new Date(a.dateStr)) || ((parseInt(b.round) || 0) - (parseInt(a.round) || 0)));
    
    if (allPersonal.length === 0) { 
        const toast = document.getElementById('toast'); 
        toast.innerText = "기록 없음"; 
        toast.style.display = 'block'; 
        setTimeout(() => { toast.style.display = 'none'; }, 2000); 
        return; 
    }
    
    let totalScore = 0; 
    allPersonal.forEach(g => { 
        const actual = g.ranks.filter(n => n.trim() !== ""); 
        totalScore += getEarnedScore(actual.indexOf(name), actual.length); 
    });
    const avg = allPersonal.length > 0 ? (totalScore / allPersonal.length).toFixed(2) : "0.00";
    
    const scoreModal = document.getElementById('player-score-modal'); 
    const scoreContent = document.getElementById('player-score-content');
    
    if (scoreModalTimeout) clearTimeout(scoreModalTimeout); 
    if (hideScoreModalTimeout) clearTimeout(hideScoreModalTimeout);
    
    if(scoreModal && scoreContent) { 
        scoreContent.innerHTML = `<div style="font-size:clamp(45px, 10vw, 55px); margin-bottom:5px;">${playerThemes[name].emoji}</div>
                                  <h2 style="display:flex; justify-content:center; align-items:center; font-size:clamp(28px, 8vw, 38px); font-weight:900; color:${getPlayerColor(name)}; margin:0 0 15px 0;">
                                      ${rank ? rank+'위 ' : ''}${name}
                                  </h2>
                                  <div style="display:flex; flex-direction:column; gap:8px; font-weight:900;">
                                      <div style="background:var(--bg); padding:12px; border-radius:12px;">
                                          <div style="font-size:13px; color:var(--sub-text);">총 승점</div>
                                          <div style="font-size:22px; color:var(--rank1);">${totalScore}점</div>
                                      </div>
                                      <div style="background:var(--bg); padding:12px; border-radius:12px;">
                                          <div style="font-size:13px; color:var(--sub-text);">참여 경기</div>
                                          <div style="font-size:22px; color:var(--rank2);">${allPersonal.length}전</div>
                                      </div>
                                      <div style="background:var(--bg); padding:12px; border-radius:12px;">
                                          <div style="font-size:13px; color:var(--sub-text);">평균 승점</div>
                                          <div style="font-size:22px; color:var(--accent);">${avg}점</div>
                                      </div>
                                  </div>`; 
        scoreModal.style.display = 'flex'; 
        scoreContent.style.animation = 'scaleUpPopup 0.4s forwards'; 
        scoreModalTimeout = setTimeout(() => { closePlayerScoreModal(); }, 3000); 
    }

    let html = `<div style="font-size:15px; font-weight:900; color:${getPlayerColor(name)}; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; border-bottom:2px dashed ${getPlayerColor(name)}50; padding-bottom:10px;">
                    <span>${playerThemes[name].emoji} ${name} 프로필</span>
                    <span style="font-size:13px; cursor:pointer;" onclick="closeMemberHistory()">닫기 ✕</span>
                </div>`;
                
    const recent = allPersonal.slice(0, 10); 
    let w10 = 0, l10 = 0; 
    
    recent.forEach(g => { 
        const actual = g.ranks.filter(n => n.trim() !== ""); 
        if(actual.indexOf(name) === 0) w10++; 
        else if(actual.indexOf(name) === actual.length - 1) l10++; 
    });
    
    let cond = (w10 / recent.length >= 0.3 && l10 / recent.length >= 0.3) ? ["⚡", "도깨비", "var(--rank3)"] : (w10 / recent.length >= 0.3 ? ["☀️", "최상", "var(--rankL)"] : (l10 / recent.length >= 0.3 ? ["🌧️", "비상", "var(--rank1)"] : ["⛅", "보통", "var(--rank2)"]));
    
    html += `<div class="condition-box cond-responsive" onclick="showInfoModal('score')">
                <div style="flex:1; display:flex; flex-direction:column;">
                    <div style="font-size:12px; font-weight:900; color:var(--sub-text);">현재 랭킹 티어</div>
                    <div style="font-size:12px; font-weight:900; color:var(--sub-text); margin-top:3px;">(총 ${totalScore}점 / 평균 ${avg}점)</div>
                </div>
                <div style="font-size:14px; font-weight:900; color:${getTier(totalScore).color};">${getTier(totalScore).icon} ${getTier(totalScore).name}</div>
             </div>`;
    
    html += `<div class="condition-box cond-responsive" onclick="showInfoModal('condition')">
                <div style="font-size:12px; flex:1; font-weight:900; color:var(--sub-text);">최근 컨디션 (${recent.length}G)</div>
                <div style="font-size:14px; font-weight:900; color:${cond[2]};">${cond[0]} ${cond[1]}</div>
             </div>`;
             
    html += `<button id="member-share-btn" class="share-btn-common" style="margin:15px 0;" onclick="shareMemberResult('${name}')">📸 개인 전적 스크린샷 공유</button>`;
    
    recent.forEach(g => { 
        const actual = g.ranks.filter(n => n.trim() !== ""); 
        const rIdx = actual.indexOf(name); 
        const rColor = rIdx === 0 ? 'var(--rank1)' : (rIdx === actual.length - 1 ? 'var(--rankL)' : '#5D4037');
        const rLabel = rIdx === 0 ? '1위🥇' : (rIdx === actual.length - 1 ? '꼴찌💀' : (rIdx + 1) + '위');
        
        const sameDateGames = gameLogs.filter(x => x.dateStr === g.dateStr);
        const gameNumber = sameDateGames.findIndex(x => x.round === g.round) + 1;
        
        html += `<div class="history-item">
                    <span style="font-size:14px; color:#5D4037;">${g.dateStr} <span style="font-size:12px; font-weight:900; color:var(--rank1); margin-left:6px;">${gameNumber}G</span></span>
                    <span style="font-size:15px; color:${rColor};">${rLabel}</span>
                 </div>`; 
    });
    
    area.innerHTML = html; 
    area.style.display = 'block'; 
    area.style.border = `2.5px solid ${getPlayerColor(name)}`; 
    setTimeout(() => { area.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
}

function getCaptureBgColor() { 
    const t = document.documentElement.getAttribute('data-theme') || 'yellow'; 
    if (t === 'dark' || t === 'navy') return t === 'dark' ? '#3c3c41' : '#0a192f'; 
    if (t === 'yellowgreen') return '#f0ffe6'; 
    if (t === 'purple') return '#f3e6ff'; 
    if (t === 'green') return '#e1faeb'; 
    if (t === 'pink') return '#ffebeb'; 
    if (t === 'gray') return '#f0f0f0'; 
    return '#fdfbe7'; 
}

function shareStatsResult() { 
    captureAndShare('stats-capture-area', 'stats-share-btn', `stats_record.png`, '멤버별 누적 전적', '멤버별 누적 전적 결과입니다!'); 
}

function shareMemberResult(name) { 
    captureAndShare('memberHistory-capture-area', 'member-share-btn', `${name}_history.png`, `${name}의 전적`, `${name} 선수의 경기 결과입니다!`); 
}

function changeZoom(v) { 
    document.body.style.zoom = v; 
    if(v === '1.2') document.body.classList.add('zoom-active'); 
    else document.body.classList.remove('zoom-active'); 
}

function renderTodayMVP() {
    const gamesToday = gameLogs.filter(g => g.dateStr === selectedDateStr); 
    const area = document.getElementById('mvpArea');
    if (gamesToday.length < 1) { 
        area.style.display = 'none'; 
        return; 
    }
    
    let stats = {}; 
    gamesToday.forEach(g => { 
        const actual = g.ranks.filter(n => n && n.trim() !== ""); 
        actual.forEach((name, idx) => { 
            if (!stats[name]) stats[name] = { wins: 0, played: 0, lasts: 0 }; 
            stats[name].played++; 
            if (idx === 0) stats[name].wins++; 
            if (idx === actual.length - 1 && actual.length > 1) stats[name].lasts++; 
        }); 
    });
    
    const active = Object.keys(stats); 
    if (active.length === 0) { 
        area.style.display = 'none'; 
        return; 
    }
    
    const winner = active.reduce((a, b) => (stats[a].wins > stats[b].wins ? a : (stats[a].wins === stats[b].wins && stats[a].played < stats[b].played ? a : b)));
    const worker = active.reduce((a, b) => (stats[a].played > stats[b].played ? a : b));
    const survivor = active.reduce((a, b) => { 
        const rA = stats[a].lasts / stats[a].played; 
        const rB = stats[b].lasts / stats[b].played; 
        return rA < rB ? a : (rA === rB && stats[a].played > stats[b].played ? a : b); 
    });
    
    area.innerHTML = `<div style="text-align:center; font-weight:900; font-size:14px; color:var(--rank1); margin-bottom:5px;">🏆 오늘의 MVP 분석</div>
                      <div class="mvp-badge">
                          <span class="mvp-title">🔥 승부사</span>
                          <span class="mvp-player">${winner}</span>
                          <span class="mvp-value">${stats[winner].wins}승 / ${stats[winner].played}전</span>
                      </div>
                      <div class="mvp-badge">
                          <span class="mvp-title">🏃 열정왕</span>
                          <span class="mvp-player">${worker}</span>
                          <span class="mvp-value">${stats[worker].played}경기</span>
                      </div>
                      <div class="mvp-badge">
                          <span class="mvp-title">🛡️ 생존자</span>
                          <span class="mvp-player">${survivor}</span>
                          <span class="mvp-value">꼴찌 단 ${stats[survivor].lasts}회</span>
                      </div>`; 
    area.style.display = 'flex';
}

function renderGameList() {
    const games = gameLogs.filter(g => g.dateStr === selectedDateStr); 
    const area = document.getElementById('dayGameList');
    renderTodayMVP();
    
    if(games.length > 0) { 
        let html = `<div id="record-header-wrap" style="text-align:center; margin:25px 0 10px 0;"><span style="font-size:12px; color:#999; font-weight:800;">DAY'S RECORD</span></div>
                    <button id="today-share-btn" class="share-btn-common" style="margin-bottom:15px;" onclick="shareTodayResult()">📸 오늘의 전적 공유</button>`; 
                    
        games.forEach((g, idx) => { 
            const names = g.ranks.filter(n => n && n.trim() !== ""); 
            html += `<div class="game-item" onclick="toggleActionOverlay(this)">
                         <div class="game-info">
                             <span>${idx+1}G</span>
                             <div style="display:inline-flex; align-items:center;">${generateNamesHTML(names)}</div>
                         </div>
                         <div class="action-overlay">
                             <div class="overlay-btn btn-edit-p" onclick="event.stopPropagation(); enterEditMode(${g.round}, '${names.join(',')}')">수정</div>
                             <div class="overlay-btn btn-del-p" onclick="event.stopPropagation(); deleteGame(${g.round})">삭제</div>
                             <div class="overlay-btn btn-cancel-p" onclick="event.stopPropagation(); closeAllOverlays()">취소</div>
                         </div>
                     </div>`; 
        }); 
        area.innerHTML = html; 
    } else {
        area.innerHTML = "";
    }
}

function shareTodayResult() { 
    captureAndShare('capture-area', 'today-share-btn', `today_record_${selectedDateStr}.png`, '오늘의 전적', `${selectedDateStr} 경기 결과!`); 
}

function shareSearchResult() { 
    captureAndShare('search-capture-area', 'search-share-btn', `search_record.png`, '월별 검색 결과', '당구 전적 검색 결과!'); 
}

function toggleActionOverlay(el) { 
    const overlay = el.querySelector('.action-overlay'); 
    if(!overlay.classList.contains('active')) { 
        document.querySelectorAll('.action-overlay').forEach(o => o.classList.remove('active')); 
        overlay.classList.add('active'); 
    } else {
        overlay.classList.remove('active');
    }
}

function closeAllOverlays() { 
    document.querySelectorAll('.action-overlay').forEach(o => o.classList.remove('active')); 
}

function enterEditMode(round, rankStr) { 
    editMode = true; 
    editRound = round; 
    updateInputFields(rankStr.split(',')); 
    document.getElementById('editBadge').style.display = 'block'; 
    document.getElementById('inputCard').classList.add('edit-active'); 
    const btn = document.getElementById('mainBtn'); 
    btn.innerText = "수정 완료"; 
    btn.classList.add('edit-btn'); 
    document.getElementById('inputArea').scrollIntoView({ behavior: 'smooth', block: 'center' }); 
    closeAllOverlays(); 
}

function cancelEdit() { 
    editMode = false; 
    editRound = null; 
    document.getElementById('editBadge').style.display = 'none'; 
    document.getElementById('inputCard').classList.remove('edit-active'); 
    const btn = document.getElementById('mainBtn'); 
    btn.innerText = "순위 저장"; 
    btn.classList.remove('edit-btn'); 
    document.getElementById('playerCount').value = "3"; 
    resetPlayerSelection(); 
    updateInputFields(); 
    
    // 순위 저장 버튼 깜빡임 해제
    if (btn) btn.classList.remove('flash-save-active');
}

async function deleteGame(round) { 
    if(!confirm("정말 삭제할거야?")) return; 
    showLoading(true, "삭제 중"); 
    try { 
        await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "DELETE", round: round }) }); 
        fetchData(); 
    } catch (e) { 
        showLoading(false); 
    } 
}

function showExitModal() { document.getElementById('exit-modal').style.display = 'flex'; }
function closeExitModal() { document.getElementById('exit-modal').style.display = 'none'; }
function closeAppWindow() { 
    window.close(); 
    setTimeout(() => { 
        document.body.innerHTML = `<div style="background:linear-gradient(135deg, #4a90e2, #9370db); height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; color:white; text-align:center; font-family: 'Pretendard', sans-serif;">
                                       <div style="font-size:60px; margin-bottom:20px;">👋</div>
                                       <div style="font-size:20px; font-weight:900; line-height:1.6;">앱 종료</div>
                                       <div style="font-size:14px; margin-top:30px; opacity:0.8;">다음에 또 봐!</div>
                                   </div>`; 
        document.body.style.backgroundImage = 'none'; 
        document.body.style.padding = '0'; 
    }, 300); 
}

function showLoading(v, t) { 
    document.getElementById('loadingText').innerText = t; 
    document.getElementById('loading').style.display = v ? 'flex' : 'none'; 
}

function changeMonth(v) { 
    currentViewDate.setMonth(currentViewDate.getMonth() + v); 
    renderCalendar(); 
}

function exportData() { 
    if (gameLogs.length === 0) return alert("데이터 없음"); 
    const link = document.createElement('a'); 
    link.href = 'data:application/json;charset=utf-8,'+ encodeURIComponent(JSON.stringify(gameLogs, null, 2)); 
    link.download = `billiard_backup_${new Date().toLocaleDateString('sv-SE')}.json`; 
    link.click(); 
}

function triggerImport() { document.getElementById('importFile').click(); }
function importData(event) { /* 기존 복구 로직 유지 */ }
function setDefaultSearchDates() { if (searchFlatpickr) searchFlatpickr.setDate(new Date()); }

function searchRecords() {
    const mon = document.getElementById('searchDateRange').value; 
    const player = document.getElementById('searchPlayer').value;
    if(!mon || !player) return alert("검색월과 선수를 선택해줘!");
    
    const filtered = gameLogs.filter(g => g.dateStr.startsWith(mon) && g.ranks.includes(player));
    const sArea = document.getElementById('searchSummaryArea'); 
    const lArea = document.getElementById('searchHistoryListArea');
    
    if(filtered.length === 0) { 
        sArea.innerHTML = `<div class="empty-search-msg" style="text-align:center; padding:20px; font-weight:800; color:var(--sub-text);">기록 없음</div>`; 
        sArea.style.display = 'block'; 
        lArea.style.display = 'none'; 
        document.getElementById('search-share-btn').style.display = 'none'; 
        return; 
    }
    
    let r = [0, 0, 0, 0, 0]; 
    filtered.forEach(g => { 
        const actual = g.ranks.filter(n => n.trim() !== ""); 
        const rIdx = actual.indexOf(player); 
        if (rIdx === actual.length - 1 && actual.length > 1) r[4]++; 
        else if (rIdx < 4) r[rIdx]++; 
    });
    
    let othersCount = r[1] + r[2] + r[3];
    sArea.innerHTML = `<div class="summary-box" style="margin: 0 -5px; box-sizing: border-box; background:var(--record-bg); border:2px solid var(--record-border); border-radius:15px; padding:12px 10px;">
                           <div style="text-align:center; font-weight:900; color:var(--text-color); margin-bottom:12px; font-size:15px; letter-spacing:-0.5px;">[ ${player}, ${mon} ]</div>
                           <div class="summary-stats-wrap" style="display:flex; justify-content:space-between; text-align:center; font-weight:900; width:100%; font-size:clamp(11px, 3.5vw, 13px); letter-spacing:-0.5px;">
                               <div style="flex:1; min-width:0; padding:0 2px;">참여<br><span style="font-size:clamp(13px, 4vw, 15px); color:var(--text-color);">${filtered.length}전</span></div>
                               <div style="flex:1; min-width:0; color:var(--rank1); padding:0 2px;">1위<br><span style="font-size:clamp(13px, 4vw, 15px);">${r[0]}승</span></div>
                               <div style="flex:1; min-width:0; color:var(--edit); padding:0 2px;">기타<br><span style="font-size:clamp(13px, 4vw, 15px);">${othersCount}회</span></div>
                               <div style="flex:1; min-width:0; color:var(--rankL); padding:0 2px;">꼴찌<br><span style="font-size:clamp(13px, 4vw, 15px);">${r[4]}회</span></div>
                               <div style="flex:1; min-width:0; color:var(--success); padding:0 2px;">승률<br><span style="font-size:clamp(13px, 4vw, 15px);">${((r[0]/filtered.length)*100).toFixed(1)}%</span></div>
                           </div>
                       </div>`;
    
    lArea.innerHTML = `<div style="max-height:250px; overflow-y:auto; padding-right:5px;">
                           ${filtered.map(g => {
                               const actual = g.ranks.filter(n=>n.trim()!=='');
                               const rankIndex = actual.indexOf(player);
                               const rankColor = rankIndex === 0 ? 'darkblue' : (rankIndex === actual.length-1 ? 'red' : 'var(--text-color)');
                               const rankLabel = rankIndex === 0 ? '1위🥇' : (rankIndex === actual.length-1 ? '꼴찌💀' : (rankIndex+1)+'위');
                               
                               const sameDateGames = gameLogs.filter(x => x.dateStr === g.dateStr);
                               const gameNumber = sameDateGames.findIndex(x => x.round === g.round) + 1;
                               
                               return `<div class="history-item search-result-card" style="flex-direction:column; align-items:flex-start; gap:5px;">
                                           <div style="display:flex; justify-content:space-between; width:100%;">
                                               <span style="font-size:13px; color:var(--sub-text);">${g.dateStr} <span style="font-size:12px; font-weight:900; color:var(--rank1); margin-left:6px;">${gameNumber}G</span></span>
                                               <span style="font-size:14px; font-weight:900; color:${rankColor};">${rankLabel}</span>
                                           </div>
                                           <div style="font-size:12px; display:inline-flex; align-items:center;">${generateNamesHTML(actual)}</div>
                                       </div>`;
                           }).join('')}
                       </div>`;
                       
    sArea.style.display = 'block'; 
    lArea.style.display = 'block'; 
    document.getElementById('search-share-btn').style.display = 'block';
    
    setTimeout(() => {
        const target = document.getElementById('search-capture-area');
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
}

function resetSearch() { 
    setDefaultSearchDates(); 
    document.getElementById('searchPlayer').value = ""; 
    document.getElementById('searchSummaryArea').style.display = 'none'; 
    document.getElementById('searchHistoryListArea').style.display = 'none'; 
    document.getElementById('search-share-btn').style.display = 'none'; 
}

window.onload = () => { 
    searchFlatpickr = flatpickr("#searchDateRange", { plugins: [new monthSelectPlugin({shorthand: true, dateFormat: "Y-m", altFormat: "Y-m"})], locale: "ko", disableMobile: "true" });
    let savedTheme = localStorage.getItem('appTheme') || 'yellow'; 
    document.documentElement.setAttribute('data-theme', savedTheme); 
    document.getElementById('themeSelect').value = savedTheme;
    
    setTimeout(() => { 
        const ws = document.getElementById('welcome-screen'); 
        if(ws) { ws.style.opacity = '0'; setTimeout(() => { ws.style.display = 'none'; }, 800); } 
        showLastGameResult(); 
    }, 3000);
    
    updateInputFields(); 
    setDefaultSearchDates(); 
    fetchData(); 
};

document.addEventListener('click', (e) => { 
    if(!e.target.closest('.game-item')) closeAllOverlays(); 
});