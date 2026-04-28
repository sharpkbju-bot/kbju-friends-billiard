let scoreModalTimeout = null;
let hideScoreModalTimeout = null;
let graphCountdownInterval = null;
let genseiCountdownInterval = null;
let defenseModalTimeout = null;
let infoModalCountdownInterval = null;

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
return <span style="color:${color};display:inline;">${name}&lt;/span>;
}).join('<span style="display:inline;">→</span>');
}

// [V6.20 캡처 버그 최종 완벽 픽스] Ghost Wrapper 기법 유지 & 보호
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

function showRingCriteria(type) {
let title = "", desc = "";
if (type === 'win') {
title = "승률 산출 기준";
desc = "<b>(1위 횟수 / 참여 경기수) × 100</b><br><br>해당 월에 참여한 전체 경기 중 1위를 차지한 비율입니다. 공격적인 결정력을 보여주는 지표입니다.";
} else if (type === 'score') {
title = "평균득점 산출 기준";
desc = "해당 선수의 월간 평균 승점입니다.";
} else if (type === 'safety') {
title = "생존율 산출 기준";
desc = "<b>((경기수 - 꼴찌수) / 경기수) × 100</b><br><br>참여 경기 중 꼴찌를 하지 않고 살아남은 비율입니다. 무너지지 않는 수비적 안정감을 보여주는 지표입니다.";
}

const timerEl = document.getElementById('info-modal-timer');
if(timerEl) {
timerEl.style.display = 'block';
let timeLeft = 10;
timerEl.innerText = ${timeLeft}초 후 자동으로 닫힙니다.`;

if (infoModalCountdownInterval) clearInterval(infoModalCountdownInterval);
infoModalCountdownInterval = setInterval(() => {
timeLeft--;
if (timerEl) timerEl.innerText = ``${timeLeft}초 후 자동으로 닫힙니다.`;
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

if (type === 'score') {
icon = "📊";
title = "인원별 차등 승점 기준";
desc = "• <b>2인</b>: 1위(+2), 꼴찌(0)<br>• <b>3인</b>: 1위(+3), 2위(+1), 꼴찌(0)<br>• <b>4인</b>: 1위(+4), 2위(+3), 3위(+2), 꼴찌(0)<br>• <b>5인</b>: 1위(+5), 2위(+4), 3위(+3), 4위(+1), 꼴찌(0)";
} else if (type === 'tier') {
icon = "🏅";
title = "랭킹 티어(계급) 기준";
desc = "👑<b>챌린저</b>: 60+  💎<b>플래티넘</b>: 50+<br>🥇<b>골드</b>: 40+   🥈<b>실버</b>: 30+  🥉<b>브론즈</b>: 30미만";
} else if (type === 'condition') {
icon = "🌡️";
title = "최근 컨디션 분석 기준";
desc = "• ☀️<b>최상</b>: 1위 비율 30%↑<br>• ⛅<b>보통</b>: 1위 비율 30% 미만. 안정적인 보통 순위<br>• ⚡<b>도깨비</b>: 1위 30%↑ & 꼴찌 30%↑<br>• 🌧️<b>비상</b>: 꼴찌 비율 30%↑";
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

let html = <div style="font-size:40px; margin-bottom:10px; display:block; text-align:center;"&gt;🏆&lt;/div&gt; &lt;div style="font-size:18px; font-weight:900; color:var(--text-color); margin-bottom:5px; display:block; text-align:center;"&gt;LAST GAME RECORD&lt;/div&gt; &lt;div style="font-size:15px; font-weight:800; color:var(--sub-text); margin-bottom: 20px; display:block; text-align:center;"&gt;[ ${lastGame.dateStr} ]</div>
<div style="display:block; font-weight:900;">`;

actualRanks.forEach((name, i) => {
const rankLabel = (i === 0) ? "1위🥇" : (i === actualRanks.length - 1 ? "꼴찌💀" : ``${i + 1}위); const rankColor = (i === 0) ? 'var(--rank1)' : (i === actualRanks.length - 1 ? 'var(--rankL)' : 'var(--text-color)'); html +=<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.4); padding:12px 20px; border-radius:15px; border:1px solid rgba(0,0,0,0.05); box-shadow: inset 1px 1px 3px rgba(255,255,255,0.7); margin-bottom:8px;">
<div style="color:{i === 0 ? '16px' : '14px'}; font-weight:{rankLabel}</div>
<div style="color:{i === 0 ? '22px' : '16px'}; font-weight:{name}</div>
</div>`;
});

html += </div>;

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
alert(게임 가능 인원 ${limit}명. 초과 불가`);
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
const realTodayStr = formatDate(new Date());
if (selectedDateStr > realTodayStr) return alert("미래에서 온거야? 날짜를 잘 확인혀!");

const limit = parseInt(document.getElementById('playerCount').value);
if (selectedPlayersForLottery.length !== limit) return alert(게임 참여${limit}명을 선택해!(현재 ${selectedPlayersForLottery.length}명));

let pool = [...selectedPlayersForLottery];
const firstIdx = Math.floor(Math.random() * pool.length);
const firstPlayer = pool.splice(firstIdx, 1)[0];
const remaining = pool.sort(() => Math.random() - 0.5);

lastDrawnPlayers = [firstPlayer, ...remaining];
currentStartOrder = [...lastDrawnPlayers];

const resultArea = document.getElementById('order-result');
const confirmBtn = document.querySelector('#order-modal button');
const p1Color = getPlayerColor(firstPlayer);

const finalHtml = <div style="background: rgba(128, 128, 128, 0.1); border-radius: 15px; padding: 15px; margin-bottom: 20px; border: 2.5px dashed${p1Color}; display:block;">
<div style="font-size: 14px; color: {p1Color}; font-weight: 900;">1번 : {remaining.map((p, idx) => <div style="color: ${getPlayerColor(p)}; display:block;">${idx + 2}번 : ${p}</div>).join('')} &lt;/div>;

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
resultArea.innerHTML = <div style="padding: 30px 0;"&gt;&lt;div style="font-size: 14px; color: var(--sub-text); margin-bottom: 10px;"&gt;초구의 영광은 누구에게?&lt;/div&gt;&lt;div id="slotName" style="font-size: 32px; font-weight: 900; color: var(--rank1); letter-spacing: 2px;"&gt;🎰&lt;/div&gt;&lt;/div>;
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
resultArea.innerHTML = <div style="padding: 30px 0; text-align: left;"&gt; &lt;div style="font-size: 14px; font-weight: 800; color: var(--sub-text); margin-bottom: 12px; text-align: center; animation: flash 0.5s infinite alternate;"&gt;나도 초구 한번 쳐보자! 🎱&lt;/div&gt; &lt;div style="width: 100%; height: 10px; background: rgba(0,0,0,0.1); border-radius: 10px; position: relative;"&gt; &lt;div id="billiardGauge" style="width: 0%; height: 100%; background: linear-gradient(90deg, var(--rank1), var(--accent)); border-radius: 10px; transition: width 3s cubic-bezier(0.2, 0.8, 0.2, 1);"&gt;&lt;/div&gt; &lt;div id="billiardBall" style="font-size: 26px; position: absolute; top: -14px; left: 0%; transition: left 3s cubic-bezier(0.2, 0.8, 0.2, 1), transform 3s cubic-bezier(0.2, 0.8, 0.2, 1); transform: translateX(-50%) rotate(0deg);"&gt;🎱&lt;/div&gt; &lt;/div&gt; &lt;/div>;
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
resultArea.innerHTML = <div style="padding: 30px 0; display: flex; flex-direction: column; align-items: center;"&gt; &lt;div style="font-size: 55px; animation: heartbeat 0.3s infinite alternate;"&gt;🎱&lt;/div&gt; &lt;div style="margin-top: 20px; font-size: 15px; font-weight: 900; color: var(--accent); animation: flash 0.5s infinite alternate;"&gt;두근두근... 초구는 누구?&lt;/div&gt; &lt;/div>;
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
let svg = <svg width="100%" height="100%" viewBox="-15 -10 130 120" preserveAspectRatio="none" style="overflow: visible; font-family: inherit;">;
const yLabels = ["1위", "2위", "3위", "4위", "꼴찌"];

for(let i=0; i<=4; i++) {
let y = i * 25;
svg += <line x1="0" y1="${y}" x2="100" y2="{y + 3}" font-size="7" font-weight="900" fill="var(--sub-text)" text-anchor="end">${yLabels[i]}&lt;/text>;
}

players.forEach(playerName => {
const pColor = getGraphColor(playerName);
legendHtml += <div style="display:flex; align-items:center; gap:4px;"&gt; &lt;span style="display:inline-block; width:10px; height:3px; background-color:${pColor}; border-radius:2px;"></span>
<span style="color:var(--text-color);">${playerName}&lt;/span&gt; &lt;/div>;

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
let pathD = M${points[0].x} latex
{points[0].y}`; for(let i=0; i&lt;points.length - 1; i++) { pathD += ` C 

{points[i].x + (points[i+1].x - points[i].x) / 2} {points[i].x + (points[i+1].x - points[i].x) / 2} {points[i+1].x} latex
{points[i+1].y}`; } svg += `<path d="

{pathD}" fill="none" stroke="latex
{pColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.85" />`; points.forEach((p) =&gt; { svg += `<circle cx="

{p.x}" cy="{pColor}" stroke="var(--card-bg)" stroke-width="1.5" />`;
});
}
});

