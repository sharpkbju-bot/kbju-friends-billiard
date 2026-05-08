let scoreModalTimeout = null;
let hideScoreModalTimeout = null;
let graphCountdownInterval = null;
let genseiCountdownInterval = null; 
let defenseModalTimeout = null; 
let infoModalCountdownInterval = null; 
let scoreCountdownInterval = null; 
let dashInfoCountdownInterval = null; 

function triggerHaptic(pattern) { if (navigator.vibrate) navigator.vibrate(pattern); }

const GAS_URL = "https://script.google.com/macros/s/AKfycbwUNoKWNmos1-kmkBoL1WDhSuJv80JDe0hINOpDM9KkEgLug6WK8vUpsk_pottrTj7dOA/exec"; 
const players = ["경배", "원석", "정석", "진웅", "창한", "경석"];
let gameLogs = [];
let currentViewDate = new Date();
let selectedDateStr = new Date().toLocaleDateString('sv-SE');
let editMode = false, editRound = null, isPercentMode = false;
let selectedPlayersForLottery = [], searchFlatpickr, animationStep = 0, lastDrawnPlayers = [], currentStartOrder = []; 

const playerThemes = {
    "경배": { emoji: "👑", color: "#1A237E" }, "원석": { emoji: "🎯", color: "#50C878" },
    "정석": { emoji: "🎱", color: "#9B59B6" }, "진웅": { emoji: "🔥", color: "#F39C12" },
    "창한": { emoji: "💎", color: "#E74C3C" }, "경석": { emoji: "🍀", color: "#1ABC9c" } 
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

    const wasZoomActive = document.body.classList.contains('zoom-active');
    if (wasZoomActive) { document.body.style.zoom = '1'; document.body.classList.remove('zoom-active'); }

    const ghostWrapper = document.createElement('div');
    ghostWrapper.style.position = 'absolute'; ghostWrapper.style.top = '-9999px'; ghostWrapper.style.left = '0';
    ghostWrapper.style.width = '360px'; ghostWrapper.style.background = getCaptureBgColor();
    ghostWrapper.style.padding = '20px'; ghostWrapper.style.borderRadius = '15px';
    ghostWrapper.style.zIndex = '-9999'; ghostWrapper.style.letterSpacing = 'normal'; ghostWrapper.style.wordBreak = 'keep-all';
    
    const clone = target.cloneNode(true);
    clone.style.width = '100%'; clone.style.margin = '0 auto'; clone.style.transform = 'none';
    clone.style.animation = 'none'; clone.style.boxSizing = 'border-box';
    
    const originalForms = target.querySelectorAll('select, input');
    const clonedForms = clone.querySelectorAll('select, input');
    originalForms.forEach((el, i) => {
        const cEl = clonedForms[i];
        const div = document.createElement('div');
        div.innerText = el.tagName === 'SELECT' ? (el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : '') : (el.value || el.placeholder || '');
        div.style.cssText = window.getComputedStyle(el).cssText;
        div.style.display = 'flex'; div.style.alignItems = 'center'; div.style.justifyContent = 'center';
        div.style.padding = '12px'; div.style.background = 'rgba(236, 238, 241, 0.4)';
        div.style.borderRadius = '8px'; div.style.width = '100%'; div.style.boxSizing = 'border-box';
        div.style.fontWeight = '900'; div.style.fontSize = '15px'; div.style.color = 'var(--text-color)';
        cEl.parentNode.replaceChild(div, cEl);
    });

    ghostWrapper.appendChild(clone); document.body.appendChild(ghostWrapper);

    try {
        await new Promise(r => setTimeout(r, 300));
        const canvas = await html2canvas(ghostWrapper, { backgroundColor: getCaptureBgColor(), scale: 2, logging: false, useCORS: true });
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        const file = new File([blob], fileName, { type: 'image/png' });
        
        if (navigator.share) {
            try { await navigator.share({ files: [file], title: shareTitle, text: shareText }); } catch (e) { console.log('Share canceled', e); }
        } else {
            const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = fileName; link.click();
        }
    } catch (err) { alert("캡처 중 오류가 발생했습니다."); } 
    finally {
        document.body.removeChild(ghostWrapper);
        if (shareBtn) shareBtn.style.display = 'block';
        if (wasZoomActive) { document.body.style.zoom = '1.2'; document.body.classList.add('zoom-active'); }
    }
}

function getPlayerColor(name) {
    const theme = document.documentElement.getAttribute('data-theme');
    if (name === "경배" && theme === "navy") return "#5D4037"; 
    return playerThemes[name] ? playerThemes[name].color : 'var(--text-color)';
}

function getGraphColor(name) {
    const isDark = ['dark', 'navy'].includes(document.documentElement.getAttribute('data-theme'));
    const cols = { '경배': isDark ? '#64b5f6' : '#1A237E', '원석': isDark ? '#2ecc71' : '#50C878', '정석': isDark ? '#ba68c8' : '#9B59B6', '진웅': isDark ? '#ffb74d' : '#F39C12', '창한': isDark ? '#ff8a80' : '#E74C3C', '경석': isDark ? '#4dd0e1' : '#1ABC9c' };
    return cols[name] || '#95a5a6';
}

function getTier(score) {
    if (score >= 60) return { name: "챌린저", icon: "👑", color: "#e67e22" };
    if (score >= 50) return { name: "플래티넘", icon: "💎", color: "#1abc9c" };
    if (score >= 40) return { name: "골드", icon: "🥇", color: "#f1c40f" };
    if (score >= 30) return { name: "실버", icon: "🥈", color: "#95a5a6" };
    return { name: "브론즈", icon: "🥉", color: "#cd7f32" };
}

// [최적화 완료] 팝업 맵핑 객체 활용
function showDashInfo(type) {
    triggerHaptic(10); 
    const wrap = (t) => `<div style='white-space: normal; word-break: keep-all; overflow-wrap: break-word; line-height: 1.5; text-align: left;'>${t}</div>`;
    const dict = {
        totalGames: { i: "🎱", t: "총 게임 수", d: wrap("현재 선택된 기간과 게임 인원 조건에 부합하여 실제로 진행된 <b>총 경기 횟수</b>를 의미함.") },
        totalDays: { i: "📅", t: "총 게임 일수", d: wrap("단순 경기 횟수가 아닌, 실제로 당구 클럽에 모여서 <b>게임을 즐긴 날짜의 총합</b>을 의미.") },
        mvp: { i: "👑", t: "월간 MVP 기준", d: wrap("<b>평균 승점</b>을 최우선으로 고려하며, 평균 승점이 같을 경우 승률(1위 횟수)을 비교하여 <b>해당 월에 가장 압도적인 기량을 보여준 선수</b>를 선정.") },
        villain: { i: "💸", t: "지갑 전사 기준", d: wrap("해당 월에 참여한 경기 수 대비 <b>꼴찌를 가장 높은 비율로 기록한 선수</b>. 게임비를 가장 많이 지출했을 것으로 추정되는 명예로운(?) 타이틀.") },
        trend: { i: "📈", t: "최근 2일 트렌드 분석", d: wrap("시즌 전체 평균 성적과 비교하여, <b>최근 2일간의 평균 성적이 15% 이상 급등(🔥Hot) 하거나 급락(❄️Cold)</b> 한 선수를 자동으로 감지하여 선정.") },
        defense: { i: "🛡️", t: "철벽 방어 기준", d: wrap("추첨된 순번 상 <b>내 바로 다음 순서인 선수의 멘탈을 붕괴시켜 평균 등수를 가장 낮게(숫자가 높게) 만든</b> 디펜스 최고의 지배자.") }
    };
    
    const info = dict[type];
    if(!info) return;

    const descEl = document.getElementById('info-modal-desc');
    descEl.style.color = document.documentElement.getAttribute('data-theme') === 'navy' ? '#5D4037' : '';
    
    const popupBox = document.getElementById('info-modal-title').parentElement;
    if (popupBox) popupBox.style.zoom = document.body.classList.contains('zoom-active') ? '0.85' : '1';

    let timerEl = document.getElementById('dash-info-timer') || Object.assign(document.createElement('div'), { id: 'dash-info-timer', style: 'margin-top:15px; font-size:12px; color:var(--sub-text); font-weight:800; text-align:center; display:block; width:100%;' });
    if(!document.getElementById('dash-info-timer')) descEl.parentNode.insertBefore(timerEl, descEl.nextSibling);
    
    document.getElementById('info-modal-icon').innerHTML = info.i; document.getElementById('info-modal-title').innerHTML = info.t; descEl.innerHTML = info.d;
    document.getElementById('info-modal').style.display = 'flex';

    let timeLeft = 10; timerEl.innerText = `${timeLeft}초 후 자동으로 닫힙니다.`;
    if (dashInfoCountdownInterval) clearInterval(dashInfoCountdownInterval);
    dashInfoCountdownInterval = setInterval(() => {
        timeLeft--; if (timerEl) timerEl.innerText = `${timeLeft}초 후 자동으로 닫힙니다.`;
        if (timeLeft <= 0) { clearInterval(dashInfoCountdownInterval); closeInfoModal(); }
    }, 1000);
}

function showRingCriteria(type) {
    const dict = {
        win: { t: "승률 산출 기준", d: "<b>(1위 횟수 / 참여 경기수) × 100</b><br><br><div style='white-space: normal; word-break: keep-all; overflow-wrap: break-word; line-height: 1.4;'>해당 월에 참여한 전체 경기 중 1위를 차지한 비율입니다. 공격적인 결정력을 보여주는 지표입니다.</div>" },
        score: { t: "평균득점 산출 기준", d: "<div style='white-space: normal; word-break: keep-all; overflow-wrap: break-word; line-height: 1.4;'>해당 선수의 월간 평균 승점입니다. 5점 기준.</div>" },
        safety: { t: "생존율 산출 기준", d: "<b>((경기수 - 꼴찌수) / 경기수) × 100</b><br><br><div style='white-space: normal; word-break: keep-all; overflow-wrap: break-word; line-height: 1.4;'>참여 경기 중 꼴찌를 하지 않고 살아남은 비율입니다. 무너지지 않는 수비적 안정감을 보여주는 지표입니다.</div>" }
    };
    const info = dict[type];
    
    const timerEl = document.getElementById('info-modal-timer');
    if(timerEl) {
        timerEl.style.display = 'block'; let timeLeft = 10; timerEl.innerText = `${timeLeft}초 후 자동으로 닫힙니다.`;
        if (infoModalCountdownInterval) clearInterval(infoModalCountdownInterval);
        infoModalCountdownInterval = setInterval(() => {
            timeLeft--; if (timerEl) timerEl.innerText = `${timeLeft}초 후 자동으로 닫힙니다.`;
            if (timeLeft <= 0) { clearInterval(infoModalCountdownInterval); closeInfoModal(); }
        }, 1000);
    }
    document.getElementById('info-modal-icon').innerHTML = "ℹ️"; document.getElementById('info-modal-title').innerHTML = info.t; document.getElementById('info-modal-desc').innerHTML = info.d; document.getElementById('info-modal').style.display = 'flex';
}

