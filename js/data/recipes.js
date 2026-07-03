// 레시피 데이터 — Phase 2: 프라이팬·냄비 12종. 판매가 = 재료 원가 합 × 2.0~2.5
// ing: {아이템id: 개수}, time: ms, tool: 'pan' | 'pot'
export const RECIPES = {
  baked_potato:      { name: '감자구이',     tool: 'pan', ing: { potato: 2 },                       time: 2 * 6e4,  sell: 90 },
  fried_egg:         { name: '달걀프라이',   tool: 'pan', ing: { egg: 1 },                          time: 1 * 6e4,  sell: 50 },
  radish_salad:      { name: '무 샐러드',    tool: 'pan', ing: { radish: 2, carrot: 1 },            time: 5 * 6e4,  sell: 95 },
  spinach_omelette:  { name: '시금치 오믈렛', tool: 'pan', ing: { spinach: 2, egg: 1 },              time: 8 * 6e4,  sell: 175 },
  sweetpotato_roast: { name: '군고구마',     tool: 'pan', ing: { sweetpotato: 2 },                  time: 10 * 6e4, sell: 340 },
  veggie_stirfry:    { name: '야채볶음',     tool: 'pan', ing: { carrot: 1, pea: 1, chili: 1 },     time: 10 * 6e4, sell: 420 },
  carrot_soup:       { name: '당근 수프',    tool: 'pot', ing: { carrot: 3, milk: 1 },              time: 15 * 6e4, sell: 620 },
  pea_soup:          { name: '완두콩 수프',  tool: 'pot', ing: { pea: 2, milk: 1 },                 time: 15 * 6e4, sell: 650 },
  cream_soup:        { name: '크림 수프',    tool: 'pot', ing: { milk: 2, potato: 1 },              time: 25 * 6e4, sell: 850 },
  corn_soup:         { name: '옥수수 스프',  tool: 'pot', ing: { corn: 2, milk: 1 },                time: 20 * 6e4, sell: 720 },
  tomato_stew:       { name: '토마토 스튜',  tool: 'pot', ing: { tomato: 2, potato: 1, garlic: 1 }, time: 30 * 6e4, sell: 620 },
  milk_stew:         { name: '밀크 스튜',    tool: 'pot', ing: { milk: 2, spinach: 1, potato: 1 },  time: 35 * 6e4, sell: 920 },
};

export const STARTER_RECIPES = ['baked_potato', 'fried_egg', 'radish_salad'];

export const TOOLS = {
  pan: { name: '프라이팬', stoveIds: ['stove_pan'] },
  pot: { name: '냄비',     stoveIds: ['stove_pot'] },
};

// 재료 조합 → 레시피 매칭 (정렬된 멀티셋 키)
export function comboKey(ing) {
  return Object.entries(ing).filter(([, n]) => n > 0)
    .map(([id, n]) => `${id}x${n}`).sort().join('+');
}
const KEYS = {};
for (const [id, r] of Object.entries(RECIPES)) KEYS[comboKey(r.ing)] = id;
export function matchRecipe(ing) { return KEYS[comboKey(ing)] || null; }
