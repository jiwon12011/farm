// 반딧불 농장 — 부트스트랩 & 게임 루프
import { MAPS, ARRIVE } from './data/maps.js';
import { CROPS } from './data/crops.js';
import { img, preload, drawSprite } from './engine/assets.js';
import { initInput, pollInput } from './engine/input.js';
import { newState, load, save, wipe, initAutosave } from './engine/save.js';
import { tickFarm, plant, water, harvest, plotCost, stageSprite, GROWTH_MULT } from './systems/farming.js';
import { ANIMALS, tickRanch, wander, readyCount, collect, feed, pet, canPet } from './systems/ranch.js';
import { settleOffline } from './systems/offline.js';
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
function findAction() {
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
  for (const it of m.interacts) {
    const d = Math.hypot(player.x - it.x, player.y - it.y);
    if (d > it.rr + 26) continue;
    const meta = {
      mailbox: ['주문', 'icon_bag'], shipbox: ['판매', 'icon_coin'],
      door: ['들어가기', null], door_out: ['나가기', null], bed: ['잠자기', 'icon_heart'],
      well: ['우물', null], exit_village: ['마을', null], exit_forest: ['숲', null],
      stove_pan: ['화로', null], stove_pot: ['화로', null], stove_oven: ['오븐', null], stove_jar: ['절임통', null],
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
    case 'mailbox': UI.openShop(); break;
    case 'shipbox': UI.openSell(); break;
    case 'door': switchMap('home'); break;
    case 'door_out': switchMap('farm'); break;
    case 'bed': save(S); UI.toast('푹 쉬었어요. 게임이 저장됐어요 💤'); break;
    case 'well': UI.toast('물이 맑아요. 물뿌리개가 찰랑찰랑 🪣'); break;
    case 'exit_village': UI.toast('마을로 가는 길이 잡초에 덮여 있어요 (2장에서 열려요)'); break;
    case 'exit_forest': UI.toast('숲의 다리가 부서져 있어요 (4장에서 열려요)'); break;
    case 'stove_pan': openStove('pan'); break;
    case 'stove_pot': openStove('pot'); break;
    default: UI.toast('오븐과 절임통은 3장에서 열려요');
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
  UI.openCooking(tool);
}

document.getElementById('act').addEventListener('pointerdown', e => { e.preventDefault(); doAction(); });
addEventListener('keydown', e => { if (e.code === 'Space' || e.code === 'Enter') doAction(); });

// ── 맵 전환 ─────────────────────────────
function switchMap(to) {
  const fade = document.getElementById('fade');
  fade.classList.add('on');
  setTimeout(() => {
    mapId = to; S.map = to;
    const p = ARRIVE[to];
    player.x = p.x; player.y = p.y;
    player.dir = to === 'home' ? 'up' : 'down';
    save(S);
    fade.classList.remove('on');
  }, 260);
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
        rr(ctx, pos.x - 27, pos.y - 46, 54, 50, 8); ctx.fill();
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
      if (plot.progress < plot.wateredUntil) { // 물기
        ctx.fillStyle = 'rgba(60,120,220,0.22)';
        ctx.beginPath(); ctx.ellipse(pos.x, pos.y - 12, 26, 14, 0, 0, 7); ctx.fill();
      }
      const size = plot.progress >= 1 ? 42 : plot.progress >= 0.45 ? 34 : 24;
      drawSprite(ctx, stageSprite(plot), pos.x, pos.y + 4, size);
      if (plot.progress >= 1) { // 수확 표시
        const bob = Math.sin(now / 280 + i) * 3;
        drawSprite(ctx, 'assets/ui/icon_star.png', pos.x, pos.y - 46 + bob, 15);
      }
    });
  }

  // 동물 + 플레이어 (y-정렬)
  const sprites = [];
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

  // 밤 연출 + 반딧불
  const h = new Date().getHours();
  if (h >= 19 || h < 6) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(43,58,103,0.5)';
    ctx.fillRect(0, 0, vw, vh);
    ctx.globalCompositeOperation = 'lighter';
    for (const f of fireflies) {
      const fx = f.x + Math.sin(now / 1000 * f.s + f.p) * 30 - cam.x;
      const fy = f.y + Math.cos(now / 1300 * f.s + f.p) * 22 - cam.y;
      if (fx < -20 || fx > vw + 20 || fy < -20 || fy > vh + 20) continue;
      const tw = 0.55 + 0.45 * Math.sin(now / 400 + f.p * 3);
      const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, 8);
      g.addColorStop(0, `rgba(255,217,122,${0.9 * tw})`);
      g.addColorStop(1, 'rgba(255,217,122,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(fx, fy, 8, 0, 7); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}
function rr(c, x, y, w, h, r) {
  c.beginPath(); c.roundRect(x, y, w, h, r);
}

// ── 루프 ─────────────────────────────
let last = 0, hudT = 0;
function loop(t) {
  const now = t;
  const dt = Math.min(0.1, (t - last) / 1000); last = t;
  if (!UI.modalOpen()) move(dt);
  tickFarm(S, dt * 1000);
  tickRanch(S, dt * 1000);
  if (mapId === 'farm') for (const an of S.animals) wander(an, dt);
  findAction();
  render(now);
  hudT += dt;
  if (hudT > 1) { hudT = 0; UI.refreshHUD(); S.px = player.x; S.py = player.y; }
  requestAnimationFrame(loop);
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