function showInfoModal(type) {
    const wrap = (t) => `<div style='white-space: normal; word-break: keep-all; overflow-wrap: break-word; line-height: 1.5; text-align: left;'>${t}</div>`;
    const dict = {
        score: { i: "📊", t: "인원별 차등 승점 기준", d: "<div style='white-space: nowrap; line-height: 1.5; text-align: left;'>• <b>2인</b>: 1위(+2), 꼴찌(0)<br>• <b>3인</b>: 1위(+3), 2위(+1), 꼴찌(0)<br>• <b>4인</b>: 1위(+4), 2위(+3), 3위(+2), 꼴찌(0)<br>• <b>5인</b>: 1위(+5), 2위(+4), 3위(+3), 4위(+1), 꼴찌(0)</div>" },
        tier: { i: "🏅", t: "랭킹 티어(계급) 기준", d: wrap("👑<b>챌린저</b>: 60+ &nbsp;💎<b>플래티넘</b>: 50+<br>🥇<b>골드</b>: 40+ &nbsp;&nbsp;🥈<b>실버</b>: 30+ &nbsp;🥉<b>브론즈</b>: 30미만") },
        condition: { i: "🌡️", t: "최근 컨디션 분석 기준", d: wrap("• ☀️<b>최상</b>: 1위 비율 30%↑<br>• ⛅<b>보통</b>: 1위 비율 30% 미만. 안정적인 보통 순위<br>• ⚡<b>도깨비</b>: 1위 30%↑ & 꼴찌 30%↑<br>• 🌧️<b>비상</b>: 꼴찌 비율 30%↑") },
        style: { i: "🎱", t: "당구 성향 분석 기준", d: wrap("<b>[승률 35% & 생존율 80% 기준]</b><br><br>• 👑 <b>전략적 지배자</b>: 승률↑ & 생존율↑<br>• 🐅 <b>폭격형 호랑이</b>: 승률↑ & 생존율↓<br>• 🐢 <b>철벽 거북이</b>: 승률↓ & 생존율↑<br>• 🐣 <b>성장하는 꿈나무</b>: 승률↓ & 생존율↓") }
    };
    const info = dict[type];

    const descEl = document.getElementById('info-modal-desc');
    const timerEl = document.getElementById('info-modal-timer');
    if(timerEl) timerEl.style.display = 'none'; 
    if (infoModalCountdownInterval) { clearInterval(infoModalCountdownInterval); infoModalCountdownInterval = null; }

    descEl.style.color = document.documentElement.getAttribute('data-theme') === 'navy' ? '#5D4037' : '';
    const popupBox = document.getElementById('info-modal-title').parentElement;
    if (popupBox) popupBox.style.zoom = document.body.classList.contains('zoom-active') ? '0.85' : '1';
    
    document.getElementById('info-modal-icon').innerHTML = info.i; document.getElementById('info-modal-title').innerHTML = info.t; descEl.innerHTML = info.d;
    document.getElementById('info-modal').style.display = 'flex';
}

function closeInfoModal() { 
    document.getElementById('info-modal').style.display = 'none'; 
    if (infoModalCountdownInterval) { clearInterval(infoModalCountdownInterval); infoModalCountdownInterval = null; }
    if (dashInfoCountdownInterval) { clearInterval(dashInfoCountdownInterval); dashInfoCountdownInterval = null; }
    const timerEl = document.getElementById('dash-info-timer'); if (timerEl) timerEl.remove();
}

function showLastGameResult() {
    if (!gameLogs.length) return document.getElementById('loading').style.display === 'none' ? undefined : setTimeout(showLastGameResult, 500);
    
    const latestDate = gameLogs.reduce((max, g) => Math.max(new Date(g.dateStr), new Date(max)) === new Date(g.dateStr) ? g.dateStr : max, gameLogs[0].dateStr);
    const lastGame = gameLogs.filter(g => g.dateStr === latestDate).pop();
    const actualRanks = lastGame.ranks.filter(n => n.trim());
    
    let html = `<div style="font-size:40px; margin-bottom:10px; display:block; text-align:center;">🏆</div><div style="font-size:18px; font-weight:900; color:var(--text-color); margin-bottom:5px; display:block; text-align:center;">LAST GAME RECORD</div><div style="font-size:15px; font-weight:800; color:var(--sub-text); margin-bottom: 20px; display:block; text-align:center;">[ ${lastGame.dateStr} ]</div><div style="display:block; font-weight:900;">`;
    actualRanks.forEach((name, i) => {
        const rankLabel = (i === 0) ? "1위🥇" : (i === actualRanks.length - 1 ? "꼴찌💀" : `${i + 1}위`);
        const rankColor = (i === 0) ? 'var(--rank1)' : (i === actualRanks.length - 1 ? 'var(--rankL)' : 'var(--text-color)');
        html += `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.4); padding:12px 20px; border-radius:15px; border:1px solid rgba(0,0,0,0.05); box-shadow: inset 1px 1px 3px rgba(255,255,255,0.7); margin-bottom:8px;"><div style="color:${rankColor}; font-size:${i === 0 ? '16px' : '14px'}; font-weight:${i === 0 ? '900' : '800'};">${rankLabel}</div><div style="color:${rankColor}; font-size:${i === 0 ? '22px' : '16px'}; font-weight:${i === 0 ? '900' : '800'};">${name}</div></div>`;
    });
    
    const modal = document.getElementById('last-game-modal'), content = document.getElementById('last-game-content');
    if(!modal || !content) return;
    content.innerHTML = html + `</div>`; modal.style.display = 'flex'; content.style.animation = 'scaleUpPopup 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
    setTimeout(() => { if(modal.style.display !== 'none') { content.style.animation = 'scaleDownPopup 0.4s ease-in forwards'; setTimeout(() => modal.style.display = 'none', 400); } }, 3000);
}

function focusOnDrawCard() { setTimeout(() => document.getElementById('drawCardArea')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150); }

function togglePlayerSelection(el, name) {
    triggerHaptic(15);
    if (selectedPlayersForLottery.includes(name)) { 
        selectedPlayersForLottery = selectedPlayersForLottery.filter(p => p !== name); el.classList.remove('active'); 
    } else {
        const limit = parseInt(document.getElementById('playerCount').value);
        if (selectedPlayersForLottery.length >= limit) return alert(`게임 가능 인원 ${limit}명. 초과 불가`); 
        selectedPlayersForLottery.push(name); el.classList.add('active');
    }
    if(!editMode) updateInputFields();
}

function resetPlayerSelection() { 
    selectedPlayersForLottery = []; document.querySelectorAll('.player-chip').forEach(el => el.classList.remove('active')); 
    if(!editMode) updateInputFields(); 
    document.getElementById('mainBtn')?.classList.remove('flash-save-active');
}

function pickRandomOrder() {
    triggerHaptic([20, 30, 20]);
    if (selectedDateStr > formatDate(new Date())) return alert("미래에서 온거야? 날짜를 잘 확인혀!"); 
    const limit = parseInt(document.getElementById('playerCount').value);
    if (selectedPlayersForLottery.length !== limit) return alert(`게임 참여 ${limit}명을 선택해!(현재 ${selectedPlayersForLottery.length}명)`);
    
    let pool = [...selectedPlayersForLottery]; 
    lastDrawnPlayers = [pool.splice(Math.floor(Math.random() * pool.length), 1)[0], ...pool.sort(() => Math.random() - 0.5)]; 
    currentStartOrder = [...lastDrawnPlayers];
    
    const resultArea = document.getElementById('order-result'), confirmBtn = document.querySelector('#order-modal button'), p1Color = getPlayerColor(lastDrawnPlayers[0]);
    const finalHtml = `<div style="background: rgba(128, 128, 128, 0.1); border-radius: 15px; padding: 15px; margin-bottom: 20px; border: 2.5px dashed ${p1Color}; display:block;"><div style="font-size: 14px; color: ${p1Color}; margin-bottom:5px;">🎯 이 게임의 초구는 바로 너!</div><div style="font-size: 26px; color: ${p1Color}; font-weight: 900;">1번 : ${lastDrawnPlayers[0]}</div></div><div style="font-size: 17px; opacity: 0.9; line-height: 2.2; font-weight: 800; display:block;">${lastDrawnPlayers.slice(1).map((p, i) => `<div style="color: ${getPlayerColor(p)}; display:block;">${i + 2}번 : ${p}</div>`).join('')}</div>`;
                       
    if (confirmBtn) confirmBtn.style.display = 'none';
    document.getElementById('order-modal').style.display = 'flex';
    
    function finishAnimation() {
        resultArea.innerHTML = finalHtml; if (confirmBtn) confirmBtn.style.display = 'block';
        lastDrawnPlayers.forEach((n, i) => { const s = document.getElementById(`rank${i + 1}`); if(s) s.value = n; });
        checkDuplicates();
    }
    
    if (animationStep === 0) {
        resultArea.innerHTML = `<div style="padding: 30px 0;"><div style="font-size: 14px; color: var(--sub-text); margin-bottom: 10px;">초구의 영광은 누구에게?</div><div id="slotName" style="font-size: 32px; font-weight: 900; color: var(--rank1); letter-spacing: 2px;">🎰</div></div>`;
        let start = Date.now(), counter = 0;
        const runSlot = () => {
            let elapsed = Date.now() - start;
            if (elapsed < 3000) { 
                const p = selectedPlayersForLottery[counter % selectedPlayersForLottery.length]; 
                const slotName = document.getElementById('slotName');
                slotName.innerText = p; slotName.style.color = getPlayerColor(p); counter++; 
                setTimeout(runSlot, 50 + Math.pow(elapsed / 3000, 3) * 400); 
            } else finishAnimation();
        }; runSlot();
    } else if (animationStep === 1) {
        resultArea.innerHTML = `<div style="padding: 30px 0; text-align: left;"><div style="font-size: 14px; font-weight: 800; color: var(--sub-text); margin-bottom: 12px; text-align: center; animation: flash 0.5s infinite alternate;">나도 초구 한번 쳐보자! 🎱</div><div style="width: 100%; height: 10px; background: rgba(0,0,0,0.1); border-radius: 10px; position: relative;"><div id="billiardGauge" style="width: 0%; height: 100%; background: linear-gradient(90deg, var(--rank1), var(--accent)); border-radius: 10px; transition: width 3s cubic-bezier(0.2, 0.8, 0.2, 1);"></div><div id="billiardBall" style="font-size: 26px; position: absolute; top: -14px; left: 0%; transition: left 3s cubic-bezier(0.2, 0.8, 0.2, 1), transform 3s cubic-bezier(0.2, 0.8, 0.2, 1); transform: translateX(-50%) rotate(0deg);">🎱</div></div></div>`;
        setTimeout(() => { const g = document.getElementById('billiardGauge'), b = document.getElementById('billiardBall'); if(g&&b) { g.style.width = '100%'; b.style.left = '100%'; b.style.transform = 'translateX(-50%) rotate(1080deg)'; } }, 50);
        setTimeout(finishAnimation, 3000);
    } else {
        resultArea.innerHTML = `<div style="padding: 30px 0; display: flex; flex-direction: column; align-items: center;"><div style="font-size: 55px; animation: heartbeat 0.3s infinite alternate;">🎱</div><div style="margin-top: 20px; font-size: 15px; font-weight: 900; color: var(--accent); animation: flash 0.5s infinite alternate;">두근두근... 초구는 누구?</div></div>`;
        setTimeout(finishAnimation, 3000);
    }
    animationStep = (animationStep + 1) % 3;
}

