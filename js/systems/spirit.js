// 정령(반딧불) 시스템 — 밤 판정·야생 반딧불 포획·제단 공양·축복 (기획서 §3.6)
import { GROWTH_MULT } from './farming.js';
import { itemOf } from '../data/items.js';

const Q = new URLSearchParams(location.search);
const FORCE = Q.has('night') ? 'night' : Q.has('day') ? 'day' : null; // ?night / ?day 강제

// 밤 어둡기 0~1 — 18:30부터 어두워져 19:30에 완전한 밤, 05:00~06:00에 밝아짐
export function nightAlpha(d = new Date()) {
  if (FORCE) return FORCE === 'night' ? 1 : 0;
  const t = d.getHours() + d.getMinutes() / 60;
  if (t >= 19.5 || t < 5) return 1;
  if (t >= 18.5) return t - 18.5;
  if (t < 6) return 1 - (t - 5);
  return 0;
}
export const isNight = (d = new Date()) => nightAlpha(d) > 0.5;

// ── 야생 반딧불 포획 (밤 한정, 하루 상한 — 등불탑 완공 시 +5) ─────────────────────────────
export const wildCap = state => state.village?.lantern?.status === 'done' ? 15 : 10;

export function catchWild(state) {
  const today = new Date().toDateString();
  if (state.spirit.wildDay !== today) { state.spirit.wildDay = today; state.spirit.wildCaught = 0; }
  if (state.spirit.wildCaught >= wildCap(state)) return false;
  state.spirit.wildCaught++;
  state.fireflies++;
  return true;
}

// ── 제단 교환 — 전설 콘텐츠 (반딧꽃 씨앗은 4장부터, 별양은 5장부터) ──
export const EXCHANGES = {
  fireflyflower_seed: { name: '반딧꽃 씨앗', desc: '밤에 피는 정령의 꽃 — 8시간 성장, 비매품', cost: 30, icon: 'assets/items/fireflyflower.png' },
  star_sheep:         { name: '별양',        desc: '별빛양털을 만드는 전설의 양 (5장)', cost: 500, icon: 'assets/animals/star_sheep_adult.png', needCh5: true },
};

// ── 축복 (정령 제단에서 반딧불로 구매) ─────────────────────────────
export const BLESSINGS = {
  growth:  { name: '새싹의 숨결',   desc: '작물 성장 속도 2배 (2시간)', cost: 15, ms: 2 * 3600e3, icon: 'assets/crops/common_sprout.png' },
  ranch:   { name: '들판의 자장가', desc: '동물 생산 속도 2배 (2시간)', cost: 12, ms: 2 * 3600e3, icon: 'assets/ui/animal_heart.png' },
  market:  { name: '금빛 흥정',     desc: '출하 상자 판매가 +20% (2시간)', cost: 10, ms: 2 * 3600e3, icon: 'assets/ui/icon_coin.png' },
  instant: { name: '달빛 소나기',   desc: '심어둔 작물이 그 자리에서 성숙 (전설)', cost: 40, ms: 0, icon: 'assets/ui/icon_star.png' },
};

export const blessLeft = (state, id, now = Date.now()) =>
  Math.max(0, (state.spirit.until[id] || 0) - now);
export const blessActive = (state, id, now = Date.now()) => blessLeft(state, id, now) > 0;
export const activeBlessCount = (state, now = Date.now()) =>
  ['growth', 'ranch', 'market'].filter(id => blessActive(state, id, now)).length;

export function buyBless(state, id, now = Date.now()) {
  const b = BLESSINGS[id];
  if (state.fireflies < b.cost) return false;
  if (id === 'instant') {
    if (!state.plots.some(p => p.crop && p.progress < 1)) return false; // 자랄 작물이 없음
    state.fireflies -= b.cost;
    for (const p of state.plots) if (p.crop) p.progress = 1;
    return true;
  }
  state.fireflies -= b.cost;
  state.spirit.until[id] = Math.max(now, state.spirit.until[id] || 0) + b.ms / GROWTH_MULT;
  return true;
}

// 실시간 틱 배율
export const growthBoost = state => blessActive(state, 'growth') ? 2 : 1;
export const ranchBoost = state => blessActive(state, 'ranch') ? 2 : 1;
export const sellMult = state => blessActive(state, 'market') ? 1.2 : 1;

// 오프라인 정산: [lastSave, now] 중 축복이 켜져 있던 구간만 2배 → 겹친 시간만큼 가산
export function boostedElapsed(state, id, elapsed, now = Date.now()) {
  const until = state.spirit.until[id] || 0;
  const overlap = Math.max(0, Math.min(until, now) - (now - elapsed));
  return elapsed + overlap;
}

// ── 공양: 요리를 바치면 반딧불 획득 — 수상한 죽이 가성비 최고 (실패작 재활용처) ──
export function offerValue(id) {
  return id === 'mystery_porridge' ? 3 : Math.max(1, Math.round(itemOf(id).sell / 150));
}

export function offer(state, id) {
  if ((state.inv[id] || 0) <= 0) return 0;
  state.inv[id]--;
  const n = offerValue(id);
  state.fireflies += n;
  return n;
}
