// 반딧불 농장 — 부트스트랩 & 게임 루프
import { MAPS, TRANSITIONS, FIREFLY_SPOTS, NIGHT_LIGHTS } from './data/maps.js';
import { CROPS, seasonNow } from './data/crops.js';
import { NPCS } from './data/npcs.js';
import { REPAIRS, REPAIR_ORDER } from './data/village.js';
import { tickRestaurant } from './systems/restaurant.js';
import { img, preload, drawSprite } from './engine/assets.js';
import { initInput, pollInput } from './engine/input.js';
import { newState, load, save, wipe, initAutosave } from './engine/save.js';
import { tickFarm, plant, water, harvest, plotCost, stageSprite, GROWTH_MULT } from './systems/farming.js';
import { ANIMALS, tickRanch, wander, readyCount, collect, feed, pet, canPet } from './systems/ranch.js';
import { settleOffline } from './systems/offline.js';
import { nightAlpha, isNight, catchWild, wildCap, growthBoost, ranchBoost } from './systems/spirit.js';
import { weatherToday, rainWater, SEASON_TINTS } from './systems/season.js';
import { itemOf } from './data/items.js';
import { STARTER_RECIPES } from './data/recipes.js';
import * as UI from './ui/ui.js';

const DEBUG = new URLSearchParams(location.search).has('debug');
const OVERLAY = new URLSearchParams(location.search).get('debug') === 'overlay'; // 충돌·상호작용 영역 표시
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');

// ── 상태 ─────────────────────────────
const S = load() || newState();
UI.bindState(S);
window.G = DEBUG ? S : undefined;

let mapId = S.map;
let player = { x: S.px, y: S.py, dir: 'down', moving: false, animT: 0 };
let cam = { x: 0, y: 0 };
let zoom = 1, vw = 0, vh = 0;
let fireflies = [];
// 떠다니는 반딧불의 현재 위치 (렌더·상호작용 공용)
const flyPos = (f, now) => ({
  x: f.x + Math.sin(now / 1000 * f.s + f.p) * 30,
  y: f.y + Math.cos(now / 1300 * f.s + f.p) * 22,
});

// ── 캔버스 & 줌 ─────────────────────────────
function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = innerWidth * dpr;
  cv.height = innerHeight * dpr;
  zoom = Math.max(1, Math.min(innerWidth, innerHeight) / 460);
  const s = dpr * zoom;
  ctx.setTransform(s, 0, 0, s, 0, 0);
  vw = innerWidth / zoom; vh = innerHeight / zoom;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
}
addEventListener('resize', resize);
resize();

// ── 이동 & 충돌 ─────────────────────────────
const SPEED = 155;
function move(dt) {
  const v = pollInput();
  player.moving = !!(v.x || v.y);
  if (!player.moving) return;
  if (Math.abs(v.x) > Math.abs(v.y)) player.dir = v.x > 0 ? 'right' : 'left';
  else player.dir = v.y > 0 ? 'down' : 'up';
  const m = MAPS[mapId];
  const step = (dx, dy) => {
    const nx = player.x + dx, ny = player.y + dy;
    const bw = 9, bh = 7; // 발밑 히트박스 절반
    for (const [rx, ry, rw, rh] of m.colliders) {
      if (nx + bw > rx && nx - bw < rx + rw && ny > ry && ny - bh < ry + rh) return;
    }
    player.x = Math.max(20, Math.min(m.w - 20, nx));
    player.y = Math.max(20, Math.min(m.h - 20, ny));
  };
  step(v.x * SPEED * dt, 0);
  step(0, v.y * SPEED * dt);
  player.animT += dt;
}