function closeOrderModal() { 
    document.getElementById('order-modal').style.display = 'none'; 
    if (lastDrawnPlayers.length) { showPlayersGraph(lastDrawnPlayers); lastDrawnPlayers = []; } 
}

function showPlayersGraph(players) {
    let svg = `<svg width="100%" height="100%" viewBox="-15 -10 130 120" preserveAspectRatio="none" style="overflow: visible; font-family: inherit;"><defs>`, legendHtml = ""; 
    players.forEach((p, i) => svg += `<linearGradient id="grad-${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${getGraphColor(p)}" stop-opacity="0.4"/><stop offset="100%" stop-color="${getGraphColor(p)}" stop-opacity="0.0"/></linearGradient>`);
    svg += `</defs>`;
    
    ["1위", "2위", "3위", "4위", "꼴찌"].forEach((l, i) => svg += `<line x1="0" y1="${i*25}" x2="100" y2="${i*25}" stroke="rgba(150,150,150,0.25)" stroke-width="1" stroke-dasharray="3,3" /><text x="-4" y="${i*25 + 3}" font-size="7" font-weight="900" fill="var(--sub-text)" text-anchor="end">${l}</text>`);
    
    players.forEach((p, pIdx) => {
        const pColor = getGraphColor(p); 
        legendHtml += `<div style="display:flex; align-items:center; gap:4px;"><span style="display:inline-block; width:10px; height:3px; background-color:${pColor}; border-radius:2px;"></span><span style="color:var(--text-color);">${p}</span></div>`;
        const recent = gameLogs.filter(g => g.ranks.includes(p)).sort((a,b) => new Date(b.dateStr) - new Date(a.dateStr) || (b.round||0) - (a.round||0)).slice(0, 10).reverse();
        if(!recent.length) return; 
        
        let pts = [], stepX = recent.length > 1 ? 100 / (recent.length - 1) : 50;
        recent.forEach((g, i) => { const a = g.ranks.filter(n=>n.trim()), r = a.indexOf(p); pts.push({x: recent.length===1?50:i*stepX, y: ((r === a.length-1 && a.length>1 ? 5 : r+1) - 1) * 25}); });
        
        if (pts.length) {
            let pathD = `M ${pts[0].x} ${pts[0].y}`; 
            for(let i=0; i<pts.length - 1; i++) pathD += ` C ${pts[i].x + (pts[i+1].x - pts[i].x)/2} ${pts[i].y}, ${pts[i].x + (pts[i+1].x - pts[i].x)/2} ${pts[i+1].y}, ${pts[i+1].x} ${pts[i+1].y}`;
            svg += `<path d="${pathD} L ${pts[pts.length-1].x} 100 L ${pts[0].x} 100 Z" fill="url(#grad-${pIdx})" /><path d="${pathD}" fill="none" stroke="${pColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.85" />`;
            pts.forEach(p => svg += `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="${pColor}" stroke="var(--card-bg)" stroke-width="1.5" />`);
        }
    });
    
    document.getElementById('graph-container').innerHTML = svg + `</svg>`; 
    document.getElementById('graph-legend').innerHTML = legendHtml; 
    document.getElementById('graph-modal').style.display = 'flex';

    let timeLeft = 10; const cEl = document.getElementById('graph-countdown-text');
    if (cEl) cEl.innerText = `${timeLeft}초 후 자동으로 닫힙니다.`;
    if (graphCountdownInterval) clearInterval(graphCountdownInterval);
    graphCountdownInterval = setInterval(() => {
        timeLeft--; if (cEl) cEl.innerText = `${timeLeft}초 후 자동으로 닫힙니다.`;
        if (timeLeft <= 0) { clearInterval(graphCountdownInterval); closeGraphModal(); }
    }, 1000);
}

function closeGraphModal() { 
    document.getElementById('graph-modal').style.display = 'none'; 
    if (graphCountdownInterval) { clearInterval(graphCountdownInterval); graphCountdownInterval = null; } 
    if (document.getElementById('graph-countdown-text')) document.getElementById('graph-countdown-text').innerText = "10초 후 자동으로 닫힙니다.";
    document.getElementById('mainBtn')?.classList.add('flash-save-active');
}

function closePlayerScoreModal() {
    const modal = document.getElementById('player-score-modal'), content = document.getElementById('player-score-content');
    [scoreModalTimeout, hideScoreModalTimeout, scoreCountdownInterval].forEach(t => clearTimeout(t)); scoreCountdownInterval = null;
    if(!modal || !content) return; 
    content.style.animation = 'scaleDownPopup 0.3s ease-in forwards'; 
    hideScoreModalTimeout = setTimeout(() => { modal.style.display = 'none'; content.style.animation = 'none'; }, 300); 
}

function changeAppTheme() { 
    const theme = document.getElementById('themeSelect').value; 
    document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('appTheme', theme); renderStats(); 
}

function formatDate(dInput) { const d = new Date(dInput); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

async function fetchData() {
    showLoading(true, "Cloud 동기화 중");
    try {
        const response = await fetch(`${GAS_URL}?t=${new Date().getTime()}`);
        gameLogs = (await response.json()).map(g => ({ ...g, dateStr: formatDate(g.date) }));
        renderAll(); 
    } catch (e) { console.error("Fetch error", e); } 
    finally { showLoading(false); document.getElementById('selectedDateTitle').innerText = `📅 ${selectedDateStr}`; }
}

function renderAll() { renderDashboard(); renderCalendar(); renderStats(); renderDefenseStats(); renderGameList(); analyzeStrategy(); }

function isHoliday(y, m, d) {
    const s = `${m + 1}-${d}`; 
    return ["1-1", "3-1", "5-1", "5-5", "6-6", "7-17", "8-15", "10-3", "10-9", "12-25"].includes(s) || (y === 2026 && ["2-16", "2-17", "2-18", "2-19", "3-2", "5-24", "5-25", "6-3", "8-17", "9-24", "9-25", "9-26", "10-5"].includes(s));
}

function renderCalendar() {
    const grid = document.getElementById('calendarGrid'), y = currentViewDate.getFullYear(), m = currentViewDate.getMonth(), realToday = formatDate(new Date());
    grid.innerHTML = ""; document.getElementById('monthDisplay').innerText = `${y}.${String(m + 1).padStart(2, '0')}`;
    
    ["일","월","화","수","목","금","토"].forEach((d, i) => grid.innerHTML += `<div class="weekday" style="color:${i===0?"#ff7675":i===6?"#74b9ff":"var(--sub-text)"}; font-size: 11px; font-weight: 700; opacity: 0.6; padding-bottom: 15px;">${d}</div>`);
    
    const lastDate = new Date(y, m + 1, 0).getDate();
    for (let i = 0; i < new Date(y, m, 1).getDay(); i++) grid.innerHTML += `<div></div>`;
    
    for (let d = 1; d <= lastDate; d++) {
        const dStr = formatDate(new Date(y, m, d));
        let c = "day-new" + (dStr===selectedDateStr?" selected-new":"") + (dStr===realToday?" today-new":"") + (new Date(y, m, d).getDay()===0||isHoliday(y,m,d)?" sun-new":"") + (new Date(y, m, d).getDay()===6?" sat-new":"");
        grid.innerHTML += `<div class="${c}" onclick="selectDate('${dStr}')"><span class="day-num">${d}</span>${gameLogs.some(g => g.dateStr === dStr) ? `<div class="record-dot" style="background:transparent; box-shadow:none; bottom:2px; left:50%; transform:translateX(-50%); font-size:10px; width:auto; height:auto; z-index:3;">🎱</div>` : ""}</div>`;
    }

    const tWrap = document.getElementById('monthRecordTimeline');
    if (tWrap) {
        const uniqueDates = [...new Set(gameLogs.filter(g => g.dateStr.startsWith(`${y}-${String(m + 1).padStart(2, '0')}`)).map(g => g.dateStr))].sort();
        if (uniqueDates.length) {
            tWrap.style.display = 'flex';
            tWrap.innerHTML = uniqueDates.map(dStr => `<div class="timeline-item${dStr === selectedDateStr ? ' active' : ''}" onclick="selectDate('${dStr}')"><div class="timeline-date">${parseInt(dStr.split('-')[2], 10)}</div><div class="timeline-dot"></div></div>`).join('');
        } else tWrap.style.display = 'none';
    }
}

function selectDate(dateStr) {
    triggerHaptic(10); if(editMode) cancelEdit();
    selectedDateStr = dateStr; document.getElementById('selectedDateTitle').innerText = `📅 ${dateStr}`;
    renderCalendar(); renderGameList();
    if (gameLogs.some(g => g.dateStr === dateStr)) setTimeout(() => document.getElementById('record-header-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
}

function checkDuplicates() { 
    const selects = Array.from(document.querySelectorAll('#inputArea select')), vals = selects.map(s => s.value); 
    selects.forEach((s, i) => { s.classList.remove('duplicate-error'); if(vals[i] && vals.filter(x => x === vals[i]).length > 1) s.classList.add('duplicate-error'); }); 
}

function updateInputFields(preFill = null) {
    if(preFill) document.getElementById('playerCount').value = preFill.length;
    const c = parseInt(document.getElementById('playerCount').value), targetPlayers = preFill ? preFill.filter(n => n.trim()) : (selectedPlayersForLottery.length === c ? selectedPlayersForLottery : players);
    let html = ''; 
    for(let i=1; i<=c; i++) html += `<div class="input-row"><label>${i===c?"꼴찌💀":i===1?"1위🥇":`${i}위`}</label><select id="rank${i}" onchange="checkDuplicates()"><option value="">선택</option>${targetPlayers.map(p => `<option value="${p}" ${preFill && preFill[i-1] === p ? 'selected' : ''}>${p}</option>`).join('')}</select></div>`; 
    document.getElementById('inputArea').innerHTML = html; 
    if(!preFill && !editMode && !selectedPlayersForLottery.length) document.querySelectorAll('.player-chip').forEach(el => el.classList.remove('active'));
}

function resetInputs() { editMode ? cancelEdit() : (document.getElementById('playerCount').value = "3", resetPlayerSelection()); document.getElementById('mainBtn')?.classList.remove('flash-save-active'); }

async function saveGame() {
    triggerHaptic(20); document.getElementById('mainBtn')?.classList.remove('flash-save-active');
    if (selectedDateStr > formatDate(new Date())) return alert("미래에서 온거야? 날짜를 잘 확인혀!"); 
    const ranks = Array.from({length: parseInt(document.getElementById('playerCount').value)}, (_, i) => document.getElementById('rank'+(i+1)).value);
    if(ranks.some(v=>!v)) return alert("참 참여 친구의 순위를 모두 선택해줘!"); 
    if(new Set(ranks).size !== ranks.length) return alert("누가 쌍둥인겨? 잘 선택혀!(중복)");
    
    showLoading(true, "저장 중");
    try { 
        await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: editMode ? "UPDATE" : "SAVE", date: selectedDateStr, ranks: Object.assign(["","","","",""], ranks), round: editRound, startOrder: currentStartOrder.length ? currentStartOrder : null }) }); 
        cancelEdit(); currentStartOrder = []; document.getElementById('playerCount').value = "3"; resetPlayerSelection(); await fetchData(); 
    } catch (e) { alert("오류 발생!"); showLoading(false); }
}

