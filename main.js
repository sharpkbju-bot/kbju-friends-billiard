// main.js - V9.82 Live Pulse Edition
let scoreModalTimeout = null;
let hideScoreModalTimeout = null;
let graphCountdownInterval = null;
let genseiCountdownInterval = null; 
let defenseModalTimeout = null; 
let infoModalCountdownInterval = null; 
let scoreCountdownInterval = null; 
let dashInfoCountdownInterval = null; 
let globalToastTimeout = null; 
let audioCtx = null; // V9.50 Web Audio API Context
let replayInterval = null; // [V9.62 신규] 오늘의 복기 애니메이션 타이머
let awardsCountdownInterval = null; // [V9.74 신규] 월간 종합 하이라이트 10초 자동 종료 타이머

function triggerHaptic(pattern) {
    if (navigator.vibrate) {
        navigator.vibrate(pattern);
    }
}

// [V9.50] 효과음 합성 함수 (Web Audio API)
function playSystemSound(type) {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        if (type === 'success') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
            oscillator.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.3); // C6
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.4);
        } else if (type === 'pop') {
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.1);
        }
    } catch (e) { console.log("Audio play failed", e); }
}

// [V9.50] 화면 플래시 효과
function triggerSuccessFlash() {
    const flash = document.getElementById('success-flash');
    if (flash) {
        flash.style.opacity = '0.5';
        setTimeout(() => { flash.style.opacity = '0'; }, 150);
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
let awardsFlatpickr; // [V9.74 신규] 월간 시상식 전용 달력 인스턴스
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
    
    // [V9.75 패치] 월간 종합 하이라이트 캡처 시 실제 모달 배경색(다크 네이비) 강제 유지하여 색상 오류 방어
    if (targetId === 'awards-content') {
        ghostWrapper.style.background = '#0f1423';
    } else {
        ghostWrapper.style.background = getCaptureBgColor();
    }
    
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
    
    // [V9.76 패치] ::before, ::after 가상 요소가 일으키는 색상 혼합(Blending) 오류를 막기 위해 클래스 임시 제거
    if (targetId === 'awards-content') {
        clone.classList.remove('last-game-content');
    }
    
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
        const canvas = await html2canvas(ghostWrapper, { backgroundColor: (targetId === 'awards-content' ? '#0f1423' : getCaptureBgColor()), scale: 2, logging: false, useCORS: true });
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        const file = new File([blob], fileName, { type: 'image/png' });
        
        if (navigator.share) {
            try { await navigator.share({ files: [file], title: shareTitle, text: shareText }); } catch (e) { console.log('Share canceled', e); }
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

function showDashInfo(type) {
    triggerHaptic(10); 
    let title = "";
    let desc = "";
    let icon = "";

    const wrapStart = "<div style='white-space: normal; word-break: keep-all; overflow-wrap: break-word; line-height: 1.5; text-align: left;'>";
    const wrapEnd = "</div>";

    if (type === 'totalGames') {
        icon = "🎱"; title = "총 게임 수";
        desc = wrapStart + "현재 선택된 기간과 인원 조건에 부합하여 실제로 진행된 <b>총 게임 횟수</b>를 의미함." + wrapEnd;
    } else if (type === 'totalDays') {
        icon = "📅"; title = "총 게임 일수";
        desc = wrapStart + "단순 게임 횟수가 아닌, 실제로 당구 클럽에 모여서 <b>게임을 즐긴 날짜의 총합</b>을 의미." + wrapEnd;
    } else if (type === 'lucky') {
        icon = "🍀"; title = "최고의 럭키 가이 기준";
        desc = wrapStart + "<b>평균 승점</b>과 <b>평균 순위</b>를 기반으로 산출. 게임 참여 대비 승점을 효율적으로 쌓은 '최고 가성비 선수'를 의미." + wrapEnd;
    } else if (type === 'timeline') { 
        icon = "⏱️"; title = "실시간 타임라인 분석 기준";
        desc = wrapStart + 
               "최근 <b>최대 10게임</b>의 흐름을 다음 기준으로 자동 분석.<br><br>" +
               "🔥 <b>압도적 선공승</b>: 3인 이상 게임에서 <b>초구(1번)</b>가 1위 (주도권 완승)<br><br>" +
               "⚡ <b>짜릿한 역전승</b>: 3인 이상 게임에서 <b>말구(마지막)</b>가 1위 (불리함 극복)<br><br>" +
               "⚔️ <b>치열한 승부</b>: 그 외 중간 순서가 1위이거나 2인 게임 (예측불허 접전)" + 
               wrapEnd;
    } else if (type === 'mvp') {
        icon = "👑"; title = "월간 MVP 기준";
        desc = wrapStart + "<b>평균 승점</b>을 최우선으로 고려. 평균 승점이 같을 경우 승률(1위 횟수)을 비교하여 <b>해당 월에 가장 압도적인 기량을 보여준 선수</b>를 선정." + wrapEnd;
    } else if (type === 'villain') {
        icon = "💸"; title = "지갑 전사 기준";
        desc = wrapStart + "해당 월에 참여한 게임 수 대비 <b>꼴찌를 가장 높은 비율로 기록한 선수</b>. 게임비를 가장 많이 지출했을 것으로 추정되는 안타까운(?) 타이틀." + wrapEnd;
    } else if (type === 'firstBreak' || type === 'lastTurn') {
        const filterEl = document.getElementById('statsFilterCount');
        const filterVal = filterEl ? filterEl.value : "all";
        const monthEl = document.getElementById('statsFilterMonth');
        const monthVal = monthEl ? monthEl.value : "";
        
        let filteredGames = gameLogs;
        if (monthVal) filteredGames = filteredGames.filter(g => g.dateStr.startsWith(monthVal));
        if (filterVal !== "all") {
            const count = parseInt(filterVal);
            filteredGames = filteredGames.filter(g => g.ranks.filter(n => n.trim() !== "").length === count);
        }

        let startOrderStats = {};
        players.forEach(p => startOrderStats[p] = { count: 0, played: 0 });

        filteredGames.forEach(g => {
            const actual = g.ranks.filter(n => n.trim() !== "");
            actual.forEach(p => { if (startOrderStats[p]) startOrderStats[p].played++; });
            
            if (g.startOrder && g.startOrder.length > 0) {
                const targetP = type === 'firstBreak' ? g.startOrder[0] : g.startOrder[g.startOrder.length - 1];
                if (type === 'firstBreak') {
                    if (startOrderStats[targetP]) startOrderStats[targetP].count++;
                } else {
                    if (startOrderStats[targetP] && g.startOrder.length > 1) startOrderStats[targetP].count++;
                }
            }
        });

        let statList = players.filter(p => startOrderStats[p].played > 0).map(p => ({
            name: p, count: startOrderStats[p].count, played: startOrderStats[p].played
        }));
        statList.sort((a, b) => b.count - a.count || b.played - a.played);

        let listHtml = `<div style="margin-top: 15px; border-top: 1px dashed rgba(0,0,0,0.1); padding-top: 15px;">`;
        if (type === 'firstBreak') {
            icon = "🎱"; title = "최다 초구자 (MOST FIRST BREAKS)";
            desc = wrapStart + "순서 추첨에서 <b>1번(초구)</b>으로 가장 많이 뽑힌 선수.<br>시작부터 게임을 리드하는 행운의 사나이!" + wrapEnd;
            listHtml += `<div style="font-size:13px; color:var(--sub-text); font-weight:900; margin-bottom:12px; text-align:center;">[ 전체 선수 초구 횟수 ]</div>`;
        } else {
            icon = "💀"; title = "최다 말구자 (MOST LAST TURNS)";
            desc = wrapStart + "순서 추첨에서 <b>마지막 순서(말구)</b>로 가장 많이 뽑힌 선수.<br>가장 불리한 위치에서 시작해야 하는 인내의 아이콘." + wrapEnd;
            listHtml += `<div style="font-size:13px; color:var(--sub-text); font-weight:900; margin-bottom:12px; text-align:center;">[ 전체 선수 말구 횟수 ]</div>`;
        }
        
        statList.forEach((s, idx) => {
            let rankStr = `${idx + 1}위`;
            if (idx === 0 && s.count > 0) rankStr = (type === 'firstBreak') ? "1위🥇" : "1위💀";
            let valColor = (type === 'firstBreak') ? 'var(--rank1)' : 'var(--rankL)';
            
            let percentage = s.played > 0 ? Math.round((s.count / s.played) * 100) : 0;
            let countText = `${s.count}회(${percentage}%)`;

            listHtml += `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.4); padding:10px 15px; border-radius:10px; margin-bottom:6px; border:1px solid rgba(0,0,0,0.05); box-shadow: inset 1px 1px 3px rgba(255,255,255,0.7);">
                            <div style="font-size:14px; font-weight:800; color:var(--sub-text); width:45px; text-align:left;">${rankStr}</div>
                            <div style="font-size:15px; font-weight:900; color:${getPlayerColor(s.name)}; flex:1; text-align:center;">${s.name}</div>
                            <div style="font-size:15px; font-weight:900; color:${valColor}; width:auto; white-space:nowrap; text-align:right;">${countText}</div>
                         </div>`;
        });
        
        listHtml += `</div>`;
        desc += listHtml; 
    } else if (type === 'trend') {
        icon = "📈"; title = "최근 7게임 레코드";
        
        let playerStats = [];
        const filterEl = document.getElementById('statsFilterCount');
        const filterVal = filterEl ? filterEl.value : "all";
        const monthEl = document.getElementById('statsFilterMonth');
        const monthVal = monthEl ? monthEl.value : "";
        
        let filteredGames = gameLogs;
        if (monthVal) filteredGames = filteredGames.filter(g => g.dateStr.startsWith(monthVal));
        if (filterVal !== "all") {
            const count = parseInt(filterVal);
            filteredGames = filteredGames.filter(g => g.ranks.filter(n => n.trim() !== "").length === count);
        }

        let sortedGamesAsc = [...filteredGames].sort((a, b) => {
            const dateA = new Date(a.dateStr); const dateB = new Date(b.dateStr);
            if (dateA - dateB !== 0) return dateA - dateB;
            return (parseInt(a.round) || 0) - (parseInt(b.round) || 0);
        });

        players.forEach(p => {
            const pGames = sortedGamesAsc.filter(g => g.ranks.filter(n => n.trim() !== "").includes(p));
            if (pGames.length === 0) return;
            const recent7 = pGames.slice(-7);
            let scoreSum = 0; let wins = 0; let ranksList = [];
            recent7.forEach(g => {
                const actual = g.ranks.filter(n => n.trim() !== "");
                const rIdx = actual.indexOf(p);
                scoreSum += getEarnedScore(rIdx, actual.length);
                if (rIdx === 0) wins++;
                let rankStr = rIdx === 0 ? "1" : (rIdx === actual.length - 1 && actual.length > 1 ? "꼴" : (rIdx + 1).toString());
                ranksList.push(rankStr);
            });
            playerStats.push({ name: p, avgScore: scoreSum / recent7.length, winRate: wins / recent7.length, wins: wins, ranksList: ranksList });
        });

        playerStats.sort((a, b) => (b.avgScore - a.avgScore) || (b.winRate - a.winRate) || (b.wins - a.wins));

        let trendHtml = `<div style="font-size:12px; color:#555; margin-bottom:15px; text-align:center; font-weight:800;">(가장 오른쪽 사각형이 최근 게임 결과)</div>`;
        trendHtml += `<table class="trend-table">
            <thead>
                <tr>
                    <th style="width: 22%; text-align: center; color: #666;">이름</th>
                    <th style="width: 28%; text-align: center; color: #666;">평균 승점</th>
                    <th style="width: 50%; text-align: center; color: #666;">7게임 순위표</th>
                </tr>
            </thead><tbody>`;
            
        playerStats.forEach(stat => {
            let rankHtml = `<div style="display: flex; align-items: center; justify-content: center;">`;
            stat.ranksList.forEach((r, idx) => {
                if (idx === stat.ranksList.length - 1) {
                    if (r === '꼴') {
                        rankHtml += `<span class="recent-rank-box" style="margin-left: 3px; border-color: #8e44ad; background: rgba(142, 68, 173, 0.12); color: #8e44ad;">${r}</span>`;
                    } else {
                        rankHtml += `<span class="recent-rank-box" style="margin-left: 3px; border-color: #ff4757; background: rgba(255, 71, 87, 0.15); color: #ff4757;">${r}</span>`;
                    }
                } else {
                    rankHtml += `<span class="trend-rank-text" style="display: inline-block; width: 18px; text-align: center; color: #444;">${r}</span><span style="opacity: 0.5; font-weight: 900; margin: 0 1px; color: #444;">-</span>`;
                }
            });
            rankHtml += `</div>`;
            
            trendHtml += `<tr>
                <td style="color:${getPlayerColor(stat.name)}; text-align: center; font-weight: 900; font-size:16px;">${stat.name}</td>
                <td style="color:#ff4757; text-align: center; font-weight: 900; font-size:16px;">${stat.avgScore.toFixed(2)}</td>
                <td style="text-align: center; white-space: nowrap;">${rankHtml}</td>
            </tr>`;
        });
        trendHtml += `</tbody></table>`;
        desc = trendHtml;
        
    } else if (type === 'defense') {
        icon = "🛡️"; title = "철벽 방어 기준";
        desc = wrapStart + "추첨된 순번 상 <b>내 바로 다음 순서인 선수의 멘탈을 붕괴시켜 평균 순위를 가장 낮게(숫자가 높게) 만든</b> 디펜스 최고의 지배자." + wrapEnd;
    }

    const descEl = document.getElementById('info-modal-desc');
    const titleEl = document.getElementById('info-modal-title');
    
    document.getElementById('info-modal-icon').innerHTML = icon;
    titleEl.innerHTML = title;
    descEl.innerHTML = desc;

    const currentAppTheme = document.documentElement.getAttribute('data-theme');
    if (currentAppTheme === 'dark' || currentAppTheme === 'navy') {
        titleEl.style.setProperty('color', '#2980b9', 'important');
    } else {
        titleEl.style.removeProperty('color');
        titleEl.style.color = 'var(--rank1)';
    }

    document.getElementById('info-modal').style.display = 'flex';

    if (dashInfoCountdownInterval) clearInterval(dashInfoCountdownInterval);
    let timeLeft = 10;
    let timerEl = document.getElementById('dash-info-timer');
    if (!timerEl) {
        timerEl = document.createElement('div'); timerEl.id = 'dash-info-timer';
        timerEl.style.cssText = 'margin-top:15px; font-size:12px; color:var(--sub-text); font-weight:800; text-align:center;';
        descEl.parentNode.insertBefore(timerEl, descEl.nextSibling);
    }
    timerEl.innerText = `${timeLeft}초 후 자동으로 닫힙니다.`;
    dashInfoCountdownInterval = setInterval(() => {
        timeLeft--; timerEl.innerText = `${timeLeft}초 후 자동으로 닫힙니다.`;
        if (timeLeft <= 0) { clearInterval(dashInfoCountdownInterval); closeInfoModal(); }
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
            if (timeLeft <= 0) { clearInterval(infoModalCountdownInterval); closeInfoModal(); }
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
        icon = "📊"; title = "인원별 차등 승점 기준";
        desc = "<div style='white-space: nowrap; line-height: 1.5; text-align: left;'>• <b>2인</b>: 1위(+2), 꼴찌(0)<br>• <b>3인</b>: 1위(+3), 2위(+1), 꼴찌(0)<br>• <b>4인</b>: 1위(+4), 2위(+3), 3위(+2), 꼴찌(0)<br>• <b>5인</b>: 1위(+5), 2위(+4), 3위(+3), 4위(+1), 꼴찌(0)</div>";
    } else if (type === 'tier') {
        icon = "🏅"; title = "랭킹 티어(계급) 기준";
        desc = wrapStart + "👑<b>챌린저</b>: 60+ &nbsp;💎<b>플래티넘</b>: 50+<br>🥇<b>골드</b>: 40+ &nbsp;&nbsp;🥈<b>실버</b>: 30+ &nbsp;🥉<b>브론즈</b>: 30미만" + wrapEnd;
    } else if (type === 'condition') {
        icon = "🌡️"; title = "최근 컨디션 분석 기준";
        desc = wrapStart + "• ☀️<b>최상</b>: 1위 비율 30%↑<br>• ⛅<b>보통</b>: 1위 비율 30% 미만. 안정적인 보통 순위<br>• ⚡<b>도깨비</b>: 1위 30%↑ & 꼴찌 30%↑<br>• 🌧️<b>비상</b>: 꼴찌 비율 30%↑" + wrapEnd;
    } else if (type === 'style') { 
        icon = "🎱"; title = "당구 성향 분석 기준";
        desc = wrapStart + "<b>[승률 35% & 생존율 80% 기준]</b><br><br>• 👑 <b>전략적 지배자</b>: 승률↑ & 생존율↑<br>• 🐅 <b>폭격형 호랑이</b>: 승률↑ & 생존율↓<br>• 🐢 <b>철벽 거북이</b>: 승률↓ & 생존율↑<br>• 🐣 <b>성장하는 꿈나무</b>: 승률↓ & 생존율↓" + wrapEnd;
    }
    
    const descEl = document.getElementById('info-modal-desc');
    const timerEl = document.getElementById('info-modal-timer');
    if(timerEl) timerEl.style.display = 'none'; 

    if (infoModalCountdownInterval) { clearInterval(infoModalCountdownInterval); infoModalCountdownInterval = null; }

    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'navy') { descEl.style.color = '#5D4037'; } else { descEl.style.color = ''; }

    const popupBox = document.getElementById('info-modal-title').parentElement;
    if (popupBox) { if (document.body.classList.contains('zoom-active')) { popupBox.style.zoom = '0.85'; } else { popupBox.style.zoom = '1'; } }
    
    document.getElementById('info-modal-icon').innerHTML = icon;
    document.getElementById('info-modal-title').innerHTML = title;
    descEl.innerHTML = desc;
    document.getElementById('info-modal').style.display = 'flex';
}

function closeInfoModal() { 
    document.getElementById('info-modal').style.display = 'none'; 
    if (infoModalCountdownInterval) { clearInterval(infoModalCountdownInterval); infoModalCountdownInterval = null; }
    if (dashInfoCountdownInterval) { clearInterval(dashInfoCountdownInterval); dashInfoCountdownInterval = null; }
    const timerEl = document.getElementById('dash-info-timer');
    if (timerEl) timerEl.remove();
}

function showLastGameResult() {
    if (!gameLogs || gameLogs.length === 0) { 
        if (document.getElementById('loading').style.display === 'none') return;
        setTimeout(showLastGameResult, 500); return; 
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
    
    content.innerHTML = html; modal.style.display = 'flex'; 
    content.style.animation = 'scaleUpPopup 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
    
    setTimeout(() => { 
        if(modal.style.display !== 'none') { 
            content.style.animation = 'scaleDownPopup 0.4s ease-in forwards'; 
            setTimeout(() => { modal.style.display = 'none'; }, 400); 
        } 
    }, 3000);
}

function focusOnDrawCard() { setTimeout(() => { const el = document.getElementById('drawCardArea'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 150); }

function togglePlayerSelection(el, name) {
    triggerHaptic(15); 
    if (selectedPlayersForLottery.includes(name)) { 
        selectedPlayersForLottery = selectedPlayersForLottery.filter(p => p !== name); 
        el.classList.remove('active'); 
    } else {
        const limit = parseInt(document.getElementById('playerCount').value);
        if (selectedPlayersForLottery.length >= limit) { alert(`게임 가능 인원 ${limit}명. 초과 불가`); return; }
        selectedPlayersForLottery.push(name); el.classList.add('active');
    }
    if(!editMode) updateInputFields();
}

function resetPlayerSelection() { 
    selectedPlayersForLottery = []; currentStartOrder = []; 
    document.querySelectorAll('.player-chip').forEach(el => el.classList.remove('active')); 
    if(!editMode) updateInputFields(); 
    const saveBtn = document.getElementById('mainBtn');
    if (saveBtn) saveBtn.classList.remove('flash-save-active');
}
function pickRandomOrder() {
    triggerHaptic([20, 30, 20]); 
    const realTodayStr = formatDate(new Date()); 
    if (selectedDateStr > realTodayStr) return alert("미래에서 온거야? 날짜를 잘 확인혀!"); 
    const limit = parseInt(document.getElementById('playerCount').value);
    if (selectedPlayersForLottery.length !== limit) return alert(`게임 참여 ${limit}명을 선택해!(현재 ${selectedPlayersForLottery.length}명)`);
    
    const todayGames = gameLogs.filter(g => g.dateStr === selectedDateStr && g.startOrder && g.startOrder.length > 0);
    
    let lastFirstPlayer = null;
    if (todayGames.length > 0) {
        const sortedTodayGames = [...todayGames].sort((a, b) => parseInt(a.round) - parseInt(b.round));
        const lastGame = sortedTodayGames[sortedTodayGames.length - 1];
        lastFirstPlayer = lastGame.startOrder[0];
    }

    let bestOrder = [];
    let minPenalty = Infinity;
    const MAX_ATTEMPTS = 100;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        let candidate = [...selectedPlayersForLottery];
        for (let i = candidate.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidate[i], candidate[j]] = [candidate[j], candidate[i]];
        }

        let penalty = 0;
        
        if (lastFirstPlayer && candidate[0] === lastFirstPlayer) {
            penalty += 1000;
        }

        for (let g of todayGames) {
            const prevOrder = g.startOrder;
            for (let i = 0; i < candidate.length; i++) {
                const currentP = candidate[i];
                const nextP = candidate[(i + 1) % candidate.length]; 

                for (let j = 0; j < prevOrder.length; j++) {
                    if (prevOrder[j] === currentP && prevOrder[(j + 1) % prevOrder.length] === nextP) {
                        penalty++; 
                    }
                }
            }
        }

        if (penalty < minPenalty) {
            minPenalty = penalty;
            bestOrder = [...candidate];
        }

        if (penalty === 0) break;
    }
    
    lastDrawnPlayers = [...bestOrder]; 
    currentStartOrder = [...lastDrawnPlayers];
    
    const firstPlayer = bestOrder[0];
    const remaining = bestOrder.slice(1);
    
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
                slotName.innerText = p; slotName.style.color = getPlayerColor(p); counter++; 
                setTimeout(runSlot, 50 + Math.pow(elapsed / 3000, 3) * 400); 
            } else { finishAnimation(); }
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
            const gauge = document.getElementById('billiardGauge'); const ball = document.getElementById('billiardBall'); 
            if(gauge && ball) { gauge.style.width = '100%'; ball.style.left = '100%'; ball.style.transform = 'translateX(-50%) rotate(1080deg)'; } 
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
    if (lastDrawnPlayers && lastDrawnPlayers.length > 0) { showPlayersGraph(lastDrawnPlayers); lastDrawnPlayers = []; } 
}

function showPlayersGraph(players) {
    const container = document.getElementById('graph-container'); const legendArea = document.getElementById('graph-legend');
    let legendHtml = ""; 
    let svg = `<svg width="100%" height="100%" viewBox="-15 -10 130 120" preserveAspectRatio="none" style="overflow: visible; font-family: inherit;"><defs>`;
    players.forEach((p, i) => {
        const c = getGraphColor(p);
        svg += `<linearGradient id="grad-${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${c}" stop-opacity="0.4"/><stop offset="100%" stop-color="${c}" stop-opacity="0.0"/></linearGradient>`;
    });
    svg += `</defs>`;
    const yLabels = ["1위", "2위", "3위", "4위", "꼴찌"];
    for(let i=0; i<=4; i++) { 
        let y = i * 25; 
        svg += `<line x1="0" y1="${y}" x2="100" y2="${y}" stroke="rgba(150,150,150,0.25)" stroke-width="1" stroke-dasharray="3,3" /><text x="-4" y="${y + 3}" font-size="7" font-weight="900" fill="var(--sub-text)" text-anchor="end">${yLabels[i]}</text>`; 
    }
    players.forEach((playerName, playerIndex) => {
        const pColor = getGraphColor(playerName); 
        legendHtml += `<div style="display:flex; align-items:center; gap:4px;"><span style="display:inline-block; width:10px; height:3px; background-color:${pColor}; border-radius:2px;"></span><span style="color:var(--text-color);">${playerName}</span></div>`;
        const allPersonalGames = gameLogs.filter(g => g.ranks.includes(playerName)).sort((a, b) => (new Date(b.dateStr) - new Date(a.dateStr)) || ((parseInt(b.round) || 0) - (parseInt(a.round) || 0)));
        if (allPersonalGames.length === 0) return; 
        const recent10Games = allPersonalGames.slice(0, 10).reverse();
        let points = []; let stepX = recent10Games.length > 1 ? 100 / (recent10Games.length - 1) : 50;
        recent10Games.forEach((g, i) => { 
            const actual = g.ranks.filter(n => n.trim() !== ""); const rIdx = actual.indexOf(playerName); 
            let isLast = (rIdx === actual.length - 1 && actual.length > 1); let yRank = isLast ? 5 : (rIdx + 1); 
            points.push({x: recent10Games.length === 1 ? 50 : i * stepX, y: (yRank - 1) * 25}); 
        });
        if (points.length > 0) {
            let pathD = `M ${points[0].x} ${points[0].y}`; 
            for(let i=0; i<points.length - 1; i++) { pathD += ` C ${points[i].x + (points[i+1].x - points[i].x) / 2} ${points[i].y}, ${points[i].x + (points[i+1].x - points[i].x) / 2} ${points[i+1].y}, ${points[i+1].x} ${points[i+1].y}`; }
            let fillPathD = pathD + ` L ${points[points.length - 1].x} 100 L ${points[0].x} 100 Z`;
            svg += `<path d="${fillPathD}" fill="url(#grad-${playerIndex})" />`;
            svg += `<path d="${pathD}" fill="none" stroke="${pColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.85" />`;
            points.forEach((p) => { svg += `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="${pColor}" stroke="var(--card-bg)" stroke-width="1.5" />`; });
        }
    });
    container.innerHTML = svg + `</svg>`; legendArea.innerHTML = legendHtml; 
    document.getElementById('graph-modal').style.display = 'flex';
    let timeLeft = 10;
    const countdownEl = document.getElementById('graph-countdown-text');
    if (countdownEl) countdownEl.innerText = `${timeLeft}초 후 자동으로 닫힙니다.`;
    if (graphCountdownInterval) clearInterval(graphCountdownInterval);
    graphCountdownInterval = setInterval(() => {
        timeLeft--;
        if (countdownEl) countdownEl.innerText = `${timeLeft}초 후 자동으로 닫힙니다.`;
        if (timeLeft <= 0) { clearInterval(graphCountdownInterval); closeGraphModal(); }
    }, 1000);
}

function closeGraphModal() { 
    document.getElementById('graph-modal').style.display = 'none'; 
    if (graphCountdownInterval) { clearInterval(graphCountdownInterval); graphCountdownInterval = null; } 
    const countdownEl = document.getElementById('graph-countdown-text');
    if (countdownEl) countdownEl.innerText = "10초 후 자동으로 닫힙니다.";
    const saveBtn = document.getElementById('mainBtn');
    if (saveBtn) { saveBtn.classList.add('flash-save-active'); }
}

function closePlayerScoreModal() {
    const modal = document.getElementById('player-score-modal'); 
    const content = document.getElementById('player-score-content');
    if (scoreModalTimeout) clearTimeout(scoreModalTimeout); 
    if (hideScoreModalTimeout) clearTimeout(hideScoreModalTimeout);
    if (scoreCountdownInterval) { clearInterval(scoreCountdownInterval); scoreCountdownInterval = null; } 
    if(!modal || !content) return; 
    content.style.animation = 'scaleDownPopup 0.3s ease-in forwards'; 
    hideScoreModalTimeout = setTimeout(() => { modal.style.display = 'none'; content.style.animation = 'none'; }, 300); 
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
    } catch (e) { console.error("Fetch error", e); } finally { 
        showLoading(false); 
        document.getElementById('selectedDateTitle').innerText = `📅 ${selectedDateStr}`; 
    }
}

function renderAll() { 
    renderDashboard(); renderCalendar(); renderStats(); renderScoreRank(); renderDefenseStats(); renderGameList(); analyzeStrategy(); analyzeOrderStats(); renderLastPlaceRecord();
}

function isHoliday(year, month, day) {
    const dStr = `${month + 1}-${day}`; 
    const fixed = ["1-1", "3-1", "5-1", "5-5", "6-6", "7-17", "8-15", "10-3", "10-9", "12-25"];
    const variable2026 = ["2-16", "2-17", "2-18", "2-19", "3-2", "5-24", "5-25", "6-3", "8-17", "9-24", "9-25", "9-26", "10-5"];
    return fixed.includes(dStr) || (year === 2026 && variable2026.includes(dStr));
}

function renderCalendar() {
    const grid = document.getElementById('calendarGrid'); grid.innerHTML = "";
    const year = currentViewDate.getFullYear(); const month = currentViewDate.getMonth();
    const realTodayStr = formatDate(new Date());
    document.getElementById('monthDisplay').innerText = `${year}.${String(month + 1).padStart(2, '0')}`;
    const daysLabel = ["일","월","화","수","목","금","토"];
    daysLabel.forEach((d, idx) => {
        let color = "var(--sub-text)"; if(idx === 0) color = "#ff7675"; if(idx === 6) color = "#74b9ff"; 
        grid.innerHTML += `<div class="weekday" style="color:${color}; font-size: 11px; font-weight: 700; opacity: 0.6; padding-bottom: 15px;">${d}</div>`;
    });
    const firstDay = new Date(year, month, 1).getDay(); const lastDate = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) { grid.innerHTML += `<div></div>`; }
    for (let d = 1; d <= lastDate; d++) {
        const dStr = formatDate(new Date(year, month, d)); const dayOfWeek = new Date(year, month, d).getDay();
        const hasRecord = gameLogs.some(g => g.dateStr === dStr);
        let dayClass = "day-new";
        if (dStr === selectedDateStr) dayClass += " selected-new";
        if (dStr === realTodayStr) dayClass += " today-new";
        if (dayOfWeek === 0 || isHoliday(year, month, d)) dayClass += " sun-new";
        if (dayOfWeek === 6) dayClass += " sat-new";
        const recordDot = hasRecord ? `<div class="record-dot"></div>` : "";
        grid.innerHTML += `<div class="${dayClass}" onclick="selectDate('${dStr}')"><span class="day-num">${d}</span>${recordDot}</div>`;
    }
    const timelineWrap = document.getElementById('monthRecordTimeline');
    if (timelineWrap) {
        timelineWrap.innerHTML = ""; const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
        const monthGames = gameLogs.filter(g => g.dateStr.startsWith(currentMonthPrefix));
        const uniqueDates = [...new Set(monthGames.map(g => g.dateStr))].sort();
        if (uniqueDates.length > 0) {
            timelineWrap.style.display = 'flex'; let timelineHtml = '';
            uniqueDates.forEach(dStr => {
                const dayNum = parseInt(dStr.split('-')[2], 10); 
                const isActive = (dStr === selectedDateStr) ? ' active' : '';
                timelineHtml += `<div class="timeline-item${isActive}" onclick="selectDate('${dStr}')"><div class="timeline-date">${dayNum}</div><div class="timeline-dot"></div></div>`;
            });
            timelineWrap.innerHTML = timelineHtml;
        } else { timelineWrap.style.display = 'none'; }
    }
}

function selectDate(dateStr) {
    triggerHaptic(10); if(editMode) cancelEdit();
    selectedDateStr = dateStr; document.getElementById('selectedDateTitle').innerText = `📅 ${dateStr}`;
    renderCalendar(); renderGameList();
    const hasRecord = gameLogs.some(g => g.dateStr === dateStr);
    if (hasRecord) {
        setTimeout(() => {
            const recordTarget = document.getElementById('record-header-wrap');
            if (recordTarget) recordTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    } else {
        showToastMsg("기록 없음");
    }
}

function checkDuplicates() { 
    const selects = Array.from(document.querySelectorAll('#inputArea select')); 
    const values = selects.map(s => s.value); 
    selects.forEach(s => s.classList.remove('duplicate-error')); 
    values.forEach((v, i) => { if(v && values.filter(x => x === v).length > 1) selects[i].classList.add('duplicate-error'); }); 
}

function updateInputFields(preFill = null) {
    if(preFill) document.getElementById('playerCount').value = preFill.length;
    const count = parseInt(document.getElementById('playerCount').value); 
    const inputArea = document.getElementById('inputArea'); inputArea.innerHTML = ""; 
    let targetPlayers = (preFill) ? preFill.filter(n => n.trim() !== "") : (selectedPlayersForLottery.length === count ? selectedPlayersForLottery : players);
    let html = ''; 
    for(let i=1; i<=count; i++) { 
        const label = i === count ? "꼴찌💀" : (i === 1 ? "1위🥇" : `${i}위`); 
        html += `<div class="input-row"><label>${label}</label><select id="rank${i}" onchange="checkDuplicates()"><option value="">선택</option>${targetPlayers.map(p => `<option value="${p}" ${preFill && preFill[i-1] === p ? 'selected' : ''}>${p}</option>`).join('')}</select></div>`; 
    }
    inputArea.innerHTML = html; 
    if(!preFill && !editMode && selectedPlayersForLottery.length === 0) { document.querySelectorAll('.player-chip').forEach(el => el.classList.remove('active')); }
}

function resetInputs() { 
    if(editMode) cancelEdit(); 
    else { document.getElementById('playerCount').value = "3"; resetPlayerSelection(); updateInputFields(); } 
    const saveBtn = document.getElementById('mainBtn');
    if (saveBtn) saveBtn.classList.remove('flash-save-active');
}

async function saveGame() {
    triggerHaptic(20); const saveBtn = document.getElementById('mainBtn');
    if (saveBtn) saveBtn.classList.remove('flash-save-active');
    const today = formatDate(new Date()); if (selectedDateStr > today) return alert("미래에서 온거야? 날짜를 잘 확인혀!"); 
    const count = parseInt(document.getElementById('playerCount').value); const ranks = [];
    for(let i=1; i<=count; i++) { 
        const val = document.getElementById('rank'+i).value; 
        if(!val) return alert("참여 친구의 순위를 모두 선택해줘!"); ranks.push(val); 
    }
    if(new Set(ranks).size !== ranks.length) return alert("누가 쌍둥인겨? 잘 선택혀!(중복)");
    
    triggerSuccessFlash();
    playSystemSound('success');

    showLoading(true, "저장 중");
    const payload = { action: "SAVE", date: selectedDateStr, ranks: [ranks[0]||"", ranks[1]||"", ranks[2]||"", ranks[3]||"", ranks[4]||""], round: editRound, startOrder: currentStartOrder.length > 0 ? currentStartOrder : null };
    if(editMode) payload.action = "UPDATE";
    try { 
        await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) }); 
        cancelEdit(); currentStartOrder = []; document.getElementById('playerCount').value = "3"; resetPlayerSelection(); updateInputFields(); await fetchData(); 
    } catch (e) { alert("오류 발생!"); showLoading(false); }
}
function calculateLuckyGuy(filteredGames) {
    if (filteredGames.length === 0) return "-";
    
    let stats = {};
    players.forEach(p => stats[p] = { played: 0, score: 0, rankSum: 0 });
    
    filteredGames.forEach(g => {
        const actual = g.ranks.filter(n => n.trim() !== "");
        actual.forEach((p, idx) => {
            if (stats[p]) {
                stats[p].played++;
                stats[p].score += getEarnedScore(idx, actual.length);
                stats[p].rankSum += (idx + 1);
            }
        });
    });
    
    let candidates = players.filter(p => stats[p].played > 0);
    if (candidates.length === 0) return "-";
    
    const luckyWinner = candidates.reduce((a, b) => {
        const luckA = (stats[a].score / stats[a].played) * (stats[a].rankSum / stats[a].played);
        const luckB = (stats[b].score / stats[b].played) * (stats[b].rankSum / stats[b].played);
        return luckA > luckB ? a : b;
    });
    
    return luckyWinner;
}

