let scoreModalTimeout = null;
let hideScoreModalTimeout = null;
let graphCountdownInterval = null;
let genseiCountdownInterval = null; 
let defenseModalTimeout = null; 
let infoModalCountdownInterval = null; 
let scoreCountdownInterval = null; 
// [v9.04] 대시보드 팝업 타이머 변수 추가
let dashInfoCountdownInterval = null; 

// [프리미엄 UX 추가] 햅틱(진동) 피드백 글로벌 함수 추가
function triggerHaptic(pattern) {
    if (navigator.vibrate) {
        navigator.vibrate(pattern);
    }
}

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

// [V9.05 캡처 무결성 유지] 
async function captureAndShare(targetId, btnId, fileName, shareTitle, shareText) {
    const target = document.getElementById(targetId);
    if (!target) return;
    const shareBtn = document.getElementById(btnId);
    if (shareBtn) shareBtn.style.display = 'none';

    const wasZoomActive = document.body.classList.contains('zoom-active');
    if (wasZoomActive) {
        document.body.style.zoom = '1';
        document.body.classList.remove('zoom-active');
    }

    const ghostWrapper = document.createElement('div');
    ghostWrapper.style.position = 'absolute';
    ghostWrapper.style.top = '-9999px';
    ghostWrapper.style.left = '0';
    ghostWrapper.style.width = '360px'; 
    ghostWrapper.style.background = getCaptureBgColor();
    ghostWrapper.style.padding = '20px';
    ghostWrapper.style.borderRadius = '15px';
    ghostWrapper.style.zIndex = '-9999';
    ghostWrapper.style.letterSpacing = 'normal';
    ghostWrapper.style.wordBreak = 'keep-all';
    
    const clone = target.cloneNode(true);
    clone.style.width = '100%';
    clone.style.margin = '0 auto';
    clone.style.transform = 'none';
    clone.style.animation = 'none';
    clone.style.boxSizing = 'border-box';
    
    const originalForms = target.querySelectorAll('select, input');
    const clonedForms = clone.querySelectorAll('select, input');
    originalForms.forEach((el, i) => {
        const cEl = clonedForms[i];
        const div = document.createElement('div');
        div.innerText = el.tagName === 'SELECT' ? (el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : '') : (el.value || el.placeholder || '');
        div.style.cssText = window.getComputedStyle(el).cssText;
        div.style.display = 'flex'; 
        div.style.alignItems = 'center'; 
        div.style.justifyContent = 'center';
        div.style.padding = '12px'; 
        div.style.background = 'rgba(236, 238, 241, 0.4)';
        div.style.borderRadius = '8px'; 
        div.style.width = '100%'; 
        div.style.boxSizing = 'border-box';
        div.style.fontWeight = '900'; 
        div.style.fontSize = '15px'; 
        div.style.color = 'var(--text-color)';
        cEl.parentNode.replaceChild(div, cEl);
    });

    ghostWrapper.appendChild(clone);
    document.body.appendChild(ghostWrapper);

    try {
        await new Promise(r => setTimeout(r, 300));
        
        const canvas = await html2canvas(ghostWrapper, { 
            backgroundColor: getCaptureBgColor(), 
            scale: 2, 
            logging: false, 
            useCORS: true 
        });
        
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        const file = new File([blob], fileName, { type: 'image/png' });
        
        if (navigator.share) {
            try { 
                await navigator.share({ files: [file], title: shareTitle, text: shareText }); 
            } catch (e) { 
                console.log('Share canceled', e); 
            }
        } else {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            link.click();
        }
    } catch (err) {
        alert("캡처 중 오류가 발생했습니다.");
    } finally {
        document.body.removeChild(ghostWrapper);
        if (shareBtn) shareBtn.style.display = 'block';
        if (wasZoomActive) {
            document.body.style.zoom = '1.2';
            document.body.classList.add('zoom-active');
        }
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

// [v9.05] 대시보드 위젯 클릭 시 호출되는 팝업 함수 (멘트 교정)
function showDashInfo(type) {
    triggerHaptic(10); // [프리미엄 추가] 햅틱 피드백 연동
    let title = "";
    let desc = "";
    let icon = "";

    const wrapStart = "<div style='white-space: normal; word-break: keep-all; overflow-wrap: break-word; line-height: 1.5; text-align: left;'>";
    const wrapEnd = "</div>";

    if (type === 'totalGames') {
        icon = "🎱";
        title = "총 게임 수";
        desc = wrapStart + "현재 선택된 기간과 인원 조건에 부합하여 실제로 진행된 <b>총 게임 횟수</b>를 의미함." + wrapEnd;
    } else if (type === 'totalDays') {
        icon = "📅";
        title = "총 게임 일수";
        desc = wrapStart + "단순 게임 횟수가 아닌, 실제로 당구 클럽에 모여서 <b>게임을 즐긴 날짜의 총합</b>을 의미." + wrapEnd;
    } else if (type === 'mvp') {
        icon = "👑";
        title = "월간 MVP 기준";
        desc = wrapStart + "<b>평균 승점</b>을 최우선으로 고려. 평균 승점이 같을 경우 승률(1위 횟수)을 비교하여 <b>해당 월에 가장 압도적인 기량을 보여준 선수</b>를 선정." + wrapEnd;
    } else if (type === 'villain') {
        icon = "💸";
        title = "지갑 전사 기준";
        desc = wrapStart + "해당 월에 참여한 게임 수 대비 <b>꼴찌를 가장 높은 비율로 기록한 선수</b>. 게임비를 가장 많이 지출했을 것으로 추정되는 안타까운(?) 타이틀." + wrapEnd;
    } else if (type === 'trend') {
        icon = "📈";
        title = "최근 2일 트렌드 분석";
        desc = wrapStart + "시즌 전체 평균 성적과 비교하여, <b>최근 2일간의 평균 성적이 15% 이상 급등(🔥Hot) 하거나 급락(❄️Cold)</b> 한 선수를 자동으로 감지하여 선정." + wrapEnd;
    } else if (type === 'defense') {
        icon = "🛡️";
        title = "철벽 방어 기준";
        desc = wrapStart + "추첨된 순번 상 <b>내 바로 다음 순서인 선수의 멘탈을 붕괴시켜 평균 순위를 가장 낮게(숫자가 높게) 만든</b> 디펜스 최고의 지배자." + wrapEnd;
    }

    const descEl = document.getElementById('info-modal-desc');
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'navy') {
        descEl.style.color = '#5D4037';
    } else {
        descEl.style.color = ''; 
    }

    const popupBox = document.getElementById('info-modal-title').parentElement;
    if (popupBox) {
        if (document.body.classList.contains('zoom-active')) {
            popupBox.style.zoom = '0.85'; 
        } else {
            popupBox.style.zoom = '1';
        }
    }

    let timerEl = document.getElementById('dash-info-timer');
    if (!timerEl) {
        timerEl = document.createElement('div');
        timerEl.id = 'dash-info-timer';
        timerEl.style.cssText = 'margin-top:15px; font-size:12px; color:var(--sub-text); font-weight:800; text-align:center; display:block; width:100%;';
        descEl.parentNode.insertBefore(timerEl, descEl.nextSibling);
    }
    
    document.getElementById('info-modal-icon').innerHTML = icon;
    document.getElementById('info-modal-title').innerHTML = title;
    descEl.innerHTML = desc;
    
    document.getElementById('info-modal').style.display = 'flex';

    let timeLeft = 10;
    timerEl.innerText = `${timeLeft}초 후 자동으로 닫힙니다.`;

    if (dashInfoCountdownInterval) clearInterval(dashInfoCountdownInterval);
    dashInfoCountdownInterval = setInterval(() => {
        timeLeft--;
        if (timerEl) timerEl.innerText = `${timeLeft}초 후 자동으로 닫힙니다.`;
        if (timeLeft <= 0) {
            clearInterval(dashInfoCountdownInterval);
            closeInfoModal();
        }
    }, 1000);
}

function showRingCriteria(type) {
    let title = "", desc = "";
    if (type === 'win') {
        title = "승률 산출 기준";
        desc = "<b>(1위 횟수 / 참여 경기수) × 100</b><br><br><div style='white-space: normal; word-break: keep-all; overflow-wrap: break-word; line-height: 1.4;'>해당 월에 참여한 전체 경기 중 1위를 차지한 비율입니다. 공격적인 결정력을 보여주는 지표입니다.</div>";
    } else if (type === 'score') {
        title = "평균득점 산출 기준";
        desc = "<div style='white-space: normal; word-break: keep-all; overflow-wrap: break-word; line-height: 1.4;'>해당 선수의 월간 평균 승점입니다. 5점 기준.</div>";
    } else if (type === 'safety') {
        title = "생존율 산출 기준";
        desc = "<b>((경기수 - 꼴찌수) / 경기수) × 100</b><br><br><div style='white-space: normal; word-break: keep-all; overflow-wrap: break-word; line-height: 1.4;'>참여 경기 중 꼴찌를 하지 않고 살아남은 비율입니다. 무너지지 않는 수비적 안정감을 보여주는 지표입니다.</div>";
    }

    const timerEl = document.getElementById('info-modal-timer');
    if(timerEl) {
        timerEl.style.display = 'block';
        let timeLeft = 10;
        timerEl.innerText = `${timeLeft}초 후 자동으로 닫힙니다.`;

        if (infoModalCountdownInterval) clearInterval(infoModalCountdownInterval);
        infoModalCountdownInterval = setInterval(() => {
            timeLeft--;
            if (timerEl) timerEl.innerText = `${timeLeft}초 후 자동으로 닫힙니다.`;
            if (timeLeft <= 0) {
                clearInterval(infoModalCountdownInterval);
                closeInfoModal();
            }
        }, 1000);
    }

    document.getElementById('info-modal-icon').innerHTML = "ℹ️";
    document.getElementById('info-modal-title').innerHTML = title;
    document.getElementById('info-modal-desc').innerHTML = desc;
    document.getElementById('info-modal').style.display = 'flex';
}

function showInfoModal(type) {
    let title = ""; 
    let desc = ""; 
    let icon = "";
    
    const wrapStart = "<div style='white-space: normal; word-break: keep-all; overflow-wrap: break-word; line-height: 1.5; text-align: left;'>";
    const wrapEnd = "</div>";

    if (type === 'score') {
        icon = "📊"; 
        title = "인원별 차등 승점 기준";
        desc = "<div style='white-space: nowrap; line-height: 1.5; text-align: left;'>• <b>2인</b>: 1위(+2), 꼴찌(0)<br>• <b>3인</b>: 1위(+3), 2위(+1), 꼴찌(0)<br>• <b>4인</b>: 1위(+4), 2위(+3), 3위(+2), 꼴찌(0)<br>• <b>5인</b>: 1위(+5), 2위(+4), 3위(+3), 4위(+1), 꼴찌(0)</div>";
    } else if (type === 'tier') {
        icon = "🏅"; 
        title = "랭킹 티어(계급) 기준";
        desc = wrapStart + "👑<b>챌린저</b>: 60+ &nbsp;💎<b>플래티넘</b>: 50+<br>🥇<b>골드</b>: 40+ &nbsp;&nbsp;🥈<b>실버</b>: 30+ &nbsp;🥉<b>브론즈</b>: 30미만" + wrapEnd;
    } else if (type === 'condition') {
        icon = "🌡️"; 
        title = "최근 컨디션 분석 기준";
        desc = wrapStart + "• ☀️<b>최상</b>: 1위 비율 30%↑<br>• ⛅<b>보통</b>: 1위 비율 30% 미만. 안정적인 보통 순위<br>• ⚡<b>도깨비</b>: 1위 30%↑ & 꼴찌 30%↑<br>• 🌧️<b>비상</b>: 꼴찌 비율 30%↑" + wrapEnd;
    } else if (type === 'style') { 
        icon = "🎱";
        title = "당구 성향 분석 기준";
        desc = wrapStart + "<b>[승률 35% & 생존율 80% 기준]</b><br><br>• 👑 <b>전략적 지배자</b>: 승률↑ & 생존율↑<br>• 🐅 <b>폭격형 호랑이</b>: 승률↑ & 생존율↓<br>• 🐢 <b>철벽 거북이</b>: 승률↓ & 생존율↑<br>• 🐣 <b>성장하는 꿈나무</b>: 승률↓ & 생존율↓" + wrapEnd;
    }
    
    const descEl = document.getElementById('info-modal-desc');
    const timerEl = document.getElementById('info-modal-timer');
    if(timerEl) timerEl.style.display = 'none'; 

    if (infoModalCountdownInterval) {
        clearInterval(infoModalCountdownInterval);
        infoModalCountdownInterval = null;
    }

    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'navy') {
        descEl.style.color = '#5D4037';
    } else {
        descEl.style.color = ''; 
    }

    const popupBox = document.getElementById('info-modal-title').parentElement;
    if (popupBox) {
        if (document.body.classList.contains('zoom-active')) {
            popupBox.style.zoom = '0.85'; 
        } else {
            popupBox.style.zoom = '1';
        }
    }
    
    document.getElementById('info-modal-icon').innerHTML = icon;
    document.getElementById('info-modal-title').innerHTML = title;
    descEl.innerHTML = desc;
    document.getElementById('info-modal').style.display = 'flex';
}