function analyzeStrategy() {
    const me = document.getElementById('strategyPlayer').value, resArea = document.getElementById('strategyResultArea'), shareBtn = document.getElementById('strategy-share-btn');
    if(!me) return (resArea.style.display = 'none', shareBtn.style.display = 'none');
    
    let stats = {};
    gameLogs.filter(g => g.startOrder?.includes(me) && g.ranks.includes(me)).forEach(g => {
        const order = g.startOrder, actual = g.ranks.filter(n => n.trim()), myRank = actual.indexOf(me), preP = order[(order.indexOf(me) - 1 + order.length) % order.length];
        if(!stats[preP]) stats[preP] = {c:0, w:0, l:0, s:0}; 
        stats[preP].c++; stats[preP].s += myRank + 1;
        if(myRank === 0) stats[preP].w++; if(myRank === actual.length - 1 && actual.length > 1) stats[preP].l++; 
    });
    
    const sorted = Object.keys(stats).sort((a,b) => (stats[a].s/stats[a].c) - (stats[b].s/stats[b].c));
    if(!sorted.length) { 
        resArea.innerHTML = `<div class="empty-search-msg" style="text-align:center; padding:20px; font-weight:800; color:var(--sub-text);">분석 가능한 추첨 기록이 없습니다.</div>`; shareBtn.style.display = 'none'; 
    } else {
        resArea.innerHTML = "<table class='stats-table strategy-table'><thead><tr><th>앞 주자</th><th>경기</th><th>평균</th><th style='color:var(--rank1);'>1위</th><th style='color:var(--rankL);'>꼴찌</th></tr></thead><tbody>" + sorted.map(p => `<tr><td style='color:${getPlayerColor(p)}; font-weight:900;'>${p}</td><td>${stats[p].c}전</td><td>${(stats[p].s/stats[p].c).toFixed(1)}위</td><td style='color:var(--rank1);'>${((stats[p].w/stats[p].c)*100).toFixed(0)}%</td><td style='color:var(--rankL);'>${((stats[p].l/stats[p].c)*100).toFixed(0)}%</td></tr>`).join('') + "</tbody></table><div class='strategy-footer-text' style='color:var(--sub-text); margin-top:10px; font-weight:800; text-align:center;'>※ 특정 선수 뒤에서의 게임 순위 분석입니다.</div>";
        shareBtn.style.display = 'block';
    }
    resArea.style.display = 'block';
}

function shareStrategyResult() { const player = document.getElementById('strategyPlayer').value; captureAndShare('strategy-capture-area', 'strategy-share-btn', `${player}_strategy.png`, `${player}의 상성 분석`, `${player} 선수의 순번별 성적 분석 결과입니다!`); }

function confirmReset(step) {
    const el = document.getElementById('resetSteps');
    el.innerHTML = step === 1 ? `<div style="color:#e67e22; font-weight:900; margin-bottom:10px;">[1단계] 정말 삭제할거야?</div><div id="confirm-buttons-wrap"><button class="save-btn" style="background:var(--edit);" onclick="confirmReset(2)">OK</button><button class="save-btn btn-cancel" onclick="cancelReset()">취소</button></div>` : (step === 2 ? `<div style="color:var(--accent); font-weight:900; margin-bottom:10px;">[2단계] 데이터가 모두 삭제돼!</div><div id="confirm-buttons-wrap"><button class="save-btn" style="background:var(--accent);" onclick="confirmReset(3)">OK</button><button class="save-btn btn-cancel" onclick="cancelReset()">취소</button></div>` : `<div style="color:#000; font-weight:900; margin-bottom:10px;">[최종 확인] 복구 불가! 진짜 삭제!</div><div id="confirm-buttons-wrap"><button class="save-btn" style="background:#000; color:#fff;" onclick="executeReset()">OK</button><button class="save-btn btn-cancel" onclick="cancelReset()">취소</button></div>`);
    if(step===1) document.getElementById('exitBtn').style.display = 'none'; 
}

function cancelReset() { document.getElementById('resetSteps').innerHTML = `<button class="reset-btn" onclick="confirmReset(1)">⚠️ 모든 데이터 초기화 (복구 불가)</button>`; document.getElementById('exitBtn').style.display = 'block'; }
async function executeReset() { showLoading(true, "초기화 중"); try { await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "RESET" }) }); location.reload(); } catch(e) { showLoading(false); } }

function renderDashboard() {
    const dCard = document.getElementById('dashboardCard'), fCount = document.getElementById('statsFilterCount')?.value || "all", fMonth = document.getElementById('statsFilterMonth')?.value || "";
    if (!dCard) return; document.getElementById('dashMonthLabel').innerText = `(${fMonth||"전체 기간"}, ${fCount==="all"?"전체":fCount+"인"})`;
    
    let filtered = gameLogs;
    if (fMonth) filtered = filtered.filter(g => g.dateStr.startsWith(fMonth));
    if (fCount !== "all") filtered = filtered.filter(g => g.ranks.filter(n => n.trim()).length === parseInt(fCount));

    dCard.style.display = 'block';
    if (!filtered.length) return ['dashTotalGames', 'dashTotalDays', 'dashMVP', 'dashVillain', 'dashHot', 'dashCold', 'dashDefense'].forEach(id => { const el = document.getElementById(id); if(el) el.innerText = id==='dashTotalGames'?'0G':(id==='dashTotalDays'?'0일':'-'); });

    let pStats = {}, datesSet = new Set(); players.forEach(p => pStats[p] = { p: 0, w: 0, l: 0, s: 0, r: 0 });
    filtered.forEach(g => { datesSet.add(g.dateStr); const a = g.ranks.filter(n => n.trim()); a.forEach((p, i) => { if(pStats[p]) { pStats[p].p++; pStats[p].s += getEarnedScore(i, a.length); pStats[p].r += i+1; if(i===0) pStats[p].w++; if(i===a.length-1&&a.length>1) pStats[p].l++; } }); });

    document.getElementById('dashTotalGames').innerText = `${filtered.length}G`; document.getElementById('dashTotalDays').innerText = `${datesSet.size}일`;

    let act = players.filter(p => pStats[p].p > 0), mvp = "-", villain = "-";
    if (act.length) {
        mvp = act.reduce((a, b) => (pStats[a].s/pStats[a].p) !== (pStats[b].s/pStats[b].p) ? ((pStats[a].s/pStats[a].p) > (pStats[b].s/pStats[b].p) ? a : b) : ((pStats[a].w/pStats[a].p) > (pStats[b].w/pStats[b].p) ? a : b));
        villain = act.reduce((a, b) => (pStats[a].l/pStats[a].p) !== (pStats[b].l/pStats[b].p) ? ((pStats[a].l/pStats[a].p) > (pStats[b].l/pStats[b].p) ? a : b) : (pStats[a].l > pStats[b].l ? a : b));
    }
    document.getElementById('dashMVP').innerText = mvp; document.getElementById('dashVillain').innerText = villain;

    let rStats = {}; players.forEach(p => rStats[p] = { p: 0, r: 0 });
    filtered.filter(g => Array.from(datesSet).sort((a,b)=>b.localeCompare(a)).slice(0,2).includes(g.dateStr)).forEach(g => { const a = g.ranks.filter(n => n.trim()); a.forEach((p, i) => { if (rStats[p]) { rStats[p].p++; rStats[p].r += i + 1; } }); });

    let hot = "-", cold = "-", mRise = -Infinity, mDrop = -Infinity;
    act.forEach(p => {
        if (pStats[p].p >= 3 && rStats[p].p > 0) {
            const sAvg = pStats[p].r / pStats[p].p, rAvg = rStats[p].r / rStats[p].p;
            if ((sAvg - rAvg)/sAvg*100 >= 15 && (sAvg - rAvg)/sAvg*100 > mRise) { mRise = (sAvg - rAvg)/sAvg*100; hot = p; }
            if ((rAvg - sAvg)/sAvg*100 >= 15 && (rAvg - sAvg)/sAvg*100 > mDrop) { mDrop = (rAvg - sAvg)/sAvg*100; cold = p; }
        }
    });
    document.getElementById('dashHot').innerText = hot !== "-" ? hot : "대기"; document.getElementById('dashCold').innerText = cold !== "-" ? cold : "대기";

    let defStats = {}; players.forEach(p => defStats[p] = { c: 0, r: 0 });
    filtered.filter(g=>g.startOrder).forEach(g => { const a = g.ranks.filter(n=>n.trim()); g.startOrder.forEach((preP, i) => { const nextIdx = a.indexOf(g.startOrder[(i + 1) % g.startOrder.length]); if (nextIdx !== -1 && defStats[preP]) { defStats[preP].c++; defStats[preP].r += nextIdx + 1; } }); });

    let defCan = "-", mDefAvg = -1;
    act.forEach(p => { if (defStats[p].c > 0 && defStats[p].r/defStats[p].c > mDefAvg) { mDefAvg = defStats[p].r/defStats[p].c; defCan = p; } });
    document.getElementById('dashDefense').innerText = defCan !== "-" ? `${defCan} (${mDefAvg.toFixed(1)}위)` : "-";
}

function onFilterChange() { renderDashboard(); renderStats(); renderDefenseStats(); closeMemberHistory(); }
function toggleAllMode() { isPercentMode = !isPercentMode; renderStats(); }