function renderLiveTimeline(filteredGames) {
    const container = document.getElementById('dashTimeline');
    if (!container) return;
    
    const recentGames = [...filteredGames].sort((a, b) => (new Date(b.dateStr) - new Date(a.dateStr)) || (parseInt(b.round) - parseInt(a.round))).slice(0, 10);
    
    if (recentGames.length === 0) {
        container.innerHTML = `<div style="font-size: 11px; color: #999; text-align: center; padding: 10px;">데이터가 없습니다.</div>`;
        return;
    }

    const currentTheme = document.documentElement.getAttribute('data-theme');
    const isDarkMode = currentTheme === 'dark' || currentTheme === 'navy';
    const subTextColor = isDarkMode ? "#3e2723" : "#888"; 
    const vsTextColor = isDarkMode ? "#3e2723" : "#999"; 
    
    let html = "";
    recentGames.forEach(g => {
        const actual = g.ranks.filter(n => n.trim() !== "");
        const winner = actual[0];
        const loser = actual[actual.length - 1];
        
        let tag = "⚔️ 치열한 승부";
        let color = "var(--sub-text)";
        
        if (actual.length >= 3) {
            if (g.startOrder && g.startOrder[0] === winner) {
                tag = "🔥 압도적 선공승"; color = "var(--rank1)";
            } else if (g.startOrder && g.startOrder[g.startOrder.length - 1] === winner) {
                tag = "⚡ 짜릿한 역전승"; color = "var(--accent)";
            }
        }

        const sameDateGames = gameLogs.filter(x => x.dateStr === g.dateStr);
        const gameNumber = sameDateGames.findIndex(x => x.round === g.round) + 1;
        
        let winnerOrderText = "";
        let loserOrderText = "";
        if (g.startOrder && g.startOrder.length > 0) {
            const wIdx = g.startOrder.indexOf(winner);
            const lIdx = g.startOrder.indexOf(loser);
            if (wIdx !== -1) winnerOrderText = `<span style="font-size:10px; font-weight:800; color:${subTextColor};">(${wIdx + 1}번째 순서)</span>`;
            if (lIdx !== -1) loserOrderText = `<span style="font-size:10px; font-weight:800; color:${subTextColor};">(${lIdx + 1}번째 순서)</span>`;
        }
        
        html += `<div style="display: flex; flex-direction: column; background: rgba(255,255,255,0.5); padding: 10px 12px; border-radius: 10px; font-size: 13px; border-left: 4px solid ${color};">
                    <div style="font-weight: 800; color: #555; text-align: left; margin-bottom: 6px;">
                        ${g.dateStr.slice(5)} <span style="color:var(--rank1); margin-left:4px;">${gameNumber}G</span> <span style="color:${color}; margin-left:4px;">[${tag}]</span>
                    </div>
                    <div style="font-weight: 900; color:var(--text-color); text-align: right;">
                        ${winner}🥇${winnerOrderText} <span style="font-size:11px; color:${vsTextColor}; font-weight:800; margin:0 5px;">vs</span> ${loser}💀${loserOrderText}
                    </div>
                 </div>`;
    });
    
    container.innerHTML = html;
    const countEl = document.getElementById('timeline-count');
    if (countEl) countEl.innerText = `(최근 ${recentGames.length}G 분석. 터치)`;
}