// ── 상호작용 ─────────────────────────────
let action = null, actionKey = '';
function findAction(now) {
  const m = MAPS[mapId];
  let best = null, bestD = 1e9;
  const consider = (d, obj) => { if (d < bestD) { bestD = d; best = obj; } };

  if (mapId === 'farm') {
    m.plots.forEach((pos, i) => {
      const d = Math.hypot(player.x - pos.x, player.y - (pos.y - 14));
      if (d > 55) return;
      const plot = S.plots[i];
      if (i >= S.unlocked) consider(d, { kind: 'unlock', i, label: `확장 ${plotCost(i)}G`, icon: 'icon_hoe' });
      else if (!plot.crop) consider(d, { kind: 'plant', i, label: '심기', icon: 'icon_hoe' });
      else if (plot.progress >= 1) consider(d, { kind: 'harvest', i, label: '수확', icon: 'icon_star' });
      else if (plot.progress >= plot.wateredUntil) consider(d, { kind: 'water', i, label: '물주기', icon: 'icon_wateringcan' });
    });
    S.animals.forEach((a, i) => {
      const d = Math.hypot(player.x - a.x, player.y - a.y);
      if (d > 52) return;
      if (readyCount(a) > 0) consider(d, { kind: 'collect', i, label: '받기', icon: 'icon_star' });
      else if ((S.inv.feed || 0) > 0) consider(d, { kind: 'feed', i, label: '먹이', icon: 'icon_bag' });
      else if (canPet(a)) consider(d, { kind: 'pet', i, label: '쓰다듬기', icon: 'icon_heart' });
    });
  }
  // NPC (맵별)
  for (const [nid, npc] of Object.entries(NPCS)) {
    if (npc.map !== mapId) continue;
    const d = Math.hypot(player.x - npc.x, player.y - npc.y);
    if (d < 60) consider(d, { kind: 'talk', npc: nid, label: '대화', icon: 'icon_heart' });
  }
  // 밤 야생 반딧불 잡기 (실외 맵)
  if (isNight() && mapId !== 'home') {
    fireflies.forEach((f, i) => {
      const p = flyPos(f, now);
      const d = Math.hypot(player.x - p.x, player.y - p.y);
      if (d < 46) consider(d, { kind: 'wildfly', i, label: '잡기', icon: 'icon_firefly' });
    });
  }
  // 숲 반딧불 채집
  if (mapId === 'forest') {
    FIREFLY_SPOTS.forEach((s, i) => {
      if (S.forest.taken[i]) return;
      const d = Math.hypot(player.x - s.x, player.y - s.y);
      if (d < 48) consider(d, { kind: 'firefly', i, label: '줍기', icon: 'icon_firefly' });
    });
  }
  for (const it of m.interacts) {
    const d = Math.hypot(player.x - it.x, player.y - it.y);
    if (d > it.rr + 26) continue;
    const meta = {
      mailbox: ['주문', 'icon_bag'], shipbox: ['판매', 'icon_coin'],
      door: ['들어가기', null], door_out: ['나가기', null], bed: ['잠자기', 'icon_heart'],
      well: ['우물', null], exit_village: ['마을', null], exit_forest: ['숲', null],
      stove_pan: ['화로', null], stove_pot: ['화로', null], stove_oven: ['오븐', null], stove_jar: ['절임통', null],
      board: ['게시판', 'icon_quest'], well_v: ['우물', null],
      restaurant: ['식당', 'icon_coin'], shrine: ['제단', null],
      exit_farm_s: ['농장', null], exit_farm_n: ['농장', null],
    }[it.id];
    consider(d, { kind: it.id, label: meta[0], icon: meta[1] });
  }
  action = best;
  const key = best ? best.kind + (best.i ?? '') + best.label : '';
  if (key !== actionKey) {
    actionKey = key;
    const btn = document.getElementById('act');
    if (!best) { btn.classList.remove('show'); return; }
    btn.classList.add('show');
    btn.querySelector('img').src = best.icon ? `assets/ui/${best.icon}.png` : 'assets/objects/sign.png';
    btn.querySelector('span').textContent = best.label;
  }
}