function renderStats() {
    if (document.querySelector('.stats-subtitle')) document.querySelector('.stats-subtitle').innerText = isPercentMode ? "(평균 승점 기준. 확률 %)" : "(평균 승점 기준. 횟수)";
    const fCount = document.getElementById('statsFilterCount')?.value || "all", fMonth = document.getElementById('statsFilterMonth')?.value || "";
    let stats = {}; players.forEach(p => stats[p] = { p: 0, r: [0,0,0,0,0], s: 0 });
    
    gameLogs.filter(g => !fMonth || g.dateStr.startsWith(fMonth)).filter(g => fCount==="all" || g.ranks.filter(n=>n.trim()).length === parseInt(fCount)).forEach(g => {
        const a = g.ranks.filter(n=>n.trim()); a.forEach((name, i) => { if(stats[name]) { stats[name].p++; stats[name].s += getEarnedScore(i, a.length); stats[name].r[i === a.length-1 && a.length>1 ? 4 : (i<4?i:4)]++; } });
    });
    
    const sorted = [...players].sort((a,b) => (stats[b].p?1:0) - (stats[a].p?1:0) || (stats[b].s/stats[b].p||0) - (stats[a].s/stats[a].p||0) || stats[b].r[0] - stats[a].r[0]);
    const maxC = { r0: Math.max(...players.map(p => stats[p].r[0])), r4: Math.max(...players.map(p => stats[p].r[4])) }; 
    
    let cRank = 1;
    document.getElementById('statsBody').innerHTML = sorted.map((p, i) => {
        if (i>0 && (stats[p].s/stats[p].p !== stats[sorted[i-1]].s/stats[sorted[i-1]].p || stats[p].r[0] !== stats[sorted[i-1]].r[0])) cRank = i + 1;
        const nStyle = `font-weight:900; cursor:pointer; text-decoration: underline; color:${stats[p].r[4]===maxC.r4&&maxC.r4>0?'darkred':(stats[p].r[0]===maxC.r0&&maxC.r0>0?'darkblue':'#8e44ad')};`;
        const getV = (v, t) => isPercentMode ? (t===0?'0':((v/t)*100).toFixed(0)) : v;
        return `<tr><td style="${nStyle}" onclick="renderMemberHistory('${p}', '${cRank}')"><span style="font-size:11px;">${getTier(stats[p].s).icon}</span> ${p}</td><td style="color:#5D4037;">${stats[p].p}</td><td style="color:var(--rank1);">${getV(stats[p].r[0], stats[p].p)}</td><td style="color:var(--rank2);">${getV(stats[p].r[1], stats[p].p)}</td><td style="color:var(--rank3);">${getV(stats[p].r[2], stats[p].p)}</td><td style="color:var(--rank4);">${getV(stats[p].r[3], stats[p].p)}</td><td style="color:var(--rankL);">${getV(stats[p].r[4], stats[p].p)}</td><td><span class="win-rate-pill">${stats[p].p>0?((stats[p].r[0]/stats[p].p)*100).toFixed(1):"0.0"}%</span></td></tr>`;
    }).join('');
    
    const rich = document.getElementById('richFriendArea'); 
    if(maxC.r4>0) { rich.style.display = 'block'; rich.innerHTML = `💸 야! 또 나냐? 다들 카드까봐!<br><span style="font-size:16px; color:var(--rankL); font-weight:900;">${players.filter(p=>stats[p].r[4]===maxC.r4).join(', ')}</span>`; } 
    else rich.style.display = 'none';
}

function showDefenseDetail(playerName) {
    const fCount = document.getElementById('statsFilterCount')?.value || "all", fMonth = document.getElementById('statsFilterMonth')?.value || "";
    let vStats = {}; 
    gameLogs.filter(g => (!fMonth || g.dateStr.startsWith(fMonth)) && g.startOrder?.includes(playerName)).forEach(g => {
        const a = g.ranks.filter(n=>n.trim()); if (fCount !== "all" && a.length !== parseInt(fCount)) return;
        const vName = g.startOrder[(g.startOrder.indexOf(playerName) + 1) % g.startOrder.length], vIdx = a.indexOf(vName);
        if (vIdx !== -1) { if (!vStats[vName]) vStats[vName] = { g: 0, r: 0, w: 0, l: 0 }; vStats[vName].g++; vStats[vName].r += vIdx + 1; if (vIdx === 0) vStats[vName].w++; if (vIdx === a.length - 1 && a.length > 1) vStats[vName].l++; }
    });

    const vSort = Object.keys(vStats).sort((a,b) => (vStats[b].r/vStats[b].g) - (vStats[a].r/vStats[a].g));
    let html = `<div id="defense-modal-capture-area" style="padding: 10px; border-radius: 15px; background: transparent; display: block;"><div style="font-size:40px; margin-bottom:10px; display:block; text-align:center;">🛡️</div><div style="font-size:19px; font-weight:900; color:var(--text-color); margin-bottom:5px; line-height:1.4; display:block; text-align:center;">${playerName}의 방어 리포트</div><div style="font-size:13px; font-weight:800; color:var(--sub-text); margin-bottom: 20px; line-height:1.4; display:block; text-align:center;">(내 바로 뒷주자 선수들의 성적 분석) ${fCount==="all"?"":`<span style="color:var(--accent); font-size:11px;">(${fCount}인 게임 기준)</span>`} ${fMonth?`<span style="color:var(--rank1); font-size:11px;">(${fMonth}월 기준)</span>`:""}</div><div style="display:block;">` + (!vSort.length ? `<div style="padding:30px; color:var(--sub-text); font-weight:800; text-align:center; display:block;">해당 조건의 분석 가능한 데이터가 없습니다.</div>` : vSort.map(v => `<div style="background:rgba(255,255,255,0.4); padding:12px 15px; border-radius:15px; border:1px solid rgba(0,0,0,0.05); text-align:left; margin-bottom: 10px; display:block;"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;"><div style="color:${getPlayerColor(v)}; font-size:17px; font-weight:900;">${playerThemes[v].emoji} ${v}</div><div style="font-size:13px; font-weight:800; color:var(--sub-text);">${vStats[v].g}전 / 평균 ${(vStats[v].r/vStats[v].g).toFixed(1)}위</div></div><div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; font-weight:900;"><div style="width:48%; background:var(--bg); padding:8px 6px; border-radius:8px; text-align:center; display:block;"><div style="color:var(--sub-text); margin-bottom:4px;">1위 확률</div><div style="color:var(--rank1); font-size:14px;">${((vStats[v].w/vStats[v].g)*100).toFixed(0)}%</div></div><div style="width:48%; background:var(--bg); padding:8px 6px; border-radius:8px; text-align:center; display:block;"><div style="color:var(--sub-text); margin-bottom:4px;">꼴찌 확률</div><div style="color:var(--rankL); font-size:14px;">${((vStats[v].l/vStats[v].g)*100).toFixed(0)}%</div></div></div></div>`).join('')) + `</div></div><button id="defense-modal-share-btn" class="share-btn-common" style="margin-top: 20px; width:100%;" onclick="shareDefenseDetail('${playerName}')">📸 디펜스 상세 기록 스크린샷 공유</button><button class="save-btn" style="background:#bdc3c7; margin-top:10px; width:100%; color:#444;" onclick="closeDefenseDetail()">닫기</button>`;

    const modal = document.getElementById('defense-detail-modal'), content = document.getElementById('defense-detail-content');
    if (!modal || !content) return;
    content.innerHTML = html; modal.style.display = 'flex'; content.style.animation = 'scaleUpPopup 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
    if (defenseModalTimeout) clearTimeout(defenseModalTimeout); defenseModalTimeout = setTimeout(closeDefenseDetail, 15000); 
}

function closeDefenseDetail() { const modal = document.getElementById('defense-detail-modal'), content = document.getElementById('defense-detail-content'); if (defenseModalTimeout) { clearTimeout(defenseModalTimeout); defenseModalTimeout = null; } if (!modal || !content) return; content.style.animation = 'scaleDownPopup 0.3s ease-in forwards'; setTimeout(() => { modal.style.display = 'none'; content.style.animation = 'none'; }, 300); }
function shareDefenseDetail(name) { captureAndShare('defense-modal-capture-area', 'defense-modal-share-btn', `${name}_defense_detail.png`, `${name}의 디펜스 리포트`, `${name} 선수가 방어한 다른 멤버들의 성적 분석 결과입니다!`); }

function renderDefenseStats() {
    const fCount = document.getElementById('statsFilterCount')?.value || "all", fMonth = document.getElementById('statsFilterMonth')?.value || "";
    let dStats = {}; players.forEach(p => dStats[p] = { r: 0, c: 0 });
    gameLogs.filter(g => (!fMonth || g.dateStr.startsWith(fMonth)) && g.startOrder?.length).forEach(g => { const a = g.ranks.filter(n=>n.trim()); if (fCount !== "all" && a.length !== parseInt(fCount)) return; g.startOrder.forEach((p, i) => { const nIdx = a.indexOf(g.startOrder[(i + 1) % g.startOrder.length]); if (nIdx !== -1 && dStats[p]) { dStats[p].r += nIdx + 1; dStats[p].c++; } }); });
    const act = players.filter(p => dStats[p].c > 0).sort((a, b) => (dStats[b].r/dStats[b].c) - (dStats[a].r/dStats[a].c));
    const tbody = document.getElementById('defenseBody'); if (!tbody) return;
    if (!act.length) return tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; font-weight:800; color:var(--sub-text);">해당 조건의 데이터가 없습니다.</td></tr>`;
    
    let cRank = 1;
    tbody.innerHTML = act.map((p, i) => {
        const avg = (dStats[p].r/dStats[p].c).toFixed(2);
        if (i > 0 && avg !== (dStats[act[i - 1]].r/dStats[act[i - 1]].c).toFixed(2)) cRank = i + 1;
        return `<tr onclick="showDefenseDetail('${p}')" style="cursor:pointer;"><td style="color:${cRank===1?'var(--rank1)':(cRank===2?'var(--rank2)':(cRank===3?'var(--rank3)':(cRank===act.length&&act.length>3?'var(--rankL)':'var(--text-color)')))}; font-weight:900;">${cRank===1?'1위🥇':cRank+'위'}</td><td style="color:${getPlayerColor(p)}; font-weight:900; text-decoration:underline;">${p}</td><td style="color:#5D4037;">${dStats[p].c}전</td><td style="color:var(--accent); font-weight:900;">${avg}위</td></tr>`;
    }).join('');
}