function renderDashboard() {
    const dCard = document.getElementById('dashboardCard'); if (!dCard) return;
    const filterVal = document.getElementById('statsFilterCount')?.value || "all";
    const monthVal = document.getElementById('statsFilterMonth')?.value || "";
    let countText = filterVal === "all" ? "전체" : filterVal + "인";
    let monthText = monthVal || "전체 기간";
    const monthLabel = document.getElementById('dashMonthLabel'); if (monthLabel) monthLabel.innerText = `(${monthText}, ${countText})`;

    let filtered = gameLogs;
    if (monthVal) filtered = filtered.filter(g => g.dateStr.startsWith(monthVal));
    if (filterVal !== "all") {
        const count = parseInt(filterVal);
        filtered = filtered.filter(g => g.ranks.filter(n => n.trim() !== "").length === count);
    }
    dCard.style.display = 'block';
    
    const luckyEl = document.getElementById('dashLuckyGuy');
    if (luckyEl) luckyEl.innerText = calculateLuckyGuy(filtered);
    renderLiveTimeline(filtered);

    if (filtered.length === 0) {
        ['dashTotalGames', 'dashTotalDays', 'dashMVP', 'dashVillain', 'dashFirstBreak', 'dashLastTurn', 'dashTrendPlayer', 'dashTrendScore', 'dashDefense'].forEach(id => {
            const el = document.getElementById(id); if (el) el.innerText = id.includes('Total') ? (id.includes('Games') ? '0G' : '0일') : '-';
        }); return;
    }
    let pStats = {}; players.forEach(p => pStats[p] = { played: 0, wins: 0, lasts: 0, score: 0, totalRank: 0 });
    let datesSet = new Set();
    filtered.forEach(g => {
        datesSet.add(g.dateStr); const actual = g.ranks.filter(n => n.trim() !== "");
        actual.forEach((p, idx) => {
            if (pStats[p]) {
                pStats[p].played++; pStats[p].score += getEarnedScore(idx, actual.length); pStats[p].totalRank += (idx + 1);
                if (idx === 0) pStats[p].wins++; if (idx === actual.length - 1 && actual.length > 1) pStats[p].lasts++;
            }
        });
    });
    document.getElementById('dashTotalGames').innerText = `${filtered.length}G`;
    document.getElementById('dashTotalDays').innerText = `${datesSet.size}일`;
    let activePlayers = players.filter(p => pStats[p].played > 0);
    if (activePlayers.length > 0) {
        const mvp = activePlayers.reduce((a, b) => {
            const avgA = pStats[a].score / pStats[a].played; const avgB = pStats[b].score / pStats[b].played;
            return avgA !== avgB ? (avgA > avgB ? a : b) : ((pStats[a].wins / pStats[a].played) > (pStats[b].wins / pStats[b].played) ? a : b);
        });
        const villain = activePlayers.reduce((a, b) => {
            const lrA = pStats[a].lasts / pStats[a].played; const lrB = pStats[b].lasts / pStats[b].played;
            return lrA !== lrB ? (lrA > lrB ? a : b) : (pStats[a].lasts > pStats[b].lasts ? a : b);
        });
        document.getElementById('dashMVP').innerText = mvp; document.getElementById('dashVillain').innerText = villain;
    }
    let trendPlayer = "-", trendScore = "-";
    if (activePlayers.length > 0) {
        let sortedGamesAsc = [...filtered].sort((a, b) => (new Date(a.dateStr) - new Date(b.dateStr)) || (parseInt(a.round) - parseInt(b.round)));
        let topP = "-", maxAvg = -Infinity;
        activePlayers.forEach(p => {
            const pGames = sortedGamesAsc.filter(g => g.ranks.includes(p)); if (pGames.length === 0) return;
            const recent7 = pGames.slice(-7); let sSum = 0;
            recent7.forEach(g => { const act = g.ranks.filter(n => n.trim() !== ""); sSum += getEarnedScore(act.indexOf(p), act.length); });
            const avg = sSum / recent7.length; if (avg > maxAvg) { maxAvg = avg; topP = p; }
        });
        if (topP !== "-") { trendPlayer = topP; trendScore = maxAvg.toFixed(2); }
    }
    document.getElementById('dashTrendPlayer').innerText = trendPlayer; document.getElementById('dashTrendScore').innerText = trendScore !== "-" ? trendScore + "점" : "-";
    let defStats = {}; players.forEach(p => defStats[p] = { count: 0, totalNextRank: 0 });
    filtered.forEach(g => {
        if (g.startOrder?.length > 0) {
            const actual = g.ranks.filter(n => n.trim() !== "");
            for (let i = 0; i < g.startOrder.length; i++) {
                const nextP = g.startOrder[(i + 1) % g.startOrder.length]; const nextIdx = actual.indexOf(nextP);
                if (nextIdx !== -1 && defStats[g.startOrder[i]]) { defStats[g.startOrder[i]].count++; defStats[g.startOrder[i]].totalNextRank += (nextIdx + 1); }
            }
        }
    });
    let defCandidate = "-", maxDefAvg = -1;
    activePlayers.forEach(p => {
        if (defStats[p]?.count > 0) {
            const avg = defStats[p].totalNextRank / defStats[p].count; if (avg > maxDefAvg) { maxDefAvg = avg; defCandidate = p; }
        }
    });
    document.getElementById('dashDefense').innerText = defCandidate !== "-" ? `${defCandidate} (${maxDefAvg.toFixed(1)}위)` : "-";
    let startOrderStats = {};
    players.forEach(p => startOrderStats[p] = { first: 0, last: 0, played: 0 });
    
    filtered.forEach(g => {
        const actual = g.ranks.filter(n => n.trim() !== "");
        actual.forEach(p => { if (startOrderStats[p]) startOrderStats[p].played++; });
        if (g.startOrder && g.startOrder.length > 0) {
            const firstP = g.startOrder[0];
            const lastP = g.startOrder[g.startOrder.length - 1];
            if (startOrderStats[firstP]) startOrderStats[firstP].first++;
            if (startOrderStats[lastP] && g.startOrder.length > 1) startOrderStats[lastP].last++;
        }
    });
    
    let maxFirst = 0, maxLast = 0;
    let bestFirst = "-", bestLast = "-";
    
    activePlayers.forEach(p => {
        if (startOrderStats[p].first > maxFirst) { maxFirst = startOrderStats[p].first; bestFirst = p; }
        else if (startOrderStats[p].first === maxFirst && maxFirst > 0) {
            if (startOrderStats[p].played > startOrderStats[bestFirst].played) bestFirst = p;
        }
        
        if (startOrderStats[p].last > maxLast) { maxLast = startOrderStats[p].last; bestLast = p; }
        else if (startOrderStats[p].last === maxLast && maxLast > 0) {
            if (startOrderStats[p].played > startOrderStats[bestLast].played) bestLast = p;
        }
    });

    document.getElementById('dashFirstBreak').innerText = bestFirst !== "-" ? `${bestFirst} (${maxFirst}회)` : "-";
    document.getElementById('dashLastTurn').innerText = bestLast !== "-" ? `${bestLast} (${maxLast}회)` : "-";
}

