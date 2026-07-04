// 식당 '반디네 부엌' — 진열대 4칸, 슬롯당 30분에 1개씩 자동 판매 (방치 수익 코어)
import { itemOf } from '../data/items.js';
import { GROWTH_MULT } from './farming.js';

export const SLOT_COUNT = 4;
const SELL_PERIOD = 30 * 6e4;
export const OFFLINE_CAP = 12 * 3600e3; // 방치 정산 상한 12시간

// dt(ms)만큼 판매 진행 — 판매 골드는 pending에 쌓이고 수금으로 회수
export function tickRestaurant(state, dt) {
  const r = state.restaurant;
  let sold = 0;
  for (const slot of r.slots) {
    if (!slot || slot.n <= 0) continue;
    slot.t = (slot.t || 0) + dt;
    const period = SELL_PERIOD / GROWTH_MULT;
    while (slot.t >= period && slot.n > 0) {
      slot.t -= period;
      slot.n--;
      r.pending += itemOf(slot.id).sell;
      sold++;
    }
  }
  for (let i = 0; i < r.slots.length; i++) {
    if (r.slots[i] && r.slots[i].n <= 0) r.slots[i] = null;
  }
  return sold;
}

// 진열: 인벤토리의 요리를 슬롯에 올려둔다
export function stock(state, slotIdx, dishId, n) {
  const r = state.restaurant;
  n = Math.min(n, state.inv[dishId] || 0);
  if (n <= 0 || r.slots[slotIdx]) return false;
  state.inv[dishId] -= n;
  r.slots[slotIdx] = { id: dishId, n, t: 0 };
  return true;
}

// 회수: 남은 요리를 인벤토리로
export function unstock(state, slotIdx) {
  const slot = state.restaurant.slots[slotIdx];
  if (!slot) return false;
  state.inv[slot.id] = (state.inv[slot.id] || 0) + slot.n;
  state.restaurant.slots[slotIdx] = null;
  return true;
}

export function collectPending(state) {
  const g = Math.floor(state.restaurant.pending);
  if (g <= 0) return 0;
  state.gold += g;
  state.stats.earned += g;
  state.restaurant.pending -= g;
  return g;
}
