// app.js — HPNY 2026 (Năm Ngọ)
// HƯỚNG A (dễ): không server/gmail, lưu bằng localStorage
// Flow:
// 1) Mở thiệp trước
// 2) Gửi lời chúc thành công -> unlock "Nhận lộc"
// 3) Mỗi người chơi 1 lần
// 4) Owner có nút "Cho chơi lại 🎡" (reset local trên máy hiện tại)

// ===== Helpers =====
const $ = (id) => document.getElementById(id);

function pad2(n){
  n = Math.max(0, Number(n||0));
  return String(n).padStart(2, "0");
}

function removeDiacritics(str){
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function hashStringFNV1a(str){
  let h = 0x811c9dc5;
  const s = String(str || "");
  for (let i=0;i<s.length;i++){
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, (m) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}

function formatMoneyVND(amount){
  const n = Math.round(Number(amount||0));
  if (!Number.isFinite(n) || n <= 0) return "0đ";
  return n.toLocaleString("vi-VN") + "đ";
}

// ===== Countdown (Tết 2026) =====
const TET_TARGET_MS = new Date('2026-02-17T00:00:00+07:00').getTime();

function initCountdown(){
  const elBig = { d: $("cdDays"), h: $("cdHours"), m: $("cdMinutes"), s: $("cdSeconds") };
  const elMini1 = { d: $("cdMiniDays"), h: $("cdMiniHours"), m: $("cdMiniMinutes"), s: $("cdMiniSeconds") };
  const elMini2 = { d: $("cdMiniDays2"), h: $("cdMiniHours2"), m: $("cdMiniMinutes2"), s: $("cdMiniSeconds2") };

  function setNum(el, val, pad=false){
    if (!el) return;
    el.textContent = pad ? pad2(val) : String(Math.max(0, val));
  }

  function tick(){
    const now = Date.now();
    let diff = TET_TARGET_MS - now;
    if (!Number.isFinite(diff)) diff = 0;

    if (diff <= 0){
      [elBig, elMini1, elMini2].forEach(g => {
        setNum(g.d, 0);
        setNum(g.h, 0, true);
        setNum(g.m, 0, true);
        setNum(g.s, 0, true);
      });
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
    const minutes = Math.floor(diff / (1000 * 60)) % 60;
    const seconds = Math.floor(diff / 1000) % 60;

    [elBig, elMini1, elMini2].forEach(g => {
      setNum(g.d, days);
      setNum(g.h, hours, true);
      setNum(g.m, minutes, true);
      setNum(g.s, seconds, true);
    });
  }

  tick();
  setInterval(tick, 1000);
}

// ===== Decorative petals =====
function initPetals(){
  const container = $("petals");
  if (!container) return;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  const COUNT = Math.min(28, Math.max(16, Math.floor(window.innerWidth / 55)));
  container.innerHTML = "";

  for (let i=0;i<COUNT;i++){
    const p = document.createElement('div');
    p.className = 'petal';

    const x = Math.floor(Math.random() * 100);
    const drift = (Math.random() * 30 - 15);
    const dur = (12 + Math.random() * 12);
    const rot = (Math.random() * 720 - 360);
    const delay = -(Math.random() * dur);
    const size = 12 + Math.random() * 14;

    p.style.setProperty('--x', x + 'vw');
    p.style.setProperty('--drift', drift + 'vw');
    p.style.setProperty('--dur', dur + 's');
    p.style.setProperty('--rot', rot + 'deg');
    p.style.left = x + 'vw';
    p.style.top = '-12vh';
    p.style.animationDelay = delay + 's';
    p.style.width = size + 'px';
    p.style.height = size + 'px';

    container.appendChild(p);
  }
}

// ===== Demo mode =====
function isDemoMode(){
  return window.DEMO_MODE === true;
}
function getDemoBannerText(){
  return String(window.DEMO_BANNER_TEXT || "DEMO MODE").trim();
}
function demoLookup(map, person){
  if (!map || typeof map !== 'object') return null;
  const key = removeDiacritics(person?.key || "");
  const label = removeDiacritics(person?.label || "");

  if (key && map[key] != null) return map[key];
  if (label && map[label] != null) return map[label];

  const combo = removeDiacritics(`${person?.key||""} ${person?.label||""}`);
  if (combo && map[combo] != null) return map[combo];

  if (map.default != null) return map.default;
  return null;
}

// ===== Post-login flow =====
const flow = $("flow");
const demoBanner = $("demoBanner");

const stageIntro = $("stageIntro");
const stageBank = $("stageBank");
const stageWheel = $("stageWheel");
const stageFortune = $("stageFortune");

const btnIntroStart = $("btnIntroStart");
const btnBankConfirm = $("btnBankConfirm");
const btnBankBack = $("btnBankBack");
const btnWheelBack = $("btnWheelBack");
const btnSpin = $("btnSpin");
const btnWheelNext = $("btnWheelNext");
const btnFortuneBack = $("btnFortuneBack");
const btnShake = $("btnShake");
const btnFinish = $("btnFinish");

const bankName = $("bankName");
const bankAccount = $("bankAccount");
const bankNote = $("bankNote");

const wheelEl = $("wheel");
const wheelResultEl = $("wheelResult");

const envelope = $("envelope");
const fortuneMoney = $("fortuneMoney");
const fortuneMsg = $("fortuneMsg");
const fortuneMeta = $("fortuneMeta");

let flowState = {
  active: false,
  personKey: "",
  bankConfirmed: false,
  wheelDone: false,
  wheelOutcome: null,
  fortuneDone: false,
};

const BANK_STORAGE_PREFIX = 'hpny2026_bank_';

function showFlow(){
  if (!flow) return;
  flow.classList.remove('hidden');
  flowState.active = true;
}
function hideFlow(){
  if (!flow) return;
  flow.classList.add('hidden');
  flowState.active = false;
}
function showStage(stageEl){
  [stageIntro, stageBank, stageWheel, stageFortune].forEach(s => s?.classList.add('hidden'));
  stageEl?.classList.remove('hidden');
}
function setDemoBannerVisible(){
  if (!demoBanner) return;
  if (isDemoMode()){
    demoBanner.textContent = getDemoBannerText();
    demoBanner.classList.remove('hidden');
  } else {
    demoBanner.classList.add('hidden');
  }
}
function loadBankInfoFor(person){
  try{
    const raw = localStorage.getItem(BANK_STORAGE_PREFIX + (person?.key || ''));
    if (!raw) return null;
    return JSON.parse(raw);
  }catch{ return null; }
}
function saveBankInfoFor(person, payload){
  try{
    localStorage.setItem(BANK_STORAGE_PREFIX + (person?.key || ''), JSON.stringify(payload));
  }catch{}
}

// ===== Wheel =====
const WHEEL_SEGMENTS = [
  { id: 'try', label: 'Chúc may mắn', prize: false },
  { id: 'ring', label: 'Nhẫn Pandora', prize: true },
  { id: 'try', label: 'Chúc may mắn', prize: false },
  { id: 'try', label: 'Chúc may mắn', prize: false },
  { id: 'bracelet', label: 'Vòng tay Pandora', prize: true },
  { id: 'try', label: 'Chúc may mắn', prize: false },
  { id: 'try', label: 'Chúc may mắn', prize: false },
  { id: 'try', label: 'Chúc may mắn', prize: false },
];
const WHEEL_N = WHEEL_SEGMENTS.length;
const WHEEL_ANGLE = 360 / WHEEL_N;

function buildWheelUI(){
  if (!wheelEl) return;
  wheelEl.innerHTML = '';
  for (let i=0;i<WHEEL_N;i++){
    const seg = document.createElement('div');
    seg.className = 'wheelSeg' + (i % 2 === 1 ? ' isGold' : '');
    const midAngle = i * WHEEL_ANGLE;
    seg.style.setProperty('--rot', `${midAngle}deg`);
    seg.style.setProperty('--neg', `${-midAngle}deg`);
    seg.innerHTML = `<span>${escapeHtml(WHEEL_SEGMENTS[i].label)}</span>`;
    wheelEl.appendChild(seg);
  }
}

function resetWheelUI(){
  if (!wheelEl) return;
  wheelEl.style.transition = 'none';
  wheelEl.style.transform = 'rotate(0deg)';
  void wheelEl.offsetWidth;
  wheelEl.style.transition = 'transform 4.2s cubic-bezier(.17,.67,.12,1)';

  if (wheelResultEl){
    wheelResultEl.classList.add('hidden');
    wheelResultEl.textContent = '';
  }
  btnWheelNext?.classList.add('hidden');
  if (btnSpin) btnSpin.disabled = false;
}

function getWheelOutcomeFor(person){
  if (isDemoMode()){
    const forced = demoLookup(window.DEMO_FORCE?.wheel, person);
    if (forced === 'ring' || forced === 'bracelet' || forced === 'none') return forced;
    return 'none';
  }
  const r = Math.random();
  if (r < 0.02) return 'bracelet';
  if (r < 0.08) return 'ring';
  return 'none';
}

function pickSegmentIndexForOutcome(outcome){
  const idxs = [];
  for (let i=0;i<WHEEL_N;i++){
    if (outcome === 'none' && WHEEL_SEGMENTS[i].id === 'try') idxs.push(i);
    if (outcome !== 'none' && WHEEL_SEGMENTS[i].id === outcome) idxs.push(i);
  }
  return idxs.length ? idxs[(Math.random()*idxs.length)|0] : 0;
}

function spinWheelToIndex(idx){
  if (!wheelEl) return Promise.resolve();

  return new Promise((resolve) => {
    const baseTurns = 6 + ((Math.random() * 3) | 0);
    const jitter = (Math.random() * (WHEEL_ANGLE * 0.6)) - (WHEEL_ANGLE * 0.3);
    const target = (360 - (idx * WHEEL_ANGLE)) % 360;
    const finalDeg = baseTurns * 360 + target + jitter;

    const onEnd = () => resolve();
    wheelEl.addEventListener('transitionend', onEnd, { once: true });
    wheelEl.style.transform = `rotate(${finalDeg}deg)`;
  });
}

function wheelResultText(outcome){
  if (outcome === 'ring') return "🎉 Chúc mừng! Bạn đã quay trúng: NHẪN PANDORA 💍";
  if (outcome === 'bracelet') return "🎉 Chúc mừng! Bạn đã quay trúng: VÒNG TAY PANDORA ✨";
  return "😄 Chưa trúng giải lớn lần này.\n\nĐừng lo, mình còn có ‘lắc quẻ may mắn’ để nhận lộc đầu năm 🧧";
}

// ===== Fortune =====
const FORTUNE_MESSAGES = {
  50000: [
    "{name} ơi, lộc nhỏ nhưng vui to – năm {year} cười nhiều hơn lo! 😊",
    "Năm {year} chúc {name} đi đâu cũng gặp quý nhân, về nhà cũng gặp bình yên 🌿",
    "{name} nhận lộc 50k – chúc {year} mọi việc ‘trơn tru’ như mứt dừa 😄",
    "Chúc {name} năm {year} sức khỏe dồi dào, tinh thần vững vàng, tiền vô đều đều 💪",
    "{year} này, {name} cứ mạnh dạn tỏa sáng – bạn làm được mà! ✨",
    "Lộc 50k gửi {name} – chúc mọi điều khó sẽ hóa dễ, mọi điều xa sẽ hóa gần 🌸",
    "{name} nhận lộc – chúc {year} ngủ ngon, ăn ngon, sống chill hết nấc 🌙",
    "{year} chúc {name} gặp đúng người, đúng việc, đúng thời điểm 🎯",
    "{name} ơi, lộc tới rồi: chúc {year} bình an là chính, vui vẻ là nhất 🕊️",
    "Chúc {name} năm {year} làm đâu thắng đó, thuận lợi đủ đường 🚀",
    "{name} nhận lộc – chúc {year} luôn được yêu thương đúng cách 💖",
    "{year} này chúc {name} có thêm nhiều khoảnh khắc ấm áp và đáng nhớ 📸",
    "Lộc nhỏ đầu năm: chúc {name} {year} nhẹ nhàng mà rực rỡ 🌟",
  ],
  100000: [
    "{name} nhận lộc 100k – chúc {year} công việc hanh thông, lương thưởng tăng đều 💼📈",
    "{year} này, {name} cứ từ tốn mà tiến – thành công sẽ đến đúng lúc 🌿",
    "Lộc 100k gửi {name}: chúc bạn luôn có động lực và niềm vui mỗi ngày 😊",
  ],
  150000: [
    "{name} nhận lộc 150k – chúc {year} bứt phá nhẹ nhàng nhưng chắc chắn 💥",
    "Lộc 150k: chúc {name} {year} gặp nhiều cơ hội tốt và nắm bắt thật nhanh ✨",
  ],
  200000: [
    "{name} nhận lộc 200k – chúc {year} tiền vào như nước, niềm vui ngập tràn 🎉💰",
    "Lộc 200k gửi {name}: chúc {year} mọi điều như ý, an yên và đủ đầy 🤍",
    "{year} chúc {name} bước qua mọi thử thách thật đẹp, thật vững vàng 💪",
  ]
};

function getFortuneAmountFor(person){
  if (isDemoMode()){
    const forced = demoLookup(window.DEMO_FORCE?.fortune, person);
    const n = Number(forced);
    return Number.isFinite(n) ? n : 50000;
  }
  const amounts = [50000, 100000, 150000, 200000];
  return amounts[(Math.random() * amounts.length) | 0];
}

function formatWishTokens(template, person){
  const name = (person?.label || person?.key || 'bạn').trim();
  const year = ($("yearInput")?.value || $("yearText")?.textContent || String(new Date().getFullYear())).trim();
  return String(template).replaceAll('{name}', name).replaceAll('{year}', year);
}

function getFortuneFor(person){
  const amount = getFortuneAmountFor(person);
  const pool = FORTUNE_MESSAGES[amount] || FORTUNE_MESSAGES[50000];
  const seed = `${person?.key || person?.label || ''}|${amount}`;
  const idx = hashStringFNV1a(seed) % pool.length;
  const msg = formatWishTokens(pool[idx], person);
  return { amount, msg };
}

// ===== Music =====
const music = $("music");
const btnMusic = $("btnMusic");
const btnPrev = $("btnPrev");
const btnNext = $("btnNext");
const musicSelect = $("musicSelect");
const tapAudio = $("tapAudio");

let PLAYLIST = [];
let trackIndex = 0;
let musicOn = false;
let userChangedTrack = false;

function setMusicButton(state, label){
  const ico = btnMusic?.querySelector('.ico');
  const txt = btnMusic?.querySelector('.txt');
  if (!ico || !txt) return;

  if (label){
    ico.textContent = '❗';
    txt.textContent = label.replace(/^❗\s*/, '');
    return;
  }

  if (state){ ico.textContent = '⏸'; txt.textContent = 'Tạm dừng'; }
  else { ico.textContent = '▶️'; txt.textContent = 'Phát nhạc'; }
}

async function loadPlaylist(){
  try{
    const res = await fetch('./music/playlist.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Cannot load music/playlist.json');
    PLAYLIST = await res.json();
    musicSelect.innerHTML = PLAYLIST.map((t, i) => `<option value="${i}">${escapeHtml(t.title)}</option>`).join('');
    trackIndex = 0;
    userChangedTrack = false;
    setTrack(trackIndex, false);
  }catch(e){
    console.warn(e);
    PLAYLIST = [];
    musicSelect.innerHTML = `<option value="">(Không có playlist)</option>`;
    setMusicButton(false, '❗ Chưa có nhạc');
  }
}

function setTrack(i, autoplay=true){
  if (!PLAYLIST.length || !music) return;
  trackIndex = (i + PLAYLIST.length) % PLAYLIST.length;
  musicSelect.value = String(trackIndex);
  music.src = `./music/${PLAYLIST[trackIndex].file}`;
  music.volume = 0.9;
  if (musicOn && autoplay) music.play().catch(()=>{});
}

function showTapOverlay(){ tapAudio?.classList.remove('hidden'); }
function hideTapOverlay(){ tapAudio?.classList.add('hidden'); }

async function tryPlayFromGesture(){
  if (!PLAYLIST.length || !music) return false;
  try{
    if (!music.src) setTrack(trackIndex, false);
    await music.play();
    musicOn = true;
    setMusicButton(true);
    hideTapOverlay();
    return true;
  }catch(err){
    console.warn(err);
    return false;
  }
}

async function toggleMusic(){
  if (!PLAYLIST.length){ setMusicButton(false, '❗ Chưa có nhạc'); return; }
  if (!musicOn){
    const ok = await tryPlayFromGesture();
    if (!ok){ showTapOverlay(); setMusicButton(false); }
    else { burst(innerWidth*0.5, innerHeight*0.25, 140); }
  }else{
    music.pause();
    musicOn = false;
    setMusicButton(false);
  }
}

btnMusic?.addEventListener('click', toggleMusic);
btnPrev?.addEventListener('click', () => { userChangedTrack = true; setTrack(trackIndex - 1, true); });
btnNext?.addEventListener('click', () => { userChangedTrack = true; setTrack(trackIndex + 1, true); });
musicSelect?.addEventListener('change', (e) => {
  userChangedTrack = true;
  const i = parseInt(e.target.value, 10);
  if (!Number.isNaN(i)) setTrack(i, true);
});

tapAudio?.addEventListener('click', async () => {
  const ok = await tryPlayFromGesture();
  if (ok) burst(innerWidth*0.5, innerHeight*0.25, 120);
});

// ===== UI refs =====
const lock = $("lock");
const statusEl = $("status");
const chip = $("chip");
const badge = $("badge");
const subLine = $("subLine");

const selectWrap = $("selectWrap");
const selectBtn = $("selectBtn");
const selectText = $("selectText");
const menu = $("menu");
const menuList = $("menuList");
const search = $("search");

const pass = $("pass");
const btnUnlock = $("btnUnlock");
const btnOwnerView = $("btnOwnerView");
const btnHint = $("btnHint");
const btnLogout = $("btnLogout");

const btnOwnerLogin = $("btnOwnerLogin");
const btnOwnerLogout = $("btnOwnerLogout");
const btnOwnerDashboard = $("btnOwnerDashboard");

const wishMsg = $("wishMsg");
const btnSendWish = $("btnSendWish");

const ownerModal = $("ownerModal");
const ownerBody = $("ownerBody");
const btnCloseOwner = $("btnCloseOwner");
const btnTabViews = $("btnTabViews");
const btnTabWishes = $("btnTabWishes");
const btnRefreshOwner = $("btnRefreshOwner");
let ownerTab = 'views';

const viewerName = $("viewerName");
const btnWish = $("btnWish");
const wishEl = $("wish");
const avatarImg = $("avatarImg");

const successPage = $("successPage");
const btnSuccessClose = $("btnSuccessClose");

const yearText = $("yearText");
const yearInput = $("yearInput");
const defaultYear = new Date().getFullYear();

// NEW buttons (Hướng A)
const btnOpenLuck = $("btnOpenLuck");        // 🎁 Nhận lộc
const btnOwnerReplay = $("btnOwnerReplay");  // Owner cho chơi lại

yearText.textContent = String(defaultYear);
yearInput.value = String(defaultYear);
yearInput.addEventListener('input', () => {
  const v = yearInput.value.replace(/[^\d]/g, '').slice(0, 4);
  yearInput.value = v;
  if (v) yearText.textContent = v;
});

// ===== Wishes data (GIỮ NGUYÊN) =====
const GLOBAL_WISHES = [
  "Chúc {name} năm {year} luôn bình an và được yêu thương thật nhiều 💖",
  "May {year} bring you calm days and bright nights, {name}. ✨",
  "{year}년에는 {name}님에게 행복이 가득하길 바라요 🌸",
  "Năm {year} chúc {name} mọi điều tốt đẹp tự tìm đến! 🍀",
  "Wishing you a year full of gentle wins, {name}. 💪",
  "{name}님, {year}년은 웃음이 더 많아지는 한 해가 되길 😊",
  "Chúc {name} {year} tiền vào như nước, tiền ra nhỏ giọt thôi nha 💰😄",
  "New year, new energy—go shine, {name}! 🌟",
  "{year}년, {name}님 꿈이 하나씩 이루어지길 🎯",
  "Năm {year} chúc {name} sức khỏe dồi dào, tinh thần lúc nào cũng sáng! 🔋",
  "May your {year} be full of good surprises, {name}. 🎁",
  "{name}님, {year}년엔 좋은 사람들과 좋은 일만 가득하길 🫶",
  "Chúc {name} {year} mọi deadline đều qua nhẹ như lông hồng ⏳🪽",
  "In {year}, may you feel proud of yourself more often, {name}. 🌈",
  "{year}년에도 {name}님이 원하는 길로 쭉 나아가길 🚀",
  "Năm {year} chúc {name} đi đâu cũng gặp điều lành, về đâu cũng thấy yên 🏡✨",
  "May {year} be kind to you, {name}. 🤍",
  "{name}님, {year}년엔 마음이 늘 편안하길 🌿",
  "Chúc {name} năm {year} rực rỡ theo cách của riêng mình 🌟",
  "Wishing {name} a {year} filled with love, laughter, and peace. 🕊️",
  "Năm {year} chúc {name} làm đâu thắng đó, thuận lợi đủ đường 🚀",
  "May your hard work pay off beautifully in {year}, {name}. 📈",
  "{year}년엔 {name}님에게 행운이 자주 찾아오길 🍀",
  "Chúc {name} {year} cười nhiều hơn, lo ít hơn, yêu đời hơn 😊🌷",
  "You’ve got this, {name}—make {year} your year. 💥",
  "{name}님, {year}년엔 좋은 소식만 들리길 💌",
  "Năm {year} chúc {name} tình cảm ấm áp, gia đình bình an 💖",
  "May {year} bring you the right people and the right moments, {name}. 🎯",
  "{year}년에는 {name}님 하루하루가 반짝이길 ✨",
  "Chúc {name} {year} học gì hiểu đó, làm gì cũng tới 📚✅",
  "Hope {year} gives you more reasons to smile, {name}. 😄",
  "{name}님, {year}년엔 건강이 최고예요! 💪",
  "Năm {year} chúc {name} may mắn tới tấp, niềm vui ngập tràn 🎉",
  "May your heart feel lighter in {year}, {name}. 🌿",
  "{year}년에도 {name}님이 사랑받는 사람인 거 잊지 마요 💗",
  "Chúc {name} {year} công việc hanh thông, lương thưởng tăng đều 💼📈",
  "Wishing you cozy moments and big dreams in {year}, {name}. ☕🌙",
  "{name}님, {year}년엔 모든 일이 술술 풀리길 🌈",
  "Năm {year} chúc {name} mỗi ngày đều có lý do để vui 😄✨",
  "May {year} be your fresh start, {name}. 🌸",
  "Chúc {name} {year} sáng tạo bùng nổ, ý tưởng ra như suối 💡🌊",
  "May you find joy in the little things this {year}, {name}. 🌼",
  "{name}님, {year}년엔 새로운 시작이 기분 좋게 이어지길 🌱",
  "Năm {year} chúc {name} bình an là chính, vui vẻ là nhất 🕊️",
  "Wishing you steady growth and soft happiness in {year}, {name}. 🌿",
  "{year}년, {name}님에게 좋은 기회가 꼭 오길 ✨",
  "Chúc {name} {year} gặp đúng người, đúng việc, đúng thời điểm 🎯",
  "May your dreams feel closer in {year}, {name}. 🌙",
  "{name}님, {year}년엔 웃는 날이 더 많아지길 😊",
  "Năm {year} chúc {name} mọi chuyện khó rồi sẽ hóa dễ 🌈",
  "Wishing you confidence and courage in {year}, {name}. 💪",
  "{year}년에도 {name}님이 원하는 걸 당당히 선택하길 🌟",
  "Chúc {name} năm {year} ngủ ngon, ăn ngon, sống chill hết nấc 🌙🍜",
  "May {year} bring you peace of mind, {name}. 🧘",
  "{name}님, {year}년엔 마음의 여유가 생기길 ☁️",
  "Năm {year} chúc {name} sống nhẹ nhàng mà vẫn rực rỡ 🌸🌟",
  "Wishing {name} a {year} full of warm memories. 📸",
  "{year}년, {name}님에게 따뜻한 순간이 많이 남길 💛",
  "Chúc {name} {year} luôn tự tin, mạnh mẽ và được trân trọng 💗",
  "May {year} surprise you with happiness, {name}. 🎉"
];

// ===== People + session =====
let PEOPLE = [];
let selectedPerson = null;
let lastWishIndex = -1;

let session = { loggedIn:false, viewer:null, target:null };
const firstWishShown = new Set();

function setStatus(msg, bad=false){
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.classList.toggle('bad', !!bad);
}

async function ensureServices(){
  if (!window.AppServices){
    throw new Error('AppServices chưa sẵn sàng (services.js chưa load hoặc lỗi).');
  }
  await window.AppServices.initFirebaseIfNeeded?.();
}

function isOwnerRole(){
  return !!(session.loggedIn && session.viewer && session.viewer.role === 'owner');
}

// ===== HƯỚNG A: lock game local =====
function playKey(){
  return String(session?.viewer?.key || "");
}
function keyUnlocked(k){ return "hpny2026_unlocked_" + k; }
function keyPlayed(k){ return "hpny2026_played_" + k; }
function keyOwnerReplay(k){ return "hpny2026_owner_replay_" + k; }

function isUnlocked(k){ return localStorage.getItem(keyUnlocked(k)) === "1"; }
function hasPlayed(k){ return localStorage.getItem(keyPlayed(k)) === "1"; }
function markPlayed(k){ if (k) localStorage.setItem(keyPlayed(k), "1"); }

function consumeReplay(k){
  if (!k) return;
  if (localStorage.getItem(keyOwnerReplay(k)) === "1"){
    localStorage.removeItem(keyOwnerReplay(k));
    localStorage.removeItem(keyPlayed(k));
  }
}

function refreshGameLockUI(){
  const k = playKey();
  const owner = isOwnerRole();
  const ok = owner || (k && isUnlocked(k));

  if (btnOpenLuck){
    btnOpenLuck.disabled = !ok;
    btnOpenLuck.classList.toggle("disabled", !ok);
  }
  if (btnOwnerReplay){
    btnOwnerReplay.disabled = !(owner && session.loggedIn && selectedPerson);
  }
}

function setUnlockedForCurrentViewer(){
  const k = playKey();
  if (!k) return;
  localStorage.setItem(keyUnlocked(k), "1");
  refreshGameLockUI();
}

// ===== Owner auth UI (giữ nguyên) =====
function isOwnerAuthed(){
  try{ return window.AppServices?.isOwnerAuthed?.() === true; }
  catch{ return false; }
}

function updateOwnerUI(){
  const ownerRole = isOwnerRole();
  const authed = isOwnerAuthed();
  btnOwnerLogin?.classList.toggle('hidden', !ownerRole || authed);
  btnOwnerLogout?.classList.toggle('hidden', !ownerRole || !authed);
  btnOwnerDashboard?.classList.toggle('hidden', !ownerRole || !authed);
  refreshGameLockUI();
}

function openOwnerModal(){
  ownerModal?.classList.remove('hidden');
  renderOwnerTab();
}
function closeOwnerModal(){
  ownerModal?.classList.add('hidden');
}

function formatDuration(sec){
  sec = Math.max(0, Number(sec||0));
  const m = Math.floor(sec/60);
  const s = sec%60;
  if (m <= 0) return s + 's';
  return m + 'm ' + s + 's';
}

function fmtTime(ts){
  try{
    if (!ts) return '';
    if (typeof ts.toDate === 'function') return ts.toDate().toLocaleString();
    if (ts.seconds) return new Date(ts.seconds*1000).toLocaleString();
    return new Date(ts).toLocaleString();
  }catch{ return ''; }
}

async function renderOwnerTab(){
  if (!ownerBody) return;
  ownerBody.textContent = 'Đang tải...';

  try{
    await ensureServices();
  }catch(e){
    ownerBody.innerHTML = `
      <div class="ownerRow">
        <div><b>⚠️ ${escapeHtml(e.message || 'Lỗi services')}</b></div>
        <div class="ownerMeta">Mở DevTools → Console/Network để xem services.js có lỗi/404 không.</div>
      </div>`;
    return;
  }

  if (!isOwnerAuthed()){
    ownerBody.innerHTML = `
      <div class="ownerRow">
        <div><b>🔐 Bạn chưa đăng nhập Google Owner</b></div>
        <div class="ownerMeta">Bấm “Owner Login” ở góc trên để đăng nhập.</div>
      </div>`;
    return;
  }

  try{
    if (ownerTab === 'views'){
      const list = await window.AppServices.getLatestViews(200);
      const ownerKey = window.OWNER_KEY || '';
      const filtered = list.filter(v => (v.ownerKey||'') === ownerKey);
      if (!filtered.length){ ownerBody.textContent = 'Chưa có lượt xem nào.'; return; }

      ownerBody.innerHTML = filtered.map(v => `
        <div class="ownerRow">
          <div class="ownerMeta">
            <span class="pillMini">👀 ${escapeHtml(v.viewerLabel || v.viewerKey || 'Ẩn danh')}</span>
            xem thiệp: <b>${escapeHtml(v.targetLabel || v.targetKey || '')}</b>
            • thời lượng: <b>${formatDuration(v.durationSec || 0)}</b>
          </div>
          <div class="ownerMeta">
            Bắt đầu: ${escapeHtml(fmtTime(v.startedAt))}
            • Kết thúc: ${escapeHtml(fmtTime(v.endedAt))}
          </div>
          <div class="ownerMeta">UA: ${escapeHtml(String(v.userAgent||'').slice(0,120))}</div>
          <div class="row" style="justify-content:flex-end">
            <button class="btnSecondary" type="button" data-del-view="${escapeHtml(v.id)}">🗑 Xoá</button>
          </div>
        </div>`).join('');
    } else {
      const list = await window.AppServices.getLatestWishes(200);
      const ownerKey = window.OWNER_KEY || '';
      const filtered = list.filter(w => (w.ownerKey||'') === ownerKey);
      if (!filtered.length){ ownerBody.textContent = 'Chưa có lời chúc nào.'; return; }

      ownerBody.innerHTML = filtered.map(w => `
        <div class="ownerRow">
          <div class="ownerMeta">
            <span class="pillMini">💌 ${escapeHtml(w.viewerLabel || w.viewerKey || 'Ẩn danh')}</span>
            gửi khi đang xem thiệp: <b>${escapeHtml(w.targetLabel || w.targetKey || '')}</b>
            • ${escapeHtml(fmtTime(w.createdAt))}
          </div>
          <div style="white-space:pre-wrap">${escapeHtml(w.message || '')}</div>
          <div class="row" style="justify-content:flex-end">
            <button class="btnSecondary" type="button" data-del-wish="${escapeHtml(w.id)}">🗑 Xoá</button>
          </div>
        </div>`).join('');
    }
  }catch(e){
    console.warn(e);
    ownerBody.innerHTML = `
      <div class="ownerRow">
        <div><b>⚠️ Không tải được dữ liệu</b></div>
        <div class="ownerMeta">Kiểm tra Firestore Rules (read/delete owner-only) hoặc Owner chưa login.</div>
      </div>`;
  }
}

ownerBody?.addEventListener('click', async (e) => {
  const bView = e.target.closest('[data-del-view]');
  const bWish = e.target.closest('[data-del-wish]');
  if (!bView && !bWish) return;

  if (!isOwnerAuthed()){
    alert('Bạn chưa Owner Login.');
    return;
  }

  const ok = confirm('Xoá dữ liệu này? Không khôi phục được.');
  if (!ok) return;

  try{
    await ensureServices();
    if (bView){
      const id = bView.getAttribute('data-del-view');
      await window.AppServices.deleteView(id);
    } else {
      const id = bWish.getAttribute('data-del-wish');
      await window.AppServices.deleteWish(id);
    }
    await renderOwnerTab();
  }catch(err){
    console.warn(err);
    alert('Xoá thất bại. Kiểm tra Firestore Rules / Owner Login.');
  }
});

function randomWish(pool){
  let idx;
  do { idx = Math.floor(Math.random() * pool.length); }
  while (pool.length > 1 && idx === lastWishIndex);
  lastWishIndex = idx;
  return pool[idx];
}

function getDisplayNameForTarget(t){
  if (!t) return 'bạn';
  const override = (t.nameOverride || '').trim();
  return override || t.label || 'bạn';
}

function formatWish(template, displayName){
  const name = (displayName || 'bạn').trim();
  const year = (yearInput.value || yearText.textContent || defaultYear).trim();
  return template.replaceAll('{name}', name).replaceAll('{year}', year);
}

function buildWishText(template, target){
  const name = getDisplayNameForTarget(target);
  let text = formatWish(template, name);
  const suffix = (target?.suffix || '').trim();
  if (suffix) text += ' ' + suffix;
  return text;
}

function getWishPoolForTarget(target){
  if (!target) return GLOBAL_WISHES;
  if (target.useGlobalRandomOnly) return GLOBAL_WISHES;
  if (Array.isArray(target.wishes) && target.wishes.length) return target.wishes;
  return GLOBAL_WISHES;
}

function showRandomWish(){
  if (!session.loggedIn || !session.target) return;
  const pool = getWishPoolForTarget(session.target);
  const t = randomWish(pool);
  wishEl.textContent = buildWishText(t, session.target);
  burst(lastPointer.x || (innerWidth*0.5), lastPointer.y || (innerHeight*0.35), 120);
}

function showInitialWishIfAny(target){
  if (!target?.firstWish) return false;
  if (firstWishShown.has(target.key)) return false;
  firstWishShown.add(target.key);
  wishEl.textContent = buildWishText(target.firstWish, target);
  return true;
}

const DEFAULT_AVATAR = './avatars/default.pnj.jpg';

function tryLoadAvatarFromCandidates(candidates){
  let i = 0;
  const tryNext = () => {
    if (i >= candidates.length){ avatarImg.src = DEFAULT_AVATAR; return; }
    avatarImg.onerror = tryNext;
    avatarImg.src = candidates[i++];
  };
  tryNext();
}

function setAvatar(person){
  if (!person){ avatarImg.src = DEFAULT_AVATAR; return; }
  const exts = person.exts || ['jpg','png','webp','jpeg'];
  const candidates = exts.map(ext => `./avatars/${person.key}.${ext}`);
  tryLoadAvatarFromCandidates(candidates);
}

async function loadPeople(){
  const res = await fetch('./avatars/people.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Cannot load avatars/people.json');
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('people.json must be an array');

  PEOPLE = data.map(p => ({
    key: String(p.key || '').trim(),
    label: String(p.label || '').trim(),
    pass: String(p.pass || '').trim(),
    role: String(p.role || 'guest').trim(),
    exts: Array.isArray(p.exts) ? p.exts : ['jpg','png','webp','jpeg'],
    wishes: Array.isArray(p.wishes) ? p.wishes : null,
    firstWish: p.firstWish ? String(p.firstWish) : '',
    useGlobalRandomOnly: !!p.useGlobalRandomOnly,
    suffix: p.suffix ? String(p.suffix) : '',
    nameOverride: p.nameOverride ? String(p.nameOverride) : ''
  })).filter(p => p.key && p.label && p.pass);
}

function openMenu(){
  menu.classList.remove('hidden');
  search.value = '';
  renderMenu('');
  setTimeout(() => search.focus(), 0);
}
function closeMenu(){ menu.classList.add('hidden'); }

function renderMenu(q){
  const query = (q || '').trim().toLowerCase();
  const list = PEOPLE.filter(p =>
    p.label.toLowerCase().includes(query) || p.key.toLowerCase().includes(query)
  );

  menuList.innerHTML = list.map(p => `
    <div class="item" data-key="${escapeHtml(p.key)}">
      <div class="left">
        <div class="name">${escapeHtml(p.label)}</div>
        <div class="meta">@${escapeHtml(p.key)}</div>
      </div>
      <div class="tag">${p.role === 'owner' ? 'OWNER' : 'GUEST'}</div>
    </div>`).join('') || `
    <div class="item">
      <div class="left">
        <div class="name">Không tìm thấy</div>
        <div class="meta">Thử gõ tên hoặc key</div>
      </div>
    </div>`;
}

function pickPersonByKey(key){
  const p = PEOPLE.find(x => x.key === key);
  if (!p) return;
  selectedPerson = p;
  selectText.innerHTML = `<span>${escapeHtml(p.label)} <small>(@${escapeHtml(p.key)})</small></span>`;
  closeMenu();
  btnOwnerView.disabled = !(session.loggedIn && session.viewer && session.viewer.role === 'owner');
  updateOwnerUI();
}

selectBtn?.addEventListener('click', () => {
  if (menu.classList.contains('hidden')) openMenu();
  else closeMenu();
});
search?.addEventListener('input', () => renderMenu(search.value));
menuList?.addEventListener('click', (e) => {
  const item = e.target.closest('.item');
  if (!item) return;
  const key = item.getAttribute('data-key');
  if (key) pickPersonByKey(key);
});
document.addEventListener('click', (e) => {
  if (!selectWrap.contains(e.target)) closeMenu();
});

function lockCard(msg){
  session = { loggedIn:false, viewer:null, target:null };
  firstWishShown.clear();

  hideFlow();

  userChangedTrack = false;
  try{ music.pause(); }catch(e){}
  musicOn = false;
  setMusicButton(false);

  try{ window.AppServices?.stopView?.(); }catch(e){}

  lock.classList.remove('hidden');
  chip.textContent = 'Chưa mở';
  badge.textContent = '🐴 Thiệp Năm Mới • Năm Ngọ 2026 🐎';
  subLine.textContent = 'Mở khóa xong bạn sẽ thấy lời chúc dành riêng cho bạn 🎁';

  viewerName.value = '';
  viewerName.disabled = true;
  btnWish.disabled = true;

  btnSendWish.disabled = true;
  wishMsg.value = '';
  wishMsg.disabled = true;

  updateOwnerUI();

  wishEl.textContent = '🔒 Thiệp đang khóa. Hãy mở thiệp để xem lời chúc.';
  avatarImg.src = DEFAULT_AVATAR;

  btnOwnerView.disabled = true;
  btnLogout.classList.add('hidden');

  refreshGameLockUI();
  setStatus(msg || '👉 Chọn người + nhập mật khẩu để bắt đầu.', false);
}

function applySessionUI(){
  const v = session.viewer;
  const t = session.target;

  chip.textContent = v.role === 'owner' ? 'Đã mở • Owner' : 'Đã mở';
  badge.textContent = v.role === 'owner' ? '👑 Owner Mode • Tết 2026' : '🐴 Thiệp Năm Mới • Năm Ngọ 2026 🐎';

  viewerName.value = t.label;
  viewerName.disabled = true;

  btnWish.disabled = false;
  btnOwnerView.disabled = !(v.role === 'owner' && selectedPerson);
  btnLogout.classList.remove('hidden');

  subLine.textContent = (v.role === 'owner')
    ? '👑 Owner: có thể xem thiệp người khác (không cần mật khẩu của họ).'
    : 'Chúc bạn một năm mới rực rỡ và thật bình an 🌸';

  setAvatar(t);

  const didShowFirst = showInitialWishIfAny(t);
  if (!didShowFirst){
    const pool = getWishPoolForTarget(t);
    const template = randomWish(pool);
    wishEl.textContent = buildWishText(template, t);
  }

  lock.classList.add('hidden');

  btnSendWish.disabled = false;
  wishMsg.disabled = false;

  try{ window.AppServices?.startView?.(session.viewer, session.target); }catch(e){}
  updateOwnerUI();
  burst(innerWidth*0.5, innerHeight*0.28, 180);

  // ✅ KHÔNG auto bật game nữa
  refreshGameLockUI();
}

btnUnlock?.addEventListener('click', () => {
  if (!selectedPerson){ setStatus('❌ Bạn chưa chọn người.', true); return; }
  const pw = (pass.value || '').trim();
  if (!pw){ setStatus('⚠️ Bạn chưa nhập mật khẩu.', true); return; }
  if (pw !== selectedPerson.pass){
    setAvatar(selectedPerson);
    setStatus('❌ Sai mật khẩu. Thử lại nha!', true);
    return;
  }
  session.loggedIn = true;
  session.viewer = selectedPerson;
  session.target = selectedPerson;
  setStatus('✅ Mở thiệp thành công! 🎉', false);
  applySessionUI();
});

btnOwnerView?.addEventListener('click', () => {
  if (!session.loggedIn || !session.viewer || session.viewer.role !== 'owner'){
    setStatus('❌ Chỉ Owner mới dùng được.', true);
    return;
  }
  if (!selectedPerson){ setStatus('⚠️ Chọn người cần xem trước đã.', true); return; }
  session.target = selectedPerson;
  applySessionUI();
});

btnLogout?.addEventListener('click', () => lockCard('👋 Đã đăng xuất.'));

// ===== HƯỚNG A: nút Nhận lộc + Owner replay =====
btnOpenLuck?.addEventListener("click", () => {
  if (!session.loggedIn) return alert("Bạn cần mở thiệp trước đã 😊");

  const k = playKey();
  const owner = isOwnerRole();

  if (!owner && !isUnlocked(k)){
    return alert("Bạn hãy Gửi lời chúc cho chủ sở hữu trước để mở khóa Nhận lộc nhé 💌");
  }

  consumeReplay(k);
  if (!owner && hasPlayed(k)){
    return alert("Bạn đã chơi rồi 😊 Mỗi người chỉ chơi 1 lần.");
  }

  markPlayed(k);
  startFlowFor(session.target);
});

btnOwnerReplay?.addEventListener("click", () => {
  if (!isOwnerRole() || !selectedPerson) return;

  const k = String(selectedPerson.key || "");
  if (!k) return;

  localStorage.setItem(keyOwnerReplay(k), "1");
  localStorage.setItem(keyUnlocked(k), "1");
  localStorage.removeItem(keyPlayed(k));

  alert("✅ Đã cho người này chơi lại (trên máy hiện tại).");
  refreshGameLockUI();
});

// ===== Owner Login/Logout/Dashboard =====
btnOwnerLogin?.addEventListener('click', async () => {
  try{
    await ensureServices();
    const info = await window.AppServices.ownerGoogleLogin();
    alert('✅ Owner Google Login OK\nUID: ' + (info.uid || '') + '\nEmail: ' + (info.email || ''));
  }catch(e){
    console.warn(e);
    alert('❌ Owner login lỗi.\nMsg: ' + (e.message || e) +
      "\n\nNếu là unauthorized-domain: Firebase Console → Auth → Settings → Authorized domains → Add domain bạn đang chạy.");
  }finally{
    updateOwnerUI();
  }
});

btnOwnerLogout?.addEventListener('click', async () => {
  try{ await window.AppServices.ownerGoogleLogout(); }catch(e){}
  updateOwnerUI();
});

btnOwnerDashboard?.addEventListener('click', () => openOwnerModal());
btnCloseOwner?.addEventListener('click', closeOwnerModal);
ownerModal?.addEventListener('click', (e) => { if (e.target === ownerModal) closeOwnerModal(); });

btnTabViews?.addEventListener('click', () => { ownerTab = 'views'; renderOwnerTab(); });
btnTabWishes?.addEventListener('click', () => { ownerTab = 'wishes'; renderOwnerTab(); });
btnRefreshOwner?.addEventListener('click', () => renderOwnerTab());

// Success overlay
function showSuccessPage(){ successPage?.classList.remove('hidden'); burst(innerWidth*0.5, innerHeight*0.28, 160); }
function hideSuccessPage(){ successPage?.classList.add('hidden'); }
btnSuccessClose?.addEventListener('click', hideSuccessPage);
successPage?.addEventListener('click', (e) => { if (e.target === successPage) hideSuccessPage(); });

// ===== Send wish: gửi xong -> unlock game =====
btnSendWish?.addEventListener('click', async () => {
  const message = (wishMsg.value || '').trim();
  if (!message){
    setStatus('⚠️ Bạn chưa nhập lời chúc.', true);
    return;
  }

  try{
    btnSendWish.disabled = true;
    await ensureServices();

    const result = await window.AppServices.sendWish({
      viewerKey: session.viewer?.key || '',
      viewerLabel: session.viewer?.label || '',
      targetKey: session.target?.key || '',
      targetLabel: session.target?.label || '',
      message
    });

    if (result && result.savedToFirestore) {
      wishMsg.value = '';
      showSuccessPage();

      // ✅ HƯỚNG A: unlock local
      setUnlockedForCurrentViewer();

      if