function onFilterChange() { renderDashboard(); renderStats(); renderScoreRank(); renderDefenseStats(); closeMemberHistory(); analyzeOrderStats(); }
function toggleAllMode() { isPercentMode = !isPercentMode; renderStats(); }

function renderScoreRank() {
    const filterVal = document.getElementById('statsFilterCount')?.value || "all";
    const monthVal = document.getElementById('statsFilterMonth')?.value || "";
    const labelEl = document.getElementById('scoreRankFilterLabel');
    if (labelEl) labelEl.innerText = `(${monthVal || "전체"}, ${filterVal === "all" ? "전체" : filterVal + "인"})`;

    let stats = {}; players.forEach(p => stats[p] = { played: 0, score: 0, wins: 0 });
    gameLogs.forEach(g => {
        if (monthVal && !g.dateStr.startsWith(monthVal)) return;
        const actual = g.ranks.filter(n => n.trim() !== "");
        if (filterVal !== "all" && actual.length !== parseInt(filterVal)) return;
        actual.forEach((name, idx) => { if(stats[name]) { stats[name].played++; stats[name].score += getEarnedScore(idx, actual.length); if (idx === 0) stats[name].wins++; } });
    });
    const active = players.filter(p => stats[p].played > 0).sort((a, b) => (stats[b].score/stats[b].played) - (stats[a].score/stats[a].played) || stats[b].wins - stats[a].wins);
    const tbody = document.getElementById('scoreRankBody'); if (!tbody) return;
    if (active.length === 0) { tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--sub-text);">데이터 없음</td></tr>`; return; }
    const maxAvg = stats[active[0]].score / stats[active[0]].played;
    let html = '', cRank = 1;
    active.forEach((p, i) => {
        const avg = stats[p].score / stats[p].played;
        if (i > 0 && avg !== (stats[active[i-1]].score / stats[active[i-1]].played)) cRank = i + 1;
        let diff = avg - maxAvg;
        html += `<tr onclick="renderMemberHistory('${p}', '${cRank}')" style="cursor:pointer;"><td style="font-weight:900;">${cRank === 1 ? '1위🥇' : cRank + '위'}</td><td style="color:${getPlayerColor(p)}; font-weight:900; text-decoration:underline;">${p}</td><td>${stats[p].played}전</td><td style="color:var(--rank1);">${stats[p].score}점</td><td style="color:var(--accent);">${avg.toFixed(2)}점</td><td style="color:var(--rankL);">${diff === 0 ? "-" : diff.toFixed(2)}</td></tr>`;
    });
    tbody.innerHTML = html;
}