function closeInfoModal() { 
    document.getElementById('info-modal').style.display = 'none'; 
    if (infoModalCountdownInterval) {
        clearInterval(infoModalCountdownInterval);
        infoModalCountdownInterval = null;
    }
    if (dashInfoCountdownInterval) {
        clearInterval(dashInfoCountdownInterval);
        dashInfoCountdownInterval = null;
    }
    const timerEl = document.getElementById('dash-info-timer');
    if (timerEl) timerEl.remove();
}

function showLastGameResult() {
    if (!gameLogs || gameLogs.length === 0) { 
        if (document.getElementById('loading').style.display === 'none') return;
        setTimeout(showLastGameResult, 500); 
        return; 
    }
    
    const latestDate = gameLogs.reduce((max, game) => (game.dateStr > max ? game.dateStr : max), gameLogs[0].dateStr);
    const gamesOnLatestDate = gameLogs.filter(g => g.dateStr === latestDate);
    const lastGame = gamesOnLatestDate[gamesOnLatestDate.length - 1];
    const actualRanks = lastGame.ranks.filter(n => n && n.trim() !== "");
    
    let html = `<div style="font-size:40px; margin-bottom:10px; display:block; text-align:center;">🏆</div>
                <div style="font-size:18px; font-weight:900; color:var(--text-color); margin-bottom:5px; display:block; text-align:center;">LAST GAME RECORD</div>
                <div style="font-size:15px; font-weight:800; color:var(--sub-text); margin-bottom: 20px; display:block; text-align:center;">[ ${lastGame.dateStr} ]</div>
                <div style="display:block; font-weight:900;">`;
    
    actualRanks.forEach((name, i) => {
        const rankLabel = (i === 0) ? "1위🥇" : (i === actualRanks.length - 1 ? "꼴찌💀" : `${i + 1}위`);
        const rankColor = (i === 0) ? 'var(--rank1)' : (i === actualRanks.length - 1 ? 'var(--rankL)' : 'var(--text-color)');
        html += `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.4); padding:12px 20px; border-radius:15px; border:1px solid rgba(0,0,0,0.05); box-shadow: inset 1px 1px 3px rgba(255,255,255,0.7); margin-bottom:8px;">
                    <div style="color:${rankColor}; font-size:${i === 0 ? '16px' : '14px'}; font-weight:${i === 0 ? '900' : '800'};">${rankLabel}</div>
                    <div style="color:${rankColor}; font-size:${i === 0 ? '22px' : '16px'}; font-weight:${i === 0 ? '900' : '800'};">${name}</div>
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
    triggerHaptic(15); // [프리미엄 추가] 햅틱 피드백 연동
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
    
    const saveBtn = document.getElementById('mainBtn');
    if (saveBtn) saveBtn.classList.remove('flash-save-active');
}

function pickRandomOrder() {
    triggerHaptic([20, 30, 20]); // [프리미엄 추가] 햅틱 피드백 연동
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
    
    const finalHtml = `<div style="background: rgba(128, 128, 128, 0.1); border-radius: 15px; padding: 15px; margin-bottom: 20px; border: 2.5px dashed ${p1Color}; display:block;">
                           <div style="font-size: 14px; color: ${p1Color}; margin-bottom:5px;">🎯 이 게임의 초구는 바로 너!</div>
                           <div style="font-size: 26px; color: ${p1Color}; font-weight: 900;">1번 : ${firstPlayer}</div>
                       </div>
                       <div style="font-size: 17px; opacity: 0.9; line-height: 2.2; font-weight: 800; display:block;">
                           ${remaining.map((p, idx) => `<div style="color: ${getPlayerColor(p)}; display:block;">${idx + 2}번 : ${p}</div>`).join('')}
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
    
    // [프리미엄 추가] Bezier 곡선 하단 그라데이션 필링을 위한 defs 동적 생성
    let svg = `<svg width="100%" height="100%" viewBox="-15 -10 130 120" preserveAspectRatio="none" style="overflow: visible; font-family: inherit;">
               <defs>`;
    players.forEach((p, i) => {
        const c = getGraphColor(p);
        svg += `<linearGradient id="grad-${i}" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="${c}" stop-opacity="0.4"/>
                    <stop offset="100%" stop-color="${c}" stop-opacity="0.0"/>
                </linearGradient>`;
    });
    svg += `</defs>`;
    
    const yLabels = ["1위", "2위", "3위", "4위", "꼴찌"];
    
    for(let i=0; i<=4; i++) { 
        let y = i * 25; 
        svg += `<line x1="0" y1="${y}" x2="100" y2="${y}" stroke="rgba(150,150,150,0.25)" stroke-width="1" stroke-dasharray="3,3" />
                <text x="-4" y="${y + 3}" font-size="7" font-weight="900" fill="var(--sub-text)" text-anchor="end">${yLabels[i]}</text>`; 
    }
    
    players.forEach((playerName, playerIndex) => {
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
            
            // [프리미엄 추가] 곡선 하단 채우기 패스 생성
            let fillPathD = pathD + ` L ${points[points.length - 1].x} 100 L ${points[0].x} 100 Z`;
            svg += `<path d="${fillPathD}" fill="url(#grad-${playerIndex})" />`;
            
            svg += `<path d="${pathD}" fill="none" stroke="${pColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.85" />`;
            points.forEach((p) => { 
                svg += `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="${pColor}" stroke="var(--card-bg)" stroke-width="1.5" />`; 
            });
        }
    });
    
    container.innerHTML = svg + `</svg>`; 
    legendArea.innerHTML = legendHtml; 
    document.getElementById('graph-modal').style.display = 'flex';

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
    
    const countdownEl = document.getElementById('graph-countdown-text');
    if (countdownEl) countdownEl.innerText = "10초 후 자동으로 닫힙니다.";

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
    if (scoreCountdownInterval) { clearInterval(scoreCountdownInterval); scoreCountdownInterval = null; } 
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
        console.error("Fetch error", e); 
    } finally { 
        showLoading(false); 
        document.getElementById('selectedDateTitle').innerText = `📅 ${selectedDateStr}`; 
    }
}

function renderAll() { 
    renderDashboard();
    renderSeasonTrend(); // [v9.50 추가] 시즌 성적 추이 호출
    renderCalendar(); 
    renderStats(); 
    renderScoreRank(); 
    renderDefenseStats(); 
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
    
    document.getElementById('monthDisplay').innerText = `${year}.${String(month + 1).padStart(2, '0')}`;
    
    const daysLabel = ["일","월","화","수","목","금","토"];
    daysLabel.forEach((d, idx) => {
        let color = "var(--sub-text)";
        if(idx === 0) color = "#ff7675"; 
        if(idx === 6) color = "#74b9ff"; 
        grid.innerHTML += `<div class="weekday" style="color:${color}; font-size: 11px; font-weight: 700; opacity: 0.6; padding-bottom: 15px;">${d}</div>`;
    });
    
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    
    for (let i = 0; i < firstDay; i++) {
        grid.innerHTML += `<div></div>`;
    }
    
    for (let d = 1; d <= lastDate; d++) {
        const dStr = formatDate(new Date(year, month, d));
        const dayOfWeek = new Date(year, month, d).getDay();
        const hasRecord = gameLogs.some(g => g.dateStr === dStr);
        
        let dayClass = "day-new";
        if (dStr === selectedDateStr) dayClass += " selected-new";
        if (dStr === realTodayStr) dayClass += " today-new";
        if (dayOfWeek === 0 || isHoliday(year, month, d)) dayClass += " sun-new";
        if (dayOfWeek === 6) dayClass += " sat-new";
        
        const recordDot = hasRecord ? `<div class="record-dot">🩷</div>` : "";

        grid.innerHTML += `
            <div class="${dayClass}" onclick="selectDate('${dStr}')">
                <span class="day-num">${d}</span>
                ${recordDot}
            </div>`;
    }

    const timelineWrap = document.getElementById('monthRecordTimeline');
    if (timelineWrap) {
        timelineWrap.innerHTML = ""; 
        const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
        const monthGames = gameLogs.filter(g => g.dateStr.startsWith(currentMonthPrefix));
        
        const uniqueDates = [...new Set(monthGames.map(g => g.dateStr))].sort();
        
        if (uniqueDates.length > 0) {
            timelineWrap.style.display = 'flex';
            let timelineHtml = '';
            
            uniqueDates.forEach(dStr => {
                const dayParts = dStr.split('-');
                const dayNum = parseInt(dayParts[2], 10); 
                const isActive = (dStr === selectedDateStr) ? ' active' : '';
                
                timelineHtml += `
                    <div class="timeline-item${isActive}" onclick="selectDate('${dStr}')">
                        <div class="timeline-date">${dayNum}</div>
                        <div class="timeline-dot"></div>
                    </div>
                `;
            });
            timelineWrap.innerHTML = timelineHtml;
        } else {
            timelineWrap.style.display = 'none';
        }
    }
}

function selectDate(dateStr) {
    triggerHaptic(10); // [프리미엄 추가] 햅틱 피드백 연동
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
    
    const saveBtn = document.getElementById('mainBtn');
    if (saveBtn) saveBtn.classList.remove('flash-save-active');
}