container.innerHTML = svg + </svg>;
legendArea.innerHTML = legendHtml;
document.getElementById('graph-modal').style.display = 'flex';

let timeLeft = 10;
const countdownEl = document.getElementById('graph-countdown-text');
if (countdownEl) countdownEl.innerText = ${timeLeft}초 후 자동으로 닫힙니다.`;

if (graphCountdownInterval) clearInterval(graphCountdownInterval);
graphCountdownInterval = setInterval(() => {
timeLeft--;
if (countdownEl) countdownEl.innerText = ``${timeLeft}초 후 자동으로 닫힙니다.`;
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
const response = await fetch(${GAS_URL}?t=${new Date().getTime()});
const rawData = await response.json();
gameLogs = rawData.map(g => ({ ...g, dateStr: formatDate(g.date) }));
renderAll();
} catch (e) {
console.error("Fetch error", e);
} finally {
showLoading(false);
document.getElementById('selectedDateTitle').innerText = 📅 ${selectedDateStr}`;
}
}

function renderAll() {
renderCalendar();
renderStats();
renderDefenseStats();
renderGameList();
analyzeStrategy();
}

function isHoliday(year, month, day) {
const dStr = ``${month + 1}-${day};
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

document.getElementById('monthDisplay').innerText = ``${year}년 ${month + 1}월;

["일","월","화","수","목","금","토"].forEach((d, idx) => {
let color = "#95a5a6";
if(idx === 0) color = "#e67e22";
if(idx === 6) color = "#5dade2";
grid.innerHTML += <div class="weekday" style="color:${color}">${d}&lt;/div>;
});

const firstDay = new Date(year, month, 1).getDay();
const lastDate = new Date(year, month + 1, 0).getDate();

for (let i = 0; i < firstDay; i++) {
grid.innerHTML += <div&gt;&lt;/div>;
}

for (let d = 1; d <= lastDate; d++) {
const dStr = formatDate(new Date(year, month, d));
const dayOfWeek = new Date(year, month, d).getDay();
let dayClass = (dayOfWeek === 0 || isHoliday(year, month, d)) ? "sun holiday" : (dayOfWeek === 6 ? "sat" : "");
grid.innerHTML += <div class="day${dayClass} {dStr === realTodayStr ? 'today' : ''} {dStr}')">${d}&lt;/div>;
}
}

function selectDate(dateStr) {
if(editMode) cancelEdit();
selectedDateStr = dateStr;
document.getElementById('selectedDateTitle').innerText = 📅${dateStr}`;
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
const label = i === count ? "꼴찌💀" : (i === 1 ? "1위🥇" : ${i}위); html +=<div class="input-row">
<label>${label}&lt;/label&gt; &lt;select id="rank${i}" onchange="checkDuplicates()">
<option value="">선택</option>
${targetPlayers.map(p =&gt;<option value="{preFill && preFill[i-1] === p ? 'selected' : ''}>${p}&lt;/option>).join('')}
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
resArea.innerHTML = <div class="empty-search-msg" style="text-align:center; padding:20px; font-weight:800; color:var(--sub-text);"&gt;분석 가능한 추첨 기록이 없습니다.&lt;/div>;
shareBtn.style.display = 'none';
} else {
let html = "<table class='stats-table strategy-table'><thead><tr><th>앞 주자</th><th>경기</th><th>평균</th><th style='color:var(--rank1);'>1위</th><th style='color:var(--rankL);'>꼴찌</th></tr></thead><tbody>";
sorted.forEach(p => {
const s = stats[p];
html += <tr&gt; &lt;td style='color:${getPlayerColor(p)}; font-weight:900;'>{s.c}전</td>
<td>{((s.w/s.c)*100).toFixed(0)}%</td>
<td style='color:var(--rankL);'>${((s.l/s.c)*100).toFixed(0)}%&lt;/td&gt; &lt;/tr>;
});
resArea.innerHTML = html + "</tbody></table><div class='strategy-footer-text' style='color:var(--sub-text); margin-top:10px; font-weight:800; text-align:center;'>※ 특정 선수 뒤에서의 게임 순위 분석입니다.</div>";
shareBtn.style.display = 'block';
}
resArea.style.display = 'block';
}

function shareStrategyResult() {
const player = document.getElementById('strategyPlayer').value;
captureAndShare('strategy-capture-area', 'strategy-share-btn', ${player}_strategy.png`, `$`{player}의 상성 분석`,${player} 선수의 순번별 성적 분석 결과입니다!`);
}

function confirmReset(step) {
const el = document.getElementById('resetSteps');
if(step === 1) {
el.innerHTML = <div style="color:#e67e22; font-weight:900; margin-bottom:10px;"&gt;[1단계] 정말 삭제할거야?&lt;/div&gt;&lt;div id="confirm-buttons-wrap"&gt;&lt;button class="save-btn" style="background:var(--edit);" onclick="confirmReset(2)"&gt;OK&lt;/button&gt;&lt;button class="save-btn btn-cancel" onclick="cancelReset()"&gt;취소&lt;/button&gt;&lt;/div>;
document.getElementById('exitBtn').style.display = 'none';
} else if(step === 2) {
el.innerHTML = <div style="color:var(--accent); font-weight:900; margin-bottom:10px;"&gt;[2단계] 데이터가 모두 삭제돼!&lt;/div&gt;&lt;div id="confirm-buttons-wrap"&gt;&lt;button class="save-btn" style="background:var(--accent);" onclick="confirmReset(3)"&gt;OK&lt;/button&gt;&lt;button class="save-btn btn-cancel" onclick="cancelReset()"&gt;취소&lt;/button&gt;&lt;/div>;
} else {
el.innerHTML = <div style="color:#000; font-weight:900; margin-bottom:10px;"&gt;[최종 확인] 복구 불가! 진짜 삭제!&lt;/div&gt;&lt;div id="confirm-buttons-wrap"&gt;&lt;button class="save-btn" style="background:#000; color:#fff;" onclick="executeReset()"&gt;OK&lt;/button&gt;&lt;button class="save-btn btn-cancel" onclick="cancelReset()"&gt;취소&lt;/button&gt;&lt;/div>;
}
}

function cancelReset() {
document.getElementById('resetSteps').innerHTML = <button class="reset-btn" onclick="confirmReset(1)"&gt;⚠️ 모든 데이터 초기화 (복구 불가)&lt;/button>;
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
const subtitleEl = document.querySelector('.stats-subtitle');
if (subtitleEl) {
subtitleEl.innerText = isPercentMode ? "(평균 승점 기준. 확률 %)" : "(평균 승점 기준. 횟수)";
}

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
nameStyle += color:darkred;;
} else if (stats[p].ranks[0] === maxC.r0 && maxC.r0 > 0) {
nameStyle += color:darkblue;;
} else {
nameStyle += color:#8e44ad;;
}

const getVal = (val, total) => isPercentMode ? (total === 0 ? '0' : ((val/total)*100).toFixed(0)) : val;

return <tr&gt; &lt;td style="${nameStyle}" onclick="renderMemberHistory('${p}', '${currentRank}')">
<span style="font-size:11px;">${getTier(stats[p].score).icon}&lt;/span&gt; ${p}
</td>
<td style="color:#5D4037;">${stats[p].played}&lt;/td&gt; &lt;td style="color:var(--rank1);"&gt;${getVal(stats[p].ranks[0], stats[p].played)}</td>
<td style="color:var(--rank2);">${getVal(stats[p].ranks[1], stats[p].played)}&lt;/td&gt; &lt;td style="color:var(--rank3);"&gt;${getVal(stats[p].ranks[2], stats[p].played)}</td>
<td style="color:var(--rank4);">${getVal(stats[p].ranks[3], stats[p].played)}&lt;/td&gt; &lt;td style="color:var(--rankL);"&gt;${getVal(stats[p].ranks[4], stats[p].played)}</td>
<td><span class="win-rate-pill">${winRate}%&lt;/span&gt;&lt;/td&gt; &lt;/tr>;
}).join('');

const rich = document.getElementById('richFriendArea');
if(maxC.r4 > 0) {
const losers = players.filter(p => stats[p].ranks[4] === maxC.r4);
rich.style.display = 'block';
rich.innerHTML = 💸 야! 또 나냐? 다들 카드까봐!&lt;br&gt;&lt;span style="font-size:16px; color:var(--rankL); font-weight:900;"&gt;${losers.join(', ')}</span>`;
} else {
rich.style.display = 'none';
}
}

function showDefenseDetail(playerName) {
let victimStats = {};

gameLogs.forEach(g => {
if (g.startOrder && g.startOrder.includes(playerName)) {
const order = g.startOrder;
const actual = g.ranks.filter(n => n && n.trim() !== "");
const pIdx = order.indexOf(playerName);
const victimName = order[(pIdx + 1) % order.length];

const vRankIdx = actual.indexOf(victimName);
if (vRankIdx !== -1) {
if (!victimStats[victimName]) {
victimStats[victimName] = { games: 0, totalRank: 0, wins: 0, lasts: 0 };
}
victimStats[victimName].games++;
victimStats[victimName].totalRank += (vRankIdx + 1);
if (vRankIdx === 0) victimStats[victimName].wins++;
if (vRankIdx === actual.length - 1 && actual.length > 1) victimStats[victimName].lasts++;
}
}
});

const victims = Object.keys(victimStats).sort((a, b) =>
(victimStats[b].totalRank / victimStats[b].games) - (victimStats[a].totalRank / victimStats[a].games)
);

let html = <div id="defense-modal-capture-area" style="padding: 10px; border-radius: 15px; background: transparent; display: block;"&gt; &lt;div style="font-size:40px; margin-bottom:10px; display:block; text-align:center;"&gt;🛡️&lt;/div&gt; &lt;div style="font-size:19px; font-weight:900; color:var(--text-color); margin-bottom:5px; line-height:1.4; display:block; text-align:center;"&gt;${playerName}의 방어 리포트</div>
<div style="font-size:13px; font-weight:800; color:var(--sub-text); margin-bottom: 20px; line-height:1.4; display:block; text-align:center;">(내 바로 뒷주자 선수들의 성적 분석)</div>
<div style="display:block;">`;

if (victims.length === 0) {
html += <div style="padding:30px; color:var(--sub-text); font-weight:800; text-align:center; display:block;"&gt;분석 가능한 데이터가 없습니다.&lt;/div>;
} else {
victims.forEach(v => {
const s = victimStats[v];
const avg = (s.totalRank / s.games).toFixed(1);
const winP = ((s.wins / s.games) * 100).toFixed(0);
const lastP = ((s.lasts / s.games) * 100).toFixed(0);

html += <div style="background:rgba(255,255,255,0.4); padding:12px 15px; border-radius:15px; border:1px solid rgba(0,0,0,0.05); text-align:left; margin-bottom: 10px; display:block;"&gt; &lt;div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;"&gt; &lt;div style="color:${getPlayerColor(v)}; font-size:17px; font-weight:900;">${playerThemes[v].emoji} ${v}</div>
<div style="font-size:13px; font-weight:800; color:var(--sub-text);">${s.games}전 / 평균 ${avg}위</div>
</div>
<div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; font-weight:900;">
<div style="width:48%; background:var(--bg); padding:8px 6px; border-radius:8px; text-align:center; display:block;">
<div style="color:var(--sub-text); margin-bottom:4px;">1위 확률</div>
<div style="color:var(--rank1); font-size:14px;">${winP}%&lt;/div&gt; &lt;/div&gt; &lt;div style="width:48%; background:var(--bg); padding:8px 6px; border-radius:8px; text-align:center; display:block;"&gt; &lt;div style="color:var(--sub-text); margin-bottom:4px;"&gt;꼴찌 확률&lt;/div&gt; &lt;div style="color:var(--rankL); font-size:14px;"&gt;${lastP}%</div>
</div>
</div>
</div>`;
});
}

