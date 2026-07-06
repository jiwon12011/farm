// 이미지 로더 + 스프라이트 드로잉 헬퍼
// ASSET_VER: 에셋 파일을 교체했을 때 올려주면 브라우저 캐시를 무효화함
export const ASSET_VER = 4;
const cache = new Map();

export function img(src) {
  if (!cache.has(src)) {
    const im = new Image();
    im.src = `${src}?v=${ASSET_VER}`;
    cache.set(src, im);
  }
  return cache.get(src);
}

export function preload(list) {
  return Promise.all(list.map(src => new Promise(res => {
    const im = img(src);
    if (im.complete) return res();
    im.onload = res;
    im.onerror = () => { console.warn('missing asset:', src); res(); };
  })));
}

// 바닥 기준(하단 중앙 앵커)으로 지정 높이에 맞춰 그림
export function drawSprite(ctx, src, x, y, targetH) {
  const im = img(src);
  if (!im.complete || !im.naturalWidth) return;
  const s = targetH / im.naturalHeight;
  const w = im.naturalWidth * s;
  ctx.drawImage(im, x - w / 2, y - targetH, w, targetH);
}
