// 오프라인 정산 — 농사·목장·식당은 경과 시간 틱, 요리는 타임스탬프라 자동 완성
import { tickFarm } from './farming.js';
import { tickRanch, readyCount } from './ranch.js';
import { tickRestaurant, OFFLINE_CAP } from './restaurant.js';
import { boostedElapsed } from './spirit.js';

export function settleOffline(state, now = Date.now()) {
  const elapsed = Math.max(0, now - state.lastSave);
  const matureBefore = state.plots.filter(p => p.crop && p.progress >= 1).length;
  const prodBefore = state.animals.reduce((s, a) => s + readyCount(a), 0);
  const pendingBefore = state.restaurant.pending;

  // 정령 축복이 켜져 있던 구간은 2배 성장 — 겹친 시간만큼 가산
  tickFarm(state, boostedElapsed(state, 'growth', elapsed, now));
  tickRanch(state, boostedElapsed(state, 'ranch', elapsed, now));
  if (state.village.restaurant.status === 'done') {
    tickRestaurant(state, Math.min(elapsed, OFFLINE_CAP));
  }

  // 마을 우물: 접속 시 자라는 밭 전체 자동 물주기
  let watered = 0;
  if (state.village.well.status === 'done') {
    for (const p of state.plots) {
      if (p.crop && p.progress < 1 && p.progress >= p.wateredUntil) {
        p.wateredUntil = Math.min(1, p.progress + 0.3);
        watered++;
      }
    }
  }

  const crops = state.plots.filter(p => p.crop && p.progress >= 1).length - matureBefore;
  const products = state.animals.reduce((s, a) => s + readyCount(a), 0) - prodBefore;
  const dishes = Object.values(state.stoves).filter(s => s && s.doneAt <= now).length;
  const earned = Math.floor(state.restaurant.pending - pendingBefore);

  return { elapsed, crops, products, dishes, earned, watered };
}