function renderStats() {
    const subtitleEl = document.querySelector('.stats-subtitle');
    if (subtitleEl) { subtitleEl.innerText = isPercentMode ? "(평균 승점 기준. 확률 %)" : "(평균 승점 기준. 횟수)"; }

    const filterVal = document.getElementById('statsFilterCount')?.value || "all";
    const monthVal = document.getElementById('statsFilterMonth')?.value || "";
    let stats = {}; players.forEach(p => stats[p] = { played: 0, ranks: [0,0,0,0,0], score: 0 });
    
    gameLogs.forEach(g => {
        if (monthVal && !g.dateStr.startsWith(monthVal)) return;
        const act = g.ranks.filter(n => n.trim() !== "");
        if (filterVal !== "all" && act.length !== parseInt(filterVal)) return;
        act.forEach((name, idx) => { 
            if(stats[name]) { 
                stats[name].played++; stats[name].score += getEarnedScore(idx, act.length); 
                if (idx === act.length - 1 && act.length > 1) stats[name].ranks[4]++; 
                else if (idx < 4) stats[name].ranks[idx]++; 
            } 
        });
    });
    
    const sorted = [...players].sort((a,b) => (stats[b].score/stats[b].played || 0) - (stats[a].score/stats[a].played || 0));
    const maxC = { r0: 0, r4: 0 }; 
    players.forEach(p => { maxC.r0 = Math.max(maxC.r0, stats[p].ranks[0]); maxC.r4 = Math.max(maxC.r4, stats[p].ranks[4]); });
    
    let cRank = 1;
    document.getElementById('statsBody').innerHTML = sorted.map((p, i) => {
        if (i > 0 && (stats[p].score/stats[p].played !== stats[sorted[i-1]].score/stats[sorted[i-1]].played)) cRank = i + 1;
        const winRate = stats[p].played > 0 ? ((stats[p].ranks[0] / stats[p].played) * 100).toFixed(1) : "0.0";
        const getVal = (v, t) => isPercentMode ? (t === 0 ? '0' : ((v/t)*100).toFixed(0)) : v;
        
        return `<tr><td style="color:${getPlayerColor(p)}; font-weight:900; text-decoration:underline; cursor:pointer;" onclick="renderMemberHistory('${p}', '${cRank}')">${getTier(stats[p].score).icon} ${p}</td><td>${stats[p].played}</td><td style="color:var(--rank1);">${getVal(stats[p].ranks[0], stats[p].played)}</td><td style="color:var(--rank2);">${getVal(stats[p].ranks[1], stats[p].played)}</td><td style="color:var(--rank3);">${getVal(stats[p].ranks[2], stats[p].played)}</td><td style="color:var(--rank4);">${getVal(stats[p].ranks[3], stats[p].played)}</td><td style="color:var(--rankL);">${getVal(stats[p].ranks[4], stats[p].played)}</td><td><span class="win-rate-pill">${winRate}%</span></td></tr>`;
    }).join('');
    
    const rich = document.getElementById('richFriendArea'); 
    if(maxC.r4 > 0) { 
        const losers = players.filter(p => stats[p].ranks[4] === maxC.r4); 
        rich.style.display = 'block'; rich.innerHTML = `💸 야! 또 나냐? 다들 카드까봐!<br><span style="font-size:16px; color:var(--rankL); font-weight:900;">${losers.join(', ')}</span>`; 
    } else { rich.style.display = 'none'; }
}

