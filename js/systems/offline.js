// 오프라인 정산 — 농사·목장은 경과 시간 틱, 요리는 타임스탬프라 자동 완성
import { tickFarm } from './farming.js';
import { tickRanch, readyCount } from './ranch.js';

export function settleOffline(state, now = Date.now()) {
  const elapsed = Math.max(0, now - state.lastSave);
  const matureBefore = state.plots.filter(p => p.crop && p.progress >= 1).length;
  const prodBefore = state.animals.reduce((s, a) => s + readyCount(a), 0);

  tickFarm(state, elapsed);
  tickRanch(state, elapsed);

  const crops = state.plots.filter(p => p.crop && p.progress >= 1).length - matureBefore;
  const products = state.animals.reduce((s, a) => s + readyCount(a), 0) - prodBefore;
  const dishes = Object.values(state.stoves).filter(s => s && s.doneAt <= now).length;

  return { elapsed, crops, products, dishes };
}
