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
const canvas = await html2canvas(ghostWrapper, { backgroundColor: getCaptureBgColor(), scale: 2, logging: false, useCORS: true });
const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
const file = new File([blob], fileName, { type: 'image/png' });
if (navigator.share) {
try { await navigator.share({ files: [file], title: shareTitle, text: shareText }); } catch (e) { }
} else {
const link = document.createElement('a');
link.href = URL.createObjectURL(blob);
link.download = fileName;
link.click();
}
} catch (err) {
alert("캡처 중 오류 발생");
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
desc = "<b>(1위 횟수 / 참여 경기수) × 100</b><br><br>해당 월에 참여한 전체 경기 중 1위를 차지한 비율입니다.";
} else if (type === 'score') {
title = "평균득점 산출 기준";
desc = "해당 선수의 월간 평균 승점입니다.";
} else if (type === 'safety') {
title = "생존율 산출 기준";
desc = "<b>((경기수 - 꼴찌수) / 경기수) × 100</b>";
}
document.getElementById('info-modal-icon').innerHTML = "ℹ️";
document.getElementById('info-modal-title').innerHTML = title;
document.getElementById('info-modal-desc').innerHTML = desc;
document.getElementById('info-modal').style.display = 'flex';
}

function showInfoModal(type) {
let title = "", desc = "", icon = "";
if (type === 'score') { icon = "📊"; title = "인원별 차등 승점 기준"; desc = "• 2인: 1위(+2), 꼴찌(0)<br>• 3인: 1위(+3), 2위(+1), 꼴찌(0)"; }
else if (type === 'tier') { icon = "🏅"; title = "랭킹 티어(계급) 기준"; desc = "👑챌린저: 60+"; }
else if (type === 'condition') { icon = "🌡️"; title = "최근 컨디션 분석 기준"; desc = "• ☀️최상: 1위 비율 30%↑"; }
document.getElementById('info-modal-icon').innerHTML = icon;
document.getElementById('info-modal-title').innerHTML = title;
document.getElementById('info-modal-desc').innerHTML = desc;
document.getElementById('info-modal').style.display = 'flex';
}

function closeInfoModal() { document.getElementById('info-modal').style.display = 'none'; }

function showLastGameResult() {
if (!gameLogs || gameLogs.length === 0) return;
const latestDate = gameLogs.reduce((max, game) => (game.dateStr > max ? game.dateStr : max), gameLogs[0].dateStr);
const lastGame = gameLogs.filter(g => g.dateStr === latestDate).slice(-1)[0];
const actualRanks = lastGame.ranks.filter(n => n && n.trim() !== "");
let html = <div style="text-align:center;"&gt;🏆 LAST RECORD [ ${lastGame.dateStr} ]</div>; actualRanks.forEach((name, i) =&gt; { html +=<div>${i+1}위: ${name}</div>`; });
const modal = document.getElementById('last-game-modal');
const content = document.getElementById('last-game-content');
if(!modal || !content) return;
content.innerHTML = html; modal.style.display = 'flex';
setTimeout(() => { modal.style.display = 'none'; }, 3000);
}

function focusOnDrawCard() { setTimeout(() => { const el = document.getElementById('drawCardArea'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 150); }

function togglePlayerSelection(el, name) {
if (selectedPlayersForLottery.includes(name)) { selectedPlayersForLottery = selectedPlayersForLottery.filter(p => p !== name); el.classList.remove('active'); }
else {
const limit = parseInt(document.getElementById('playerCount').value);
if (selectedPlayersForLottery.length >= limit) return alert(인원 초과);
selectedPlayersForLottery.push(name); el.classList.add('active');
}
if(!editMode) updateInputFields();
}

function resetPlayerSelection() { selectedPlayersForLottery = []; document.querySelectorAll('.player-chip').forEach(el => el.classList.remove('active')); if(!editMode) updateInputFields(); }

function pickRandomOrder() {
const limit = parseInt(document.getElementById('playerCount').value);
if (selectedPlayersForLottery.length !== limit) return alert(``${limit}명을 선택해줘!`);
let pool = [...selectedPlayersForLottery].sort(() => Math.random() - 0.5);
lastDrawnPlayers = [...pool]; currentStartOrder = [...pool];
document.getElementById('order-result').innerText = pool.join(' → ');
document.getElementById('order-modal').style.display = 'flex';
}

function closeOrderModal() {
document.getElementById('order-modal').style.display = 'none';
lastDrawnPlayers.forEach((name, idx) => { document.getElementById('rank' + (idx + 1)).value = name; });
checkDuplicates();
}

function closeGraphModal() { document.getElementById('graph-modal').style.display = 'none'; }
function closePlayerScoreModal() { document.getElementById('player-score-modal').style.display = 'none'; }

function changeAppTheme() { const theme = document.getElementById('themeSelect').value; document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('appTheme', theme); renderStats(); }
function formatDate(dateInput) { const d = new Date(dateInput); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

async function fetchData() {
showLoading(true, "동기화 중");
try {
const response = await fetch(${GAS_URL}?t=${new Date().getTime()});
const rawData = await response.json();
gameLogs = rawData.map(g => ({ ...g, dateStr: formatDate(g.date) }));
renderAll();
} catch (e) { console.error(e); }
finally { showLoading(false); document.getElementById('selectedDateTitle').innerText = 📅 ${selectedDateStr}`; }
}

function renderAll() { renderCalendar(); renderStats(); renderDefenseStats(); renderGameList(); analyzeStrategy(); }
function isHoliday(year, month, day) { return ["1-1", "3-1", "5-5", "12-25"].includes(``${month + 1}-${day}); }

function renderCalendar() {
const grid = document.getElementById('calendarGrid');
if(!grid) return;
grid.innerHTML = "";
const year = currentViewDate.getFullYear(); const month = currentViewDate.getMonth();
document.getElementById('monthDisplay').innerText = ``${year}년 latex
{month + 1}월`; const firstDay = new Date(year, month, 1).getDay(); const lastDate = new Date(year, month + 1, 0).getDate(); for (let i = 0; i &lt; firstDay; i++) grid.innerHTML += `<div&gt;&lt;/div>`; for (let d = 1; d &lt;= lastDate; d++) { const dStr = formatDate(new Date(year, month, d)); grid.innerHTML += `<div class="day 

{dStr === selectedDateStr ? 'selected' : ''}" onclick="selectDate('{d}</div>`;
}
}

function selectDate(dateStr) { selectedDateStr = dateStr; document.getElementById('selectedDateTitle').innerText = 📅 ${dateStr}`; renderCalendar(); renderGameList(); }
function checkDuplicates() { const selects = Array.from(document.querySelectorAll('#inputArea select')); selects.forEach(s => s.classList.remove('duplicate-error')); }

function updateInputFields(preFill = null) {
const count = parseInt(document.getElementById('playerCount').value);
const inputArea = document.getElementById('inputArea');
if(!inputArea) return;
inputArea.innerHTML = "";
for(let i=1; i<=count; i++) {
inputArea.innerHTML += <div class="input-row"&gt;&lt;label&gt;${i}위</label><select id="rank{players.map(p => <option value="${p}">${p}&lt;/option>).join('')}</select></div>`;
}
}

function resetInputs() { resetPlayerSelection(); updateInputFields(); }

async function saveGame() {
const count = parseInt(document.getElementById('playerCount').value);
const ranks = [];
for(let i=1; i<=count; i++) ranks.push(document.getElementById('rank'+i).value);
showLoading(true, "저장 중");
try {
await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "SAVE", date: selectedDateStr, ranks: ranks, startOrder: currentStartOrder }) });
fetchData();
} catch (e) { alert("저장 실패"); showLoading(false); }
}

