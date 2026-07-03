// 입력: 가상 조이스틱(터치) + 키보드(WASD/방향키)
export const input = { x: 0, y: 0, active: false };

const keys = {};
const KEYMAP = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0],
};

export function initInput(joyEl, stickEl) {
  addEventListener('keydown', e => { if (KEYMAP[e.code]) { keys[e.code] = 1; e.preventDefault(); } });
  addEventListener('keyup',   e => { delete keys[e.code]; });

  const R = 46; // 스틱 이동 반경(px)
  let pid = null, cx = 0, cy = 0;

  const zone = document.getElementById('joyzone');
  zone.addEventListener('pointerdown', e => {
    if (pid !== null) return;
    pid = e.pointerId;
    zone.setPointerCapture(pid);
    const base = joyEl.getBoundingClientRect();
    cx = base.left + base.width / 2;
    cy = base.top + base.height / 2;
    move(e);
  });
  zone.addEventListener('pointermove', e => { if (e.pointerId === pid) move(e); });
  const end = e => {
    if (e.pointerId !== pid) return;
    pid = null; input.x = 0; input.y = 0; input.active = false;
    stickEl.style.transform = 'translate(-50%,-50%)';
  };
  zone.addEventListener('pointerup', end);
  zone.addEventListener('pointercancel', end);

  function move(e) {
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const d = Math.hypot(dx, dy) || 1;
    const c = Math.min(d, R);
    dx = dx / d * c; dy = dy / d * c;
    stickEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    input.x = dx / R; input.y = dy / R;
    input.active = true;
  }
}

// 키보드 입력 반영 (조이스틱이 우선)
export function pollInput() {
  if (input.active) return input;
  let x = 0, y = 0;
  for (const k in keys) { x += KEYMAP[k][0]; y += KEYMAP[k][1]; }
  const d = Math.hypot(x, y);
  return d ? { x: x / d, y: y / d } : { x: 0, y: 0 };
}