function shareDefenseResult() { captureAndShare('defense-capture-area', 'defense-share-btn', 'defense_ranking.png', 'Defense 순위', '멤버별 전체 디펜스 랭킹입니다!'); }
function closeMemberHistory() { document.getElementById('memberHistoryArea').style.display = 'none'; document.querySelector('.stats-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }

function renderMemberHistory(name, rank = "") {
    const area = document.getElementById('memberHistoryArea'), fCount = document.getElementById('statsFilterCount')?.value || "all", fMonth = document.getElementById('statsFilterMonth')?.value || "";
    const allGames = gameLogs.filter(g => (!fMonth || g.dateStr.startsWith(fMonth)) && g.ranks.filter(n=>n.trim()).includes(name) && (fCount === "all" || g.ranks.filter(n=>n.trim()).length === parseInt(fCount))).sort((a,b) => new Date(b.dateStr) - new Date(a.dateStr) || (b.round||0) - (a.round||0));
    
    if (!allGames.length) { const t = document.getElementById('toast'); t.innerText = "해당 조건의 기록이 없습니다."; t.style.display = 'block'; setTimeout(() => t.style.display = 'none', 2000); return; }
    
    const tScore = allGames.reduce((acc, g) => acc + getEarnedScore(g.ranks.filter(n=>n.trim()).indexOf(name), g.ranks.filter(n=>n.trim()).length), 0);
    const avg = (tScore / allGames.length).toFixed(2);
    
    [scoreModalTimeout, hideScoreModalTimeout, scoreCountdownInterval].forEach(t => clearTimeout(t)); scoreCountdownInterval = null; 
    const sModal = document.getElementById('player-score-modal'), sContent = document.getElementById('player-score-content');
    if(sModal && sContent) { 
        sContent.innerHTML = `<div style="font-size:clamp(45px, 10vw, 55px); margin-bottom:5px; display:block; text-align:center;">${playerThemes[name].emoji}</div><div style="display:flex; justify-content:center; align-items:center; font-size:clamp(28px, 8vw, 38px); font-weight:900; color:${getPlayerColor(name)}; margin-bottom: 15px;">${rank?rank+'위 ':''}${name}</div><div style="display:block; font-weight:900;"><div style="background:var(--bg); padding:12px; border-radius:12px; margin-bottom:8px; display:block;"><div style="font-size:13px; color:var(--sub-text); margin-bottom:4px;">총 승점</div><div style="font-size:22px; color:var(--rank1);">${tScore}점</div></div><div style="background:var(--bg); padding:12px; border-radius:12px; margin-bottom:8px; display:block;"><div style="font-size:13px; color:var(--sub-text); margin-bottom:4px;">참여 경기</div><div style="font-size:22px; color:var(--rank2);">${allGames.length}game</div></div><div style="background:var(--bg); padding:12px; border-radius:12px; margin-bottom:8px; display:block;"><div style="font-size:13px; color:var(--sub-text); margin-bottom:4px;">평균 승점</div><div style="font-size:22px; color:var(--accent);">${avg}점</div></div></div><div id="score-timer" style="margin-top:15px; font-size:12px; color:var(--sub-text); font-weight:800; text-align:center; display:block;">10초 후 자동으로 닫힙니다.</div>`; 
        sModal.style.display = 'flex'; sContent.style.animation = 'scaleUpPopup 0.4s forwards'; 
        let sLeft = 10; scoreCountdownInterval = setInterval(() => { sLeft--; const tEl = document.getElementById('score-timer'); if(tEl) tEl.innerText = `${sLeft}초 후 자동으로 닫힙니다.`; if(sLeft <= 0) { clearInterval(scoreCountdownInterval); closePlayerScoreModal(); } }, 1000);
    }

    const recent = allGames.slice(0, 10);
    let w10 = 0, l10 = 0; recent.forEach(g => { const a = g.ranks.filter(n=>n.trim()); if(a.indexOf(name) === 0) w10++; else if(a.indexOf(name) === a.length - 1) l10++; });
    const cnd = (w10/recent.length>=0.3 && l10/recent.length>=0.3) ? ["⚡", "도깨비", "var(--rank3)"] : (w10/recent.length>=0.3 ? ["☀️", "최상", "var(--rankL)"] : (l10/recent.length>=0.3 ? ["🌧️", "비상", "var(--rank1)"] : ["⛅", "보통", "var(--rank2)"]));

    area.innerHTML = `<div style="font-size:15px; font-weight:900; color:${getPlayerColor(name)}; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; border-bottom:2px dashed ${getPlayerColor(name)}50; padding-bottom:10px;"><div>${playerThemes[name].emoji} ${name} 프로필 <span style="font-size:11px; color:#999;">(${fMonth||'전체 기간'}, ${fCount==='all'?'전체 인원':fCount+'인 게임'})</span></div><div style="font-size:13px; cursor:pointer;" onclick="closeMemberHistory()">닫기 ✕</div></div><div class="condition-box cond-responsive"><div style="flex:1; display:flex; flex-direction:column; cursor:pointer;" onclick="showInfoModal('score')"><div style="font-size:12px; font-weight:900; color:var(--sub-text);">현재 랭킹 티어</div><div style="font-size:12px; font-weight:900; color:var(--sub-text); margin-top:3px;">(총 ${tScore}점 / 평균 ${avg}점)</div></div><div style="font-size:14px; font-weight:900; color:${getTier(tScore).color}; cursor:pointer;" onclick="showInfoModal('tier')">${getTier(tScore).icon} ${getTier(tScore).name}</div></div><div class="condition-box cond-responsive" onclick="showInfoModal('condition')"><div style="font-size:12px; flex:1; font-weight:900; color:var(--sub-text);">최근 컨디션 (${recent.length}G)</div><div style="font-size:14px; font-weight:900; color:${cnd[2]};">${cnd[0]} ${cnd[1]}</div></div><button id="member-share-btn" class="share-btn-common" style="margin:15px 0;" onclick="shareMemberResult('${name}')">📸 개인 전적 스크린샷 공유</button>` + recent.map(g => { const a = g.ranks.filter(n=>n.trim()), rIdx = a.indexOf(name); return `<div class="history-item"><div style="font-size:14px; color:#5D4037;">${g.dateStr} <span style="font-size:12px; font-weight:900; color:var(--rank1); margin-left:6px;">${gameLogs.filter(x=>x.dateStr===g.dateStr).findIndex(x=>x.round===g.round)+1}G</span></div><div style="font-size:15px; color:${rIdx===0?'var(--rank1)':(rIdx===a.length-1?'var(--rankL)':'#5D4037')};">${rIdx===0?'1위🥇':(rIdx===a.length-1?'꼴찌💀':(rIdx+1)+'위')}</div></div>`; }).join('');
    area.style.display = 'block'; area.style.border = `2.5px solid ${getPlayerColor(name)}`; setTimeout(() => area.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
}

function getCaptureBgColor() { const t = document.documentElement.getAttribute('data-theme') || 'yellow'; return t==='dark'?'#3c3c41':t==='navy'?'#0a192f':t==='yellowgreen'?'#f0ffe6':t==='purple'?'#f3e6ff':t==='green'?'#e1faeb':t==='pink'?'#ffebeb':t==='gray'?'#f0f0f0':'#fdfbe7'; }
function shareStatsResult() { captureAndShare('stats-capture-area', 'stats-share-btn', `stats_record.png`, '멤버별 누적 전적', '멤버별 누적 전적 결과입니다!'); }
function shareMemberResult(name) { captureAndShare('memberHistory-capture-area', 'member-share-btn', `${name}_history.png`, `${name}의 전적`, `${name} 선수의 경기 결과입니다!`); }
function changeZoom(v) { document.body.style.zoom = v; document.body.classList.toggle('zoom-active', v === '1.2'); }

function showGenseiModal(playerName) {
    let victims = [];
    gameLogs.filter(g => g.dateStr === selectedDateStr).forEach(g => { if(g.startOrder) { const pIdx = g.startOrder.indexOf(playerName); if(pIdx !== -1) { const a = g.ranks.filter(n=>n.trim()), vIdx = a.indexOf(g.startOrder[(pIdx+1)%g.startOrder.length]); if(vIdx !== -1) victims.push({r:g.round, n:g.startOrder[(pIdx+1)%g.startOrder.length], v:vIdx+1, a:a}); } } });
    if(!victims.length) return;
    const modal = document.getElementById('gensei-modal'), content = document.getElementById('gensei-modal-content'); if(!modal || !content) return;
    content.innerHTML = `<div style="font-size:40px; margin-bottom:10px; display:block; text-align:center;">😈</div><div style="font-size:18px; font-weight:900; color:var(--text-color); margin-bottom:5px; display:block; text-align:center;">${playerName}의 겐세이 희생양들</div><div style="font-size:14px; font-weight:800; color:var(--sub-text); margin-bottom: 20px; display:block; text-align:center;">[ ${selectedDateStr} ] 뒷주자 성적</div><div style="display:block; font-weight:900;">` + victims.map(v => `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.4); padding:12px 20px; border-radius:15px; border:1px solid rgba(0,0,0,0.05); box-shadow: inset 1px 1px 3px rgba(255,255,255,0.7); margin-bottom:8px;"><div style="color:var(--sub-text); font-size:12px; font-weight:800; width: 30px; text-align: left;">${gameLogs.filter(x=>x.dateStr===selectedDateStr).findIndex(x=>x.round===v.r)+1}G</div><div style="color:${getPlayerColor(v.n)}; font-size:16px; font-weight:900; flex: 1; text-align: center;">${v.n}</div><div style="color:${v.v===1?'var(--rank1)':(v.v===v.a.length?'var(--rankL)':'var(--text-color)')}; font-size:16px; font-weight:900; width: 50px; text-align: right;">${v.v===1?'1위🥇':(v.v===v.a.length?'꼴찌💀':v.v+'위')}</div></div>`).join('') + `</div><div style="margin-top:15px; font-size:12px; color:var(--sub-text); font-weight:800; display:block; text-align:center;">※ ${playerName} 선수의 바로 다음 순서<br>선수들의 결과입니다.</div><div id="gensei-countdown-text" style="margin-top:15px; font-size:12px; color:#999; font-weight:800; text-align:center; display:block;">10초 후 자동으로 닫힙니다.</div>`;
    modal.style.display = 'flex'; content.style.animation = 'scaleUpPopup 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
    if(genseiCountdownInterval) clearInterval(genseiCountdownInterval);
    let gLeft = 10; genseiCountdownInterval = setInterval(() => { gLeft--; const gEl = document.getElementById('gensei-countdown-text'); if(gEl) gEl.innerText = `${gLeft}초 후 자동으로 닫힙니다.`; if(gLeft<=0){clearInterval(genseiCountdownInterval); closeGenseiModal();} }, 1000);
}

function closeGenseiModal() { const m=document.getElementById('gensei-modal'), c=document.getElementById('gensei-modal-content'); if(genseiCountdownInterval) clearInterval(genseiCountdownInterval); if(!m||!c)return; c.style.animation='scaleDownPopup 0.3s ease-in forwards'; setTimeout(()=>{m.style.display='none'; c.style.animation='none';}, 300); }

function renderTodayMVP() {
    const area = document.getElementById('mvpArea'), games = gameLogs.filter(g => g.dateStr === selectedDateStr); 
    if(!games.length) return area.style.display = 'none';
    let s={}, gS={}; games.forEach(g=>{ const a=g.ranks.filter(n=>n.trim()); a.forEach((n,i)=>{if(!s[n])s[n]={w:0,p:0,l:0}; s[n].p++; if(i===0)s[n].w++; if(i===a.length-1&&a.length>1)s[n].l++;}); if(g.startOrder){g.startOrder.forEach((p,i)=>{const nIdx=a.indexOf(g.startOrder[(i+1)%g.startOrder.length]); if(nIdx!==-1){if(!gS[p])gS[p]={r:0,c:0,aL:true}; gS[p].r+=nIdx+1; gS[p].c++; if(nIdx!==a.length-1||a.length<=1)gS[p].aL=false;}});} });
    const act = Object.keys(s); if(!act.length) return area.style.display = 'none';
    const win = act.reduce((a,b)=>s[a].w>s[b].w?a:(s[a].w===s[b].w&&s[a].p<s[b].p?a:b)), work = act.reduce((a,b)=>s[a].p>s[b].p?a:b), surv = act.reduce((a,b)=>s[a].l/s[a].p<s[b].l/s[b].p?a:(s[a].l/s[a].p===s[b].l/s[b].p&&s[a].p>s[b].p?a:b));
    let gM = null, gD = ""; if(Object.keys(gS).length){ gM=Object.keys(gS).reduce((a,b)=>gS[a].r/gS[a].c>gS[b].r/gS[b].c?a:b); gD=gS[gM].aL?"뒷주자<br>평균 꼴찌":`뒷주자<br>평균 ${(gS[gM].r/gS[gM].c).toFixed(1)}위`; }
    area.innerHTML = `<div style="text-align:center; font-weight:900; font-size:14px; color:var(--rank1); margin-bottom:5px;">🏆 오늘의 MVP 분석</div><div class="mvp-badge"><span class="mvp-title">🔥 승부사</span><span class="mvp-player">${win}</span><span class="mvp-value">${s[win].w}승 / ${s[win].p}전</span></div><div class="mvp-badge"><span class="mvp-title">🏃 열정왕</span><span class="mvp-player">${work}</span><span class="mvp-value">${s[work].p}경기</span></div><div class="mvp-badge"><span class="mvp-title">🛡️ 생존자</span><span class="mvp-player">${surv}</span><span class="mvp-value">꼴찌 단 ${s[surv].l}회</span></div>` + (gM ? `<div class="mvp-badge" onclick="showGenseiModal('${gM}')" style="cursor: pointer; border: 1.5px dashed var(--edit);"><span class="mvp-title">😈 겐세이</span><span class="mvp-player" style="color: var(--edit); text-decoration: underline;">${gM}</span><span class="mvp-value" style="color: var(--edit);">${gD}</span></div>` : ""); 
    area.style.display = 'flex';
}

function renderGameList() {
    const area = document.getElementById('dayGameList'), games = gameLogs.filter(g => g.dateStr === selectedDateStr); renderTodayMVP();
    area.innerHTML = games.length ? `<div id="record-header-wrap" style="text-align:center; margin:25px 0 10px 0;"><span style="font-size:12px; color:#999; font-weight:800;">DAY'S RECORD</span></div><button id="today-share-btn" class="share-btn-common" style="margin-bottom:15px;" onclick="shareTodayResult()">📸 오늘의 전적 스크린샷 공유</button>` + games.map((g, i) => { const n = g.ranks.filter(x=>x.trim()); return `<div class="game-item" onclick="toggleActionOverlay(this)"><div class="game-info"><span>${i+1}G</span><div style="display:inline-flex; align-items:center;">${generateNamesHTML(n)}</div></div><div class="action-overlay"><div class="overlay-btn btn-edit-p" onclick="event.stopPropagation(); enterEditMode(${g.round}, '${n.join(',')}')">수정</div><div class="overlay-btn btn-del-p" onclick="event.stopPropagation(); deleteGame(${g.round})">삭제</div><div class="overlay-btn btn-cancel-p" onclick="event.stopPropagation(); closeAllOverlays()">취소</div></div></div>`; }).join('') : "";
}

function shareTodayResult() { captureAndShare('capture-area', 'today-share-btn', `today_record_${selectedDateStr}.png`, '오늘의 전적', `${selectedDateStr} 경기 결과!`); }
function shareSearchResult() { captureAndShare('search-capture-area', 'search-share-btn', `search_record.png`, '월별 검색 결과', '당구 전적 검색 결과!'); }
function toggleActionOverlay(el) { const o = el.querySelector('.action-overlay'); if(!o.classList.contains('active')) { closeAllOverlays(); o.classList.add('active'); } else o.classList.remove('active'); }
function closeAllOverlays() { document.querySelectorAll('.action-overlay').forEach(o => o.classList.remove('active')); }

function enterEditMode(round, rankStr) { editMode = true; editRound = round; updateInputFields(rankStr.split(',')); document.getElementById('editBadge').style.display = 'block'; document.getElementById('inputCard').classList.add('edit-active'); const btn = document.getElementById('mainBtn'); btn.innerText = "수정 완료"; btn.classList.add('edit-btn'); document.getElementById('inputArea').scrollIntoView({ behavior: 'smooth', block: 'center' }); closeAllOverlays(); }
function cancelEdit() { editMode = false; editRound = null; document.getElementById('editBadge').style.display = 'none'; document.getElementById('inputCard').classList.remove('edit-active'); const btn = document.getElementById('mainBtn'); btn.innerText = "순위 저장"; btn.classList.remove('edit-btn'); document.getElementById('playerCount').value = "3"; resetPlayerSelection(); updateInputFields(); btn?.classList.remove('flash-save-active'); }
async function deleteGame(round) { if(!confirm("정말 삭제할거야?")) return; showLoading(true, "삭제 중"); try { await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "DELETE", round: round }) }); fetchData(); } catch (e) { showLoading(false); } }