function doAction() {
  if (!action || UI.modalOpen()) return;
  const a = action;
  const plot = a.i != null ? S.plots[a.i] : null;
  switch (a.kind) {
    case 'plant':
      UI.openSeedPicker(id => {
        if (plant(S, plot, id)) { UI.toast(`${CROPS[id].name} 씨앗을 심었어요 🌱`); save(S); }
      });
      break;
    case 'water':
      if (water(plot)) { UI.toast('촉촉해졌어요! 성장 1.5배 💧'); save(S); }
      break;
    case 'harvest': {
      const id = harvest(S, plot);
      if (id) { UI.toast(`${CROPS[id].name} 수확! 🧺`); UI.refreshHUD(); save(S); }
      break;
    }
    case 'unlock': {
      const cost = plotCost(a.i);
      if (S.unlocked !== a.i) { UI.toast('앞의 밭부터 순서대로 개간할 수 있어요'); break; }
      if (S.gold < cost) { UI.toast(`골드가 부족해요 (${cost}G 필요)`); break; }
      S.gold -= cost; S.unlocked++;
      UI.toast('새 밭을 개간했어요! 🌾'); UI.refreshHUD(); save(S);
      break;
    }
    case 'collect': {
      const r = collect(S, S.animals[a.i]);
      if (r) { UI.toast(`${itemOf(r.product).name} ×${r.n} 획득! 🧺`); save(S); }
      break;
    }
    case 'feed': {
      const an = S.animals[a.i];
      if (feed(S, an)) { UI.toast(`${ANIMALS[an.type].name}이(가) 냠냠! 생산 +50% 🐾`); save(S); }
      break;
    }
    case 'pet': {
      const an = S.animals[a.i];
      if (pet(an)) { UI.toast(`${ANIMALS[an.type].name}이(가) 행복해해요 💕 생산 +25%`); save(S); }
      break;
    }
    case 'talk': UI.openDialog(a.npc); break;
    case 'firefly':
      S.forest.taken[a.i] = true;
      S.fireflies++;
      UI.toast('반딧불이 손끝에 앉았다… ✨ +1');
      UI.refreshHUD(); save(S);
      break;
    case 'wildfly': {
      if (catchWild(S)) {
        UI.toast(`반딧불을 살포시 감쌌다 ✨ +1 (오늘 ${S.spirit.wildCaught}/${wildCap(S)})`);
        const f = fireflies[a.i]; // 다른 곳에 재출현
        f.x = 60 + Math.random() * 1130;
        f.y = 60 + Math.random() * 1130;
        UI.refreshHUD(); save(S);
      } else UI.toast('오늘은 이만 놓아주자… 내일 밤 또 만나요 🌙');
      break;
    }
    case 'mailbox': UI.openShop(); break;
    case 'shipbox': UI.openSell(); break;
    case 'door': switchMap('door'); break;
    case 'door_out': switchMap('door_out'); break;
    case 'bed': save(S); UI.toast('푹 쉬었어요. 게임이 저장됐어요 💤'); break;
    case 'well': UI.toast('물이 맑아요. 물뿌리개가 찰랑찰랑 🪣'); break;
    case 'well_v':
      UI.toast(S.village.well.status === 'done'
        ? '수리된 우물이 반짝반짝해요. 밭에 자동으로 물을 줘요 💧'
        : '두레박이 부서져 있어요… 망치에게 부탁해볼까?');
      break;
    case 'exit_village':
      if (!S.flags.ch1) UI.toast('마을로 가는 길이 잡초에 덮여 있어요 — 첫 요리를 만들면 소문이 날 거예요 🍳');
      else switchMap('exit_village');
      break;
    case 'exit_forest':
      if (S.village.bridge.status !== 'done') UI.toast('숲의 다리가 부서져 있어요 — 망치가 고칠 수 있을 것 같아요 🌉');
      else switchMap('exit_forest');
      break;
    case 'exit_farm_s': switchMap('exit_farm_s'); break;
    case 'exit_farm_n': switchMap('exit_farm_n'); break;
    case 'board':
      if (S.village.board.status !== 'done') UI.toast('게시판이 부서져 있어요 — 망치에게 수리를 부탁하세요 🔨');
      else UI.openBoard();
      break;
    case 'restaurant':
      if (S.village.restaurant.status !== 'done') UI.toast("문이 판자로 막혀 있어요… 할머니의 단골 식당 '반디네 부엌'이래요");
      else UI.openRestaurant();
      break;
    case 'shrine':
      if (!S.flags.ch4) {
        S.flags.ch4 = true; save(S);
        UI.showMemory('🌌 4장 — 반딧불이 사라진 밤', [
          '차갑게 식은 돌 제단에 손을 얹자, 돌 틈의 덩굴 문양이 희미하게 깨어났다.',
          '『…할머니와 같은 냄새가 나.』<br>뒤돌아보니, 밤에만 보이던 소년 <b>반디</b>가 서 있었다.',
          '『정령들은 죽은 게 아니야. 배가 고파서 잠든 것뿐.<br>맛있는 걸 바치면… 조금씩 깨어날 거야.』',
          '달빛에 비친 반디의 발끝은, 땅에 닿아 있지 않았다.',
        ], '제단에 요리를 바쳐보자');
      } else if (S.flags.ch5 && !S.flags.ending && (S.inv.moonlight_stew || 0) > 0) {
        S.inv.moonlight_stew--;
        S.flags.ending = true;
        S.fireflies += 100;
        save(S);
        UI.showMemory('🌠 에필로그 — 달빛 스튜', [
          '김이 오르는 스튜를 제단에 올리자, 숲 전체가 숨을 들이쉬었다.',
          '수천 개의 반딧불이 일제히 떠올랐다. 그 빛 한가운데,<br>빛나는 사슴 — 대정령 <b>루미</b>가 고개를 숙였다.',
          '『그 맛이야. 그 아이가 매년 달이 가장 밝은 밤에 끓여주던.』<br>『약속은 다시 이어졌다. 이 마을의 계절이 다시 돌 것이다.』',
          '멀리 마을에서 웃음소리가 들려온다.<br>축제의 불빛, 되살아난 부엌, 그리고 밭 위의 반딧불.',
          '— 할머니, 저 잘하고 있죠? 🌾<br><b>반딧불 대축제가 시작됐다! (✨+100)</b>',
        ], '농장은 계속된다');
      } else UI.openShrine();
      break;
    case 'stove_pan': openStove('pan'); break;
    case 'stove_pot': openStove('pot'); break;
    case 'stove_oven': openStove('oven'); break;
    case 'stove_jar': openStove('jar'); break;
  }
}
// 레시피북 발견(1장 시작) → 요리 해금
function openStove(tool) {
  if (!S.flags.recipeBook) {
    S.flags.recipeBook = true;
    S.recipes.push(...STARTER_RECIPES.filter(id => !S.recipes.includes(id)));
    save(S);
    UI.showMemory('📖 낡은 레시피북', [
      '부엌 서랍 깊숙한 곳, 손때 묻은 책 한 권.<br>표지에 무 그림이 수놓아져 있다.',
      '펼치자 대부분의 페이지가 은은히 빛나는 <b>덩굴 문양</b>으로 잠겨 있었다.',
      '『요리에는 마음이 담긴단다. 마음이 닿으면, 책이 답할 거야.』',
      '…기본 레시피 3개를 익혔다! (감자구이 · 달걀프라이 · 무 샐러드)',
    ], '요리를 시작하자!');
    return;
  }
  if (tool === 'pot' && S.stats.earned < 2000) {
    UI.toast(`냄비는 누적 판매 2,000G 달성 시 열려요 (현재 ${S.stats.earned.toLocaleString()}G)`);
    return;
  }
  if (tool === 'oven' && !S.flags.ch3) {
    UI.toast("오븐은 식당 '반디네 부엌'을 수리하면 열려요 (3장)");
    return;
  }
  if (tool === 'jar' && !S.flags.ch4) {
    UI.toast('절임통은 숲 깊은 곳의 제단을 찾으면 열려요 (4장)');
    return;
  }
  UI.openCooking(tool);
}

