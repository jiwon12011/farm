// DOM UI: HUD·모달·토스트·상점·판매·씨앗 선택·요리·정산·스토리
import { CROPS, SEASONS, seasonNow, shopSeeds, itemIcon } from '../data/crops.js';
import { ITEMS, itemOf } from '../data/items.js';
import { RECIPES, TOOLS } from '../data/recipes.js';
import { NPCS, MILESTONES } from '../data/npcs.js';
import { REPAIRS, REPAIR_ORDER, nextRepair } from '../data/village.js';
import { ANIMALS, MAX_ANIMALS, newAnimal } from '../systems/ranch.js';
import * as Cook from '../systems/cooking.js';
import { ensureOrders, deliver } from '../systems/orders.js';
import { SLOT_COUNT, stock, unstock, collectPending } from '../systems/restaurant.js';
import { GROWTH_MULT } from '../systems/farming.js';
import { BLESSINGS, blessLeft, buyBless, offer, offerValue, sellMult, activeBlessCount, WILD_CAP } from '../systems/spirit.js';
import { weatherToday } from '../systems/season.js';
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
  const w = weatherToday();
  const sky = night ? '🌙' : w === 'rain' ? '🌧️' : w === 'snow' ? '❄️' : '☀️';
  const bless = activeBlessCount(S) > 0 ? ' ✨' : '';
  $('#clock').textContent = `${SEASONS[season]} ${day}일차 ${sky}${bless}`;
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

// ── 상점 (우편함): 씨앗 | 목장 ─────────────────────────────
export function openShop(tab = 'seeds') {
  let rows = '';
  if (tab === 'seeds') {
    rows = shopSeeds().map(id => {
      const c = CROPS[id];
      return `<div class="row">
        <img src="${itemIcon(id)}" class="icon">
        <div class="grow"><b>${c.name} 씨앗</b><small>${growLabel(c.grow)} · 판매 ${c.sell}G${c.regrow ? ' · 다회수확' : ''}</small></div>
        <button class="buy ${S.gold >= c.seed ? '' : 'off'}" data-buy="seed" data-id="${id}">${c.seed}G</button>
      </div>`;
    }).join('');
  } else {
    const full = S.animals.length >= MAX_ANIMALS;
    rows = `<div class="row">
      <img src="assets/items/feed.png" class="icon">
      <div class="grow"><b>사료 5개</b><small>동물에게 주면 생산 게이지 +50%</small></div>
      <button class="buy ${S.gold >= 40 ? '' : 'off'}" data-buy="feed">40G</button>
    </div>` + Object.entries(ANIMALS).map(([id, a]) => `<div class="row">
      <img src="assets/animals/${id}_adult.png" class="icon">
      <div class="grow"><b>${a.name}</b><small>${itemOf(a.product).name} ${growLabel(a.period)}마다 · 개당 ${itemOf(a.product).sell}G</small></div>
      <button class="buy ${S.gold >= a.price && !full ? '' : 'off'}" data-buy="animal" data-id="${id}">${fmt(a.price)}G</button>
    </div>`).join('');
    if (full) rows = `<p class="sub">🏡 울타리가 가득 찼어요 (최대 ${MAX_ANIMALS}마리)</p>` + rows;
  }
  const sheet = openModal(`
    <h2>📮 봄이네 배달 주문서</h2>
    <div class="tabs">
      <button class="tab ${tab === 'seeds' ? 'on' : ''}" data-tab="seeds">🌱 씨앗</button>
      <button class="tab ${tab === 'ranch' ? 'on' : ''}" data-tab="ranch">🐄 목장</button>
    </div>
    <div class="list">${rows}</div>
    <button class="close-btn">닫기</button>`);
  sheet.querySelectorAll('.tab').forEach(b => b.onclick = () => openShop(b.dataset.tab));
  sheet.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
    const kind = b.dataset.buy;
    if (kind === 'seed') {
      const c = CROPS[b.dataset.id];
      if (S.gold < c.seed) return toast('골드가 부족해요!');
      S.gold -= c.seed;
      S.seeds[b.dataset.id] = (S.seeds[b.dataset.id] || 0) + 1;
      toast(`${c.name} 씨앗을 샀어요`);
    } else if (kind === 'feed') {
      if (S.gold < 40) return toast('골드가 부족해요!');
      S.gold -= 40;
      S.inv.feed = (S.inv.feed || 0) + 5;
      toast('사료 5개 도착! 🐾');
    } else {
      const a = ANIMALS[b.dataset.id];
      if (S.animals.length >= MAX_ANIMALS) return toast('울타리가 가득 찼어요');
      if (S.gold < a.price) return toast('골드가 부족해요!');
      S.gold -= a.price;
      S.animals.push(newAnimal(b.dataset.id));
      toast(`${a.name}이(가) 울타리에 도착했어요! 🎉`);
    }
    save(S); refreshHUD();
    openShop(kind === 'seed' ? 'seeds' : 'ranch');
  });
  sheet.querySelector('.close-btn').onclick = closeModal;
}