function showDefenseDetail(playerName) {
    const filterVal = document.getElementById('statsFilterCount')?.value || "all";
    const monthVal = document.getElementById('statsFilterMonth')?.value || "";
    let victimStats = {}; 

    gameLogs.forEach(g => {
        if (monthVal && !g.dateStr.startsWith(monthVal)) return;
        if (g.startOrder && g.startOrder.includes(playerName)) {
            const actual = g.ranks.filter(n => n && n.trim() !== "");
            if (filterVal !== "all" && actual.length !== parseInt(filterVal)) return;
            const order = g.startOrder;
            const pIdx = order.indexOf(playerName);
            const victimName = order[(pIdx + 1) % order.length]; 
            const vRankIdx = actual.indexOf(victimName);
            if (vRankIdx !== -1) {
                if (!victimStats[victimName]) victimStats[victimName] = { games: 0, totalRank: 0, wins: 0, lasts: 0 };
                victimStats[victimName].games++;
                victimStats[victimName].totalRank += (vRankIdx + 1);
                if (vRankIdx === 0) victimStats[victimName].wins++;
                if (vRankIdx === actual.length - 1 && actual.length > 1) victimStats[victimName].lasts++;
            }
        }
    });

    const victims = Object.keys(victimStats).sort((a, b) => (victimStats[b].totalRank / victimStats[b].games) - (victimStats[a].totalRank / victimStats[a].games));
    let filterText = filterVal === "all" ? "" : `<span style="color:var(--accent); font-size:11px;">(${filterVal}인 게임 기준)</span>`;
    let monthText = monthVal ? `<span style="color:var(--rank1); font-size:11px;">(${monthVal}월 기준)</span>` : "";

    let html = `<div id="defense-modal-capture-area" style="padding: 10px; border-radius: 15px; background: transparent; display: block;">
                <div style="font-size:40px; margin-bottom:10px; display:block; text-align:center;">🛡️</div>
                <div style="font-size:19px; font-weight:900; color:var(--text-color); margin-bottom:5px; line-height:1.4; display:block; text-align:center;">${playerName}의 방어 리포트</div>
                <div style="font-size:13px; font-weight:800; color:var(--sub-text); margin-bottom: 20px; line-height:1.4; display:block; text-align:center;">(내 바로 뒷주자 선수들의 성적 분석) ${filterText} ${monthText}</div>
                <div style="display:block;">`;

    if (victims.length === 0) {
        html += `<div style="padding:30px; color:var(--sub-text); font-weight:800; text-align:center; display:block;">해당 조건의 분석 가능한 데이터가 없습니다.</div>`;
    } else {
        victims.forEach(v => {
            const s = victimStats[v];
            const avg = (s.totalRank / s.games).toFixed(1);
            const winP = ((s.wins / s.games) * 100).toFixed(0);
            const lastP = ((s.lasts / s.games) * 100).toFixed(0);

            html += `<div style="background:rgba(255,255,255,0.4); padding:12px 15px; border-radius:15px; border:1px solid rgba(0,0,0,0.05); text-align:left; margin-bottom: 10px; display:block;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <div style="color:${getPlayerColor(v)}; font-size:17px; font-weight:900;">${playerThemes[v].emoji} ${v}</div>
                            <div style="font-size:13px; font-weight:800; color:var(--sub-text);">${s.games}전 / 평균 ${avg}위</div>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; font-weight:900;">
                            <div style="width:48%; background:var(--bg); padding:8px 6px; border-radius:8px; text-align:center; display:block;">
                                <div style="color:var(--sub-text); margin-bottom:4px;">1위 확률</div>
                                <div style="color:var(--rank1); font-size:14px;">${winP}%</div>
                            </div>
                            <div style="width:48%; background:var(--bg); padding:8px 6px; border-radius:8px; text-align:center; display:block;">
                                <div style="color:var(--sub-text); margin-bottom:4px;">꼴찌 확률</div>
                                <div style="color:var(--rankL); font-size:14px;">${lastP}%</div>
                            </div>
                        </div>
                     </div>`;
        });
    }

    html += `</div></div>
             <button id="defense-modal-share-btn" class="share-btn-common" style="margin-top: 20px; width:100%; height:48px; display:flex; align-items:center; justify-content:center;" onclick="shareDefenseDetail('${playerName}')">📸 디펜스 상세 기록 스크린샷 공유</button>
             <button class="save-btn" style="background:#bdc3c7; margin-top:12px; width:100%; height:48px; display:flex; align-items:center; justify-content:center; color:#444;" onclick="closeDefenseDetail()">닫기</button>`;

    const modal = document.getElementById('defense-detail-modal');
    const content = document.getElementById('defense-detail-content');
    if (!modal || !content) return;
    content.innerHTML = html;
    modal.style.display = 'flex';
    content.style.animation = 'scaleUpPopup 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
    if (defenseModalTimeout) clearTimeout(defenseModalTimeout);
    defenseModalTimeout = setTimeout(() => { closeDefenseDetail(); }, 15000); 
}

function closeDefenseDetail() {
    const modal = document.getElementById('defense-detail-modal');
    const content = document.getElementById('defense-detail-content');
    if (defenseModalTimeout) { clearTimeout(defenseModalTimeout); defenseModalTimeout = null; }
    if (!modal || !content) return;
    content.style.animation = 'scaleDownPopup 0.3s ease-in forwards';
    setTimeout(() => { modal.style.display = 'none'; content.style.animation = 'none'; }, 300);
}

function shareDefenseDetail(name) {
    captureAndShare('defense-modal-capture-area', 'defense-modal-share-btn', `${name}_defense_detail.png`, `${name}의 디펜스 리포트`, `${name} 선수가 방어한 다른 멤버들의 성적 분석 결과입니다!`);
}