async function saveGame() {
    triggerHaptic(20); // [프리미엄 추가] 햅틱 피드백 연동
    const saveBtn = document.getElementById('mainBtn');
    if (saveBtn) saveBtn.classList.remove('flash-save-active');

    const today = formatDate(new Date()); 
    if (selectedDateStr > today) return alert("미래에서 온거야? 날짜를 잘 확인혀!"); 
    
    const count = parseInt(document.getElementById('playerCount').value); 
    const ranks = [];
    
    for(let i=1; i<=count; i++) { 
        const val = document.getElementById('rank'+i).value; 
        if(!val) return alert("참여 친구의 순위를 모두 선택해줘!"); 
        ranks.push(val); 
    }
    
    if(new Set(ranks).size !== ranks.length) return alert("누가 쌍둥인겨? 잘 선택혀!(중복)");
    
    showLoading(true, "저장 중");
    const payload = { 
        action: "SAVE", 
        date: selectedDateStr, 
        ranks: [ranks[0] || "", ranks[1] || "", ranks[2] || "", ranks[3] || "", ranks[4] || ""], 
        round: editRound, 
        startOrder: currentStartOrder.length > 0 ? currentStartOrder : null 
    };
    if(editMode) payload.action = "UPDATE";
    
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
function renderDashboard() {
    const dCard = document.getElementById('dashboardCard');
    if (!dCard) return;

    const filterEl = document.getElementById('statsFilterCount');
    const filterVal = filterEl ? filterEl.value : "all";

    const monthEl = document.getElementById('statsFilterMonth');
    const monthVal = monthEl ? monthEl.value : "";

    let countText = filterVal === "all" ? "전체" : filterVal + "인";
    let monthText = monthVal ? monthVal : "전체 기간";
    const monthLabel = document.getElementById('dashMonthLabel');
    if (monthLabel) monthLabel.innerText = `(${monthText}, ${countText})`;

    let filtered = gameLogs;
    if (monthVal) filtered = filtered.filter(g => g.dateStr.startsWith(monthVal));
    if (filterVal !== "all") {
        const count = parseInt(filterVal);
        filtered = filtered.filter(g => g.ranks.filter(n => n.trim() !== "").length === count);
    }

    dCard.style.display = 'block';

    if (filtered.length === 0) {
        const els = ['dashTotalGames', 'dashTotalDays', 'dashMVP', 'dashVillain', 'dashHot', 'dashCold', 'dashDefense'];
        els.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (id === 'dashTotalGames') el.innerText = '0G';
                else if (id === 'dashTotalDays') el.innerText = '0일';
                else el.innerText = '-';
            }
        });
        return;
    }

    let totalGames = filtered.length;
    let pStats = {};
    players.forEach(p => pStats[p] = { played: 0, wins: 0, lasts: 0, score: 0, totalRank: 0 });

    let datesSet = new Set();

    filtered.forEach(g => {
        datesSet.add(g.dateStr); 
        const actual = g.ranks.filter(n => n.trim() !== "");
        actual.forEach((p, idx) => {
            if (pStats[p]) {
                pStats[p].played++;
                const s = getEarnedScore(idx, actual.length);
                pStats[p].score += s;
                pStats[p].totalRank += (idx + 1);
                if (idx === 0) pStats[p].wins++;
                if (idx === actual.length - 1 && actual.length > 1) pStats[p].lasts++;
            }
        });
    });

    const dashTotalGames = document.getElementById('dashTotalGames');
    if (dashTotalGames) dashTotalGames.innerText = `${totalGames}G`;
    
    const dashTotalDays = document.getElementById('dashTotalDays');
    if (dashTotalDays) dashTotalDays.innerText = `${datesSet.size}일`;

    let activePlayers = players.filter(p => pStats[p].played > 0);
    let mvp = "-", villain = "-";
    
    if (activePlayers.length > 0) {
        // [v9.05 업데이트] 월간 MVP 1순위: 평균승점, 2순위: 승률 통일 스와핑
        mvp = activePlayers.reduce((a, b) => {
            const avgA = pStats[a].score / pStats[a].played;
            const avgB = pStats[b].score / pStats[b].played;
            if (avgA !== avgB) return avgA > avgB ? a : b;
            return (pStats[a].wins / pStats[a].played) > (pStats[b].wins / pStats[b].played) ? a : b;
        });
        villain = activePlayers.reduce((a, b) => {
            const lrA = pStats[a].lasts / pStats[a].played;
            const lrB = pStats[b].lasts / pStats[b].played;
            if (lrA !== lrB) return lrA > lrB ? a : b;
            return pStats[a].lasts > pStats[b].lasts ? a : b;
        });
    }
    
    const dashMVP = document.getElementById('dashMVP');
    if (dashMVP) dashMVP.innerText = mvp;
    const dashVillain = document.getElementById('dashVillain');
    if (dashVillain) dashVillain.innerText = villain;

    let sortedDates = Array.from(datesSet).sort((a, b) => b.localeCompare(a));
    let recentDates = sortedDates.slice(0, 2);
    let recentFiltered = filtered.filter(g => recentDates.includes(g.dateStr));
    
    let rStats = {};
    players.forEach(p => rStats[p] = { played: 0, totalRank: 0 });

    recentFiltered.forEach(g => {
        const actual = g.ranks.filter(n => n.trim() !== "");
        actual.forEach((p, idx) => {
            if (rStats[p]) {
                rStats[p].played++;
                rStats[p].totalRank += (idx + 1);
            }
        });
    });

    let hotCandidate = "-", coldCandidate = "-";
    let maxRise = -Infinity, maxDrop = -Infinity;

    activePlayers.forEach(p => {
        if (pStats[p].played >= 3 && rStats[p].played > 0) {
            const seasonAvgRank = pStats[p].totalRank / pStats[p].played;
            const recentAvgRank = rStats[p].totalRank / rStats[p].played;

            const risePercent = ((seasonAvgRank - recentAvgRank) / seasonAvgRank) * 100;
            if (risePercent >= 15 && risePercent > maxRise) {
                maxRise = risePercent;
                hotCandidate = p;
            }
            
            const dropPercent = ((recentAvgRank - seasonAvgRank) / seasonAvgRank) * 100;
            if (dropPercent >= 15 && dropPercent > maxDrop) {
                maxDrop = dropPercent;
                coldCandidate = p;
            }
        }
    });

    const dashHot = document.getElementById('dashHot');
    if (dashHot) dashHot.innerText = hotCandidate !== "-" ? hotCandidate : "대기";
    const dashCold = document.getElementById('dashCold');
    if (dashCold) dashCold.innerText = coldCandidate !== "-" ? coldCandidate : "대기";

    let defStats = {};
    players.forEach(p => defStats[p] = { count: 0, totalNextRank: 0 });
    filtered.forEach(g => {
        if (g.startOrder && g.startOrder.length > 0) {
            const actual = g.ranks.filter(n => n.trim() !== "");
            const order = g.startOrder;
            for (let i = 0; i < order.length; i++) {
                const preP = order[i];
                const nextP = order[(i + 1) % order.length];
                const nextIdx = actual.indexOf(nextP);
                if (nextIdx !== -1 && defStats[preP]) {
                    defStats[preP].count++;
                    defStats[preP].totalNextRank += (nextIdx + 1);
                }
            }
        }
    });

    let defCandidate = "-";
    let maxDefAvg = -1;
    activePlayers.forEach(p => {
        if (defStats[p] && defStats[p].count > 0) {
            const avg = defStats[p].totalNextRank / defStats[p].count;
            if (avg > maxDefAvg) {
                maxDefAvg = avg;
                defCandidate = p;
            }
        }
    });
    
    const dashDefense = document.getElementById('dashDefense');
    if (dashDefense) dashDefense.innerText = defCandidate !== "-" ? `${defCandidate} (${maxDefAvg.toFixed(1)}위)` : "-";
}

// [v9.50 신규 기능] 시즌 성적 추이 (월별 트렌드 그래프)
function renderSeasonTrend() {
    const trendCard = document.getElementById('seasonTrendCard');
    if (!trendCard) return;

    const filterEl = document.getElementById('statsFilterCount');
    const filterVal = filterEl ? filterEl.value : "all";

    let countText = filterVal === "all" ? "전체 인원" : filterVal + "인";
    const periodLabel = document.getElementById('trendPeriodLabel');
    if (periodLabel) periodLabel.innerText = `(${countText} 기준)`;

    let monthlyData = {};
    gameLogs.forEach(g => {
        const month = g.dateStr.substring(0, 7); 
        const actual = g.ranks.filter(n => n.trim() !== "");
        if (filterVal !== "all" && actual.length !== parseInt(filterVal)) return;

        if (!monthlyData[month]) monthlyData[month] = {};
        actual.forEach((p, idx) => {
            if (!monthlyData[month][p]) monthlyData[month][p] = { rankSum: 0, games: 0 };
            monthlyData[month][p].rankSum += (idx + 1);
            monthlyData[month][p].games++;
        });
    });

    const sortedMonths = Object.keys(monthlyData).sort().slice(-6);

    if (sortedMonths.length < 2) {
        trendCard.style.display = 'none';
        return;
    }

    trendCard.style.display = 'block';

    const container = document.getElementById('trend-graph-container');
    const legendArea = document.getElementById('trend-legend');
    
    let legendHtml = "";
    let svg = `<svg width="100%" height="100%" viewBox="-15 -10 130 135" preserveAspectRatio="none" style="overflow: visible; font-family: inherit;">`;

    const yLabels = ["1위", "2위", "3위", "4위", "5위"];
    for(let i=0; i<=4; i++) { 
        let y = i * 25; 
        svg += `<line x1="0" y1="${y}" x2="100" y2="${y}" stroke="rgba(150,150,150,0.25)" stroke-width="1" stroke-dasharray="3,3" />
                <text x="-4" y="${y + 3}" font-size="7" font-weight="900" fill="var(--sub-text)" text-anchor="end">${yLabels[i]}</text>`; 
    }

    const stepX = 100 / (sortedMonths.length - 1);
    sortedMonths.forEach((m, i) => {
        let x = i * stepX;
        let mLabel = m.substring(5, 7) + "월"; 
        svg += `<text x="${x}" y="115" font-size="8" font-weight="900" fill="var(--text-color)" text-anchor="middle">${mLabel}</text>`;
    });

    players.forEach(playerName => {
        let points = [];
        let hasValidData = false;

        sortedMonths.forEach((m, i) => {
            const pData = monthlyData[m][playerName];
            if (pData && pData.games >= 2) { // 해당 월에 최소 2게임 이상 참여해야 트렌드 반영
                let avgRank = pData.rankSum / pData.games;
                let y = (avgRank - 1) * 25; 
                points.push({x: i * stepX, y: y, valid: true});
                hasValidData = true;
            } else {
                points.push({x: i * stepX, y: null, valid: false});
            }
        });

        if (hasValidData) {
            const pColor = getGraphColor(playerName); 
            legendHtml += `<div style="display:flex; align-items:center; gap:4px;">
                               <span style="display:inline-block; width:10px; height:3px; background-color:${pColor}; border-radius:2px;"></span>
                               <span style="color:var(--text-color);">${playerName}</span>
                           </div>`;
            
            let pathD = "";
            let first = true;
            points.forEach((p) => {
                if (p.valid) {
                    if (first) {
                        pathD += `M ${p.x} ${p.y} `;
                        first = false;
                    } else {
                        pathD += `L ${p.x} ${p.y} `;
                    }
                } else {
                    first = true; 
                }
            });

            if (pathD.trim() !== "") {
                svg += `<path d="${pathD}" fill="none" stroke="${pColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.85" />`;
                points.forEach((p) => { 
                    if(p.valid) {
                        svg += `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="${pColor}" stroke="var(--card-bg)" stroke-width="1.5" />`; 
                    }
                });
            }
        }
    });

    container.innerHTML = svg + `</svg>`;
    legendArea.innerHTML = legendHtml;
}