// ── 출하 상자 (판매) ─────────────────────────────
export function openSell() {
  const mult = sellMult(S);
  const ids = Object.keys(S.inv).filter(id => S.inv[id] > 0);
  const rows = ids.length ? ids.map(id => {
    const it = itemOf(id);
    return `<div class="row">
      <img src="${it.icon}" class="icon">
      <div class="grow"><b>${it.name}</b><small>${fmt(Math.round(it.sell * mult))}G × ${S.inv[id]}개</small></div>
      <button class="buy" data-id="${id}" data-n="1">1개</button>
      <button class="buy gold" data-id="${id}" data-n="all">전부</button>
    </div>`;
  }).join('') : `<p class="empty">팔 수 있는 것이 없어요.<br>작물을 키우고 요리를 만들어보세요!</p>`;
  const blessNote = mult > 1 ? `<p class="sub">✨ 금빛 흥정의 축복 — 판매가 +20%!</p>` : '';
  const sheet = openModal(`
    <h2>📦 출하 상자</h2>
    <p class="sub">넣어두면 행상인이 바로 값을 쳐줘요 — 요리는 재료보다 훨씬 비싸요!</p>
    ${blessNote}
    <div class="list">${rows}</div>
    <button class="close-btn">닫기</button>`);
  sheet.querySelectorAll('.buy').forEach(b => b.onclick = () => {
    const id = b.dataset.id;
    const n = b.dataset.n === 'all' ? S.inv[id] : 1;
    const earn = Math.round(itemOf(id).sell * mult) * n;
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

// ── 요리 (화로) ─────────────────────────────
export function openCooking(tool) {
  const st = Cook.stoveState(S, tool);
  const toolName = TOOLS[tool].name;

  if (st.status === 'cooking') {
    const it = itemOf(st.recipe);
    const sheet = openModal(`
      <h2>🍳 ${toolName}</h2>
      <div class="settle"><img src="${it.icon}">
        <p><b>${it.name}</b> 조리 중...<br>${Cook.fmtLeft(st.left)} 남았어요</p></div>
      <button class="close-btn">기다리기</button>`, 'center');
    sheet.querySelector('.close-btn').onclick = closeModal;
    return;
  }
  if (st.status === 'done') {
    const id = Cook.collectDish(S, tool);
    const it = itemOf(id);
    save(S);
    toast(`${it.name} 완성! 🍽️`);
    if (id !== 'mystery_porridge' && !S.flags.ch1) {
      S.flags.ch1 = true; save(S);
      showMemory('📖 레시피북 — 첫 페이지', [
        '요리 냄새에 이끌리듯, 레시피북의 덩굴 문양 하나가 스르르 풀렸다.',
        '『맛있는 냄새는 배고픈 이만 부르는 게 아니란다. 밤의 작은 친구들도 코가 밝거든.』',
        '…창밖에서 반딧불 하나가 반짝, 하고 사라졌다.',
      ]);
    }
    return;
  }

  // idle: 레시피 목록 + 실험
  const known = S.recipes.filter(id => RECIPES[id].tool === tool);
  const rows = known.length ? known.map(id => {
    const r = RECIPES[id];
    const ok = Cook.hasIngredients(S, r.ing);
    const ingTxt = Object.entries(r.ing).map(([i, n]) => `${itemOf(i).name}×${n}`).join(' ');
    return `<div class="row">
      <img src="assets/dishes/${id}.png" class="icon">
      <div class="grow"><b>${r.name}</b><small>${ingTxt} · ${growLabel(r.time)} · ${fmt(r.sell)}G</small></div>
      <button class="buy ${ok ? '' : 'off'}" data-cook="${id}">조리</button>
    </div>`;
  }).join('') : `<p class="empty">이 도구로 아는 레시피가 없어요.<br>재료를 조합해 실험해보세요!</p>`;
  const sheet = openModal(`
    <h2>🍳 ${toolName}</h2>
    <div class="list">${rows}</div>
    <button class="buy gold wide" id="exp-btn">🧪 실험하기 — 재료를 자유롭게 조합!</button>
    <button class="close-btn">닫기</button>`);
  sheet.querySelectorAll('[data-cook]').forEach(b => b.onclick = () => {
    if (Cook.startCook(S, tool, b.dataset.cook)) {
      save(S);
      toast(`${RECIPES[b.dataset.cook].name} 조리 시작!`);
      closeModal();
    } else toast('재료가 부족해요');
  });
  sheet.querySelector('#exp-btn').onclick = () => openExperiment(tool);
  sheet.querySelector('.close-btn').onclick = closeModal;
}

// ── 실험 조합 ─────────────────────────────
function openExperiment(tool, sel = {}) {
  const total = Object.values(sel).reduce((a, b) => a + b, 0);
  const ids = Object.keys(S.inv).filter(id => S.inv[id] > 0 && !RECIPES[id] && id !== 'mystery_porridge');
  const rows = ids.map(id => {
    const it = itemOf(id);
    const n = sel[id] || 0;
    return `<div class="row">
      <img src="${it.icon}" class="icon">
      <div class="grow"><b>${it.name}</b><small>보유 ${S.inv[id]}개</small></div>
      <button class="buy ${n > 0 ? '' : 'off'}" data-mod="${id}" data-d="-1">−</button>
      <span class="count">${n}</span>
      <button class="buy ${total < 4 && n < S.inv[id] ? '' : 'off'}" data-mod="${id}" data-d="1">＋</button>
    </div>`;
  }).join('');
  const sheet = openModal(`
    <h2>🧪 실험 조합 — ${TOOLS[tool].name}</h2>
    <p class="sub">재료 2~4개를 넣고 끓여보세요. 새로운 레시피를 발견할지도!</p>
    <div class="list">${rows || '<p class="empty">재료가 없어요</p>'}</div>
    <button class="buy gold wide ${total >= 2 ? '' : 'off'}" id="go-btn">조합하기! (${total}/4)</button>
    <button class="close-btn">뒤로</button>`);
  sheet.querySelectorAll('[data-mod]').forEach(b => b.onclick = () => {
    const id = b.dataset.mod, d = +b.dataset.d;
    const next = { ...sel, [id]: Math.max(0, (sel[id] || 0) + d) };
    if (!next[id]) delete next[id];
    openExperiment(tool, next);
  });
  sheet.querySelector('#go-btn').onclick = () => {
    if (total < 2) return toast('재료를 2개 이상 넣어주세요');
    const res = Cook.experiment(S, tool, sel);
    if (!res.ok) return toast('조리 중이거나 재료가 부족해요');
    save(S);
    closeModal();
    if (res.discovered) toast(`✨ 새 레시피 발견: ${RECIPES[res.discovered].name}!`, 3200);
    else if (res.mystery) toast('부글부글… 수상한 죽이 되어가고 있어요 💀');
    else toast(`${RECIPES[res.recipe].name} 조리 시작!`);
  };
  sheet.querySelector('.close-btn').onclick = () => openCooking(tool);
}

// ── NPC 대화 ─────────────────────────────
export function openDialog(npcId) {
  const npc = NPCS[npcId];
  const aff = S.affinity[npcId] || 0;
  const today = new Date().toDateString();
  const talked = S.talkDay[npcId] === today;
  const line = npc.lines[(aff + (talked ? 0 : 1)) % npc.lines.length];
  const hearts = '♥'.repeat(Math.min(10, aff)) + '♡'.repeat(Math.max(0, 10 - aff));

  if (!talked) {
    S.talkDay[npcId] = today;
    S.affinity[npcId] = aff + 1;
    if (MILESTONES[aff + 1]) {
      S.gold += MILESTONES[aff + 1];
      toast(`${npc.name}의 선물! +${MILESTONES[aff + 1]}G 💝`, 3000);
    }
    save(S); refreshHUD();
  }

  let extra = '';
  if (npc.action === 'repairs') extra = `<button class="buy gold wide" id="npc-action">🔨 수리 의뢰 보기</button>`;
  if (npc.hint) {
    const unknown = Object.keys(RECIPES).filter(id => !S.recipes.includes(id));
    if (unknown.length) {
      const r = RECIPES[unknown[Math.floor(Math.random() * unknown.length)]];
      const ings = Object.entries(r.ing).map(([i, n]) => `${itemOf(i).name}×${n}`).join(', ');
      extra = `<p class="sub">💡 "${TOOLS[r.tool].name}에 ${ings}… 그런 요리가 있었는데 말이야~"</p>`;
    }
  }

  const sheet = openModal(`
    <div class="npc-head"><img src="${npc.sprite}"><div>
      <h2>${npc.name}</h2><small class="hearts">${hearts}</small></div></div>
    <p class="dialog-line">"${line}"</p>
    ${extra}
    <button class="close-btn">그럼 이만</button>`, 'center');
  const act = sheet.querySelector('#npc-action');
  if (act) act.onclick = () => openRepairs();
  sheet.querySelector('.close-btn').onclick = closeModal;
}

// ── 수리 의뢰 (망치) ─────────────────────────────
export function openRepairs() {
  const next = nextRepair(S.village);
  const rows = REPAIR_ORDER.map(id => {
    const rp = REPAIRS[id];
    const st = S.village[id];
    const mats = Object.entries(rp.mats).map(([i, n]) =>
      `${itemOf(i).name} ${Math.min(S.inv[i] || 0, n)}/${n}`).join(' · ');
    let btn;
    if (st.status === 'done') btn = `<span class="count">✅</span>`;
    else if (st.status === 'building') btn = `<span class="count">🔨 ${Cook.fmtLeft(st.doneAt - Date.now())}</span>`;
    else if (id !== next) btn = `<span class="count">🔒</span>`;
    else {
      const can = S.gold >= rp.gold && Object.entries(rp.mats).every(([i, n]) => (S.inv[i] || 0) >= n);
      btn = `<button class="buy ${can ? '' : 'off'}" data-repair="${id}">${fmt(rp.gold)}G</button>`;
    }
    return `<div class="row">
      <div class="grow"><b>${rp.name}</b><small>${rp.desc}<br>재료: ${mats} · 공사 ${growLabel(rp.ms)}</small></div>
      ${btn}</div>`;
  }).join('');
  const sheet = openModal(`
    <h2>🔨 망치의 작업 목록</h2>
    <p class="sub">"…순서대로 고친다. 그게 내 방식."</p>
    <div class="list">${rows}</div>
    <button class="close-btn">닫기</button>`);
  sheet.querySelectorAll('[data-repair]').forEach(b => b.onclick = () => {
    const id = b.dataset.repair;
    const rp = REPAIRS[id];
    if (S.gold < rp.gold || !Object.entries(rp.mats).every(([i, n]) => (S.inv[i] || 0) >= n)) {
      return toast('돈이나 재료가 부족해요');
    }
    S.gold -= rp.gold;
    for (const [i, n] of Object.entries(rp.mats)) S.inv[i] -= n;
    S.village[id] = { status: 'building', doneAt: Date.now() + rp.ms / GROWTH_MULT };
    save(S); refreshHUD();
    toast(`${rp.name} 공사 시작! 🔨`);
    openRepairs();
  });
  sheet.querySelector('.close-btn').onclick = closeModal;
}

// ── 주문 게시판 ─────────────────────────────
export function openBoard() {
  ensureOrders(S);
  save(S);
  const rows = S.orders.list.map((o, i) => {
    const it = itemOf(o.id);
    const have = S.inv[o.id] || 0;
    if (o.done) return `<div class="row"><img src="${it.icon}" class="icon">
      <div class="grow"><b>${it.name} ×${o.n}</b><small>납품 완료</small></div><span class="count">✅</span></div>`;
    return `<div class="row"><img src="${it.icon}" class="icon">
      <div class="grow"><b>${it.name} ×${o.n}</b><small>보유 ${have}개 · 보상 ${fmt(o.reward)}G (1.5배)</small></div>
      <button class="buy ${have >= o.n ? '' : 'off'}" data-deliver="${i}">납품</button></div>`;
  }).join('');
  const left = Cook.fmtLeft(Math.max(0, S.orders.refreshAt - Date.now()));
  const sheet = openModal(`
    <h2>📋 마을 주문 게시판</h2>
    <p class="sub">주민들의 부탁 — ${left} 후 새 주문이 붙어요</p>
    <div class="list">${rows}</div>
    <button class="close-btn">닫기</button>`);
  sheet.querySelectorAll('[data-deliver]').forEach(b => b.onclick = () => {
    const i = +b.dataset.deliver;
    if (deliver(S, i)) {
      save(S); refreshHUD();
      toast(`납품 완료! +${fmt(S.orders.list[i].reward)}G 💰`);
      openBoard();
    } else toast('수량이 부족해요');
  });
  sheet.querySelector('.close-btn').onclick = closeModal;
}

// ── 식당 진열대 ─────────────────────────────
export function openRestaurant() {
  const r = S.restaurant;
  const slots = r.slots.map((slot, i) => {
    if (!slot) return `<button class="row pick" data-slot="${i}">
      <span class="icon slot-empty">＋</span>
      <div class="grow"><b>빈 진열대</b><small>요리를 올려두면 자동으로 팔려요</small></div></button>`;
    const it = itemOf(slot.id);
    return `<div class="row"><img src="${it.icon}" class="icon">
      <div class="grow"><b>${it.name} ×${slot.n}</b><small>30분마다 1개 · ${fmt(it.sell)}G씩</small></div>
      <button class="buy" data-unstock="${i}">회수</button></div>`;
  }).join('');
  const sheet = openModal(`
    <h2>🍽️ 반디네 부엌 — 진열대</h2>
    <div class="row"><img src="assets/ui/icon_coin.png" class="icon">
      <div class="grow"><b>쌓인 매출 ${fmt(Math.floor(r.pending))}G</b><small>자리를 비워도 12시간까지 팔려요</small></div>
      <button class="buy gold ${Math.floor(r.pending) > 0 ? '' : 'off'}" id="collect-btn">수금</button></div>
    <div class="list">${slots}</div>
    <button class="close-btn">닫기</button>`);
  sheet.querySelector('#collect-btn').onclick = () => {
    const g = collectPending(S);
    if (g > 0) { save(S); refreshHUD(); toast(`+${fmt(g)}G 수금! 💰`); openRestaurant(); }
  };
  sheet.querySelectorAll('[data-unstock]').forEach(b => b.onclick = () => {
    unstock(S, +b.dataset.unstock); save(S); openRestaurant();
  });
  sheet.querySelectorAll('[data-slot]').forEach(b => b.onclick = () => {
    const i = +b.dataset.slot;
    const dishes = Object.keys(S.inv).filter(id => S.inv[id] > 0 && (RECIPES[id] || id === 'mystery_porridge'));
    if (!dishes.length) return toast('진열할 요리가 없어요 — 부엌에서 만들어오세요!');
    const rows = dishes.map(id => `<button class="row pick" data-dish="${id}">
      <img src="${itemOf(id).icon}" class="icon">
      <div class="grow"><b>${itemOf(id).name}</b><small>${fmt(itemOf(id).sell)}G</small></div>
      <span class="count">×${S.inv[id]}</span></button>`).join('');
    const sub = openModal(`<h2>무엇을 진열할까요?</h2><div class="list">${rows}</div>
      <button class="close-btn">뒤로</button>`);
    sub.querySelectorAll('[data-dish]').forEach(d => d.onclick = () => {
      stock(S, i, d.dataset.dish, S.inv[d.dataset.dish]);
      save(S); openRestaurant();
    });
    sub.querySelector('.close-btn').onclick = () => openRestaurant();
  });
  sheet.querySelector('.close-btn').onclick = closeModal;
}

// ── 정령 제단: 공양(요리 → 반딧불) + 축복 구매 ─────────────────────────────
export function openShrine(tab = 'bless') {
  let rows = '';
  if (tab === 'bless') {
    rows = Object.entries(BLESSINGS).map(([id, b]) => {
      const left = blessLeft(S, id);
      const state = left > 0
        ? `<span class="count">✨ ${Cook.fmtLeft(left)}</span>`
        : `<button class="buy ${S.fireflies >= b.cost ? 'gold' : 'off'}" data-bless="${id}">${b.cost}✨</button>`;
      return `<div class="row">
        <img src="${b.icon}" class="icon">
        <div class="grow"><b>${b.name}</b><small>${b.desc}</small></div>
        ${state}</div>`;
    }).join('');
  } else {
    const dishes = Object.keys(S.inv).filter(id => S.inv[id] > 0 && (RECIPES[id] || id === 'mystery_porridge'));
    rows = dishes.length ? dishes.map(id => {
      const it = itemOf(id);
      return `<div class="row">
        <img src="${it.icon}" class="icon">
        <div class="grow"><b>${it.name}</b><small>보유 ${S.inv[id]}개${id === 'mystery_porridge' ? ' · 정령들이 이상하게 좋아해요' : ''}</small></div>
        <button class="buy gold" data-offer="${id}">+${offerValue(id)}✨</button>
      </div>`;
    }).join('') : `<p class="empty">바칠 요리가 없어요.<br>수상한 죽도 정령에겐 진수성찬이래요!</p>`;
  }
  const sheet = openModal(`
    <h2>🌿 정령의 제단</h2>
    <p class="sub">보유 반딧불 ✨${fmt(S.fireflies)} · 밤에는 들판의 반딧불을 잡을 수 있어요 (하루 ${WILD_CAP}마리)</p>
    <div class="tabs">
      <button class="tab ${tab === 'bless' ? 'on' : ''}" data-tab="bless">🌙 축복</button>
      <button class="tab ${tab === 'offer' ? 'on' : ''}" data-tab="offer">🍲 공양</button>
    </div>
    <div class="list">${rows}</div>
    <button class="close-btn">닫기</button>`);
  sheet.querySelectorAll('.tab').forEach(b => b.onclick = () => openShrine(b.dataset.tab));
  sheet.querySelectorAll('[data-bless]').forEach(b => b.onclick = () => {
    const id = b.dataset.bless;
    if (buyBless(S, id)) {
      save(S); refreshHUD();
      toast(id === 'instant' ? '달빛이 쏟아진다… 밭의 작물이 일제히 여물었다! 🌕' : `${BLESSINGS[id].name}의 축복을 받았어요 ✨`, 3000);
      openShrine('bless');
    } else toast(id === 'instant' && S.fireflies >= BLESSINGS.instant.cost ? '자라는 중인 작물이 없어요' : '반딧불이 부족해요');
  });
  sheet.querySelectorAll('[data-offer]').forEach(b => b.onclick = () => {
    const n = offer(S, b.dataset.offer);
    if (n > 0) {
      save(S); refreshHUD();
      toast(`제단이 은은하게 빛난다… ✨ +${n}`);
      openShrine('offer');
    }
  });
  sheet.querySelector('.close-btn').onclick = closeModal;
}

// ── 오프라인 정산 ─────────────────────────────
export function showSettlement(elapsed, { crops = 0, products = 0, dishes = 0, earned = 0, watered = 0 } = {}) {
  const mins = Math.floor(elapsed / 6e4);
  const t = mins >= 60 ? `${Math.floor(mins / 60)}시간 ${mins % 60}분` : `${mins}분`;
  const lines = [];
  if (crops > 0) lines.push(`🌾 작물 <b>${crops}개</b>가 수확을 기다려요`);
  if (products > 0) lines.push(`🥚 동물 생산물 <b>${products}개</b>가 쌓였어요`);
  if (dishes > 0) lines.push(`🍽️ 요리 <b>${dishes}개</b>가 완성됐어요`);
  if (earned > 0) lines.push(`💰 식당에서 <b>${fmt(earned)}G</b>어치가 팔렸어요`);
  if (watered > 0) lines.push(`💧 우물이 밭 ${watered}칸에 물을 줬어요`);
  if (!lines.length) lines.push('농장이 무럭무럭 자라는 중이에요');
  const sheet = openModal(`
    <h2>🌙 돌아온 걸 환영해요!</h2>
    <p class="sub">${t} 동안 농장은 잘 자라고 있었어요</p>
    <div class="settle"><img src="assets/crops/common_growing.png">
      <p>${lines.join('<br>')}</p></div>
    <button class="close-btn primary">농장으로!</button>`, 'center');
  sheet.querySelector('.close-btn').onclick = closeModal;
}

// ── 스토리 편지/기억 모달 ─────────────────────────────
export function showMemory(title, paras, btn = '소중히 간직하기') {
  const sheet = openModal(`
    <div class="letter">
      <h2>${title}</h2>
      ${paras.map(p => `<p>${p}</p>`).join('')}
    </div>
    <button class="close-btn primary">${btn}</button>`, 'center');
  sheet.querySelector('.close-btn').onclick = closeModal;
}

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
