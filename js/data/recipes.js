// 레시피 데이터 — 프라이팬·냄비·오븐·절임통 22종. 판매가 = 재료 원가 합 × 2.0~2.5
// ing: {아이템id: 개수}, time: ms, tool: 'pan' | 'pot' | 'oven' | 'jar'
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
  // Phase 4: 오븐 (3장 해금)
  bread:             { name: '빵',           tool: 'oven', ing: { flour: 2 },                        time: 30 * 6e4, sell: 380 },
  garlic_bread:      { name: '마늘빵',       tool: 'oven', ing: { garlic: 1, flour: 1 },             time: 25 * 6e4, sell: 390 },
  pumpkin_pie:       { name: '호박파이',     tool: 'oven', ing: { pumpkin: 1, flour: 1, egg: 1 },    time: 60 * 6e4, sell: 1180 },
  honey_toast:       { name: '허니토스트',   tool: 'oven', ing: { bread: 1, honey: 1, strawberry: 1 }, time: 45 * 6e4, sell: 1520 },
  // Phase 4: 절임통 (4장 해금)
  strawberry_jam:    { name: '딸기잼',       tool: 'jar', ing: { strawberry: 3 },                    time: 40 * 6e4, sell: 660 },
  grape_jam:         { name: '포도잼',       tool: 'jar', ing: { grape: 3 },                         time: 40 * 6e4, sell: 1750 },
  cheese:            { name: '치즈',         tool: 'jar', ing: { milk: 2 },                          time: 60 * 6e4, sell: 800, icon: 'assets/items/cheese.png' },
  pickles:           { name: '채소 절임',    tool: 'jar', ing: { eggplant: 1, garlic: 1 },           time: 50 * 6e4, sell: 430 },
  // 최상위 요리 & 엔딩
  truffle_pasta:     { name: '트러플 파스타', tool: 'pot', ing: { truffle: 1, flour: 1, cheese: 1 },  time: 90 * 6e4, sell: 3500 },
  moonlight_stew:    { name: '달빛 스튜',    tool: 'pot', ing: { star_rice: 1, fireflyflower: 1, truffle: 1, milk: 1 }, time: 120 * 6e4, sell: 0 },
};

export const STARTER_RECIPES = ['baked_potato', 'fried_egg', 'radish_salad'];

export const TOOLS = {
  pan:  { name: '프라이팬', stoveIds: ['stove_pan'] },
  pot:  { name: '냄비',     stoveIds: ['stove_pot'] },
  oven: { name: '오븐',     stoveIds: ['stove_oven'] },
  jar:  { name: '절임통',   stoveIds: ['stove_jar'] },
};

// 재료 조합 → 레시피 매칭 (정렬된 멀티셋 키)
export function comboKey(ing) {
  return Object.entries(ing).filter(([, n]) => n > 0)
    .map(([id, n]) => `${id}x${n}`).sort().join('+');
}
const KEYS = {};
for (const [id, r] of Object.entries(RECIPES)) KEYS[comboKey(r.ing)] = id;
export function matchRecipe(ing) { return KEYS[comboKey(ing)] || null; }
