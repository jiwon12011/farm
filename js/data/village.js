// 마을 복구 시설 — 순서대로만 진행 가능 (기획서 §3.5)
export const REPAIR_ORDER = ['board', 'well', 'restaurant', 'bridge', 'bakery', 'greenhouse', 'lantern', 'festival'];

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
  bakery: {
    name: '빵집 화덕', gold: 8000, mats: { wheat: 20, egg: 10 }, ms: 360 * 6e4,
    desc: '봄이네 상점에 가공품(밀가루)이 들어와요 — 오븐 요리의 시작',
  },
  greenhouse: {
    name: '온실', gold: 12000, mats: { radish: 30, wool: 5 }, ms: 480 * 6e4,
    desc: '계절에 상관없이 모든 씨앗을 사고 심을 수 있어요',
  },
  lantern: {
    name: '정령의 등불탑', gold: 16000, mats: { honey: 10, cheese: 2 }, ms: 600 * 6e4,
    desc: '밤의 마을에 불이 켜지고, 야생 반딧불을 5마리 더 잡을 수 있어요',
  },
  festival: {
    name: '축제 광장', gold: 25000, mats: { pumpkin: 10, wool: 5 }, ms: 720 * 6e4,
    desc: '주말마다 작은 축제 — 출하 상자 판매가 +25%',
  },
};

// 다음 수리 가능한 시설 id (모두 완료면 null)
export function nextRepair(village) {
  for (const id of REPAIR_ORDER) if (village[id].status !== 'done') return id;
  return null;
}

// 축제 광장 완공 후 주말(토·일) 노점 판매 배율
export function festivalMult(state, d = new Date()) {
  return state.village.festival?.status === 'done' && [0, 6].includes(d.getDay()) ? 1.25 : 1;
}