function showExitModal() { document.getElementById('exit-modal').style.display = 'flex'; }
function closeExitModal() { document.getElementById('exit-modal').style.display = 'none'; }
function closeAppWindow() { window.close(); setTimeout(() => { document.body.innerHTML = `<div style="background:linear-gradient(135deg, #4a90e2, #9370db); height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; color:white; text-align:center; font-family: 'Pretendard', sans-serif;"><div style="font-size:60px; margin-bottom:20px;">👋</div><div style="font-size:20px; font-weight:900; line-height:1.6;">앱 종료</div><div style="font-size:14px; margin-top:30px; opacity:0.8;">다음에 또 봐!</div></div>`; document.body.style.backgroundImage = 'none'; document.body.style.padding = '0'; }, 300); }

function showLoading(v, t) { document.getElementById('loadingText').innerText = t; document.getElementById('loading').style.display = v ? 'flex' : 'none'; }
function changeMonth(v) { currentViewDate.setMonth(currentViewDate.getMonth() + v); renderCalendar(); }
function exportData() { if (!gameLogs.length) return alert("데이터 없음"); const a = document.createElement('a'); a.href = 'data:application/json;charset=utf-8,'+ encodeURIComponent(JSON.stringify(gameLogs, null, 2)); a.download = `billiard_backup_${new Date().toLocaleDateString('sv-SE')}.json`; a.click(); }
function triggerImport() { document.getElementById('importFile').click(); }

function importData(e) {
    const file = e.target.files[0]; if (!file) return; const reader = new FileReader();
    reader.onload = async function(ev) {
        try {
            const data = JSON.parse(ev.target.result); if (!Array.isArray(data)) throw new Error("Invalid format");
            if (!confirm(`백업 파일에서 ${data.length}개의 데이터를 발견했습니다.\n전체 복구를 진행하시겠습니까?`)) { e.target.value = ''; return; }
            showLoading(true, "기존 데이터 초기화 중..."); await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "RESET" }) });
            for (let i = 0; i < data.length; i++) { showLoading(true, `데이터 복구 중... (${i + 1} / ${data.length})`); await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "SAVE", date: data[i].dateStr, ranks: Object.assign(["","","","",""], data[i].ranks||[]), startOrder: data[i].startOrder || null }) }); }
            alert("데이터 복구가 성공적으로 완료되었습니다!"); e.target.value = ''; showLoading(true, "최신 데이터 불러오는 중..."); await fetchData();
        } catch (err) { alert("복구 중 오류가 발생했습니다.\n오류 내용: " + err.message); showLoading(false); e.target.value = ''; }
    }; reader.readAsText(file);
}

function setDefaultSearchDates() { if (searchFlatpickr) searchFlatpickr.setDate(new Date()); }
function resetSearch() { ['searchDateRange', 'searchPlayer'].forEach(id => {if(document.getElementById(id)) document.getElementById(id).value = '';}); ['searchSummaryArea', 'searchHistoryListArea', 'search-share-btn'].forEach(id => {if(document.getElementById(id)) document.getElementById(id).style.display = 'none';}); if(typeof setDefaultSearchDates==='function') setDefaultSearchDates(); }

