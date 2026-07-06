// 아이템 레지스트리 — 인벤토리에 들어가는 모든 것 (수확물·생산물·요리·기타)
import { CROPS } from './crops.js';
import { RECIPES } from './recipes.js';

const ITEMS = {};

// 수확물 (작물과 동일 id)
for (const [id, c] of Object.entries(CROPS)) {
  ITEMS[id] = { name: c.name, sell: c.sell, icon: `assets/items/${id}.png` };
}

// 목장 생산물
Object.assign(ITEMS, {
  egg:       { name: '달걀',   sell: 22,  icon: 'assets/items/egg.png' },
  duck_egg:  { name: '오리알', sell: 50,  icon: 'assets/items/duck_egg.png' },
  goat_milk: { name: '염소젖', sell: 105, icon: 'assets/items/goat_milk.png' },
  wool:      { name: '양털',   sell: 220, icon: 'assets/items/wool.png' },
  milk:      { name: '우유',   sell: 180, icon: 'assets/items/milk.png' },
  honey:     { name: '꿀',     sell: 130, icon: 'assets/items/honey.png' },
  truffle:   { name: '트러플', sell: 520, icon: 'assets/items/truffle.png' },
  star_wool: { name: '별빛양털', sell: 1200, icon: 'assets/items/star_wool.png' },
  feed:      { name: '사료',   sell: 4,   icon: 'assets/items/feed.png' },
  flour:     { name: '밀가루', sell: 40,  icon: 'assets/items/flour.png' }, // 빵집 화덕에서 구매
});

// 요리
for (const [id, r] of Object.entries(RECIPES)) {
  ITEMS[id] = { name: r.name, sell: r.sell, icon: r.icon || `assets/dishes/${id}.png` };
}
ITEMS.mystery_porridge = { name: '수상한 죽', sell: 5, icon: 'assets/dishes/mystery_porridge.png' };

export { ITEMS };
export function itemOf(id) {
  return ITEMS[id] || { name: id, sell: 1, icon: 'assets/ui/icon_bag.png' };
}
