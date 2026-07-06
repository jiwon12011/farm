// 작물 데이터 — 기획서 §4 경제표 기준. grow: ms, seed/sell: 골드
export const SEASONS = ['봄', '여름', '가을', '겨울'];

export const CROPS = {
  radish:      { name: '무',       season: -1, tier: 1, grow: 60e3,   seed: 5,   sell: 9 },
  potato:      { name: '감자',     season: 0,  tier: 1, grow: 9e5,    seed: 10,  sell: 19 },
  carrot:      { name: '당근',     season: 0,  tier: 1, grow: 18e5,   seed: 15,  sell: 30 },
  pea:         { name: '완두콩',   season: 0,  tier: 2, grow: 36e5,   seed: 25,  sell: 52 },
  strawberry:  { name: '딸기',     season: 0,  tier: 2, grow: 72e5,   seed: 45,  sell: 98,  regrow: true },
  corn:        { name: '옥수수',   season: 1,  tier: 2, grow: 54e5,   seed: 35,  sell: 74 },
  tomato:      { name: '토마토',   season: 1,  tier: 2, grow: 72e5,   seed: 40,  sell: 88,  regrow: true },
  chili:       { name: '고추',     season: 1,  tier: 2, grow: 9e6,    seed: 50,  sell: 110 },
  sunflower:   { name: '해바라기', season: 1,  tier: 3, grow: 144e5,  seed: 100, sell: 230 },
  watermelon:  { name: '수박',     season: 1,  tier: 3, grow: 18e6,   seed: 120, sell: 290 },
  wheat:       { name: '밀',       season: 2,  tier: 1, grow: 27e5,   seed: 12,  sell: 25 },
  sweetpotato: { name: '고구마',   season: 2,  tier: 2, grow: 72e5,   seed: 40,  sell: 86 },
  eggplant:    { name: '가지',     season: 2,  tier: 2, grow: 9e6,    seed: 50,  sell: 108 },
  grape:       { name: '포도',     season: 2,  tier: 3, grow: 144e5,  seed: 110, sell: 260, regrow: true },
  pumpkin:     { name: '호박',     season: 2,  tier: 3, grow: 216e5,  seed: 150, sell: 380 },
  spinach:     { name: '시금치',   season: 3,  tier: 1, grow: 24e5,   seed: 14,  sell: 28 },
  garlic:      { name: '마늘',     season: 3,  tier: 2, grow: 72e5,   seed: 38,  sell: 82 },
  napa:        { name: '눈꽃배추', season: 3,  tier: 3, grow: 18e6,   seed: 130, sell: 320 },
  // 전설 작물 (5장 해금) — 상점 미진열: 반딧꽃 씨앗은 제단 교환, 별빛벼는 온실+5장
  fireflyflower: { name: '반딧꽃', season: -1, tier: 4, grow: 288e5, seed: 0,   sell: 0,    hidden: true },
  star_rice:     { name: '별빛벼', season: -1, tier: 5, grow: 432e5, seed: 500, sell: 1500, hidden: true },
};

export function cropSprite(id) { return `assets/crops/${id}_mature.png`; }
export function itemIcon(id)   { return `assets/items/${id}.png`; }

// 디버그: ?season=0~3 강제 (0봄 1여름 2가을 3겨울) — node 테스트 환경엔 location이 없다
const FORCE_SEASON = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('season');

// 현재 실제 날짜 → 게임 계절 (실제 7일 = 한 계절, 28일 주기)
export function seasonNow(now = Date.now()) {
  const dayIdx = Math.floor(now / 864e5);
  const season = FORCE_SEASON === null
    ? Math.floor((dayIdx % 28) / 7)
    : Math.max(0, Math.min(3, +FORCE_SEASON || 0));
  return { season, day: (dayIdx % 7) + 1 };
}

// 오늘 상점에 진열되는 씨앗 (무는 전 계절, 온실 완공 시 전 계절 진열)
export function shopSeeds(now = Date.now(), all = false) {
  const { season } = seasonNow(now);
  return Object.keys(CROPS).filter(id =>
    !CROPS[id].hidden && (all || CROPS[id].season === -1 || CROPS[id].season === season));
}
