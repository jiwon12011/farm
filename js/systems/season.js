// 계절·날씨 — 실제 7일 = 한 계절 (기획서 §3.7). 날씨는 날짜 시드로 고정
import { seasonNow } from '../data/crops.js';

const Q = new URLSearchParams(location.search);
const FORCE_W = Q.has('rain') ? 'rain' : Q.has('sun') ? 'sun' : null; // ?rain / ?sun 강제

// 날짜 인덱스 시드 결정적 난수 — 리로드해도 그날 날씨는 같다
function dayRand(dayIdx) {
  let x = Math.imul(dayIdx + 1, 2654435761);
  x = Math.imul(x ^ (x >>> 13), 1103515245);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

// 'sun' | 'rain' | 'snow' — 궂은 날 25%, 겨울엔 눈
export function weatherToday(now = Date.now()) {
  const wet = FORCE_W ? FORCE_W === 'rain' : dayRand(Math.floor(now / 864e5)) < 0.25;
  if (!wet) return 'sun';
  return seasonNow(now).season === 3 ? 'snow' : 'rain';
}

export const isRainy = (now = Date.now()) => weatherToday(now) === 'rain';

// 비 오는 날 자동 급수 — 자라는 밭의 물기를 계속 유지 (우물과 동일 규칙, 눈은 해당 없음)
export function rainWater(state, now = Date.now()) {
  if (!isRainy(now)) return 0;
  let n = 0;
  for (const p of state.plots) {
    if (p.crop && p.progress < 1 && p.progress >= p.wateredUntil) {
      p.wateredUntil = Math.min(1, p.progress + 0.3);
      n++;
    }
  }
  return n;
}

// 계절 색감 — 실외 맵 위에 덮는 [blend, fillStyle] 목록 (봄은 원본 그대로)
export const SEASON_TINTS = [
  [],                                                                              // 봄
  [['overlay', 'rgba(140,215,95,0.10)']],                                          // 여름 — 짙은 초록
  [['overlay', 'rgba(235,150,60,0.15)']],                                          // 가을 — 노을빛
  [['multiply', 'rgba(190,208,240,0.5)'], ['overlay', 'rgba(220,235,255,0.12)']],  // 겨울 — 차가운 빛
];