function renderDefenseStats() {
    const filterVal = document.getElementById('statsFilterCount')?.value || "all";
    const monthVal = document.getElementById('statsFilterMonth')?.value || "";

    const labelEl = document.getElementById('defenseFilterLabel');
    if (labelEl) {
        let countText = filterVal === "all" ? "전체" : filterVal + "인";
        let monthText = monthVal ? monthVal : "전체";
        labelEl.innerText = `(${monthText}, ${countText})`;
    }

    let defenseStats = {}; players.forEach(p => defenseStats[p] = { totalNextRank: 0, count: 0 });
    
    gameLogs.forEach(g => {
        if (monthVal && !g.dateStr.startsWith(monthVal)) return;
        if (g.startOrder && g.startOrder.length > 0) {
            const actual = g.ranks.filter(n => n && n.trim() !== "");
            if (filterVal !== "all" && actual.length !== parseInt(filterVal)) return;
            const order = g.startOrder;
            for (let i = 0; i < order.length; i++) {
                const preP = order[i];
                const nextP = order[(i + 1) % order.length];
                const nextPRankIdx = actual.indexOf(nextP);
                if (nextPRankIdx !== -1 && defenseStats[preP]) {
                    defenseStats[preP].totalNextRank += (nextPRankIdx + 1);
                    defenseStats[preP].count++;
                }
            }
        }
    });

    const activePlayers = players.filter(p => defenseStats[p].count > 0).sort((a, b) => (defenseStats[b].totalNextRank / defenseStats[b].count) - (defenseStats[a].totalNextRank / defenseStats[a].count));
    const tbody = document.getElementById('defenseBody');
    if (!tbody) return;
    if (activePlayers.length === 0) { tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; font-weight:800; color:var(--sub-text);">해당 조건의 데이터가 없습니다.</td></tr>`; return; }

    let currentRank = 1; let html = '';
    activePlayers.forEach((p, index) => {
        const avgRank = (defenseStats[p].totalNextRank / defenseStats[p].count).toFixed(2);
        if (index > 0) {
            const prevP = activePlayers[index - 1];
            if (avgRank !== (defenseStats[prevP].totalNextRank / defenseStats[prevP].count).toFixed(2)) currentRank = index + 1;
        }
        let rankLabel = currentRank + '위';
        let rankColor = currentRank === 1 ? 'var(--rank1)' : (currentRank === 2 ? 'var(--rank2)' : (currentRank === 3 ? 'var(--rank3)' : (currentRank === activePlayers.length && activePlayers.length > 3 ? 'var(--rankL)' : 'var(--text-color)')));
        if (currentRank === 1) rankLabel = '1위🥇';
        html += `<tr onclick="showDefenseDetail('${p}')" style="cursor:pointer;"><td style="color:${rankColor}; font-weight:900;">${rankLabel}</td><td style="color:${getPlayerColor(p)}; font-weight:900; text-decoration:underline;">${p}</td><td style="color:#5D4037;">${defenseStats[p].count}전</td><td style="color:var(--accent); font-weight:900;">${avgRank}위</td></tr>`;
    });
    tbody.innerHTML = html;
}

function closeMemberHistory() {
    const area = document.getElementById('memberHistoryArea');
    area.style.display = 'none';
    const statsCard = document.querySelector('.stats-card');
    if (statsCard) statsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderMemberHistory(name, rank = "") {
    const area = document.getElementById('memberHistoryArea');
    const filterVal = document.getElementById('statsFilterCount')?.value || "all";
    const monthVal = document.getElementById('statsFilterMonth')?.value || "";

    const allPersonal = gameLogs.filter(g => {
        if (monthVal && !g.dateStr.startsWith(monthVal)) return false;
        const actual = g.ranks.filter(n => n.trim() !== "");
        if (!actual.includes(name)) return false; 
        if (filterVal !== "all" && actual.length !== parseInt(filterVal)) return false; 
        return true;
    }).sort((a, b) => (new Date(b.dateStr) - new Date(a.dateStr)) || ((parseInt(b.round) || 0) - (parseInt(a.round) || 0)));
    
    if (allPersonal.length === 0) { 
        showToastMsg("해당 조건의 기록이 없습니다.");
        return; 
    }
    
    let totalScore = 0; 
    allPersonal.forEach(g => { const actual = g.ranks.filter(n => n.trim() !== ""); totalScore += getEarnedScore(actual.indexOf(name), actual.length); });
    const avg = allPersonal.length > 0 ? (totalScore / allPersonal.length).toFixed(2) : "0.00";
    
    const scoreModal = document.getElementById('player-score-modal'); 
    const scoreContent = document.getElementById('player-score-content');
    
    if (scoreModalTimeout) clearTimeout(scoreModalTimeout); 
    if (hideScoreModalTimeout) clearTimeout(hideScoreModalTimeout);
    if (scoreCountdownInterval) { clearInterval(scoreCountdownInterval); scoreCountdownInterval = null; } 
    
    if(scoreModal && scoreContent) { 
        scoreContent.innerHTML = `<div style="font-size:clamp(45px, 10vw, 55px); margin-bottom:5px; display:block; text-align:center;">${playerThemes[name].emoji}</div>
                                  <div style="display:flex; justify-content:center; align-items:center; font-size:clamp(28px, 8vw, 38px); font-weight:900; color:${getPlayerColor(name)}; margin-bottom: 15px;">${rank ? rank+'위 ' : ''}${name}</div>
                                  <div style="display:block; font-weight:900;">
                                      <div style="background:var(--bg); padding:12px; border-radius:12px; margin-bottom:8px; display:block;">
                                          <div style="font-size:13px; color:var(--sub-text); margin-bottom:4px;">총 승점</div><div style="font-size:22px; color:var(--rank1);">${totalScore}점</div>
                                      </div>
                                      <div style="background:var(--bg); padding:12px; border-radius:12px; margin-bottom:8px; display:block;">
                                          <div style="font-size:13px; color:var(--sub-text); margin-bottom:4px;">참여 경기</div><div style="font-size:22px; color:var(--rank2);">${allPersonal.length}game</div>
                                      </div>
                                      <div style="background:var(--bg); padding:12px; border-radius:12px; margin-bottom:8px; display:block;">
                                          <div style="font-size:13px; color:var(--sub-text); margin-bottom:4px;">평균 승점</div><div style="font-size:22px; color:var(--accent);">${avg}점</div>
                                      </div>
                                  </div>
                                  <div id="score-timer" style="margin-top:15px; font-size:12px; color:var(--sub-text); font-weight:800; text-align:center; display:block;">10초 후 자동으로 닫힙니다.</div>`; 
        scoreModal.style.display = 'flex'; 
        scoreContent.style.animation = 'scaleUpPopup 0.4s forwards'; 
        let sLeft = 10;
        scoreCountdownInterval = setInterval(() => {
            sLeft--; const timerEl = document.getElementById('score-timer');
            if (timerEl) timerEl.innerText = `${sLeft}초 후 자동으로 닫힙니다.`;
            if (sLeft <= 0) { clearInterval(scoreCountdownInterval); closePlayerScoreModal(); }
        }, 1000);
    }

    let filterText = filterVal === 'all' ? '전체 인원' : filterVal + '인 게임';
    let monthText = monthVal ? monthVal + '월' : '전체 기간';

    let html = `<div style="font-size:15px; font-weight:900; color:${getPlayerColor(name)}; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; border-bottom:2px dashed ${getPlayerColor(name)}50; padding-bottom:10px;">
                    <div>${playerThemes[name].emoji} ${name} 프로필 <span style="font-size:11px; color:#999;">(${monthText}, ${filterText})</span></div>
                    <div style="font-size:13px; cursor:pointer;" onclick="closeMemberHistory()">닫기 ✕</div>
                </div>`;
                
    const recent = allPersonal.slice(0, 10); 
    let w10 = 0, l10 = 0; 
    recent.forEach(g => { 
        const actual = g.ranks.filter(n => n.trim() !== ""); 
        if(actual.indexOf(name) === 0) w10++; else if(actual.indexOf(name) === actual.length - 1) l10++; 
    });
    
    let cond = (w10 / recent.length >= 0.3 && l10 / recent.length >= 0.3) ? ["⚡", "도깨비", "var(--rank3)"] : (w10 / recent.length >= 0.3 ? ["☀️", "최상", "var(--rankL)"] : (l10 / recent.length >= 0.3 ? ["🌧️", "비상", "var(--rank1)"] : ["⛅", "보통", "var(--rank2)"]));
    
    html += `<div class="condition-box cond-responsive">
                <div style="flex:1; display:flex; flex-direction:column; cursor:pointer;" onclick="showInfoModal('score')">
                    <div style="font-size:12px; font-weight:900; color:var(--sub-text);">현재 랭킹 티어</div>
                    <div style="font-size:12px; font-weight:900; color:var(--sub-text); margin-top:3px;">(총 ${totalScore}점 / 평균 ${avg}점)</div>
                </div>
                <div style="font-size:14px; font-weight:900; color:${getTier(totalScore).color}; cursor:pointer;" onclick="showInfoModal('tier')">
                    ${getTier(totalScore).icon} ${getTier(totalScore).name}
                </div>
             </div>`;
    
    html += `<div class="condition-box cond-responsive" onclick="showInfoModal('condition')">
                <div style="font-size:12px; flex:1; font-weight:900; color:var(--sub-text);">최근 컨디션 (${recent.length}G)</div>
                <div style="font-size:14px; font-weight:900; color:${cond[2]};">${cond[0]} ${cond[1]}</div>
             </div>`;

    let h2h = {};
    players.forEach(p => { if (p !== name) h2h[p] = { match: 0, win: 0, loss: 0 }; });
    
    allPersonal.forEach(g => {
        const actual = g.ranks.filter(n => n.trim() !== "");
        const myIdx = actual.indexOf(name);
        actual.forEach((p, pIdx) => {
            if (p !== name && h2h[p]) {
                h2h[p].match++;
                if (myIdx < pIdx) h2h[p].win++; 
                else if (myIdx > pIdx) h2h[p].loss++; 
            }
        });
    });

    let validOpponents = Object.keys(h2h).filter(p => h2h[p].match >= 1);
    let nemesis = null; let punchingBag = null;

    if (validOpponents.length > 0) {
        let nemesisList = [...validOpponents].sort((a, b) => (h2h[b].loss / h2h[b].match) - (h2h[a].loss / h2h[a].match) || h2h[b].loss - h2h[a].loss);
        let bagList = [...validOpponents].sort((a, b) => (h2h[b].win / h2h[b].match) - (h2h[a].win / h2h[a].match) || h2h[b].win - h2h[a].win);

        if (nemesisList.length > 0 && h2h[nemesisList[0]].loss > h2h[nemesisList[0]].win) nemesis = nemesisList[0];
        if (bagList.length > 0 && h2h[bagList[0]].win > h2h[bagList[0]].loss) punchingBag = bagList[0];
    }

    let nemesisText = nemesis ? `<span style="color:var(--rankL); font-size:16px; font-weight:900;">${nemesis}</span><br><span style="font-size:11px; color:var(--sub-text); font-weight:800;">승률 ${Math.round((h2h[nemesis].win/h2h[nemesis].match)*100)}%</span>` : `<span style="color:var(--sub-text); font-weight:800; font-size:12px;">천적이 없어!</span>`;
    let bagText = punchingBag ? `<span style="color:var(--rank1); font-size:16px; font-weight:900;">${punchingBag}</span><br><span style="font-size:11px; color:var(--sub-text); font-weight:800;">승률 ${Math.round((h2h[punchingBag].win/h2h[punchingBag].match)*100)}%</span>` : `<span style="color:var(--sub-text); font-weight:800; font-size:12px;">샌드백이 없어!</span>`;

    const spotlightColors = [
        { bg: 'rgba(255, 173, 173, 0.25)', shadow: 'rgba(255, 173, 173, 0.5)', border: '#FFADAD' },
        { bg: 'rgba(255, 214, 165, 0.25)', shadow: 'rgba(255, 214, 165, 0.5)', border: '#FFD6A5' },
        { bg: 'rgba(253, 255, 182, 0.25)', shadow: 'rgba(253, 255, 182, 0.5)', border: '#FDFFB6' },
        { bg: 'rgba(202, 255, 191, 0.25)', shadow: 'rgba(202, 255, 191, 0.5)', border: '#CAFFBF' },
        { bg: 'rgba(155, 246, 255, 0.25)', shadow: 'rgba(155, 246, 255, 0.5)', border: '#9BF6FF' },
        { bg: 'rgba(160, 196, 255, 0.25)', shadow: 'rgba(160, 196, 255, 0.5)', border: '#A0C4FF' },
        { bg: 'rgba(189, 178, 255, 0.25)', shadow: 'rgba(189, 178, 255, 0.5)', border: '#BDB2FF' },
        { bg: 'rgba(255, 198, 255, 0.25)', shadow: 'rgba(255, 198, 255, 0.5)', border: '#FFC6FF' }
    ];
    
    const shuffledColors = [...spotlightColors].sort(() => 0.5 - Math.random());
    const nemColor = shuffledColors[0];
    const bagColor = shuffledColors[1];

    html += `<div style="display: flex; gap: 10px; margin-top: 10px; margin-bottom: 15px;">
                <div class="cond-responsive" onclick="showH2HDetailModal('${name}', 'nemesis')" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; background: ${nemColor.bg}; padding: 15px 5px; border-radius: 14px; border: 2.5px solid ${nemColor.border}; box-shadow: 0 0 10px ${nemColor.border}, 0 0 20px ${nemColor.shadow}, inset 0 0 8px rgba(255,255,255,0.3); backdrop-filter: blur(5px); transition: all 0.4s ease; box-sizing: border-box;">
                    <div style="font-size:12px; font-weight:900; color:var(--sub-text); margin-bottom:8px; text-shadow: 0 0 5px rgba(255,255,255,0.5);">😈 나의 천적 <span style="font-size:9px; opacity:0.6;">(터치)</span></div>
                    <div style="text-align:center; text-shadow: 1px 1px 2px rgba(0,0,0,0.1), 0 0 8px ${nemColor.shadow};">${nemesisText}</div>
                </div>
                <div class="cond-responsive" onclick="showH2HDetailModal('${name}', 'bag')" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; background: ${bagColor.bg}; padding: 15px 5px; border-radius: 14px; border: 2.5px solid ${bagColor.border}; box-shadow: 0 0 10px ${bagColor.border}, 0 0 20px ${bagColor.shadow}, inset 0 0 8px rgba(255,255,255,0.3); backdrop-filter: blur(5px); transition: all 0.4s ease; box-sizing: border-box;">
                    <div style="font-size:12px; font-weight:900; color:var(--sub-text); margin-bottom:8px; text-shadow: 0 0 5px rgba(255,255,255,0.5);">🥊 나의 샌드백 <span style="font-size:9px; opacity:0.6;">(터치)</span></div>
                    <div style="text-align:center; text-shadow: 1px 1px 2px rgba(0,0,0,0.1), 0 0 8px ${bagColor.shadow};">${bagText}</div>
                </div>
             </div>`;
             
    html += `<button id="member-share-btn" class="share-btn-common" style="margin:15px 0;" onclick="shareMemberResult('${name}')">📸 개인 전적 스크린샷 공유</button>`;
    
    recent.forEach(g => { 
        const actual = g.ranks.filter(n => n.trim() !== ""); 
        const rIdx = actual.indexOf(name); 
        const rColor = rIdx === 0 ? 'var(--rank1)' : (rIdx === actual.length - 1 ? 'var(--rankL)' : '#5D4037');
        const rLabel = rIdx === 0 ? '1위🥇' : (rIdx === actual.length - 1 ? '꼴찌💀' : (rIdx + 1) + '위');
        const sameDateGames = gameLogs.filter(x => x.dateStr === g.dateStr);
        const gameNumber = sameDateGames.findIndex(x => x.round === g.round) + 1;
        html += `<div class="history-item"><div style="font-size:14px; color:#5D4037;">${g.dateStr} <span style="font-size:12px; font-weight:900; color:var(--rank1); margin-left:6px;">${gameNumber}G</span></div><div style="font-size:15px; color:${rColor};">${rLabel}</div></div>`; 
    });
    
    area.innerHTML = html; area.style.display = 'block'; area.style.border = `2.5px solid ${getPlayerColor(name)}`; 
    setTimeout(() => { area.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
}
function renderLastPlaceRecord() {
    const tbody = document.getElementById('lastPlaceBody');
    if (!tbody) return;

    let stats = {};
    players.forEach(p => {
        stats[p] = { lastDate: null, lastRound: null, lastGameNumber: null, gamesSinceLast: 0, hasRecord: false };
    });

    const sortedGames = [...gameLogs].sort((a, b) => {
        const dateA = new Date(a.dateStr);
        const dateB = new Date(b.dateStr);
        if (dateA - dateB !== 0) return dateA - dateB;
        return (parseInt(a.round) || 0) - (parseInt(b.round) || 0);
    });

    const dailyGameIndex = {};
    sortedGames.forEach(g => {
        if (!dailyGameIndex[g.dateStr]) {
            dailyGameIndex[g.dateStr] = sortedGames.filter(x => x.dateStr === g.dateStr).map(x => x.round);
        }
        const gameNumber = dailyGameIndex[g.dateStr].indexOf(g.round) + 1;
        const actual = g.ranks.filter(n => n && n.trim() !== "");
        
        if (actual.length <= 1) return;

        actual.forEach((p, idx) => {
            if (!stats[p]) return;
            stats[p].hasRecord = true;
            
            if (idx === actual.length - 1) {
                stats[p].lastDate = g.dateStr;
                stats[p].lastRound = g.round;
                stats[p].lastGameNumber = gameNumber;
                stats[p].gamesSinceLast = 0;
            } else {
                if (stats[p].lastDate !== null) {
                    stats[p].gamesSinceLast++;
                }
            }
        });
    });

    const activePlayers = players.filter(p => stats[p].hasRecord);
    if (activePlayers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--sub-text); font-weight:800;">데이터 없음</td></tr>`;
        return;
    }

    activePlayers.sort((a, b) => {
        if (!stats[a].lastDate && stats[b].lastDate) return -1;
        if (stats[a].lastDate && !stats[b].lastDate) return 1;
        if (!stats[a].lastDate && !stats[b].lastDate) return 0;
        return stats[b].gamesSinceLast - stats[a].gamesSinceLast;
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let html = '';
    activePlayers.forEach((p) => {
        const s = stats[p];
        let dateText = "-";
        let gameText = "-";
        let durationText = "-";

        if (s.lastDate) {
            dateText = s.lastDate;
            gameText = s.lastGameNumber + "G";
            
            const lastD = new Date(s.lastDate);
            lastD.setHours(0, 0, 0, 0);
            
            const diffTime = Math.abs(today - lastD);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            durationText = `${s.gamesSinceLast}G / ${diffDays}일째`;
        } else {
            dateText = "기록 없음";
            durationText = `무패행진 중!`;
        }

        html += `<tr style="background:rgba(255,255,255,0.4);">
            <td style="color:${getPlayerColor(p)}; font-weight:900;">${p}</td>
            <td style="color:var(--text-color); font-weight:800; font-size:13px;">${dateText}</td>
            <td style="color:var(--sub-text); font-weight:800; font-size:13px;">${gameText}</td>
            <td style="color:var(--accent); font-weight:900; font-size:13px;">${durationText}</td>
        </tr>`;
    });

    tbody.innerHTML = html;
}

function shareLastPlaceRecord() {
    captureAndShare('lastPlace-capture-area', 'lastPlace-share-btn', 'last_place_record.png', '선수별 마지막 최하위 기록', '멤버별 마지막 최하위 기록 결과입니다!');
}

function toggleSidebar() {
    triggerHaptic(10);
    const sidebarWrap = document.getElementById('quick-sidebar-wrap');
    if (sidebarWrap) {
        sidebarWrap.classList.toggle('active');
    }
}

function scrollToTarget(targetId) {
    triggerHaptic(15);
    const targetElement = document.getElementById(targetId);
    
    if (targetElement) {
        if (window.getComputedStyle(targetElement).display === 'none') {
            showToastMsg("해당 항목은 현재 조건에서 비활성화되어 있습니다.");
        } else {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    
    const sidebarWrap = document.getElementById('quick-sidebar-wrap');
    if (sidebarWrap) {
        sidebarWrap.classList.remove('active');
    }
}

function showToastMsg(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerText = msg;
    toast.style.display = 'block'; 
    toast.style.zIndex = '999999';
    void toast.offsetWidth; 
    toast.classList.add('show');
    
    if (globalToastTimeout) clearTimeout(globalToastTimeout);
    
    globalToastTimeout = setTimeout(() => {
        toast.classList.remove('show');
        toast.style.display = 'none';
    }, 3000);
}

function confirmReset(step) {
    const btnWrap = document.getElementById('resetSteps');
    if (!btnWrap) return;
    const cancelBtn = `<button class="save-btn" style="background:#bdc3c7; color:#444; margin-top:10px; width:100%; box-shadow: none;" onclick="cancelReset()">아니, 취소할게 (데이터 유지)</button>`;

    if (step === 1) {
        triggerHaptic(10);
        btnWrap.innerHTML = `<button class="reset-btn" style="background: linear-gradient(145deg, #f39c12, #e67e22);" onclick="confirmReset(2)">⚠️ 진짜 초기화 할거야? (1/3)</button>${cancelBtn}`;
    } else if (step === 2) {
        triggerHaptic(20);
        btnWrap.innerHTML = `<button class="reset-btn" style="background: linear-gradient(145deg, #e74c3c, #c0392b);" onclick="confirmReset(3)">🚨 진심이지? 절대 복구 안돼! (2/3)</button>${cancelBtn}`;
    } else if (step === 3) {
        triggerHaptic(30);
        btnWrap.innerHTML = `<button class="reset-btn" style="background: #000000; color:#fff;" onclick="confirmReset(4)">💀 마지막 경고: 데이터 영구 소각 (3/3)</button>${cancelBtn}`;
    } else if (step === 4) {
        triggerHaptic([20, 30, 20]);
        executeReset();
    }
}

function cancelReset() {
    const btnWrap = document.getElementById('resetSteps');
    if (btnWrap) btnWrap.innerHTML = `<button class="reset-btn" onclick="confirmReset(1)">⚠️ 모든 데이터 초기화 (복구 불가)</button>`;
}

async function executeReset() {
    showLoading(true, "모든 데이터 소각 중...");
    try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "RESET" }) });
        if (response.ok) {
            gameLogs = []; renderAll(); alert("모든 데이터가 영구적으로 초기화되었습니다.");
        } else { throw new Error("Reset Failed"); }
    } catch (e) {
        alert("서버 통신 오류로 초기화에 실패했습니다.");
    } finally {
        showLoading(false); cancelReset();
    }
}
// =========================================================================================
// [V9.82 복구] 누락되었던 초기화 블록(window.onload) 및 이벤트 리스너 완전 복구
// =========================================================================================

window.onload = () => { 
    try {
        function applyHighlight(instance) {
            if (!instance || !instance.calendarContainer) return;
            const year = instance.currentYear;
            const monthEls = instance.calendarContainer.querySelectorAll('.flatpickr-monthSelect-month');
            monthEls.forEach((el, index) => {
                const monthStr = String(index + 1).padStart(2, '0');
                const targetPrefix = `${year}-${monthStr}`;
                const hasRecord = gameLogs.some(g => g.dateStr.startsWith(targetPrefix));
                if (hasRecord) {
                    if (!el.classList.contains('selected')) { el.style.backgroundColor = '#5D4037'; el.style.color = '#ffffff'; } 
                    else { el.style.backgroundColor = ''; el.style.color = ''; }
                } else { el.style.backgroundColor = ''; el.style.color = ''; }
            });
        }

        searchFlatpickr = flatpickr("#searchDateRange", { 
            plugins: [new monthSelectPlugin({shorthand: true, dateFormat: "Y-m", altFormat: "Y-m"})], 
            locale: "ko", disableMobile: true,
            onReady: function(selectedDates, dateStr, instance) {
                const clearBtnWrap = document.createElement("div"); clearBtnWrap.style.padding = "0 10px 10px 10px";
                clearBtnWrap.innerHTML = "<button type='button' style='width:100%; padding:10px; background:var(--edit); color:white; border:none; border-radius:8px; font-weight:900; font-size:13px; cursor:pointer; box-shadow:0 4px 6px rgba(0,0,0,0.1);'>전체 기간으로 리셋</button>";
                clearBtnWrap.onclick = function() { instance.clear(); instance.close(); };
                instance.calendarContainer.appendChild(clearBtnWrap); applyHighlight(instance);
            },
            onOpen: function(selectedDates, dateStr, instance) { applyHighlight(instance); },
            onYearChange: function(selectedDates, dateStr, instance) { setTimeout(() => applyHighlight(instance), 50); },
            onChange: function(selectedDates, dateStr, instance) {
                applyHighlight(instance);
                if (dateStr) {
                    const hasRecord = gameLogs.some(g => g.dateStr.startsWith(dateStr));
                    if (!hasRecord) showToastMsg("게임 기록 없음");
                }
            }
        });

        flatpickr("#statsFilterMonth", { 
            plugins: [new monthSelectPlugin({shorthand: true, dateFormat: "Y-m", altFormat: "Y-m"})], 
            locale: "ko", disableMobile: true,
            onReady: function(selectedDates, dateStr, instance) {
                const clearBtnWrap = document.createElement("div"); clearBtnWrap.style.padding = "0 10px 10px 10px";
                clearBtnWrap.innerHTML = "<button type='button' style='width:100%; padding:10px; background:var(--edit); color:white; border:none; border-radius:8px; font-weight:900; font-size:13px; cursor:pointer; box-shadow:0 4px 6px rgba(0,0,0,0.1);'>전체 기간으로 리셋</button>";
                clearBtnWrap.onclick = function() { instance.clear(); instance.close(); onFilterChange(); };
                instance.calendarContainer.appendChild(clearBtnWrap); applyHighlight(instance); 
            },
            onOpen: function(selectedDates, dateStr, instance) { applyHighlight(instance); },
            onYearChange: function(selectedDates, dateStr, instance) { setTimeout(() => applyHighlight(instance), 50); },
            onChange: function(selectedDates, dateStr, instance) {
                applyHighlight(instance); onFilterChange(); 
                if (dateStr) {
                    const hasRecord = gameLogs.some(g => g.dateStr.startsWith(dateStr));
                    if (!hasRecord) showToastMsg("게임 기록 없음");
                }
            }
        });

        awardsFlatpickr = flatpickr("#awardsMonthBtn", { 
            plugins: [new monthSelectPlugin({shorthand: true, dateFormat: "Y-m", altFormat: "Y-m"})], 
            locale: "ko", disableMobile: true,
            onReady: function(selectedDates, dateStr, instance) {
                applyHighlight(instance);
            },
            onOpen: function(selectedDates, dateStr, instance) { applyHighlight(instance); },
            onYearChange: function(selectedDates, dateStr, instance) { setTimeout(() => applyHighlight(instance), 50); },
            onChange: function(selectedDates, dateStr, instance) {
                applyHighlight(instance);
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

    setTimeout(() => playSystemSound('pop'), 3500); 
    
    updateInputFields(); setDefaultSearchDates(); fetchData(); 
};

document.addEventListener('click', (e) => { if(!e.target.closest('.game-item')) closeAllOverlays(); });
