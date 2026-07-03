// 요리 시스템: 도구별 1슬롯 실시간 조리, 타임스탬프 기반 (오프라인에도 완성됨)
import { RECIPES, matchRecipe } from '../data/recipes.js';
import { GROWTH_MULT } from './farming.js';

export function hasIngredients(state, ing) {
  return Object.entries(ing).every(([id, n]) => (state.inv[id] || 0) >= n);
}

export function consume(state, ing) {
  for (const [id, n] of Object.entries(ing)) state.inv[id] -= n;
}

// 조리 시작 (recipeId 또는 실험 조합)
export function startCook(state, tool, recipeId) {
  const r = RECIPES[recipeId];
  if (!r || state.stoves[tool] || !hasIngredients(state, r.ing)) return false;
  consume(state, r.ing);
  state.stoves[tool] = { recipe: recipeId, doneAt: Date.now() + r.time / GROWTH_MULT };
  return true;
}

// 실험: 조합이 미발견 레시피와 일치하면 발견+조리, 아니면 수상한 죽
export function experiment(state, tool, ing) {
  if (state.stoves[tool] || !hasIngredients(state, ing)) return { ok: false };
  const id = matchRecipe(ing);
  if (id && RECIPES[id].tool === tool) {
    const isNew = !state.recipes.includes(id);
    if (isNew) state.recipes.push(id);
    consume(state, ing);
    state.stoves[tool] = { recipe: id, doneAt: Date.now() + RECIPES[id].time / GROWTH_MULT };
    return { ok: true, discovered: isNew ? id : null, recipe: id };
  }
  consume(state, ing);
  state.stoves[tool] = { recipe: 'mystery_porridge', doneAt: Date.now() + 3e4 / GROWTH_MULT };
  return { ok: true, mystery: true };
}

export function stoveState(state, tool) {
  const s = state.stoves[tool];
  if (!s) return { status: 'idle' };
  const left = s.doneAt - Date.now();
  return left <= 0 ? { status: 'done', recipe: s.recipe } : { status: 'cooking', recipe: s.recipe, left };
}

export function collectDish(state, tool) {
  const s = state.stoves[tool];
  if (!s || s.doneAt > Date.now()) return null;
  state.inv[s.recipe] = (state.inv[s.recipe] || 0) + 1;
  state.stoves[tool] = null;
  return s.recipe;
}

export function fmtLeft(ms) {
  const m = Math.ceil(ms / 6e4);
  if (m < 1) return `${Math.ceil(ms / 1e3)}초`;
  return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`;
}