document.getElementById('act').addEventListener('pointerdown', e => { e.preventDefault(); doAction(); });
addEventListener('keydown', e => { if (e.code === 'Space' || e.code === 'Enter') doAction(); });

// ── 맵 전환 ─────────────────────────────
function switchMap(via) {
  const tr = TRANSITIONS[via];
  if (!tr) return;
  const fade = document.getElementById('fade');
  fade.classList.add('on');
  setTimeout(() => {
    mapId = tr.to; S.map = tr.to;
    player.x = tr.at.x; player.y = tr.at.y;
    player.dir = tr.to === 'home' ? 'up' : 'down';
    if (tr.to === 'forest') resetForestDay();
    save(S);
    fade.classList.remove('on');
  }, 260);
}

// 숲 반딧불 스팟 매일 리셋
function resetForestDay() {
  const today = new Date().toDateString();
  if (S.forest.day !== today) {
    S.forest.day = today;
    S.forest.taken = FIREFLY_SPOTS.map(() => false);
  }
}

// ── 렌더 ─────────────────────────────
function render(now) {
  const m = MAPS[mapId];
  cam.x = Math.max(0, Math.min(m.w - vw, player.x - vw / 2));
  cam.y = Math.max(0, Math.min(m.h - vh, player.y - vh / 2));
  ctx.clearRect(0, 0, vw, vh);
  ctx.save();
  ctx.translate(-cam.x, -cam.y);

  const bg = img(m.img);
  if (bg.complete) ctx.drawImage(bg, 0, 0);

  // 밭
  if (mapId === 'farm') {
    m.plots.forEach((pos, i) => {
      const plot = S.plots[i];
      if (i >= S.unlocked) {
        ctx.fillStyle = 'rgba(30,24,18,0.45)';
        rr(ctx, pos.x - 24, pos.y - 39, 48, 43, 8); ctx.fill();
        if (i === S.unlocked) {
          drawSprite(ctx, 'assets/ui/icon_coin.png', pos.x - 17, pos.y - 12, 13);
          ctx.fillStyle = '#FFD97A';
          ctx.font = '11px NeoDGM, monospace';
          ctx.textAlign = 'left';
          ctx.fillText(`${plotCost(i)}`, pos.x - 9, pos.y - 14);
        } else {
          ctx.fillStyle = 'rgba(255,243,214,0.75)';
          ctx.font = '13px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🔒', pos.x, pos.y - 14);
        }
        return;
      }
      if (!plot.crop) return;
      if (plot.progress < plot.wateredUntil) { // 물기 — 밭칸 전체가 촉촉하게
        ctx.fillStyle = 'rgba(40,70,160,0.20)';
        rr(ctx, pos.x - 22, pos.y - 38, 44, 41, 9); ctx.fill();
      }
      const size = plot.progress >= 1 ? 42 : plot.progress >= 0.45 ? 34 : 24;
      drawSprite(ctx, stageSprite(plot), pos.x, pos.y - 4, size);
      if (plot.progress >= 1) { // 수확 표시
        const bob = Math.sin(now / 280 + i) * 3;
        drawSprite(ctx, 'assets/ui/icon_star.png', pos.x, pos.y - 46 + bob, 15);
      }
    });
  }

  // 마을 복구 오버레이
  if (mapId === 'village') {
    const v = S.village;
    drawSprite(ctx, `assets/buildings/board_${v.board.status === 'done' ? 'new' : 'old'}.png`, 415, 690, 62);
    drawSprite(ctx, `assets/buildings/well_${v.well.status === 'done' ? 'new' : 'old'}.png`, 182, 668, 76);
    if (v.restaurant.status !== 'done') drawSprite(ctx, 'assets/buildings/fence_broken.png', 905, 892, 50);
    drawSprite(ctx, `assets/buildings/bakery_oven${v.bakery.status === 'done' ? '' : '_broken'}.png`, 1010, 560, 70);
    drawSprite(ctx, `assets/buildings/lantern_tower_${v.lantern.status === 'done' ? 'new' : 'broken'}.png`, 760, 620, 84);
    drawSprite(ctx, `assets/buildings/festival_stage_${v.festival.status === 'done' ? 'new' : 'broken'}.png`, 300, 1080, 110);
    for (const id of REPAIR_ORDER) {
      if (S.village[id].status !== 'building') continue;
      const pos = {
        board: [415, 640], well: [182, 600], restaurant: [905, 830],
        bakery: [1010, 505], lantern: [760, 550], festival: [300, 1005],
      }[id];
      if (!pos) continue;
      ctx.fillStyle = '#FFD97A';
      ctx.font = '12px NeoDGM, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🔨 공사중…', pos[0], pos[1]);
    }
  }
  // 숲: 다리 상태 & 반딧불 채집 스팟
  if (mapId === 'farm') {
    if (S.village.bridge.status !== 'done') drawSprite(ctx, 'assets/buildings/fence_broken.png', 620, 1170, 46);
    // 온실 (좌하단 공터) — 완공 전엔 골조만
    const gh = S.village.greenhouse.status;
    drawSprite(ctx, `assets/buildings/greenhouse_${gh === 'done' ? 'new' : 'frame'}.png`, 350, 990, 116);
    if (gh === 'building') {
      ctx.fillStyle = '#FFD97A';
      ctx.font = '12px NeoDGM, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🔨 공사중…', 350, 900);
    }
  }
  if (mapId === 'forest') {
    FIREFLY_SPOTS.forEach((s, i) => {
      if (S.forest.taken[i]) return;
      const tw = 0.6 + 0.4 * Math.sin(now / 350 + i * 2);
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 16);
      g.addColorStop(0, `rgba(255,217,122,${0.95 * tw})`);
      g.addColorStop(1, 'rgba(255,217,122,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(s.x, s.y, 16, 0, 7); ctx.fill();
      drawSprite(ctx, 'assets/objects/firefly.png', s.x, s.y + 8 + Math.sin(now / 400 + i) * 4, 18);
    });
  }

  // 동물 + NPC + 플레이어 (y-정렬)
  const sprites = [];
  for (const npc of Object.values(NPCS)) {
    if (npc.map !== mapId) continue;
    sprites.push({ y: npc.y, draw: () => {
      const bob = Math.sin(now / 600 + npc.x) * 1.5;
      drawSprite(ctx, npc.sprite, npc.x, npc.y + bob, npc.h);
    }});
  }
  if (mapId === 'farm') {
    for (const an of S.animals) {
      sprites.push({ y: an.y, draw: () => {
        const bob = Math.abs(Math.sin(now / 300 + an.x)) * (an.idle > 0 ? 0 : 2.5);
        const src = `assets/animals/${an.type}_adult.png`;
        if (an.flip) {
          ctx.save(); ctx.translate(an.x, 0); ctx.scale(-1, 1);
          drawSprite(ctx, src, 0, an.y - bob, ANIMALS[an.type].h);
          ctx.restore();
        } else drawSprite(ctx, src, an.x, an.y - bob, ANIMALS[an.type].h);
        if (readyCount(an) > 0) {
          const fb = Math.sin(now / 280 + an.x) * 3;
          drawSprite(ctx, itemOf(ANIMALS[an.type].product).icon, an.x, an.y - ANIMALS[an.type].h - 10 + fb, 16);
        }
      }});
    }
  }
  const frame = player.moving ? (Math.floor(player.animT / 0.22) % 2) + 1 : 1;
  sprites.push({ y: player.y, draw: () =>
    drawSprite(ctx, `assets/characters/hero_${player.dir}_${frame}.png`, player.x, player.y + 6, 54) });
  sprites.sort((p, q) => p.y - q.y).forEach(s => s.draw());

  if (OVERLAY) {
    ctx.strokeStyle = 'rgba(255,0,0,0.6)';
    for (const [x, y, w, h] of m.colliders) ctx.strokeRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(0,200,255,0.8)';
    for (const it of m.interacts) { ctx.beginPath(); ctx.arc(it.x, it.y, it.rr, 0, 7); ctx.stroke(); }
  }
  ctx.restore();

  // 계절 색감 + 날씨 (실외 맵)
  if (mapId !== 'home') {
    for (const [mode, style] of SEASON_TINTS[seasonNow().season]) {
      ctx.globalCompositeOperation = mode;
      ctx.fillStyle = style;
      ctx.fillRect(0, 0, vw, vh);
    }
    ctx.globalCompositeOperation = 'source-over';
    drawWeather(now);
  }

  // 밤 연출: 황혼~밤 틴트 + 광원 글로우 + 반딧불 (실내 제외)
  const na = nightAlpha();
  if (na > 0 && mapId !== 'home') {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgba(43,58,103,${0.55 * na})`;
    ctx.fillRect(0, 0, vw, vh);
    ctx.globalCompositeOperation = 'lighter';

    // 창문·가로등·제단의 따뜻한 빛
    const glow = (x, y, r, c, a) => {
      if (x < -r || x > vw + r || y < -r || y > vh + r) return;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${c},${a})`);
      g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    };
    const lights = [...(NIGHT_LIGHTS[mapId] || [])];
    if (mapId === 'village' && S.village.lantern.status === 'done') { // 등불탑 점등
      lights.push(
        { x: 760, y: 590, r: 140, c: '255,217,122' },
        { x: 450, y: 380, r: 70, c: '255,214,140' },
        { x: 950, y: 1050, r: 70, c: '255,214,140' },
      );
    }
    for (const L of lights) {
      const flick = 1 + 0.06 * Math.sin(now / 180 + L.x); // 촛불 흔들림
      glow(L.x - cam.x, L.y - cam.y, L.r * flick, L.c, 0.34 * na);
    }
    // 플레이어 손등불 (은은한 시야)
    glow(player.x - cam.x, player.y - cam.y - 8, 64, '255,214,140', 0.18 * na);

    // 떠다니는 반딧불 — 밤이 깊으면 잡을 수 있다
    for (const f of fireflies) {
      const p = flyPos(f, now);
      const fx = p.x - cam.x, fy = p.y - cam.y;
      if (fx < -20 || fx > vw + 20 || fy < -20 || fy > vh + 20) continue;
      const near = isNight() && Math.hypot(player.x - p.x, player.y - p.y) < 46;
      const tw = 0.55 + 0.45 * Math.sin(now / 400 + f.p * 3);
      const r = near ? 12 : 8;
      const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, r);
      g.addColorStop(0, `rgba(255,217,122,${(near ? 1 : 0.9) * tw})`);
      g.addColorStop(1, 'rgba(255,217,122,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(fx, fy, r, 0, 7); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}
function rr(c, x, y, w, h, r) {
  c.beginPath(); c.roundRect(x, y, w, h, r);
}

// ── 날씨·계절 파티클 (화면 좌표) ─────────────────────────────
// 비: 빗줄기+어둑한 톤 / 눈: 함박눈 / 맑은 봄: 꽃잎 / 맑은 가을: 낙엽
let particles = [], particleKey = '';
function drawWeather(now) {
  const w = weatherToday();
  const { season } = seasonNow();
  const key = w !== 'sun' ? w : season === 0 ? 'petal' : season === 2 ? 'leaf' : '';
  if (key !== particleKey) {
    particleKey = key;
    const n = { rain: 70, snow: 50, petal: 10, leaf: 12 }[key] || 0;
    particles = Array.from({ length: n }, () => ({
      x: Math.random(), y: Math.random(), s: 0.6 + Math.random() * 0.8, p: Math.random() * 6.28,
    }));
  }
  if (!key) return;
  if (key === 'rain') {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(140,155,185,0.35)';
    ctx.fillRect(0, 0, vw, vh);
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(190,210,255,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const p of particles) {
      const x = (p.x * vw + now * 0.06 * p.s) % (vw + 20) - 10;
      const y = (p.y * vh + now * 0.45 * p.s) % (vh + 20) - 10;
      ctx.moveTo(x, y); ctx.lineTo(x - 2.5, y + 9);
    }
    ctx.stroke();
    return;
  }
  for (const p of particles) {
    const x = (p.x * vw + Math.sin(now / 900 * p.s + p.p) * 24 + vw) % vw;
    const y = (p.y * vh + now * (key === 'snow' ? 0.03 : 0.02) * p.s) % (vh + 20) - 10;
    ctx.fillStyle = key === 'snow' ? 'rgba(255,255,255,0.8)'
      : key === 'petal' ? 'rgba(255,183,205,0.85)' : 'rgba(224,142,60,0.85)';
    ctx.beginPath();
    ctx.arc(x, y, key === 'snow' ? 1.6 : 2.2, 0, 7);
    ctx.fill();
  }
}

// ── 루프 ─────────────────────────────
let last = 0, hudT = 0;
function loop(t) {
  const now = t;
  const dt = Math.min(0.1, (t - last) / 1000); last = t;
  if (!UI.modalOpen()) move(dt);
  tickFarm(S, dt * 1000 * growthBoost(S));
  tickRanch(S, dt * 1000 * ranchBoost(S));
  if (S.village.restaurant.status === 'done') tickRestaurant(S, dt * 1000);
  if (mapId === 'farm') for (const an of S.animals) wander(an, dt);
  findAction(now);
  render(now);
  hudT += dt;
  if (hudT > 1) {
    hudT = 0; UI.refreshHUD();
    S.px = player.x; S.py = player.y;
    rainWater(S); // 비 오는 날엔 밭이 계속 촉촉
    checkRepairs();
    checkChapter5();
  }
  requestAnimationFrame(loop);
}

// 공사 완료 체크 → 챕터 비트
function checkRepairs() {
  const now = Date.now();
  for (const id of REPAIR_ORDER) {
    const st = S.village[id];
    if (st.status !== 'building' || st.doneAt > now) continue;
    st.status = 'done';
    save(S);
    if (id === 'board' && !S.flags.ch2) {
      S.flags.ch2 = true; save(S);
      UI.showMemory('🌙 2장 — 헛간의 발자국', [
        '새 게시판 앞에 주민들이 모여 웅성거린다. 마을에 오랜만의 활기.',
        '그런데 그날 밤 — 헛간 근처에서 <b>작은 발자국</b>을 보았다.<br>아이 같기도, 아닌 것 같기도 한.',
        '발자국은 숲 쪽으로 이어지다… 문득 끊겨 있었다.<br>그 자리엔 희미한 금빛 가루만.',
      ], '…누구지?');
    } else if (id === 'restaurant' && !S.flags.ch3) {
      S.flags.ch3 = true; save(S);
      UI.showMemory("🍲 3장 — 되살아나는 부엌", [
        "판자를 뜯어낸 '반디네 부엌'에 다시 불이 켜졌다.",
        '『여기 옥수수스프가 그렇게 맛있었는데.』<br>『할머니가 끓이던 그 맛이 날까?』',
        '옛 단골들이 하나둘 문을 두드린다.<br>이제 요리를 진열해두면, 자리를 비워도 팔릴 것이다.',
      ], '개업이다!');
    } else {
      UI.toast(`${REPAIRS[id].name} 완공! 🎉`, 3000);
    }
  }
}

// 5장: 온실 완공 + 레시피 20종 → 루미 재회, 전설 콘텐츠·달빛 스튜 해금
function checkChapter5() {
  if (S.flags.ch5 || S.village.greenhouse.status !== 'done') return;
  if (S.recipes.filter(id => id !== 'moonlight_stew').length < 20) return;
  S.flags.ch5 = true;
  if (!S.recipes.includes('moonlight_stew')) S.recipes.push('moonlight_stew');
  save(S);
  UI.showMemory('🦌 5장 — 할머니의 약속', [
    '온실의 유리가 달빛을 머금은 밤, 레시피북의 마지막 문양이 스르르 풀렸다.',
    '그리고 숲에서 — 빛으로 된 사슴이 걸어나왔다. 대정령 <b>루미</b>.',
    '『네 할머니는 매년 가장 밝은 보름밤, 나에게 스튜를 끓여주었지.<br>그것이 이 마을의 계절을 지키는 약속이었다.』',
    '마지막 페이지의 레시피 — <b>달빛 스튜</b>.<br>재료: 별빛벼 · 반딧꽃 · 트러플 · 우유',
    '별빛벼 씨앗은 봄이네 상점에, 반딧꽃 씨앗과 <b>별양</b>은 정령의 제단에 있다.',
  ], '약속을 이어가자');
}

// ── 부트 ─────────────────────────────
const CORE_ASSETS = [
  'assets/maps/farm.png', 'assets/maps/home.png',
  ...['down', 'up', 'left', 'right'].flatMap(d => [1, 2].map(f => `assets/characters/hero_${d}_${f}.png`)),
  'assets/crops/common_sprout.png', 'assets/crops/common_growing.png',
  ...Object.keys(CROPS).flatMap(id => [`assets/crops/${id}_mature.png`, `assets/items/${id}.png`]),
  'assets/ui/icon_star.png', 'assets/ui/icon_coin.png', 'assets/ui/icon_firefly.png',
  'assets/ui/icon_hoe.png', 'assets/ui/icon_wateringcan.png', 'assets/ui/icon_heart.png', 'assets/ui/icon_bag.png',
  'assets/objects/sign.png',
  ...Object.keys(ANIMALS).map(id => `assets/animals/${id}_adult.png`),
  'assets/items/egg.png', 'assets/items/milk.png', 'assets/items/feed.png',
  'assets/maps/village.png', 'assets/maps/forest.png',
  ...Object.values(NPCS).map(n => n.sprite),
  'assets/buildings/board_old.png', 'assets/buildings/board_new.png',
  'assets/buildings/well_old.png', 'assets/buildings/well_new.png',
  'assets/buildings/fence_broken.png', 'assets/objects/firefly.png',
  'assets/buildings/bakery_oven.png', 'assets/buildings/bakery_oven_broken.png',
  'assets/buildings/lantern_tower_new.png', 'assets/buildings/lantern_tower_broken.png',
  'assets/buildings/festival_stage_new.png', 'assets/buildings/festival_stage_broken.png',
  'assets/buildings/greenhouse_new.png', 'assets/buildings/greenhouse_frame.png',
  'assets/items/honey.png', 'assets/items/truffle.png', 'assets/items/star_wool.png', 'assets/items/flour.png',
];

async function boot() {
  initInput(document.getElementById('joy'), document.getElementById('stick'));
  await preload(CORE_ASSETS);

  fireflies = Array.from({ length: 16 }, () => ({
    x: Math.random() * 1254, y: Math.random() * 1254,
    s: 0.5 + Math.random(), p: Math.random() * 6.28,
  }));

  const title = document.getElementById('title');
  document.getElementById('start-btn').onclick = () => {
    title.classList.add('hide');
    setTimeout(() => title.remove(), 600);
    const begin = () => {
      if (mapId === 'forest') resetForestDay();
      const r = settleOffline(S);
      if (r.elapsed > 6e4 && S.flags.prologue) UI.showSettlement(r.elapsed, r);
      initAutosave(S);
      requestAnimationFrame(t => { last = t; loop(t); });
    };
    if (!S.flags.prologue) {
      UI.showPrologue(() => { S.flags.prologue = true; save(S); });
      S.lastSave = Date.now();
      begin();
    } else begin();
  };
  document.getElementById('reset-btn').onclick = () => {
    if (confirm('처음부터 다시 시작할까요? 저장된 농장이 사라져요.')) { wipe(); location.reload(); }
  };
  if (DEBUG) {
    document.getElementById('clock').addEventListener('click', () => { S.gold += 1000; UI.refreshHUD(); });
    window.TP = (x, y) => { player.x = x; player.y = y; };
    window.ACT = doAction;
    window.PLAYER = player;
    UI.toast(`DEBUG: 성장 ×${GROWTH_MULT}, 시계 탭=+1000G`);
  }
  UI.refreshHUD();

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
boot();