function analyzeStrategy() { /* 상성 분석 로직 */ }
function confirmReset(step) { if(confirm("초기화할까요?")) executeReset(); }
async function executeReset() { showLoading(true, "초기화 중"); await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: "RESET" }) }); location.reload(); }

function toggleAllMode() { isPercentMode = !isPercentMode; renderStats(); }

function renderStats() {
const sorted = [...players];
document.getElementById('statsBody').innerHTML = sorted.map(p => <tr&gt;&lt;td&gt;${p}&lt;/td&gt;&lt;td&gt;0&lt;/td&gt;&lt;td&gt;0&lt;/td&gt;&lt;td&gt;0%&lt;/td&gt;&lt;/tr>).join('');
}

function renderDefenseStats() { /* 방어 순위 로직 / }
function renderGameList() { / 게임 리스트 로직 */ }

// [v5.60 Fix] 리셋 버튼 함수 추가
function resetSearch() {
const dateInput = document.getElementById('searchDateRange');
const playerInput = document.getElementById('searchPlayer');
const sArea = document.getElementById('searchSummaryArea');
const lArea = document.getElementById('searchHistoryListArea');
if(dateInput) dateInput.value = '';
if(playerInput) playerInput.value = '';
if(sArea) sArea.style.display = 'none';
if(lArea) lArea.style.display = 'none';
if(document.getElementById('search-share-btn')) document.getElementById('search-share-btn').style.display = 'none';
setDefaultSearchDates();
}

function searchRecords() { /* 검색 로직 */ }
function setDefaultSearchDates() { if (searchFlatpickr) searchFlatpickr.setDate(new Date()); }

function showLoading(v, t) { const el = document.getElementById('loading'); if(el) el.style.display = v ? 'flex' : 'none'; }
function changeMonth(v) { currentViewDate.setMonth(currentViewDate.getMonth() + v); renderCalendar(); }

// 웰컴 화면 강제 종료 (무조건 3.5초 뒤 실행되도록 보장)
setTimeout(() => {
const ws = document.getElementById('welcome-screen');
if(ws) { ws.style.opacity = '0'; setTimeout(() => { ws.style.display = 'none'; }, 800); }
showLastGameResult();
}, 3500);

window.onload = () => {
try {
searchFlatpickr = flatpickr("#searchDateRange", { plugins: [new monthSelectPlugin({shorthand: true, dateFormat: "Y-m"})], locale: "ko" });
} catch(e) { console.error(e); }
let savedTheme = localStorage.getItem('appTheme') || 'yellow';
document.documentElement.setAttribute('data-theme', savedTheme);
updateInputFields(); setDefaultSearchDates(); fetchData();
};

document.addEventListener('click', (e) => {
if(!e.target.closest('.game-item')) {
document.querySelectorAll('.action-overlay').forEach(o => o.classList.remove('active'));
}
});