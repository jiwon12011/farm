// 목장 시스템: 동물은 실시간으로 생산 게이지가 차고, 상한 3개까지 축적
import { GROWTH_MULT } from './farming.js';

export const ANIMALS = {
  chicken: { name: '닭',   price: 300,  product: 'egg',       period: 30 * 6e4,  h: 26 },
  duck:    { name: '오리', price: 800,  product: 'duck_egg',  period: 60 * 6e4,  h: 26 },
  goat:    { name: '염소', price: 1500, product: 'goat_milk', period: 120 * 6e4, h: 34 },
  sheep:   { name: '양',   price: 2500, product: 'wool',      period: 240 * 6e4, h: 32 },
  cow:     { name: '소',   price: 4000, product: 'milk',      period: 180 * 6e4, h: 40 },
};

export const PEN = { x0: 832, y0: 468, x1: 1020, y1: 600 }; // 농장 울타리 안 배회 영역
export const MAX_ANIMALS = 6;

const dayKey = () => new Date().toDateString();

export function newAnimal(type) {
  return {
    type, acc: 0,
    x: PEN.x0 + Math.random() * (PEN.x1 - PEN.x0),
    y: PEN.y0 + Math.random() * (PEN.y1 - PEN.y0),
    tx: 0, ty: 0, idle: 1 + Math.random() * 3, flip: false,
    petDay: '', // 오늘 쓰다듬었는지
  };
}

// dt(ms)만큼 생산 게이지 진행 — 실시간 틱과 오프라인 정산 공용
export function tickRanch(state, dt) {
  for (const a of state.animals) {
    const period = ANIMALS[a.type].period / GROWTH_MULT;
    a.acc = Math.min(3, a.acc + dt / period);
  }
}

export function readyCount(a) { return Math.floor(a.acc); }

export function collect(state, a) {
  const n = readyCount(a);
  if (n <= 0) return null;
  const prod = ANIMALS[a.type].product;
  state.inv[prod] = (state.inv[prod] || 0) + n;
  a.acc -= n;
  return { product: prod, n };
}

// 먹이: 사료 1개 소모 → 생산 게이지 +50%
export function feed(state, a) {
  if ((state.inv.feed || 0) <= 0) return false;
  state.inv.feed--;
  a.acc = Math.min(3, a.acc + 0.5);
  return true;
}

// 쓰다듬기: 하루 1회 → 게이지 +25%
export function pet(a) {
  if (a.petDay === dayKey()) return false;
  a.petDay = dayKey();
  a.acc = Math.min(3, a.acc + 0.25);
  return true;
}

export const canPet = a => a.petDay !== dayKey();

// 배회 AI (렌더 프레임마다)
export function wander(a, dt) {
  if (a.idle > 0) { a.idle -= dt; return; }
  if (!a.tx) {
    a.tx = PEN.x0 + Math.random() * (PEN.x1 - PEN.x0);
    a.ty = PEN.y0 + Math.random() * (PEN.y1 - PEN.y0);
  }
  const dx = a.tx - a.x, dy = a.ty - a.y;
  const d = Math.hypot(dx, dy);
  if (d < 4) { a.tx = 0; a.idle = 2 + Math.random() * 4; return; }
  const sp = 22 * dt;
  a.x += dx / d * sp; a.y += dy / d * sp;
  a.flip = dx > 0;
}
