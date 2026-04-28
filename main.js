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
${targetPlayers.map(p =&gt;<option value="{preFill && preFill[i-1] === p ? 'selected' : ''}>${p}</option>).join('')} &lt;/select&gt; &lt;/div>;
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

function analyzeStrategy() { /* 상성 분석 로직 */ }

// [v5.60 Fix] 리셋 버튼 클릭 시 검색 필드와 결과를 초기화하는 로직
function resetSearch() {
const dateInput = document.getElementById('searchDateRange');
const playerInput = document.getElementById('searchPlayer');
const sArea = document.getElementById('searchSummaryArea');
const lArea = document.getElementById('searchHistoryListArea');
const shareBtn = document.getElementById('search-share-btn');

if(dateInput) dateInput.value = '';
if(playerInput) playerInput.value = '';
if(sArea) { sArea.innerHTML = ''; sArea.style.display = 'none'; }
if(lArea) { lArea.innerHTML = ''; lArea.style.display = 'none'; }
if(shareBtn) shareBtn.style.display = 'none';

setDefaultSearchDates();
}

function searchRecords() { /* 검색 로직 */ }
function setDefaultSearchDates() { if (searchFlatpickr) searchFlatpickr.setDate(new Date()); }

function showLoading(v, t) {
document.getElementById('loadingText').innerText = t;
document.getElementById('loading').style.display = v ? 'flex' : 'none';
}

function changeMonth(v) {
currentViewDate.setMonth(currentViewDate.getMonth() + v);
renderCalendar();
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
if(!e.target.closest('.game-item')) {
const overlays = document.querySelectorAll('.action-overlay');
overlays.forEach(o => o.classList.remove('active'));
}
});