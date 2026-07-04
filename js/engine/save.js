// 세이브: localStorage 단일 JSON + 타임스탬프 (오프라인 정산용)
const KEY = 'bandi-farm-v1';

export function newState() {
  return {
    v: 1,
    gold: 50,
    fireflies: 0,
    seeds: { radish: 3 },
    inv: {},
    plots: Array.from({ length: 20 }, (_, i) => ({ id: i, crop: null, progress: 0, wateredUntil: 0 })),
    unlocked: 6,
    animals: [],
    stoves: { pan: null, pot: null },
    recipes: [],
    village: {
      board: { status: 'broken' }, well: { status: 'broken' },
      restaurant: { status: 'broken' }, bridge: { status: 'broken' },
    },
    affinity: {},
    talkDay: {},
    orders: { list: [], refreshAt: 0 },
    restaurant: { slots: [null, null, null, null], pending: 0 },
    forest: { day: '', taken: [] },
    map: 'farm',
    px: 620, py: 400,
    flags: {},
    stats: { earned: 0, harvested: 0 },
    lastSave: Date.now(),
  };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s.v !== 1) return null;
    return migrate(s);
  } catch { return null; }
}

// Phase 2·3 필드 채우기 (기존 세이브 호환)
function migrate(s) {
  s.animals ??= [];
  s.stoves ??= { pan: null, pot: null };
  s.recipes ??= [];
  s.village ??= {
    board: { status: 'broken' }, well: { status: 'broken' },
    restaurant: { status: 'broken' }, bridge: { status: 'broken' },
  };
  s.affinity ??= {};
  s.talkDay ??= {};
  s.orders ??= { list: [], refreshAt: 0 };
  s.restaurant ??= { slots: [null, null, null, null], pending: 0 };
  s.forest ??= { day: '', taken: [] };
  return s;
}

export function save(state) {
  state.lastSave = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}

export function wipe() { localStorage.removeItem(KEY); }

export function initAutosave(state) {
  setInterval(() => save(state), 30e3);
  addEventListener('visibilitychange', () => { if (document.hidden) save(state); });
  addEventListener('pagehide', () => save(state));
}
