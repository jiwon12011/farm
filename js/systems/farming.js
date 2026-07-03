// 농사 시스템: 성장은 타임스탬프 기반 — 실시간 틱과 오프라인 정산이 같은 코드 경로
import { CROPS } from '../data/crops.js';

export const GROWTH_MULT = new URLSearchParams(location.search).has('debug') ? 60 : 1;

// dt(ms)만큼 성장. 물 준 구간(wateredUntil까지)은 1.5배 — 구간별 적분
export function advance(plot, dt) {
  if (!plot.crop || plot.progress >= 1) return;
  const grow = CROPS[plot.crop].grow / GROWTH_MULT;
  let p = plot.progress, rest = dt;
  if (p < plot.wateredUntil) {
    const needMs = (plot.wateredUntil - p) * grow / 1.5;
    if (rest <= needMs) { p += rest / grow * 1.5; rest = 0; }
    else { p = plot.wateredUntil; rest -= needMs; }
  }
  p += rest / grow;
  plot.progress = Math.min(1, p);
}

export function tickFarm(state, dt) {
  for (const plot of state.plots) advance(plot, dt);
}

// 오프라인 정산: 경과 시간 적용 후 새로 다 자란 작물 수 반환
export function settleOffline(state, now = Date.now()) {
  const elapsed = Math.max(0, now - state.lastSave);
  const before = state.plots.filter(p => p.crop && p.progress >= 1).length;
  tickFarm(state, elapsed);
  const after = state.plots.filter(p => p.crop && p.progress >= 1).length;
  return { elapsed, newlyMature: after - before };
}

export function plant(state, plot, cropId) {
  if ((state.seeds[cropId] || 0) <= 0 || plot.crop) return false;
  state.seeds[cropId]--;
  plot.crop = cropId;
  plot.progress = 0;
  plot.wateredUntil = 0;
  return true;
}

export function water(plot) {
  if (!plot.crop || plot.progress >= 1) return false;
  if (plot.progress < plot.wateredUntil) return false; // 아직 물기가 남음
  plot.wateredUntil = Math.min(1, plot.progress + 0.3);
  return true;
}

export function harvest(state, plot) {
  if (!plot.crop || plot.progress < 1) return null;
  const id = plot.crop;
  state.inv[id] = (state.inv[id] || 0) + 1;
  state.stats.harvested++;
  if (CROPS[id].regrow) { plot.progress = 0.6; plot.wateredUntil = 0; } // 다회 수확
  else { plot.crop = null; plot.progress = 0; plot.wateredUntil = 0; }
  return id;
}

// 밭 확장 비용 (7번째 칸부터)
export function plotCost(n) {
  return [150, 200, 300, 400, 550, 700, 900, 1100, 1400, 1700, 2100, 2500, 3000, 3500][n - 6] || 4000;
}

// 성장 단계 → 스프라이트
export function stageSprite(plot) {
  if (!plot.crop) return null;
  if (plot.progress >= 1) return `assets/crops/${plot.crop}_mature.png`;
  if (plot.progress >= 0.45) return 'assets/crops/common_growing.png';
  return 'assets/crops/common_sprout.png';
}
