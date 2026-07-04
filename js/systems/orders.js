// 주문 게시판: 의뢰 3건, 4시간마다 갱신, 보상 = 기본가 ×1.5
import { CROPS, shopSeeds } from '../data/crops.js';
import { itemOf } from '../data/items.js';
import { GROWTH_MULT } from './farming.js';

const REFRESH = 240 * 6e4;

export function ensureOrders(state, now = Date.now()) {
  if (state.orders.list.length && now < state.orders.refreshAt) return;
  const pool = [
    ...shopSeeds(now).filter(id => id !== 'radish'),
    'radish', 'egg',
    ...(state.animals.some(a => a.type === 'cow') ? ['milk'] : []),
    ...state.recipes,
  ];
  const list = [];
  const used = new Set();
  while (list.length < 3 && used.size < pool.length) {
    const id = pool[Math.floor(Math.random() * pool.length)];
    if (used.has(id)) continue;
    used.add(id);
    const n = CROPS[id] ? 2 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 2);
    list.push({ id, n, reward: Math.ceil(itemOf(id).sell * n * 1.5), done: false });
  }
  state.orders = { list, refreshAt: now + REFRESH / GROWTH_MULT };
}

export function deliver(state, idx) {
  const o = state.orders.list[idx];
  if (!o || o.done || (state.inv[o.id] || 0) < o.n) return false;
  state.inv[o.id] -= o.n;
  state.gold += o.reward;
  state.stats.earned += o.reward;
  o.done = true;
  return true;
}