function shareTrendResult() {
    captureAndShare('trend-capture-area', 'trend-share-btn', 'season_trend.png', '시즌 성적 추이', '최근 시즌 멤버별 성적 추이입니다!');
}

function onFilterChange() {
    renderDashboard();       
    renderSeasonTrend();     // [v9.50] 필터 변경 시 시즌 트렌드도 갱신
    renderStats();           
    renderScoreRank();
    renderDefenseStats();    
    closeMemberHistory();    
}

function toggleAllMode() { 
    isPercentMode = !isPercentMode; 
    renderStats(); 
}

function renderScoreRank() {
    const filterEl = document.getElementById('statsFilterCount');
    const filterVal = filterEl ? filterEl.value : "all";

    const monthEl = document.getElementById('statsFilterMonth');
    const monthVal = monthEl ? monthEl.value : "";

    const labelEl = document.getElementById('scoreRankFilterLabel');
    let countText = filterVal === "all" ? "전체" : filterVal + "인";
    let monthText = monthVal ? monthVal : "전체 기간";
    if (labelEl) labelEl.innerText = `(${monthText}, ${countText})`;

    let stats = {};
    players.forEach(p => stats[p] = { played: 0, score: 0, wins: 0 });

    gameLogs.forEach(g => {
        if (monthVal && !g.dateStr.startsWith(monthVal)) return;

        const actual = g.ranks.filter(n => n.trim() !== "");
        if (filterVal !== "all" && actual.length !== parseInt(filterVal)) return;

        actual.forEach((name, idx) => {
            if(stats[name]) {
                stats[name].played++;
                stats[name].score += getEarnedScore(idx, actual.length);
                if (idx === 0) stats[name].wins++;
            }
        });
    });

    const activePlayers = players.filter(p => stats[p].played > 0);
    
    activePlayers.sort((a, b) => {
        const avgA = stats[a].score / stats[a].played;
        const avgB = stats[b].score / stats[b].played;
        if (avgB !== avgA) return avgB - avgA;
        
        const winRateA = stats[a].wins / stats[a].played;
        const winRateB = stats[b].wins / stats[b].played;
        if (winRateB !== winRateA) return winRateB - winRateA;
        
        return stats[b].wins - stats[a].wins;
    });

    const tbody = document.getElementById('scoreRankBody');
    if (!tbody) return;

    if (activePlayers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; font-weight:800; color:var(--sub-text);">해당 조건의 데이터가 없습니다.</td></tr>`;
        return;
    }

    const maxAvg = stats[activePlayers[0]].score / stats[activePlayers[0]].played;
    let html = '';
    let currentRank = 1;

    activePlayers.forEach((p, index) => {
        const avg = stats[p].score / stats[p].played;
        const winRate = stats[p].wins / stats[p].played;

        if (index > 0) {
            const prevP = activePlayers[index - 1];
            const prevAvg = stats[prevP].score / stats[prevP].played;
            const prevWinRate = stats[prevP].wins / stats[prevP].played;
            if (avg !== prevAvg || winRate !== prevWinRate || stats[p].wins !== stats[prevP].wins) {
                currentRank = index + 1;
            }
        }

        let diff = avg - maxAvg;
        let diffStr = diff === 0 ? "-" : diff.toFixed(2);
        let diffColor = diff === 0 ? "var(--text-color)" : "var(--rankL)";

        let rankLabel = currentRank + '위';
        let rankColor = 'var(--text-color)';
        if (currentRank === 1) { rankLabel = '1위🥇'; rankColor = 'var(--rank1)'; }
        else if (currentRank === 2) { rankColor = 'var(--rank2)'; }
        else if (currentRank === 3) { rankColor = 'var(--rank3)'; }

        html += `<tr onclick="renderMemberHistory('${p}', '${currentRank}')" style="cursor:pointer;">
                    <td style="color:${rankColor}; font-weight:900;">${rankLabel}</td>
                    <td style="color:${getPlayerColor(p)}; font-weight:900; text-decoration:underline;">${p}</td>
                    <td style="color:#5D4037;">${stats[p].played}전</td>
                    <td style="color:var(--rank1); font-weight:900;">${stats[p].score}점</td>
                    <td style="color:var(--accent); font-weight:900;">${avg.toFixed(2)}점</td>
                    <td style="color:${diffColor}; font-weight:900;">${diffStr}</td>
                 </tr>`;
    });
    tbody.innerHTML = html;
}

function shareScoreRankResult() {
    captureAndShare('scoreRank-capture-area', 'scoreRank-share-btn', 'score_rank.png', '멤버별 승점 순위', '멤버별 승점 순위 및 평균 승점차 결과입니다!');
}

