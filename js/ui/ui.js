// DOM UI: HUD·모달·토스트·상점·판매·씨앗 선택·정산·프롤로그
import { CROPS, SEASONS, seasonNow, shopSeeds, itemIcon } from '../data/crops.js';
import { save } from '../engine/save.js';

const $ = sel => document.querySelector(sel);
const fmt = n => n.toLocaleString('ko-KR');

let S; // 게임 상태 참조
export function bindState(state) { S = state; }

// ── HUD ─────────────────────────────
export function refreshHUD() {
  $('#gold').textContent = fmt(S.gold);
  $('#firefly').textContent = fmt(S.fireflies);
  const { season, day } = seasonNow();
  const h = new Date().getHours();
  const night = h >= 19 || h < 6;
  $('#clock').textContent = `${SEASONS[season]} ${day}일차 ${night ? '🌙' : '☀️'}`;
}

// ── 토스트 ─────────────────────────────
let toastTimer;
export function toast(msg, ms = 2200) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

// ── 모달 공통 ─────────────────────────────
export function openModal(html, cls = '') {
  closeModal();
  const root = $('#modal-root');
  root.innerHTML = `<div class="dim"></div><div class="sheet ${cls}">${html}</div>`;
  root.classList.add('open');
  root.querySelector('.dim').onclick = closeModal;
  return root.querySelector('.sheet');
}
export function closeModal() {
  const root = $('#modal-root');
  root.classList.remove('open');
  root.innerHTML = '';
}
export const modalOpen = () => $('#modal-root').classList.contains('open');

// ── 씨앗 상점 (우편함) ─────────────────────────────
export function openShop() {
  const ids = shopSeeds();
  const rows = ids.map(id => {
    const c = CROPS[id];
    const afford = S.gold >= c.seed;
    return `<div class="row">
      <img src="${itemIcon(id)}" class="icon">
      <div class="grow"><b>${c.name} 씨앗</b><small>${growLabel(c.grow)} · 판매 ${c.sell}G${c.regrow ? ' · 다회수확' : ''}</small></div>
      <button class="buy ${afford ? '' : 'off'}" data-id="${id}">${c.seed}G</button>
    </div>`;
  }).join('');
  const sheet = openModal(`
    <h2>🌱 씨앗 카탈로그</h2>
    <p class="sub">봄이네 잡화점 배달 주문서 — 계절 작물만 실려 있어요</p>
    <div class="list">${rows}</div>
    <button class="close-btn">닫기</button>`);
  sheet.querySelectorAll('.buy').forEach(b => b.onclick = () => {
    const c = CROPS[b.dataset.id];
    if (S.gold < c.seed) return toast('골드가 부족해요!');
    S.gold -= c.seed;
    S.seeds[b.dataset.id] = (S.seeds[b.dataset.id] || 0) + 1;
    save(S); refreshHUD();
    toast(`${c.name} 씨앗을 샀어요`);
    openShop(); // 갱신
  });
  sheet.querySelector('.close-btn').onclick = closeModal;
}

// ── 출하 상자 (판매) ─────────────────────────────
export function openSell() {
  const ids = Object.keys(S.inv).filter(id => S.inv[id] > 0);
  const rows = ids.length ? ids.map(id => {
    const c = CROPS[id];
    return `<div class="row">
      <img src="${itemIcon(id)}" class="icon">
      <div class="grow"><b>${c.name}</b><small>${c.sell}G × ${S.inv[id]}개</small></div>
      <button class="buy" data-id="${id}" data-n="1">1개</button>
      <button class="buy gold" data-id="${id}" data-n="all">전부</button>
    </div>`;
  }).join('') : `<p class="empty">팔 수 있는 수확물이 없어요.<br>밭에서 작물을 키워보세요!</p>`;
  const sheet = openModal(`
    <h2>📦 출하 상자</h2>
    <p class="sub">넣어두면 행상인이 바로 값을 쳐줘요</p>
    <div class="list">${rows}</div>
    <button class="close-btn">닫기</button>`);
  sheet.querySelectorAll('.buy').forEach(b => b.onclick = () => {
    const id = b.dataset.id;
    const n = b.dataset.n === 'all' ? S.inv[id] : 1;
    const earn = CROPS[id].sell * n;
    S.inv[id] -= n;
    S.gold += earn;
    S.stats.earned += earn;
    save(S); refreshHUD();
    toast(`+${fmt(earn)}G 💰`);
    openSell();
  });
  sheet.querySelector('.close-btn').onclick = closeModal;
}

// ── 씨앗 선택 (빈 밭 탭) ─────────────────────────────
export function openSeedPicker(onPick) {
  const ids = Object.keys(S.seeds).filter(id => S.seeds[id] > 0);
  if (!ids.length) { toast('씨앗이 없어요 — 우편함에서 주문하세요 📮'); return; }
  const rows = ids.map(id => `
    <button class="row pick" data-id="${id}">
      <img src="${itemIcon(id)}" class="icon">
      <div class="grow"><b>${CROPS[id].name}</b><small>${growLabel(CROPS[id].grow)}</small></div>
      <span class="count">×${S.seeds[id]}</span>
    </button>`).join('');
  const sheet = openModal(`<h2>어떤 씨앗을 심을까요?</h2><div class="list">${rows}</div>
    <button class="close-btn">취소</button>`);
  sheet.querySelectorAll('.pick').forEach(b => b.onclick = () => { closeModal(); onPick(b.dataset.id); });
  sheet.querySelector('.close-btn').onclick = closeModal;
}

// ── 오프라인 정산 ─────────────────────────────
export function showSettlement(elapsed, newlyMature) {
  const mins = Math.floor(elapsed / 6e4);
  const t = mins >= 60 ? `${Math.floor(mins / 60)}시간 ${mins % 60}분` : `${mins}분`;
  const sheet = openModal(`
    <h2>🌙 돌아온 걸 환영해요!</h2>
    <p class="sub">${t} 동안 농장은 잘 자라고 있었어요</p>
    <div class="settle"><img src="assets/crops/common_growing.png">
      <p>${newlyMature > 0 ? `<b>${newlyMature}개</b> 작물이 수확을 기다려요!` : '작물이 무럭무럭 자라는 중이에요'}</p></div>
    <button class="close-btn primary">농장으로!</button>`, 'center');
  sheet.querySelector('.close-btn').onclick = closeModal;
}

// ── 프롤로그 (할머니의 편지) ─────────────────────────────
export function showPrologue(done) {
  const sheet = openModal(`
    <div class="letter">
      <h2>💌 할머니의 편지</h2>
      <p>사랑하는 아이에게.</p>
      <p>반딧불 마을의 농장을 너에게 맡긴다.
      도시의 밤이 너무 밝아 별이 안 보이거든,
      이곳의 반딧불을 보러 오렴.</p>
      <p>부엌 서랍에 나의 레시피북을 두었단다.
      …그 책이 너를 기다리고 있을 거야.</p>
      <p class="sign">— 할머니가</p>
    </div>
    <button class="close-btn primary">농장 시작하기 🌾</button>`, 'center');
  sheet.querySelector('.close-btn').onclick = () => { closeModal(); done(); };
}

function growLabel(ms) {
  const m = ms / 6e4;
  if (m < 60) return `${m}분`;
  return m % 60 === 0 ? `${m / 60}시간` : `${Math.floor(m / 60)}시간 ${m % 60}분`;
}