html += </div&gt;&lt;/div&gt; &lt;button id="defense-modal-share-btn" class="share-btn-common" style="margin-top: 20px; width:100%;" onclick="shareDefenseDetail('${playerName}')">📸 디펜스 상세 기록 스크린샷 공유</button>
<button class="save-btn" style="background:#bdc3c7; margin-top:10px; width:100%; color:#444;" onclick="closeDefenseDetail()">닫기</button>`;

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
captureAndShare('defense-modal-capture-area', 'defense-modal-share-btn', ${name}_defense_detail.png, ``${name}의 디펜스 리포트, ${name} 선수가 방어한 다른 멤버들의 성적 분석 결과입니다!`);
}

function renderDefenseStats() {
let defenseStats = {};
players.forEach(p => defenseStats[p] = { totalNextRank: 0, count: 0 });

gameLogs.forEach(g => {
if (g.startOrder && g.startOrder.length > 0) {
const order = g.startOrder;
const actual = g.ranks.filter(n => n && n.trim() !== "");
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

const activePlayers = players.filter(p => defenseStats[p].count > 0);

activePlayers.sort((a, b) => {
const avgA = defenseStats[a].totalNextRank / defenseStats[a].count;
const avgB = defenseStats[b].totalNextRank / defenseStats[b].count;
return avgB - avgA;
});

const tbody = document.getElementById('defenseBody');
if (!tbody) return;

if (activePlayers.length === 0) {
tbody.innerHTML = <tr&gt;&lt;td colspan="4" style="text-align:center; padding:20px; font-weight:800; color:var(--sub-text);"&gt;데이터가 없습니다.&lt;/td&gt;&lt;/tr>;
return;
}

let currentRank = 1;
let html = '';
activePlayers.forEach((p, index) => {
const avgRank = (defenseStats[p].totalNextRank / defenseStats[p].count).toFixed(2);

if (index > 0) {
const prevP = activePlayers[index - 1];
const prevAvg = (defenseStats[prevP].totalNextRank / defenseStats[prevP].count).toFixed(2);
if (avgRank !== prevAvg) {
currentRank = index + 1;
}
}

let rankLabel = currentRank + '위';
let rankColor = 'var(--text-color)';

if (currentRank === 1) {
rankLabel = '1위🥇';
rankColor = 'var(--rank1)';
} else if (currentRank === 2) {
rankColor = 'var(--rank2)';
} else if (currentRank === 3) {
rankColor = 'var(--rank3)';
} else if (currentRank === activePlayers.length && activePlayers.length > 3) {
rankColor = 'var(--rankL)';
}

html += <tr onclick="showDefenseDetail('${p}')" style="cursor:pointer;">
<td style="color:{rankLabel}</td>
<td style="color:{p}</td>
<td style="color:#5D4037;">{avgRank}위</td>
</tr>`;
});
tbody.innerHTML = html;
}

function shareDefenseResult() {
captureAndShare('defense-capture-area', 'defense-share-btn', 'defense_ranking.png', 'Defense 순위', '멤버별 전체 디펜스 랭킹입니다!');
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
scoreContent.innerHTML = <div style="font-size:clamp(45px, 10vw, 55px); margin-bottom:5px; display:block; text-align:center;"&gt;${playerThemes[name].emoji}</div>
<div style="display:flex; justify-content:center; align-items:center; font-size:clamp(28px, 8vw, 38px); font-weight:900; color:${getPlayerColor(name)}; margin-bottom: 15px;"&gt; ${rank ? rank+'위 ' : ''}${name} &lt;/div&gt; &lt;div style="display:block; font-weight:900;"&gt; &lt;div style="background:var(--bg); padding:12px; border-radius:12px; margin-bottom:8px; display:block;"&gt; &lt;div style="font-size:13px; color:var(--sub-text); margin-bottom:4px;"&gt;총 승점&lt;/div&gt; &lt;div style="font-size:22px; color:var(--rank1);"&gt;${totalScore}점</div>
</div>
<div style="background:var(--bg); padding:12px; border-radius:12px; margin-bottom:8px; display:block;">
<div style="font-size:13px; color:var(--sub-text); margin-bottom:4px;">참여 경기</div>
<div style="font-size:22px; color:var(--rank2);">${allPersonal.length}game&lt;/div&gt; &lt;/div&gt; &lt;div style="background:var(--bg); padding:12px; border-radius:12px; margin-bottom:8px; display:block;"&gt; &lt;div style="font-size:13px; color:var(--sub-text); margin-bottom:4px;"&gt;평균 승점&lt;/div&gt; &lt;div style="font-size:22px; color:var(--accent);"&gt;${avg}점</div>
</div>
</div>`;
scoreModal.style.display = 'flex';
scoreContent.style.animation = 'scaleUpPopup 0.4s forwards';
scoreModalTimeout = setTimeout(() => { closePlayerScoreModal(); }, 3000);
}

let html = <div style="font-size:15px; font-weight:900; color:${getPlayerColor(name)}; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; border-bottom:2px dashed {playerThemes[name].emoji} ${name} 프로필&lt;/div&gt; &lt;div style="font-size:13px; cursor:pointer;" onclick="closeMemberHistory()"&gt;닫기 ✕&lt;/div&gt; &lt;/div>;

const recent = allPersonal.slice(0, 10);
let w10 = 0, l10 = 0;

recent.forEach(g => {
const actual = g.ranks.filter(n => n.trim() !== "");
if(actual.indexOf(name) === 0) w10++;
else if(actual.indexOf(name) === actual.length - 1) l10++;
});

let cond = (w10 / recent.length >= 0.3 && l10 / recent.length >= 0.3) ? ["⚡", "도깨비", "var(--rank3)"] : (w10 / recent.length >= 0.3 ? ["☀️", "최상", "var(--rankL)"] : (l10 / recent.length >= 0.3 ? ["🌧️", "비상", "var(--rank1)"] : ["⛅", "보통", "var(--rank2)"]));

html += <div class="condition-box cond-responsive"&gt; &lt;div style="flex:1; display:flex; flex-direction:column; cursor:pointer;" onclick="showInfoModal('score')"&gt; &lt;div style="font-size:12px; font-weight:900; color:var(--sub-text);"&gt;현재 랭킹 티어&lt;/div&gt; &lt;div style="font-size:12px; font-weight:900; color:var(--sub-text); margin-top:3px;"&gt;(총${totalScore}점 / 평균 {getTier(totalScore).color}; cursor:pointer;" onclick="showInfoModal('tier')">
{getTier(totalScore).name}
</div>
</div>`;

html += <div class="condition-box cond-responsive" onclick="showInfoModal('condition')"&gt; &lt;div style="font-size:12px; flex:1; font-weight:900; color:var(--sub-text);"&gt;최근 컨디션 (${recent.length}G)</div>
<div style="font-size:14px; font-weight:900; color:${cond[2]};"&gt;${cond[0]} ${cond[1]}&lt;/div&gt; &lt;/div>;

html += <button id="member-share-btn" class="share-btn-common" style="margin:15px 0;" onclick="shareMemberResult('${name}')">📸 개인 전적 스크린샷 공유</button>`;

recent.forEach(g => {
const actual = g.ranks.filter(n => n.trim() !== "");
const rIdx = actual.indexOf(name);
const rColor = rIdx === 0 ? 'var(--rank1)' : (rIdx === actual.length - 1 ? 'var(--rankL)' : '#5D4037');
const rLabel = rIdx === 0 ? '1위🥇' : (rIdx === actual.length - 1 ? '꼴찌💀' : (rIdx + 1) + '위');

const sameDateGames = gameLogs.filter(x => x.dateStr === g.dateStr);
const gameNumber = sameDateGames.findIndex(x => x.round === g.round) + 1;

html += <div class="history-item"&gt; &lt;div style="font-size:14px; color:#5D4037;"&gt;${g.dateStr} <span style="font-size:12px; font-weight:900; color:var(--rank1); margin-left:6px;">{rColor};">${rLabel}&lt;/div&gt; &lt;/div>;
});

area.innerHTML = html;
area.style.display = 'block';
area.style.border = 2.5px solid${getPlayerColor(name)}`;
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
captureAndShare('stats-capture-area', 'stats-share-btn', stats_record.png, '멤버별 누적 전적', '멤버별 누적 전적 결과입니다!');
}

function shareMemberResult(name) {
captureAndShare('memberHistory-capture-area', 'member-share-btn', ${name}_history.png, ``${name}의 전적, ${name} 선수의 경기 결과입니다!`);
}

function changeZoom(v) {
document.body.style.zoom = v;
if(v === '1.2') document.body.classList.add('zoom-active');
else document.body.classList.remove('zoom-active');
}

function showGenseiModal(playerName) {
const gamesToday = gameLogs.filter(g => g.dateStr === selectedDateStr);
let victims = [];

gamesToday.forEach(g => {
if (g.startOrder && g.startOrder.length > 0) {
const order = g.startOrder;
const pIdx = order.indexOf(playerName);
if (pIdx !== -1) {
const nextP = order[(pIdx + 1) % order.length];
const actual = g.ranks.filter(n => n && n.trim() !== "");
const nextPRankIdx = actual.indexOf(nextP);
if (nextPRankIdx !== -1) {
victims.push({
round: g.round,
victimName: nextP,
victimRank: nextPRankIdx + 1,
actual: actual
});
}
}
}
});

if (victims.length === 0) return;

let html = <div style="font-size:40px; margin-bottom:10px; display:block; text-align:center;"&gt;😈&lt;/div&gt; &lt;div style="font-size:18px; font-weight:900; color:var(--text-color); margin-bottom:5px; display:block; text-align:center;"&gt;${playerName}의 겐세이 희생양들</div>
<div style="font-size:14px; font-weight:800; color:var(--sub-text); margin-bottom: 20px; display:block; text-align:center;">[ ${selectedDateStr} ] 뒷주자 성적&lt;/div&gt; &lt;div style="display:block; font-weight:900;">;

victims.forEach((v) => {
const rankColor = v.victimRank === 1 ? 'var(--rank1)' : (v.victimRank === v.actual.length ? 'var(--rankL)' : 'var(--text-color)');
const rankLabel = v.victimRank === 1 ? '1위🥇' : (v.victimRank === v.actual.length ? '꼴찌💀' : ``${v.victimRank}위`);

const sameDateGames = gameLogs.filter(x => x.dateStr === selectedDateStr);
const gameNumber = sameDateGames.findIndex(x => x.round === v.round) + 1;

html += <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.4); padding:12px 20px; border-radius:15px; border:1px solid rgba(0,0,0,0.05); box-shadow: inset 1px 1px 3px rgba(255,255,255,0.7); margin-bottom:8px;"&gt; &lt;div style="color:var(--sub-text); font-size:12px; font-weight:800; width: 30px; text-align: left;"&gt;${gameNumber}G</div>
<div style="color:${getPlayerColor(v.victimName)}; font-size:16px; font-weight:900; flex: 1; text-align: center;"&gt;${v.victimName}</div>
<div style="color:${rankColor}; font-size:16px; font-weight:900; width: 50px; text-align: right;"&gt;${rankLabel}</div>
</div>`;
});

html += </div&gt; &lt;div style="margin-top:15px; font-size:12px; color:var(--sub-text); font-weight:800; display:block; text-align:center;"&gt;※${playerName} 선수의 바로 다음 순서<br>선수들의 결과입니다.</div>
<div id="gensei-countdown-text" style="margin-top:15px; font-size:12px; color:#999; font-weight:800; text-align:center; display:block;">10초 후 자동으로 닫힙니다.</div>`;

const modal = document.getElementById('gensei-modal');
const content = document.getElementById('gensei-modal-content');

if(!modal || !content) return;

content.innerHTML = html;
modal.style.display = 'flex';
content.style.animation = 'scaleUpPopup 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';

if (genseiCountdownInterval) clearInterval(genseiCountdownInterval);
let gLeft = 10;
genseiCountdownInterval = setInterval(() => {
gLeft--;
const gCountEl = document.getElementById('gensei-countdown-text');
if (gCountEl) gCountEl.innerText = ${gLeft}초 후 자동으로 닫힙니다.`;
if (gLeft <= 0) {
clearInterval(genseiCountdownInterval);
closeGenseiModal();
}
}, 1000);
}

function closeGenseiModal() {
const modal = document.getElementById('gensei-modal');
const content = document.getElementById('gensei-modal-content');
if (genseiCountdownInterval) { clearInterval(genseiCountdownInterval); genseiCountdownInterval = null; }
if(!modal || !content) return;
content.style.animation = 'scaleDownPopup 0.3s ease-in forwards';
setTimeout(() => { modal.style.display = 'none'; content.style.animation = 'none'; }, 300);
}

function renderTodayMVP() {
const gamesToday = gameLogs.filter(g => g.dateStr === selectedDateStr);
const area = document.getElementById('mvpArea');
if (gamesToday.length < 1) {
area.style.display = 'none';
return;
}

let stats = {};
let genseiStats = {};

gamesToday.forEach(g => {
const actual = g.ranks.filter(n => n && n.trim() !== "");
actual.forEach((name, idx) => {
if (!stats[name]) stats[name] = { wins: 0, played: 0, lasts: 0 };
stats[name].played++;
if (idx === 0) stats[name].wins++;
if (idx === actual.length - 1 && actual.length > 1) stats[name].lasts++;
});

if (g.startOrder && g.startOrder.length > 0) {
const order = g.startOrder;
for (let i = 0; i < order.length; i++) {
const preP = order[i];
const nextP = order[(i + 1) % order.length];
const nextPRankIdx = actual.indexOf(nextP);

if (nextPRankIdx !== -1) {
if (!genseiStats[preP]) genseiStats[preP] = { nextTotalRank: 0, count: 0, allLast: true };
genseiStats[preP].nextTotalRank += (nextPRankIdx + 1);
genseiStats[preP].count++;
if (nextPRankIdx !== actual.length - 1 || actual.length <= 1) {
genseiStats[preP].allLast = false;
}
}
}
}
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

let genseiMVP = null;
let maxAvgNextRank = -1;
let genseiDesc = "";
const genseiCandidates = Object.keys(genseiStats);

if (genseiCandidates.length > 0) {
genseiMVP = genseiCandidates.reduce((a, b) => {
const avgA = genseiStats[a].nextTotalRank / genseiStats[a].count;
const avgB = genseiStats[b].nextTotalRank / genseiStats[b].count;
return avgA > avgB ? a : b;
});
if (genseiStats[genseiMVP].allLast) {
genseiDesc = 뒷주자&lt;br&gt;평균 꼴찌;
} else {
maxAvgNextRank = (genseiStats[genseiMVP].nextTotalRank / genseiStats[genseiMVP].count).toFixed(1);
genseiDesc = 뒷주자&lt;br&gt;평균${maxAvgNextRank}위`;
}
}

let html = <div style="text-align:center; font-weight:900; font-size:14px; color:var(--rank1); margin-bottom:5px;"&gt;🏆 오늘의 MVP 분석&lt;/div&gt; &lt;div class="mvp-badge"&gt; &lt;span class="mvp-title"&gt;🔥 승부사&lt;/span&gt; &lt;span class="mvp-player"&gt;${winner}</span>
<span class="mvp-value">${stats[winner].wins}승 / ${stats[winner].played}전</span>
</div>
<div class="mvp-badge">
<span class="mvp-title">🏃 열정왕</span>
<span class="mvp-player">${worker}&lt;/span&gt; &lt;span class="mvp-value"&gt;${stats[worker].played}경기</span>
</div>
<div class="mvp-badge">
<span class="mvp-title">🛡️ 생존자</span>
<span class="mvp-player">${survivor}&lt;/span&gt; &lt;span class="mvp-value"&gt;꼴찌 단 ${stats[survivor].lasts}회</span>
</div>`;

if (genseiMVP) {
html += <div class="mvp-badge" onclick="showGenseiModal('${genseiMVP}')" style="cursor: pointer; border: 1.5px dashed var(--edit);">
<span class="mvp-title">😈 겐세이</span>
<span class="mvp-player" style="color: var(--edit); text-decoration: underline;">{genseiDesc}</span>
</div>`;
}

area.innerHTML = html;
area.style.display = 'flex';
}

function renderGameList() {
const games = gameLogs.filter(g => g.dateStr === selectedDateStr);
const area = document.getElementById('dayGameList');
renderTodayMVP();

if(games.length > 0) {
let html = <div id="record-header-wrap" style="text-align:center; margin:25px 0 10px 0;"&gt;&lt;span style="font-size:12px; color:#999; font-weight:800;"&gt;DAY'S RECORD&lt;/span&gt;&lt;/div&gt; &lt;button id="today-share-btn" class="share-btn-common" style="margin-bottom:15px;" onclick="shareTodayResult()"&gt;📸 오늘의 전적 스크린샷 공유&lt;/button>;

games.forEach((g, idx) => {
const names = g.ranks.filter(n => n && n.trim() !== "");
html += <div class="game-item" onclick="toggleActionOverlay(this)"&gt; &lt;div class="game-info"&gt; &lt;span&gt;${idx+1}G</span>
<div style="display:inline-flex; align-items:center;">${generateNamesHTML(names)}&lt;/div&gt; &lt;/div&gt; &lt;div class="action-overlay"&gt; &lt;div class="overlay-btn btn-edit-p" onclick="event.stopPropagation(); enterEditMode(${g.round}, '${names.join(',')}')"&gt;수정&lt;/div&gt; &lt;div class="overlay-btn btn-del-p" onclick="event.stopPropagation(); deleteGame(${g.round})">삭제</div>
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
captureAndShare('capture-area', 'today-share-btn', today_record_${selectedDateStr}.png, '오늘의 전적',${selectedDateStr} 경기 결과!);
}

function shareSearchResult() {
captureAndShare('search-capture-area', 'search-share-btn', search_record.png, '월별 검색 결과', '당구 전적 검색 결과!');
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
document.body.innerHTML = <div style="background:linear-gradient(135deg, #4a90e2, #9370db); height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; color:white; text-align:center; font-family: 'Pretendard', sans-serif;"&gt; &lt;div style="font-size:60px; margin-bottom:20px;"&gt;👋&lt;/div&gt; &lt;div style="font-size:20px; font-weight:900; line-height:1.6;"&gt;앱 종료&lt;/div&gt; &lt;div style="font-size:14px; margin-top:30px; opacity:0.8;"&gt;다음에 또 봐!&lt;/div&gt; &lt;/div>;
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
link.download = billiard_backup_${new Date().toLocaleDateString('sv-SE')}.json`;
link.click();
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
if (!confirm(백업 파일에서 ${importedData.length}개의 데이터를 발견했습니다.\n전체 복구를 진행하시겠습니까?)) { event.target.value = ''; return; } showLoading(true, "기존 데이터 초기화 중..."); await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "RESET" }) }); for (let i = 0; i &lt; importedData.length; i++) { showLoading(true,데이터 복구 중... (${i + 1} / ${importedData.length})`);
const game = importedData[i];
const ranks = game.ranks || [];
const payload = { action: "SAVE", date: game.dateStr, ranks: [ranks[0] || "", ranks[1] || "", ranks[2] || "", ranks[3] || "", ranks[4] || ""], startOrder: game.startOrder || null };
await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
}
alert("데이터 복구가 성공적으로 완료되었습니다!");
event.target.value = '';
showLoading(true, "최신 데이터 불러오는 중...");
await fetchData();
} catch (err) {
alert("복구 중 오류가 발생했습니다.\n오류 내용: " + err.message);
showLoading(false);
event.target.value = '';
}
};
reader.readAsText(file);
}

function setDefaultSearchDates() { if (searchFlatpickr) searchFlatpickr.setDate(new Date()); }

// [v5.60 Fix] 누락되었던 리셋 버튼 함수 추가
function resetSearch() {
const searchDateEl = document.getElementById('searchDateRange');
const searchPlayerEl = document.getElementById('searchPlayer');
const sArea = document.getElementById('searchSummaryArea');
const lArea = document.getElementById('searchHistoryListArea');
const shareBtn = document.getElementById('search-share-btn');

if (searchDateEl) {
searchDateEl.value = '';
if (searchFlatpickr) searchFlatpickr.clear();
}
if (searchPlayerEl) searchPlayerEl.selectedIndex = 0;
if (sArea) {
sArea.innerHTML = '';
sArea.style.display = 'none';
}
if (lArea) {
lArea.innerHTML = '';
lArea.style.display = 'none';
}
if (shareBtn) shareBtn.style.display = 'none';

setDefaultSearchDates();
}

function searchRecords() {
const mon = document.getElementById('searchDateRange').value;
const player = document.getElementById('searchPlayer').value;
if(!mon || !player) return alert("검색월과 선수를 선택해줘!");

const filtered = gameLogs.filter(g => g.dateStr.startsWith(mon) && g.ranks.includes(player));
filtered.sort((a, b) => (new Date(b.dateStr) - new Date(a.dateStr)) || ((parseInt(b.round) || 0) - (parseInt(a.round) || 0)));

const sArea = document.getElementById('searchSummaryArea');
const lArea = document.getElementById('searchHistoryListArea');

if(filtered.length === 0) {
sArea.innerHTML = <div class="empty-search-msg" style="text-align:center; padding:20px; font-weight:800; color:var(--sub-text);"&gt;기록 없음&lt;/div>;
sArea.style.display = 'block'; lArea.style.display = 'none';
document.getElementById('search-share-btn').style.display = 'none'; return;
}

let r = [0, 0, 0, 0, 0];
let monthlyTotalScore = 0;

filtered.forEach(g => {
const actual = g.ranks.filter(n => n.trim() !== "");
const rIdx = actual.indexOf(player);
if (rIdx === actual.length - 1 && actual.length > 1) r[4]++;
else if (rIdx < 4) r[rIdx]++;
monthlyTotalScore += getEarnedScore(rIdx, actual.length);
});

let monthlyAvgScore = filtered.length > 0 ? (monthlyTotalScore / filtered.length).toFixed(2) : "0.00";
let winRateFloat = filtered.length > 0 ? ((r[0] / filtered.length) * 100).toFixed(1) : "0.0";
let safetyRate = filtered.length > 0 ? Math.round(((filtered.length - r[4]) / filtered.length) * 100) : 0;
let othersCount = filtered.length - r[0] - r[4];

let monthlyStatsAll = {};
players.forEach(p => monthlyStatsAll[p] = { played: 0, score: 0, win: 0 });

const allGamesThisMonth = gameLogs.filter(g => g.dateStr.startsWith(mon));
allGamesThisMonth.forEach(g => {
const actual = g.ranks.filter(n => n.trim() !== "");
actual.forEach((pName, idx) => {
if (monthlyStatsAll[pName]) {
monthlyStatsAll[pName].played++;
monthlyStatsAll[pName].score += getEarnedScore(idx, actual.length);
if (idx === 0) monthlyStatsAll[pName].win++;
}
});
});

const monthlyRankedPlayers = [...players].sort((a,b) =>
(monthlyStatsAll[b].score/monthlyStatsAll[b].played || 0) - (monthlyStatsAll[a].score/monthlyStatsAll[a].played || 0) || monthlyStatsAll[b].win - monthlyStatsAll[a].win
);

let myMonthlyRank = 1;
let currentRank = 1;
for (let i = 0; i < monthlyRankedPlayers.length; i++) {
const p = monthlyRankedPlayers[i];
if (i > 0) {
const prevP = monthlyRankedPlayers[i - 1];
if ((monthlyStatsAll[p].score/monthlyStatsAll[p].played || 0) !== (monthlyStatsAll[prevP].score/monthlyStatsAll[prevP].played || 0) || monthlyStatsAll[p].win !== monthlyStatsAll[prevP].win) {
currentRank = i + 1;
}
}
if (p === player) {
myMonthlyRank = currentRank;
break;
}
}

const tier = getTier(monthlyTotalScore);
const wRatio = filtered.length > 0 ? r[0] / filtered.length : 0;
const lRatio = filtered.length > 0 ? r[4] / filtered.length : 0;
let cond = (wRatio >= 0.3 && lRatio >= 0.3) ? ["⚡", "도깨비", "var(--rank3)"] : (wRatio >= 0.3 ? ["☀️", "최상", "var(--rankL)"] : (lRatio >= 0.3 ? ["🌧️", "비상", "var(--rank1)"] : ["⛅", "보통", "var(--rank2)"]));

sArea.innerHTML = <div class="summary-box" style="margin: 0 -5px; box-sizing: border-box; background:var(--record-bg); border:2px solid var(--record-border); border-radius:15px; padding:15px 10px;"&gt; &lt;div style="text-align:center; font-weight:900; color:var(--text-color); margin-bottom:15px; font-size:15px; letter-spacing:-0.5px;"&gt;[${player}, {filtered.length}전</div></div>
<div><div style="font-size: 11px; font-weight: 800; color: var(--rank1); margin-bottom: 4px;">1위</div><div style="font-size: 14px; font-weight: 900; color: var(--rank1);">{othersCount}회</div></div>
<div><div style="font-size: 11px; font-weight: 800; color: var(--rankL); margin-bottom: 4px;">꼴찌</div><div style="font-size: 14px; font-weight: 900; color: var(--rankL);">{winRateFloat}%</div></div>
</div>
<div style="border-top: 1px dashed var(--record-border); margin: 12px 0;"></div>
<div style="display: flex; justify-content: space-around; text-align: center;">
<div><div style="font-size: 11px; font-weight: 800; color: var(--rankL); margin-bottom: 4px;">월간순위</div><div style="font-size: 14px; font-weight: 900; color: var(--rankL);">{monthlyTotalScore}점 <span style="font-size:11px; color:var(--sub-text);">({tier.color};">{tier.name}</div></div>
<div><div style="font-size: 11px; font-weight: 800; color: var(--sub-text); margin-bottom: 4px;">컨디션</div><div style="font-size: 14px; font-weight: 900; color: {cond[0]}${cond[1]}&lt;/div&gt;&lt;/div&gt; &lt;/div&gt; &lt;/div>;

lArea.innerHTML = <div style="max-height:250px; overflow-y:auto; padding-right:5px; margin-top:15px;"&gt;${filtered.map(g => {
const actual = g.ranks.filter(n=>n.trim()!=='');
const rankIndex = actual.indexOf(player);
const rankColor = rankIndex === 0 ? 'darkblue' : (rankIndex === actual.length-1 ? 'red' : 'var(--text-color)');
const rankLabel = rankIndex === 0 ? '1위🥇' : (rankIndex === actual.length-1 ? '꼴찌💀' : (rankIndex+1)+'위');
const sameDateGames = gameLogs.filter(x => x.dateStr === g.dateStr);
const gameNumber = sameDateGames.findIndex(x => x.round === g.round) + 1;
return <div class="history-item search-result-card" style="flex-direction:column; align-items:flex-start; gap:5px;"&gt; &lt;div style="display:flex; justify-content:space-between; width:100%;"&gt; &lt;div style="font-size:13px; color:var(--sub-text);"&gt;${g.dateStr} <span style="font-size:12px; font-weight:900; color:var(--rank1); margin-left:6px;">${gameNumber}G&lt;/span&gt;&lt;/div&gt; &lt;div style="font-size:14px; font-weight:900; color:${rankColor};">${rankLabel}&lt;/div&gt; &lt;/div&gt; &lt;div style="font-size:12px; display:inline-flex; align-items:center;"&gt;${generateNamesHTML(actual)}&lt;/div&gt; &lt;/div>;
}).join('')}
</div>`;

sArea.style.display = 'block'; lArea.style.display = 'block';
document.getElementById('search-share-btn').style.display = 'block';
setTimeout(() => { const target = document.getElementById('search-capture-area'); if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
}

window.onload = () => {
try {
searchFlatpickr = flatpickr("#searchDateRange", {
plugins: [new monthSelectPlugin({shorthand: true, dateFormat: "Y-m", altFormat: "Y-m"})],
locale: "ko", disableMobile: true,
onChange: function(selectedDates, dateStr, instance) {
if (dateStr) {
const hasRecord = gameLogs.some(g => g.dateStr.startsWith(dateStr));
if (!hasRecord) {
const toast = document.getElementById('toast'); toast.innerText = "게임 기록 없음"; toast.style.display = 'block';
setTimeout(() => { toast.style.display = 'none'; setDefaultSearchDates(); }, 3000);
}
}
}
});
} catch(e) {
console.error("Flatpickr initialization failed", e);
}

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
if(!e.target.closest('.game-item')) closeAllOverlays();
});