function renderStats() {
    const subtitleEl = document.querySelector('.stats-subtitle');
    if (subtitleEl) {
        subtitleEl.innerText = isPercentMode ? "(평균 승점 기준. 확률 %)" : "(평균 승점 기준. 횟수)";
    }

    const filterEl = document.getElementById('statsFilterCount');
    const filterVal = filterEl ? filterEl.value : "all";

    const monthEl = document.getElementById('statsFilterMonth');
    const monthVal = monthEl ? monthEl.value : "";

    let stats = {}; 
    players.forEach(p => stats[p] = { played: 0, ranks: [0,0,0,0,0], score: 0 });
    
    gameLogs.forEach(g => {
        if (monthVal && !g.dateStr.startsWith(monthVal)) return;

        const actual = g.ranks.filter(n => n.trim() !== "");
        
        if (filterVal !== "all" && actual.length !== parseInt(filterVal)) return;

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
    
    const sortedByWin = [...players].sort((a,b) => {
        if (stats[a].played === 0 && stats[b].played > 0) return 1;
        if (stats[b].played === 0 && stats[a].played > 0) return -1;
        return (stats[b].score/stats[b].played || 0) - (stats[a].score/stats[a].played || 0) || stats[b].ranks[0] - stats[a].ranks[0];
    });

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
        
        const getVal = (val, total) => isPercentMode ? (total === 0 ? '0' : ((val/total)*100).toFixed(0)) : val;
        
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
function renderMemberHistory(name, rank) {
    const area = document.getElementById('memberHistoryArea');
    const filterEl = document.getElementById('statsFilterCount');
    const filterVal = filterEl ? filterEl.value : "all";
    const monthEl = document.getElementById('statsFilterMonth');
    const monthVal = monthEl ? monthEl.value : "";

    let pGames = gameLogs.filter(g => g.ranks.includes(name));
    
    if (monthVal) pGames = pGames.filter(g => g.dateStr.startsWith(monthVal));
    if (filterVal !== "all") {
        pGames = pGames.filter(g => g.ranks.filter(n => n.trim() !== "").length === parseInt(filterVal));
    }

    if (pGames.length === 0) {
        area.innerHTML = "<div style='padding:20px; text-align:center; font-weight:800; color:var(--sub-text);'>데이터가 없습니다.</div>";
        area.classList.add('active');
        return;
    }

    let stats = { played: 0, score: 0, wins: 0, lasts: 0, r2: 0, r3: 0, r4: 0 };
    let recentCondition = { games: 0, wins: 0, lasts: 0 }; 

    pGames.sort((a, b) => {
        if (a.dateStr !== b.dateStr) return new Date(b.dateStr) - new Date(a.dateStr);
        return (parseInt(b.round) || 0) - (parseInt(a.round) || 0);
    });

    pGames.forEach((g, idx) => {
        const actual = g.ranks.filter(n => n.trim() !== "");
        const pIdx = actual.indexOf(name);
        stats.played++;
        stats.score += getEarnedScore(pIdx, actual.length);
        
        if (pIdx === 0) stats.wins++;
        else if (pIdx === 1) stats.r2++;
        else if (pIdx === 2) stats.r3++;
        else if (pIdx === 3 && actual.length > 4) stats.r4++;
        
        if (pIdx === actual.length - 1 && actual.length > 1) stats.lasts++;

        if (idx < 10) { 
            recentCondition.games++;
            if (pIdx === 0) recentCondition.wins++;
            if (pIdx === actual.length - 1 && actual.length > 1) recentCondition.lasts++;
        }
    });

    const winRate = ((stats.wins / stats.played) * 100).toFixed(1);
    const avgScore = (stats.score / stats.played).toFixed(2);
    const survivalRate = (((stats.played - stats.lasts) / stats.played) * 100).toFixed(1);

    const recentWinRate = recentCondition.games > 0 ? ((recentCondition.wins / recentCondition.games) * 100).toFixed(1) : 0;
    const recentLastRate = recentCondition.games > 0 ? ((recentCondition.lasts / recentCondition.games) * 100).toFixed(1) : 0;
    
    let conditionIcon = "⛅";
    let conditionText = "보통";
    let conditionColor = "#f39c12";

    if (recentWinRate >= 30 && recentLastRate >= 30) { conditionIcon = "⚡"; conditionText = "도깨비"; conditionColor = "#9b59b6"; }
    else if (recentWinRate >= 30) { conditionIcon = "☀️"; conditionText = "최상"; conditionColor = "#e74c3c"; }
    else if (recentLastRate >= 30) { conditionIcon = "🌧️"; conditionText = "비상"; conditionColor = "#3498db"; }

    let styleIcon = "🐣";
    let styleText = "성장하는 꿈나무";
    let styleColor = "#f1c40f";

    if (winRate >= 35 && survivalRate >= 80) { styleIcon = "👑"; styleText = "전략적 지배자"; styleColor = "#1A237E"; }
    else if (winRate >= 35 && survivalRate < 80) { styleIcon = "🐅"; styleText = "폭격형 호랑이"; styleColor = "#e67e22"; }
    else if (winRate < 35 && survivalRate >= 80) { styleIcon = "🐢"; styleText = "철벽 거북이"; styleColor = "#27ae60"; }

    const tier = getTier(stats.score);
    let rankLabel = rank + '위';
    let rankColor = 'var(--text-color)';
    if (rank === '1') { rankLabel = '1위🥇'; rankColor = 'var(--rank1)'; }
    else if (rank === '2') { rankColor = 'var(--rank2)'; }
    else if (rank === '3') { rankColor = 'var(--rank3)'; }

    let html = `<div class="member-header">
                    <div style="font-size:20px; font-weight:900; color:${getPlayerColor(name)}; display:flex; align-items:center; gap:8px;">
                        ${name} <span style="font-size:12px; background:var(--card-bg); padding:4px 8px; border-radius:12px; color:${rankColor}; border:1px solid ${rankColor};">${rankLabel}</span>
                    </div>
                    <button class="nav-btn" style="background:#e0e0e0; color:#444;" onclick="closeMemberHistory()">닫기</button>
                </div>
                
                <div class="tier-badge" style="background: linear-gradient(135deg, ${tier.color}22, transparent); border: 1px solid ${tier.color};">
                    <div style="font-size:32px; margin-bottom:5px;">${tier.icon}</div>
                    <div style="font-size:16px; font-weight:900; color:${tier.color};">${tier.name}</div>
                    <div style="font-size:12px; font-weight:800; color:var(--sub-text); margin-top:3px; cursor:pointer;" onclick="showInfoModal('tier')">총 승점: ${stats.score}점 <span style="font-size:10px;">ℹ️</span></div>
                </div>

                <div class="ring-container">
                    <div class="ring-box" onclick="showRingCriteria('win')">
                        <div class="ring-circle" style="background:conic-gradient(var(--rank1) ${winRate}%, #e0e0e0 0);">
                            <div class="ring-inner">
                                <div class="ring-value" style="color:var(--rank1);">${winRate}%</div>
                                <div class="ring-label">승률 ℹ️</div>
                            </div>
                        </div>
                    </div>
                    <div class="ring-box" onclick="showRingCriteria('score')">
                        <div class="ring-circle" style="background:conic-gradient(var(--accent) ${(avgScore/5)*100}%, #e0e0e0 0);">
                            <div class="ring-inner">
                                <div class="ring-value" style="color:var(--accent);">${avgScore}</div>
                                <div class="ring-label">평균득점 ℹ️</div>
                            </div>
                        </div>
                    </div>
                    <div class="ring-box" onclick="showRingCriteria('safety')">
                        <div class="ring-circle" style="background:conic-gradient(var(--success) ${survivalRate}%, #e0e0e0 0);">
                            <div class="ring-inner">
                                <div class="ring-value" style="color:var(--success);">${survivalRate}%</div>
                                <div class="ring-label">생존율 ℹ️</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="display:flex; gap:10px; margin-bottom:20px;">
                    <div class="trait-box" onclick="showInfoModal('condition')" style="flex:1;">
                        <div style="font-size:11px; color:var(--sub-text); font-weight:800; margin-bottom:5px;">최근 컨디션(10G) ℹ️</div>
                        <div style="font-size:15px; font-weight:900; color:${conditionColor};"><span style="font-size:16px;">${conditionIcon}</span> ${conditionText}</div>
                    </div>
                    <div class="trait-box" onclick="showInfoModal('style')" style="flex:1;">
                        <div style="font-size:11px; color:var(--sub-text); font-weight:800; margin-bottom:5px;">당구 성향 분석 ℹ️</div>
                        <div style="font-size:15px; font-weight:900; color:${styleColor};"><span style="font-size:16px;">${styleIcon}</span> ${styleText}</div>
                    </div>
                </div>

                <div style="background:rgba(255,255,255,0.5); padding:15px; border-radius:15px; margin-bottom:20px; text-align:center;">
                    <div style="font-size:12px; font-weight:800; color:var(--sub-text); margin-bottom:10px;">상세 순위 분포 (총 ${stats.played}전)</div>
                    <div style="display:flex; justify-content:space-between; align-items:flex-end; height:60px; padding:0 10px; gap:4px;">`;
    
    const maxBar = Math.max(stats.wins, stats.r2, stats.r3, stats.r4, stats.lasts);
    const ranksData = [
        { label: '1위', val: stats.wins, color: 'var(--rank1)' },
        { label: '2위', val: stats.r2, color: 'var(--rank2)' },
        { label: '3위', val: stats.r3, color: 'var(--rank3)' },
        { label: '4위', val: stats.r4, color: 'var(--rank4)' },
        { label: '꼴찌', val: stats.lasts, color: 'var(--rankL)' }
    ];

    ranksData.forEach(d => {
        const h = maxBar === 0 ? 0 : (d.val / maxBar) * 100;
        html += `<div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:5px;">
                    <div style="font-size:10px; font-weight:800; color:var(--text-color);">${d.val}</div>
                    <div style="width:100%; max-width:20px; height:${h}%; background:${d.color}; border-radius:4px 4px 0 0; min-height:4px; opacity:0.8;"></div>
                    <div style="font-size:10px; font-weight:800; color:var(--sub-text);">${d.label}</div>
                 </div>`;
    });

    html += `    </div>
                </div>`;

    area.innerHTML = html;
    area.classList.add('active');
    setTimeout(() => { area.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
}

function closeMemberHistory() {
    const area = document.getElementById('memberHistoryArea');
    area.classList.remove('active');
    setTimeout(() => { area.innerHTML = ""; }, 300);
}

function renderDefenseStats() {
    const filterEl = document.getElementById('statsFilterCount');
    const filterVal = filterEl ? filterEl.value : "all";
    const monthEl = document.getElementById('statsFilterMonth');
    const monthVal = monthEl ? monthEl.value : "";

    let defStats = {};
    players.forEach(p => defStats[p] = { count: 0, totalNextRank: 0 });

    gameLogs.forEach(g => {
        if (monthVal && !g.dateStr.startsWith(monthVal)) return;
        const actual = g.ranks.filter(n => n.trim() !== "");
        if (filterVal !== "all" && actual.length !== parseInt(filterVal)) return;

        if (g.startOrder && g.startOrder.length > 0) {
            const order = g.startOrder;
            for (let i = 0; i < order.length; i++) {
                const preP = order[i];
                const nextP = order[(i + 1) % order.length];
                const nextIdx = actual.indexOf(nextP);
                if (nextIdx !== -1 && defStats[preP]) {
                    defStats[preP].count++;
                    defStats[preP].totalNextRank += (nextIdx + 1);
                }
            }
        }
    });

    const activePlayers = players.filter(p => defStats[p].count > 0);
    activePlayers.sort((a, b) => {
        const avgA = defStats[a].totalNextRank / defStats[a].count;
        const avgB = defStats[b].totalNextRank / defStats[b].count;
        if (avgA !== avgB) return avgB - avgA; 
        return defStats[b].count - defStats[a].count;
    });

    const tbody = document.getElementById('defenseBody');
    if (!tbody) return;

    if (activePlayers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; font-weight:800; color:var(--sub-text);">초구 추첨 기록이 포함된 게임이 없습니다.</td></tr>`;
        return;
    }

    let html = '';
    let currentRank = 1;
    activePlayers.forEach((p, index) => {
        const avg = defStats[p].totalNextRank / defStats[p].count;
        if (index > 0) {
            const prevP = activePlayers[index - 1];
            const prevAvg = defStats[prevP].totalNextRank / defStats[prevP].count;
            if (avg !== prevAvg) currentRank = index + 1;
        }

        let rankLabel = currentRank + '위';
        let rankColor = 'var(--text-color)';
        if (currentRank === 1) { rankLabel = '1위🛡️'; rankColor = 'var(--rank1)'; }
        else if (currentRank === 2) { rankColor = 'var(--rank2)'; }
        else if (currentRank === 3) { rankColor = 'var(--rank3)'; }

        html += `<tr onclick="showDefenseDetail('${p}')" style="cursor:pointer;">
                    <td style="color:${rankColor}; font-weight:900;">${rankLabel}</td>
                    <td style="color:${getPlayerColor(p)}; font-weight:900; text-decoration:underline;">${p}</td>
                    <td style="color:#5D4037;">${defStats[p].count}회</td>
                    <td style="color:var(--accent); font-weight:900;">${avg.toFixed(2)}위</td>
                 </tr>`;
    });
    tbody.innerHTML = html;
}

function showDefenseDetail(attackerName) {
    const filterEl = document.getElementById('statsFilterCount');
    const filterVal = filterEl ? filterEl.value : "all";
    const monthEl = document.getElementById('statsFilterMonth');
    const monthVal = monthEl ? monthEl.value : "";

    let victimStats = {};
    players.forEach(p => { if (p !== attackerName) victimStats[p] = { count: 0, totalRank: 0 }; });

    gameLogs.forEach(g => {
        if (monthVal && !g.dateStr.startsWith(monthVal)) return;
        const actual = g.ranks.filter(n => n.trim() !== "");
        if (filterVal !== "all" && actual.length !== parseInt(filterVal)) return;

        if (g.startOrder && g.startOrder.length > 0) {
            const order = g.startOrder;
            for (let i = 0; i < order.length; i++) {
                if (order[i] === attackerName) {
                    const victim = order[(i + 1) % order.length];
                    const vIdx = actual.indexOf(victim);
                    if (vIdx !== -1 && victimStats[victim]) {
                        victimStats[victim].count++;
                        victimStats[victim].totalRank += (vIdx + 1);
                    }
                }
            }
        }
    });

    const activeVictims = Object.keys(victimStats).filter(p => victimStats[p].count > 0);
    activeVictims.sort((a, b) => {
        const avgA = victimStats[a].totalRank / victimStats[a].count;
        const avgB = victimStats[b].totalRank / victimStats[b].count;
        if (avgA !== avgB) return avgB - avgA;
        return victimStats[b].count - victimStats[a].count;
    });

    let html = `<div style="font-size:35px; margin-bottom:10px; display:block; text-align:center;">🛡️</div>
                <div style="font-size:18px; font-weight:900; color:${getPlayerColor(attackerName)}; margin-bottom:5px; display:block; text-align:center;">${attackerName}의 철벽 방어 희생양</div>
                <div style="font-size:13px; font-weight:800; color:var(--sub-text); margin-bottom: 20px; display:block; text-align:center;">(바로 뒷순서 선수의 평균 순위)</div>
                <div style="display:block; font-weight:900;">`;

    if (activeVictims.length === 0) {
        html += `<div style="text-align:center; padding:20px; font-weight:800; color:var(--sub-text); font-size:14px;">데이터가 없습니다.</div>`;
    } else {
        activeVictims.forEach((p, i) => {
            const avg = (victimStats[p].totalRank / victimStats[p].count).toFixed(2);
            const rankLabel = i === 0 ? "최대 피해자💀" : `${i + 1}순위`;
            const rankColor = i === 0 ? 'var(--rankL)' : 'var(--text-color)';
            
            html += `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.4); padding:12px 20px; border-radius:15px; border:1px solid rgba(0,0,0,0.05); box-shadow: inset 1px 1px 3px rgba(255,255,255,0.7); margin-bottom:8px;">
                        <div style="display:flex; flex-direction:column; align-items:flex-start;">
                            <div style="color:${rankColor}; font-size:12px; font-weight:900; margin-bottom:4px;">${rankLabel}</div>
                            <div style="color:${getPlayerColor(p)}; font-size:16px; font-weight:900;">${p}</div>
                        </div>
                        <div style="display:flex; flex-direction:column; align-items:flex-end;">
                            <div style="color:var(--accent); font-size:18px; font-weight:900;">${avg}위</div>
                            <div style="color:var(--sub-text); font-size:11px; font-weight:800;">${victimStats[p].count}회 조우</div>
                        </div>
                     </div>`;
        });
    }

    html += `</div>`;
    
    const modal = document.getElementById('defense-detail-modal'); 
    const content = document.getElementById('defense-detail-content');
    
    if(!modal || !content) return;
    
    content.innerHTML = html; 
    modal.style.display = 'flex'; 
    content.style.animation = 'scaleUpPopup 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
}

function closeDefenseDetail() {
    const modal = document.getElementById('defense-detail-modal'); 
    const content = document.getElementById('defense-detail-content');
    if(!modal || !content) return; 
    
    content.style.animation = 'scaleDownPopup 0.3s ease-in forwards'; 
    if (defenseModalTimeout) clearTimeout(defenseModalTimeout);
    defenseModalTimeout = setTimeout(() => { 
        modal.style.display = 'none'; 
        content.style.animation = 'none'; 
    }, 300); 
}

function shareDefenseResult() {
    captureAndShare('defense-capture-area', 'defense-share-btn', 'defense_rank.png', '디펜스 랭킹', '철벽 방어 순위 결과입니다!');
}

function analyzeStrategy() {
    const targetP = document.getElementById('strategyPlayer').value;
    const resArea = document.getElementById('strategyResultArea');
    const shareBtn = document.getElementById('strategy-share-btn');
    if (!targetP) { resArea.style.display = 'none'; if(shareBtn) shareBtn.style.display = 'none'; return; }

    const filterEl = document.getElementById('statsFilterCount');
    const filterVal = filterEl ? filterEl.value : "all";
    const monthEl = document.getElementById('statsFilterMonth');
    const monthVal = monthEl ? monthEl.value : "";

    let oppStats = {};
    players.forEach(p => { if (p !== targetP) oppStats[p] = { match: 0, targetWins: 0, targetLasts: 0, oppTotalRank: 0, targetTotalRank: 0 }; });

    gameLogs.forEach(g => {
        if (monthVal && !g.dateStr.startsWith(monthVal)) return;
        const actual = g.ranks.filter(n => n.trim() !== "");
        if (filterVal !== "all" && actual.length !== parseInt(filterVal)) return;

        if (g.startOrder && g.startOrder.length > 0) {
            const order = g.startOrder;
            const targetIdx = order.indexOf(targetP);
            if (targetIdx !== -1) {
                const oppIdx = (targetIdx === 0) ? order.length - 1 : targetIdx - 1;
                const oppName = order[oppIdx];
                
                const tRank = actual.indexOf(targetP) + 1;
                const oRank = actual.indexOf(oppName) + 1;

                if (tRank > 0 && oRank > 0 && oppStats[oppName]) {
                    oppStats[oppName].match++;
                    oppStats[oppName].targetTotalRank += tRank;
                    oppStats[oppName].oppTotalRank += oRank;
                    if (tRank === 1) oppStats[oppName].targetWins++;
                    if (tRank === actual.length && actual.length > 1) oppStats[oppName].targetLasts++;
                }
            }
        }
    });

    let bestOpp = "-", worstOpp = "-";
    let bestAvg = 99, worstAvg = 0;
    
    Object.keys(oppStats).forEach(p => {
        if (oppStats[p].match >= 1) { 
            const avg = oppStats[p].targetTotalRank / oppStats[p].match;
            if (avg < bestAvg) { bestAvg = avg; bestOpp = p; }
            if (avg > worstAvg) { worstAvg = avg; worstOpp = p; }
        }
    });

    let html = ``;
    if (bestOpp === "-" && worstOpp === "-") {
        html = `<div style="text-align:center; padding:15px; font-weight:800; color:var(--sub-text); font-size:13px;">해당 조건에서 뒷 순서로 게임한 기록이 없습니다.</div>`;
    } else {
        html += `<div style="display:flex; gap:10px; margin-bottom:15px;">
                    <div style="flex:1; background:rgba(46, 204, 113, 0.1); border:1px solid rgba(46, 204, 113, 0.3); border-radius:15px; padding:12px; text-align:center; cursor:pointer;" onclick="showGenseiDetail('${targetP}', '${bestOpp}', 'best')">
                        <div style="font-size:11px; color:var(--success); font-weight:900; margin-bottom:5px;">😋 최고의 밥</div>
                        <div style="font-size:16px; font-weight:900; color:var(--text-color);">${bestOpp} 뒤</div>
                        <div style="font-size:12px; font-weight:800; color:var(--sub-text); margin-top:3px;">(평균 ${bestAvg.toFixed(2)}위)</div>
                    </div>
                    <div style="flex:1; background:rgba(231, 76, 60, 0.1); border:1px solid rgba(231, 76, 60, 0.3); border-radius:15px; padding:12px; text-align:center; cursor:pointer;" onclick="showGenseiDetail('${targetP}', '${worstOpp}', 'worst')">
                        <div style="font-size:11px; color:var(--accent); font-weight:900; margin-bottom:5px;">👿 극강 상성</div>
                        <div style="font-size:16px; font-weight:900; color:var(--text-color);">${worstOpp} 뒤</div>
                        <div style="font-size:12px; font-weight:800; color:var(--sub-text); margin-top:3px;">(평균 ${worstAvg.toFixed(2)}위)</div>
                    </div>
                 </div>`;
        html += `<table class="stats-table" style="font-size:12px;">
                    <thead>
                        <tr>
                            <th style="width:25%; text-align:center;">앞 순서</th>
                            <th style="width:20%;">조우</th>
                            <th style="width:27%;">내 평균</th>
                            <th style="width:28%; color:var(--sub-text);">앞사람 평균</th>
                        </tr>
                    </thead>
                    <tbody>`;
        
        const activeOpps = Object.keys(oppStats).filter(p => oppStats[p].match > 0);
        activeOpps.sort((a,b) => (oppStats[a].targetTotalRank/oppStats[a].match) - (oppStats[b].targetTotalRank/oppStats[b].match));
        
        activeOpps.forEach(p => {
            const d = oppStats[p];
            const myAvg = (d.targetTotalRank / d.match).toFixed(2);
            const opAvg = (d.oppTotalRank / d.match).toFixed(2);
            let myColor = 'var(--text-color)';
            if (myAvg < 2.0) myColor = 'var(--rank1)';
            else if (myAvg > 3.0) myColor = 'var(--rankL)';

            html += `<tr onclick="showGenseiDetail('${targetP}', '${p}', 'list')" style="cursor:pointer;">
                        <td style="color:${getPlayerColor(p)}; font-weight:900;">${p}</td>
                        <td style="color:#5D4037; font-weight:800;">${d.match}회</td>
                        <td style="color:${myColor}; font-weight:900;">${myAvg}위</td>
                        <td style="color:var(--sub-text); font-weight:800;">${opAvg}위</td>
                     </tr>`;
        });
        html += `</tbody></table>`;
    }
    
    resArea.innerHTML = html;
    resArea.style.display = 'block';
    if(shareBtn) shareBtn.style.display = 'block';
}

function showGenseiDetail(targetP, oppP, type) {
    if(oppP === "-") return;
    const filterEl = document.getElementById('statsFilterCount');
    const filterVal = filterEl ? filterEl.value : "all";
    const monthEl = document.getElementById('statsFilterMonth');
    const monthVal = monthEl ? monthEl.value : "";

    let oppStats = { match: 0, targetWins: 0, targetLasts: 0, oppTotalRank: 0, targetTotalRank: 0 };
    
    gameLogs.forEach(g => {
        if (monthVal && !g.dateStr.startsWith(monthVal)) return;
        const actual = g.ranks.filter(n => n.trim() !== "");
        if (filterVal !== "all" && actual.length !== parseInt(filterVal)) return;

        if (g.startOrder && g.startOrder.length > 0) {
            const order = g.startOrder;
            const targetIdx = order.indexOf(targetP);
            if (targetIdx !== -1) {
                const oppIdx = (targetIdx === 0) ? order.length - 1 : targetIdx - 1;
                if (order[oppIdx] === oppP) {
                    const tRank = actual.indexOf(targetP) + 1;
                    const oRank = actual.indexOf(oppP) + 1;
                    if (tRank > 0 && oRank > 0) {
                        oppStats.match++;
                        oppStats.targetTotalRank += tRank;
                        oppStats.oppTotalRank += oRank;
                        if (tRank === 1) oppStats.targetWins++;
                        if (tRank === actual.length && actual.length > 1) oppStats.targetLasts++;
                    }
                }
            }
        }
    });

    let emoji = "🎱";
    let subText = "상세 분석";
    if (type === 'best') { emoji = "😋"; subText = "내가 멘탈을 지배함!"; }
    else if (type === 'worst') { emoji = "👿"; subText = "지독한 겐세이 피해자..."; }

    const winRate = ((oppStats.targetWins / oppStats.match) * 100).toFixed(1);
    const lastRate = ((oppStats.targetLasts / oppStats.match) * 100).toFixed(1);

    let html = `<div style="font-size:35px; margin-bottom:10px; display:block; text-align:center;">${emoji}</div>
                <div style="font-size:18px; font-weight:900; color:var(--text-color); margin-bottom:5px; display:block; text-align:center;"><span style="color:${getPlayerColor(oppP)}">${oppP}</span> 뒤에서 <span style="color:${getPlayerColor(targetP)}">${targetP}</span>의 성적</div>
                <div style="font-size:13px; font-weight:800; color:var(--sub-text); margin-bottom: 20px; display:block; text-align:center;">[ ${subText} ]</div>
                <div style="display:block; font-weight:900;">
                    <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.4); padding:12px 20px; border-radius:15px; border:1px solid rgba(0,0,0,0.05); margin-bottom:8px;">
                        <div style="color:var(--text-color); font-size:14px; font-weight:800;">총 조우 횟수</div>
                        <div style="color:#5D4037; font-size:18px; font-weight:900;">${oppStats.match}회</div>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.4); padding:12px 20px; border-radius:15px; border:1px solid rgba(0,0,0,0.05); margin-bottom:8px;">
                        <div style="color:var(--rank1); font-size:14px; font-weight:800;">내 1위 비율🥇</div>
                        <div style="color:var(--rank1); font-size:18px; font-weight:900;">${winRate}%</div>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.4); padding:12px 20px; border-radius:15px; border:1px solid rgba(0,0,0,0.05); margin-bottom:8px;">
                        <div style="color:var(--rankL); font-size:14px; font-weight:800;">내 꼴찌 비율💀</div>
                        <div style="color:var(--rankL); font-size:18px; font-weight:900;">${lastRate}%</div>
                    </div>
                </div>`;
    
    const modal = document.getElementById('gensei-modal'); 
    const content = document.getElementById('gensei-modal-content');
    
    if(!modal || !content) return;
    
    content.innerHTML = html; 
    modal.style.display = 'flex'; 
    content.style.animation = 'scaleUpPopup 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';

    let timeLeft = 10;
    let timerEl = document.getElementById('gensei-countdown-text');
    if (!timerEl) {
        timerEl = document.createElement('div');
        timerEl.id = 'gensei-countdown-text';
        timerEl.style.cssText = 'margin-top:20px; font-size:13px; color:var(--sub-text); font-weight:800; text-align:center; display:block; width:100%;';
        content.appendChild(timerEl);
    }
    timerEl.innerText = `${timeLeft}초 후 자동으로 닫힙니다.`;

    if (genseiCountdownInterval) clearInterval(genseiCountdownInterval);
    genseiCountdownInterval = setInterval(() => {
        timeLeft--;
        if (timerEl) timerEl.innerText = `${timeLeft}초 후 자동으로 닫힙니다.`;
        if (timeLeft <= 0) {
            clearInterval(genseiCountdownInterval);
            closeGenseiModal();
        }
    }, 1000);
}

function closeGenseiModal() {
    const modal = document.getElementById('gensei-modal'); 
    const content = document.getElementById('gensei-modal-content');
    if(!modal || !content) return; 
    
    if (genseiCountdownInterval) {
        clearInterval(genseiCountdownInterval);
        genseiCountdownInterval = null;
    }

    content.style.animation = 'scaleDownPopup 0.3s ease-in forwards'; 
    setTimeout(() => { 
        modal.style.display = 'none'; 
        content.style.animation = 'none'; 
        const timerEl = document.getElementById('gensei-countdown-text');
        if (timerEl) timerEl.remove();
    }, 300); 
}

function shareStrategyResult() {
    captureAndShare('strategy-capture-area', 'strategy-share-btn', 'strategy_analysis.png', '상성 분석', '멤버 간 상성 분석 결과입니다!');
}

function renderGameList() {
    const listArea = document.getElementById('dayGameList');
    const mvpArea = document.getElementById('mvpArea');
    const todayGames = gameLogs.filter(g => g.dateStr === selectedDateStr).sort((a,b) => parseInt(a.round) - parseInt(b.round));
    
    if (todayGames.length === 0) { 
        listArea.innerHTML = "<div style='padding:20px; text-align:center; font-weight:800; color:var(--sub-text);'>이날은 게임이 없었어! 🍻</div>"; 
        mvpArea.style.display = 'none';
        return; 
    }
    
    let scores = {}; let plays = {};
    todayGames.forEach(g => { 
        const actual = g.ranks.filter(n => n.trim() !== ""); 
        actual.forEach((p, idx) => { 
            scores[p] = (scores[p] || 0) + getEarnedScore(idx, actual.length); 
            plays[p] = (plays[p] || 0) + 1; 
        }); 
    });
    
    let maxAvg = -1; let mvps = [];
    Object.keys(scores).forEach(p => { 
        if (plays[p] > 0) { 
            let avg = scores[p] / plays[p]; 
            if (avg > maxAvg) { maxAvg = avg; mvps = [p]; } 
            else if (avg === maxAvg) mvps.push(p); 
        } 
    });
    
    if(mvps.length > 0) { 
        mvpArea.innerHTML = `<span style="font-size:12px; margin-right:8px;">🏆 오늘의 MVP </span><br><span style="font-size:17px; font-weight:900; color:var(--rank1);">${mvps.join(', ')}</span>`; 
        mvpArea.style.display = 'block'; 
    } else {
        mvpArea.style.display = 'none';
    }

    listArea.innerHTML = `<div id="record-header-wrap" style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:15px; border-bottom:2px solid rgba(0,0,0,0.05); padding-bottom:8px;">
                              <h2 style="font-size:16px; margin:0; color:#444; font-weight:800; padding-left: 5px;">📜 순위 기록</h2>
                              <button id="dayGameList-share-btn" class="share-btn-common" style="margin:0; width:auto; padding:6px 12px; font-size:11px;" onclick="captureAndShare('capture-area', 'dayGameList-share-btn', 'daily_record.png', '오늘의 기록', '오늘 당구 결과입니다!')">📸 스크린샷 공유</button>
                          </div>` + 
        todayGames.map(g => {
            const actual = g.ranks.filter(n => n.trim() !== "");
            let rankHtml = '';
            for(let i=0; i<actual.length; i++) {
                const label = i === 0 ? "1위🥇" : (i === actual.length - 1 ? "꼴찌💀" : `${i+1}위`);
                const color = i === 0 ? 'var(--rank1)' : (i === actual.length - 1 ? 'var(--rankL)' : 'var(--text-color)');
                rankHtml += `<div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:14px; font-weight:800;">
                                <span style="color:${color};">${label}</span>
                                <span style="color:${color}; font-weight:900;">${actual[i]}</span>
                             </div>`;
            }
            
            let orderHtml = '';
            if (g.startOrder && g.startOrder.length > 0) {
                orderHtml = `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed rgba(0,0,0,0.1); font-size: 12px; font-weight: 800; color: var(--sub-text); text-align: left;">
                                🎱 초구 추첨: ${generateNamesHTML(g.startOrder)}
                             </div>`;
            }

            return `<div class="game-item">
                        <div style="font-weight:900; color:var(--main); margin-bottom:12px; font-size:15px; display:flex; justify-content:space-between; align-items:center;">
                            <span>${g.round}게임 <span style="font-size:12px; color:var(--sub-text); font-weight:800;">(${actual.length}인)</span></span>
                            <div class="action-btn-wrap" style="display:none; gap:6px;">
                                <button class="action-btn edit-btn" onclick="editGame('${g.dateStr}', ${g.round})">수정</button>
                                <button class="action-btn delete-btn" onclick="deleteGame('${g.dateStr}', ${g.round})">삭제</button>
                            </div>
                        </div>
                        ${rankHtml}
                        ${orderHtml}
                    </div>`;
        }).join('');
}

function editGame(date, round) {
    triggerHaptic(10); // [프리미엄 추가] 햅틱 피드백 연동
    const g = gameLogs.find(x => x.dateStr === date && x.round == round); 
    if(!g) return;
    
    editMode = true; 
    editRound = round; 
    document.getElementById('editBadge').style.display = 'block'; 
    document.getElementById('editBadge').innerText = `✏️ [${round}게임] 기록 수정 중`; 
    
    const actual = g.ranks.filter(n => n.trim() !== "");
    document.querySelectorAll('.player-chip').forEach(el => el.classList.remove('active'));
    
    selectedPlayersForLottery = [...actual];
    actual.forEach(p => { 
        const chip = Array.from(document.querySelectorAll('.player-chip')).find(el => el.innerText === p); 
        if(chip) chip.classList.add('active'); 
    });
    
    updateInputFields(actual); 
    
    if (g.startOrder && g.startOrder.length > 0) {
        currentStartOrder = [...g.startOrder];
    } else {
        currentStartOrder = [];
    }
    
    const saveBtn = document.getElementById('mainBtn');
    saveBtn.innerText = "수정 완료"; 
    saveBtn.style.background = "var(--edit)"; 
    document.querySelector('.btn-cancel').style.display = 'block'; 
    
    document.getElementById('inputCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelEdit() { 
    editMode = false; 
    editRound = null; 
    currentStartOrder = []; 
    document.getElementById('editBadge').style.display = 'none'; 
    document.getElementById('playerCount').value = "3"; 
    
    document.querySelectorAll('.player-chip').forEach(el => el.classList.remove('active')); 
    selectedPlayersForLottery = []; 
    
    updateInputFields(); 
    
    const saveBtn = document.getElementById('mainBtn');
    saveBtn.innerText = "순위 저장"; 
    saveBtn.style.background = "var(--success)"; 
    document.querySelector('.btn-cancel').style.display = 'none'; 
}

async function deleteGame(date, round) {
    if(!confirm(`진짜로 ${round}게임 기록을 날려버릴겨?`)) return;
    showLoading(true, "삭제 중");
    try { 
        await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "DELETE", date: date, round: round }) }); 
        if(editMode) cancelEdit(); 
        await fetchData(); 
    } catch (e) { 
        alert("오류 발생!"); 
        showLoading(false); 
    }
}

function showLoading(show, msg = "순위 데이터 동기화 중") {
    const el = document.getElementById('loading');
    if (show) {
        document.getElementById('loadingText').innerText = msg;
        el.style.display = 'flex';
    } else {
        el.style.display = 'none';
    }
}

function changeMonth(offset) {
    triggerHaptic(10); // [프리미엄 추가] 햅틱 피드백 연동
    currentViewDate.setMonth(currentViewDate.getMonth() + offset);
    renderCalendar();
}

function getCaptureBgColor() { 
    const theme = document.documentElement.getAttribute('data-theme'); 
    if (theme === 'dark') return '#121212'; 
    if (theme === 'navy') return '#EFEBE9'; 
    if (theme === 'yellow') return '#fdfbe7'; 
    if (theme === 'yellowgreen') return '#f1f8e9'; 
    if (theme === 'purple') return '#f3e5f5'; 
    if (theme === 'green') return '#e8f5e9'; 
    if (theme === 'pink') return '#fce4ec'; 
    if (theme === 'gray') return '#f5f5f5'; 
    return '#fdfbe7'; 
}

function changeZoom(scale) { 
    if(scale === '1') { 
        document.body.style.zoom = '1'; 
        document.body.classList.remove('zoom-active'); 
    } else { 
        document.body.style.zoom = scale; 
        document.body.classList.add('zoom-active'); 
    } 
}

function setDefaultSearchDates() { 
    if (searchFlatpickr) { 
        searchFlatpickr.clear(); 
        document.getElementById('searchDateRange').value = ""; 
    } 
}

function searchRecords() {
    const targetMonth = document.getElementById('searchDateRange').value; 
    const targetPlayer = document.getElementById('searchPlayer').value; 
    
    if (!targetMonth || !targetPlayer) return alert("검색월과 선수를 모두 선택해주세요."); 
    
    const summaryArea = document.getElementById('searchSummaryArea'); 
    const listArea = document.getElementById('searchHistoryListArea'); 
    const shareBtn = document.getElementById('search-share-btn');
    
    let pGames = gameLogs.filter(g => g.ranks.includes(targetPlayer) && g.dateStr.startsWith(targetMonth));
    pGames.sort((a, b) => { 
        if (a.dateStr !== b.dateStr) return new Date(b.dateStr) - new Date(a.dateStr); 
        return (parseInt(b.round) || 0) - (parseInt(a.round) || 0); 
    }); 
    
    if (pGames.length === 0) { 
        summaryArea.innerHTML = "<div style='padding:20px; text-align:center; font-weight:800; color:var(--sub-text);'>해당 조건의 기록이 없습니다.</div>"; 
        summaryArea.style.display = 'block'; 
        listArea.style.display = 'none'; 
        if(shareBtn) shareBtn.style.display = 'none';
        return; 
    } 
    
    let stats = { played: 0, score: 0, wins: 0, lasts: 0, r2: 0, r3: 0, r4: 0 }; 
    let htmlList = ''; 
    
    pGames.forEach(g => { 
        const actual = g.ranks.filter(n => n.trim() !== ""); 
        const pIdx = actual.indexOf(targetPlayer); 
        stats.played++; 
        stats.score += getEarnedScore(pIdx, actual.length); 
        
        if (pIdx === 0) stats.wins++; 
        else if (pIdx === 1) stats.r2++; 
        else if (pIdx === 2) stats.r3++; 
        else if (pIdx === 3 && actual.length > 4) stats.r4++; 
        
        if (pIdx === actual.length - 1 && actual.length > 1) stats.lasts++; 
        
        const rankLabel = pIdx === 0 ? "1위🥇" : (pIdx === actual.length - 1 ? "꼴찌💀" : `${pIdx + 1}위`); 
        const rankColor = pIdx === 0 ? 'var(--rank1)' : (pIdx === actual.length - 1 ? 'var(--rankL)' : 'var(--text-color)'); 
        htmlList += `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.4); padding:10px 15px; border-radius:12px; margin-bottom:6px; border:1px solid rgba(0,0,0,0.05);">
                        <div style="font-size:12px; font-weight:800; color:var(--sub-text);">${g.dateStr.substring(5)} (${g.round}G)</div>
                        <div style="font-size:14px; font-weight:900; color:${rankColor};">${rankLabel}</div>
                     </div>`; 
    }); 
    
    const winRate = ((stats.wins / stats.played) * 100).toFixed(1); 
    const avgScore = (stats.score / stats.played).toFixed(2); 
    const survivalRate = (((stats.played - stats.lasts) / stats.played) * 100).toFixed(1); 
    const tier = getTier(stats.score); 
    
    let summaryHtml = `<div style="background:var(--card-bg); border-radius:15px; padding:15px; margin-bottom:15px; box-shadow: var(--shadow);">
                            <div style="font-size:16px; font-weight:900; color:${getPlayerColor(targetPlayer)}; text-align:center; margin-bottom:15px;">${targetMonth} ${targetPlayer} 요약</div>
                            <div style="display:flex; justify-content:space-around; margin-bottom:15px; text-align:center;">
                                <div><div style="font-size:11px; color:var(--sub-text); font-weight:800;">총 게임</div><div style="font-size:15px; font-weight:900; color:var(--text-color);">${stats.played}전</div></div>
                                <div><div style="font-size:11px; color:var(--sub-text); font-weight:800;">총 승점</div><div style="font-size:15px; font-weight:900; color:var(--rank1);">${stats.score}점</div></div>
                                <div><div style="font-size:11px; color:var(--sub-text); font-weight:800;">평균승점</div><div style="font-size:15px; font-weight:900; color:var(--accent);">${avgScore}</div></div>
                            </div>
                            <div class="ring-container" style="gap:5px; margin-bottom:0;">
                                <div class="ring-box" style="padding:10px;">
                                    <div class="ring-circle" style="width:60px; height:60px; background:conic-gradient(var(--rank1) ${winRate}%, #e0e0e0 0);"><div class="ring-inner" style="width:48px; height:48px;"><div class="ring-value" style="font-size:12px; color:var(--rank1);">${winRate}%</div></div></div>
                                    <div class="ring-label" style="font-size:10px; margin-top:5px;">승률</div>
                                </div>
                                <div class="ring-box" style="padding:10px;">
                                    <div class="ring-circle" style="width:60px; height:60px; background:conic-gradient(var(--success) ${survivalRate}%, #e0e0e0 0);"><div class="ring-inner" style="width:48px; height:48px;"><div class="ring-value" style="font-size:12px; color:var(--success);">${survivalRate}%</div></div></div>
                                    <div class="ring-label" style="font-size:10px; margin-top:5px;">생존율</div>
                                </div>
                            </div>
                       </div>`; 
                       
    summaryArea.innerHTML = summaryHtml; 
    summaryArea.style.display = 'block'; 
    listArea.innerHTML = `<div style="font-size:13px; font-weight:900; color:var(--sub-text); margin-bottom:10px; padding-left:5px;">📜 상세 전적 리스트</div>` + htmlList; 
    listArea.style.display = 'block'; 
    if(shareBtn) shareBtn.style.display = 'block';
}

function resetSearch() { 
    setDefaultSearchDates(); 
    document.getElementById('searchPlayer').value = ""; 
    document.getElementById('searchSummaryArea').style.display = 'none'; 
    document.getElementById('searchHistoryListArea').style.display = 'none'; 
    const shareBtn = document.getElementById('search-share-btn');
    if(shareBtn) shareBtn.style.display = 'none';
}

function shareSearchResult() {
    captureAndShare('search-capture-area', 'search-share-btn', 'search_result.png', '검색 결과', '월별 선수 전적 검색 결과입니다!');
}

function exportData() {
    const dataStr = JSON.stringify(gameLogs, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `billiard_backup_${formatDate(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function triggerImport() { document.getElementById('importFile').click(); }

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (!Array.isArray(importedData)) throw new Error("Invalid format");
            
            showLoading(true, "데이터 복구 중");
            await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "IMPORT", data: importedData }) });
            await fetchData();
            alert("데이터가 성공적으로 복구되었습니다.");
        } catch (err) {
            alert("복구 실패: 올바른 백업 파일이 아닙니다.");
        } finally {
            showLoading(false);
            event.target.value = ""; 
        }
    };
    reader.readAsText(file);
}

function confirmReset(step) {
    const stepsDiv = document.getElementById('resetSteps');
    if (step === 1) {
        if (confirm("경고: 이 작업은 되돌릴 수 없습니다. 정말 모든 데이터를 삭제하시겠습니까?")) {
            stepsDiv.innerHTML = `<button class="reset-btn" style="background:#c0392b;" onclick="confirmReset(2)">🔥 최종 확인: 모든 데이터 삭제</button><button class="save-btn" onclick="cancelReset()">취소</button>`;
        }
    } else if (step === 2) {
        executeFactoryReset();
    }
}

function cancelReset() {
    document.getElementById('resetSteps').innerHTML = `<button class="reset-btn" onclick="confirmReset(1)">⚠️ 모든 데이터 초기화 (복구 불가)</button>`;
}

async function executeFactoryReset() {
    showLoading(true, "초기화 진행 중");
    try {
        await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "RESET_ALL" }) });
        gameLogs = [];
        renderAll();
        cancelReset();
        alert("모든 데이터가 초기화되었습니다.");
    } catch (e) {
        alert("초기화 실패!");
    } finally {
        showLoading(false);
    }
}

function showExitModal() { document.getElementById('exit-modal').style.display = 'flex'; }
function closeExitModal() { document.getElementById('exit-modal').style.display = 'none'; }
function closeAppWindow() {
    window.close();
    if (!window.closed) {
        document.body.innerHTML = "<div style='display:flex; justify-content:center; align-items:center; height:100vh; font-size:20px; font-weight:900; color:#555;'>앱을 종료하려면 홈 버튼이나 뒤로가기를 눌러주세요.</div>";
    }
}

window.onload = function() {
    const applyHighlight = (instance) => {
        setTimeout(() => {
            if(!gameLogs || gameLogs.length === 0) return;
            const activeMonths = new Set(gameLogs.map(g => g.dateStr.substring(0,7)));
            
            instance.calendarContainer.querySelectorAll('.flatpickr-monthSelect-month').forEach(mEl => {
                const monthIdx = mEl.dateObj.getMonth();
                const year = mEl.dateObj.getFullYear();
                const dStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
                
                if (activeMonths.has(dStr)) {
                    mEl.style.backgroundColor = 'rgba(139, 69, 19, 0.2)'; 
                    mEl.style.fontWeight = '900';
                    mEl.style.color = '#5D4037';
                } else {
                    mEl.style.backgroundColor = '';
                    mEl.style.fontWeight = '';
                    mEl.style.color = '';
                }
            });
        }, 10);
    };

    try {
        const statsFilterMonth = document.getElementById('statsFilterMonth');
        if (statsFilterMonth) {
            flatpickr(statsFilterMonth, {
                plugins: [ new monthSelectPlugin({ shorthand: true, dateFormat: "Y-m", altFormat: "Y년 m월" }) ],
                disableMobile: true,
                locale: "ko",
                onReady: function(selectedDates, dateStr, instance) {
                    const clearBtnWrap = document.createElement('div');
                    clearBtnWrap.style.textAlign = 'center';
                    clearBtnWrap.style.padding = '10px';
                    clearBtnWrap.style.borderTop = '1px solid #eee';
                    
                    const clearBtn = document.createElement('button');
                    clearBtn.innerText = "초기화 (전체 기간 보기)";
                    clearBtn.style.padding = '8px 15px';
                    clearBtn.style.border = 'none';
                    clearBtn.style.background = '#e74c3c';
                    clearBtn.style.color = 'white';
                    clearBtn.style.borderRadius = '5px';
                    clearBtn.style.fontWeight = 'bold';
                    clearBtn.style.cursor = 'pointer';
                    
                    clearBtnWrap.appendChild(clearBtn);
                    clearBtn.onclick = function() {
                        instance.clear();
                        instance.close();
                        onFilterChange(); 
                    };
                    instance.calendarContainer.appendChild(clearBtnWrap);
                    applyHighlight(instance);
                },
                onOpen: function(selectedDates, dateStr, instance) { applyHighlight(instance); },
                onYearChange: function(selectedDates, dateStr, instance) { setTimeout(() => applyHighlight(instance), 50); },
                onChange: function(selectedDates, dateStr, instance) {
                    applyHighlight(instance);
                    onFilterChange();
                }
            });
        }
    } catch(e) { console.error("Flatpickr initialization failed", e); }

    try {
        searchFlatpickr = flatpickr("#searchDateRange", {
            plugins: [ new monthSelectPlugin({ shorthand: true, dateFormat: "Y-m", altFormat: "Y년 m월" }) ],
            disableMobile: true,
            locale: "ko",
            onReady: function(selectedDates, dateStr, instance) {
                const clearBtnWrap = document.createElement('div');
                clearBtnWrap.style.textAlign = 'center';
                clearBtnWrap.style.padding = '10px';
                clearBtnWrap.style.borderTop = '1px solid #eee';
                
                const clearBtn = document.createElement('button');
                clearBtn.innerText = "초기화 (선택 해제)";
                clearBtn.style.padding = '8px 15px';
                clearBtn.style.border = 'none';
                clearBtn.style.background = '#e74c3c';
                clearBtn.style.color = 'white';
                clearBtn.style.borderRadius = '5px';
                clearBtn.style.fontWeight = 'bold';
                clearBtn.style.cursor = 'pointer';
                
                clearBtnWrap.appendChild(clearBtn);
                clearBtn.onclick = function() {
                    instance.clear();
                    instance.close();
                    onFilterChange(); 
                };
                instance.calendarContainer.appendChild(clearBtnWrap);
                applyHighlight(instance); 
            },
            onOpen: function(selectedDates, dateStr, instance) { applyHighlight(instance); },
            onYearChange: function(selectedDates, dateStr, instance) { setTimeout(() => applyHighlight(instance), 50); },
            onChange: function(selectedDates, dateStr, instance) {
                applyHighlight(instance);
                onFilterChange(); 
            }
        });
    } catch(e) { console.error("Flatpickr initialization failed", e); }
    
    let savedTheme = localStorage.getItem('appTheme') || 'yellow'; 
    document.documentElement.setAttribute('data-theme', savedTheme); 
    document.getElementById('themeSelect').value = savedTheme;
    
    setTimeout(() => { 
        const ws = document.getElementById('welcome-screen'); 
        if(ws) { ws.style.opacity = '0'; setTimeout(() => { ws.style.display = 'none'; }, 800); } 
        showLastGameResult(); 
    }, 3000);
    
    updateInputFields(); setDefaultSearchDates(); fetchData(); 
};

document.addEventListener('click', (e) => { 
    if(!e.target.closest('.game-item')) { 
        document.querySelectorAll('.action-btn-wrap').forEach(el => el.style.display = 'none'); 
    } 
});