function searchRecords() {
    const mon = document.getElementById('searchDateRange').value, player = document.getElementById('searchPlayer').value;
    if(!mon || !player) return alert("검색월과 선수를 선택해줘!");
    const filtered = gameLogs.filter(g => g.dateStr.startsWith(mon) && g.ranks.includes(player)).sort((a,b) => new Date(b.dateStr) - new Date(a.dateStr) || (b.round||0) - (a.round||0));
    const sArea = document.getElementById('searchSummaryArea'), lArea = document.getElementById('searchHistoryListArea'), shareBtn = document.getElementById('search-share-btn');
    if(!filtered.length) { sArea.innerHTML = `<div class="empty-search-msg" style="text-align:center; padding:20px; font-weight:800; color:var(--sub-text);">기록 없음</div>`; sArea.style.display = 'block'; lArea.style.display = 'none'; shareBtn.style.display = 'none'; return; }
    
    let r=[0,0,0,0,0], mScore=0, mAll={}; players.forEach(p => mAll[p] = { p: 0, s: 0, w: 0 });
    filtered.forEach(g => { const a = g.ranks.filter(n=>n.trim()), rIdx = a.indexOf(player); if(rIdx===a.length-1&&a.length>1) r[4]++; else if(rIdx<4) r[rIdx]++; mScore+=getEarnedScore(rIdx, a.length); });
    gameLogs.filter(g => g.dateStr.startsWith(mon)).forEach(g => { const a=g.ranks.filter(n=>n.trim()); a.forEach((p,i)=>{if(mAll[p]){mAll[p].p++; mAll[p].s+=getEarnedScore(i, a.length); if(i===0)mAll[p].w++;}}); });
    
    const mRanked = [...players].sort((a,b) => (mAll[b].p?1:0)-(mAll[a].p?1:0) || (mAll[b].s/mAll[b].p||0)-(mAll[a].s/mAll[a].p||0) || mAll[b].w-mAll[a].w);
    let myRank = 1, cRank = 1; mRanked.forEach((p,i) => { if(i>0 && ((mAll[p].s/mAll[p].p||0)!==(mAll[mRanked[i-1]].s/mAll[mRanked[i-1]].p||0) || mAll[p].w!==mAll[mRanked[i-1]].w)) cRank = i+1; if(p===player) myRank = cRank; });
    
    const wR = r[0]/filtered.length, lR = r[4]/filtered.length, cnd = (wR>=0.3&&lR>=0.3)?["⚡","도깨비","var(--rank3)"]:(wR>=0.3?["☀️","최상","var(--rankL)"]:(lR>=0.3?["🌧️","비상","var(--rank1)"]:["⛅","보통","var(--rank2)"]));
    const sC = [{b:'rgba(255,173,173,0.25)',s:'rgba(255,173,173,0.5)',c:'#FFADAD'},{b:'rgba(255,214,165,0.25)',s:'rgba(255,214,165,0.5)',c:'#FFD6A5'},{b:'rgba(253,255,182,0.25)',s:'rgba(253,255,182,0.5)',c:'#FDFFB6'},{b:'rgba(202,255,191,0.25)',s:'rgba(202,255,191,0.5)',c:'#CAFFBF'},{b:'rgba(155,246,255,0.25)',s:'rgba(155,246,255,0.5)',c:'#9BF6FF'},{b:'rgba(160,196,255,0.25)',s:'rgba(160,196,255,0.5)',c:'#A0C4FF'},{b:'rgba(189,178,255,0.25)',s:'rgba(189,178,255,0.5)',c:'#BDB2FF'},{b:'rgba(255,198,255,0.25)',s:'rgba(255,198,255,0.5)',c:'#FFC6FF'}][Math.floor(Math.random()*8)];
    const mkCard = (l, v, sv="") => `<div style="background:${sC.b}; padding:15px 10px; border-radius:14px; text-align:center; border:2.5px solid ${sC.c}; box-shadow:0 0 10px ${sC.c}, 0 0 20px ${sC.s}, inset 0 0 8px rgba(255,255,255,0.3); backdrop-filter:blur(5px); margin:2px;"><div style="font-size:12px; font-weight:800; color:var(--sub-text); margin-bottom:8px;">${l}</div><div style="font-size:18px; font-weight:900; color:var(--text-color);">${v} ${sv}</div></div>`;
    const mkRing = (v, c, l, t) => `<div style="display:flex; flex-direction:column; align-items:center; cursor:pointer; flex: 1;" onclick="showRingCriteria('${t}')"><svg viewBox="0 0 36 36" style="width:70px; height:70px; margin-bottom:8px; overflow:visible;"><path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(150,150,150,0.2)" stroke-width="4.5" /><path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="${c}" stroke-width="4.5" stroke-dasharray="${v}, 100" stroke-linecap="round" /><text x="18" y="21.5" text-anchor="middle" font-size="10" font-weight="900" fill="${c}">${v}%</text></svg><span style="font-size:12px; font-weight:900; color:var(--sub-text);">${l}</span></div>`;

    const bStyle = (wR*100>=35&&Math.round((filtered.length-r[4])/filtered.length*100)>=80)?{n:"👑 전략적 지배자",d:"공수 밸런스가 완벽한 최강의 포식자!",c:"var(--rank1)"}:((wR*100>=35&&Math.round((filtered.length-r[4])/filtered.length*100)<80)?{n:"🐅 폭격형 호랑이",d:"화끈한 공격력! 수비가 다소 불안한 공격수!",c:"#FF6B81"}:((wR*100<35&&Math.round((filtered.length-r[4])/filtered.length*100)>=80)?{n:"🐢 철벽 거북이",d:"무너지지 않는 멘탈! 짠당구의 고수!",c:"#3498DB"}:{n:"🐣 성장하는 꿈나무",d:"경험이 필요한 단계! 잠재력은 무궁무진!",c:"#95a5a6"}));

    sArea.innerHTML = `<div class="summary-box" style="margin: 0 -5px; box-sizing: border-box; background:var(--record-bg); border:2px solid var(--record-border); border-radius:15px; padding:25px 15px;"><div style="text-align:center; font-weight:900; color:var(--text-color); margin-bottom:20px; font-size:18px;">[ ${player}, ${mon} ]</div><div style="display:flex; justify-content:center; width:100%; margin-bottom:35px;">${mkRing(Math.round(wR*100),'#9B59B6','승률','win')}${mkRing(Math.min(100, Math.round(((mScore/filtered.length)/5)*100)),'#FF6B81','평균득점','score')}${mkRing(Math.round((filtered.length-r[4])/filtered.length*100),'#3498DB','생존율','safety')}</div><div style="background: rgba(255,255,255,0.7); border: 2px dashed ${bStyle.c}; border-radius: 12px; padding: 15px; margin-bottom: 20px; text-align: center; cursor: pointer;" onclick="showInfoModal('style')"><div style="font-size: 13px; font-weight: 800; color: var(--sub-text); margin-bottom: 5px;">나의 당구 MBTI</div><div style="font-size: 20px; font-weight: 900; color: ${bStyle.c}; margin-bottom: 8px;">${bStyle.n}</div><div style="font-size: 12px; font-weight: 700; color: #555;">${bStyle.d}</div></div><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">${mkCard("월간순위",`${myRank}위`)}${mkCard("총/평균 승점",`${mScore}점`,`<span style="font-size:13px; color:var(--sub-text);">(${(mScore/filtered.length).toFixed(2)})</span>`)}${mkCard("티어",`<span style="color:${getTier(mScore).color};">${getTier(mScore).icon}${getTier(mScore).name}</span>`)}${mkCard("컨디션",`<span style="color:${cnd[2]};">${cnd[0]}${cnd[1]}</span>`)}</div></div>`;
    lArea.innerHTML = `<div style="max-height:250px; overflow-y:auto; padding-right:5px; margin-top:15px;">${filtered.map(g => `<div class="history-item search-result-card" style="flex-direction:column; align-items:flex-start; gap:5px;"><div style="display:flex; justify-content:space-between; width:100%;"><div style="font-size:13px; color:var(--sub-text);">${g.dateStr} <span style="font-size:12px; font-weight:900; color:var(--rank1); margin-left:6px;">${gameLogs.filter(x=>x.dateStr===g.dateStr).findIndex(x=>x.round===g.round)+1}G</span></div><div style="font-size:14px; font-weight:900; color:${g.ranks.filter(n=>n.trim()).indexOf(player)===0?'darkblue':(g.ranks.filter(n=>n.trim()).indexOf(player)===g.ranks.filter(n=>n.trim()).length-1?'red':'var(--text-color)')};">${g.ranks.filter(n=>n.trim()).indexOf(player)===0?'1위🥇':(g.ranks.filter(n=>n.trim()).indexOf(player)===g.ranks.filter(n=>n.trim()).length-1?'꼴찌💀':(g.ranks.filter(n=>n.trim()).indexOf(player)+1)+'위')}</div></div><div style="font-size:12px; display:inline-flex; align-items:center;">${generateNamesHTML(g.ranks.filter(n=>n.trim()))}</div></div>`).join('')}</div>`;
    sArea.style.display = 'block'; lArea.style.display = 'block'; shareBtn.style.display = 'block'; setTimeout(() => document.getElementById('search-capture-area')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
}

window.onload = () => { 
    try {
        function applyHighlight(instance) {
            if (!instance || !instance.calendarContainer) return;
            instance.calendarContainer.querySelectorAll('.flatpickr-monthSelect-month').forEach((el, i) => {
                if (gameLogs.some(g => g.dateStr.startsWith(`${instance.currentYear}-${String(i + 1).padStart(2, '0')}`))) { if (!el.classList.contains('selected')) { el.style.backgroundColor = '#5D4037'; el.style.color = '#ffffff'; } else { el.style.backgroundColor = ''; el.style.color = ''; } } else { el.style.backgroundColor = ''; el.style.color = ''; }
            });
        }

        searchFlatpickr = flatpickr("#searchDateRange", { 
            plugins: [new monthSelectPlugin({shorthand: true, dateFormat: "Y-m", altFormat: "Y-m"})], locale: "ko", disableMobile: true,
            onReady: (sd, ds, i) => applyHighlight(i), onOpen: (sd, ds, i) => applyHighlight(i), onYearChange: (sd, ds, i) => setTimeout(() => applyHighlight(i), 50),
            onChange: (sd, ds, i) => { applyHighlight(i); if (ds && !gameLogs.some(g => g.dateStr.startsWith(ds))) { document.getElementById('toast').innerText = "게임 기록 없음"; document.getElementById('toast').style.display = 'block'; setTimeout(() => { document.getElementById('toast').style.display = 'none'; setDefaultSearchDates(); }, 3000); } }
        });

        flatpickr("#statsFilterMonth", { 
            plugins: [new monthSelectPlugin({shorthand: true, dateFormat: "Y-m", altFormat: "Y-m"})], locale: "ko", disableMobile: true,
            onReady: function(sd, ds, i) { const btn = document.createElement("div"); btn.style.padding = "0 10px 10px 10px"; btn.innerHTML = "<button type='button' style='width:100%; padding:10px; background:var(--edit); color:white; border:none; border-radius:8px; font-weight:900; font-size:13px; cursor:pointer; box-shadow:0 4px 6px rgba(0,0,0,0.1);'>전체 기간으로 리셋</button>"; btn.onclick = () => { i.clear(); i.close(); onFilterChange(); }; i.calendarContainer.appendChild(btn); applyHighlight(i); },
            onOpen: (sd, ds, i) => applyHighlight(i), onYearChange: (sd, ds, i) => setTimeout(() => applyHighlight(i), 50), onChange: (sd, ds, i) => { applyHighlight(i); onFilterChange(); }
        });
    } catch(e) { console.error("Flatpickr initialization failed", e); }
    
    let savedTheme = localStorage.getItem('appTheme') || 'yellow'; document.documentElement.setAttribute('data-theme', savedTheme); document.getElementById('themeSelect').value = savedTheme;
    setTimeout(() => { const ws = document.getElementById('welcome-screen'); if(ws) { ws.style.opacity = '0'; setTimeout(() => ws.style.display = 'none', 800); } showLastGameResult(); }, 3000);
    updateInputFields(); setDefaultSearchDates(); fetchData(); 
};
document.addEventListener('click', (e) => { if(!e.target.closest('.game-item')) closeAllOverlays(); });
