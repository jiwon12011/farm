// 마을 복구 시설 — 순서대로만 진행 가능 (기획서 §3.5)
export const REPAIR_ORDER = ['board', 'well', 'restaurant', 'bridge'];

export const REPAIRS = {
  board: {
    name: '마을 게시판', gold: 500, mats: { potato: 10 }, ms: 10 * 6e4,
    desc: '주민들의 주문을 받아 1.5배 가격에 팔 수 있어요',
  },
  well: {
    name: '마을 우물', gold: 1200, mats: { carrot: 10 }, ms: 30 * 6e4,
    desc: '접속할 때마다 자라는 밭 전체에 자동으로 물을 줘요',
  },
  restaurant: {
    name: "식당 '반디네 부엌'", gold: 3000, mats: { egg: 10, milk: 5 }, ms: 120 * 6e4,
    desc: '요리를 진열하면 자리를 비운 동안 자동으로 팔려요',
  },
  bridge: {
    name: '숲의 다리', gold: 5000, mats: { carrot: 20, egg: 10 }, ms: 240 * 6e4,
    desc: '반딧불 숲으로 가는 길이 열려요',
  },
};

// 다음 수리 가능한 시설 id (모두 완료면 null)
export function nextRepair(village) {
  for (const id of REPAIR_ORDER) if (village[id].status !== 'done') return id;
  return null;
}
