# 🎨 에셋 현황

두 개의 에셋 팩이 합쳐져 있음:

1. **팩 A (게임 연결 완료)** — 생성 시트 21장을 크로마키·슬라이스한 221개 파일. 현재 코드(`js/`)가 참조하는 파일들. 맵은 1254×1254 (타일 32px ≈ 39×39).
2. **팩 B (추가 생성분)** — 부족분을 채운 확장 팩. 스토리 컷씬 8장, 부서진 건물 상태, 정령 제단, 절임통, 조이스틱 아트, 인벤토리 슬롯 등. 파일명 체계가 A와 달라 충돌 없이 공존 (예: A `icon_coin.png` / B `coin.png`). 원본·중간 산출물은 `work/imagegen/`.

## 코드에서 사용 중 (팩 A)

| 폴더 | 내용 |
|---|---|
| maps/ | 농장·집·마을·숲 배경 (1254×1254) |
| characters/ | 주인공 4방향×2프레임 (우측은 좌측 반전), NPC 6, 할머니, 루미, 반딧불 정령 |
| portraits/ | 주인공·반디·할머니·루미 |
| crops/ | 작물 18종 성숙 + 공용 새싹 단계 + 반딧꽃·별빛벼 |
| items/ · dishes/ | 수확물·생산물 아이콘 37 / 요리 아이콘 44 |
| animals/ | 7종 성체+새끼, 별양 |
| buildings/ · objects/ | 시설 (낡음/수리 페어 일부), 소품 |
| ui/ | 패널·버튼·아이콘·조이스틱 |
| cutscenes/ | 타이틀(세로), 레시피북, 키비주얼 3종 |
| fonts/ | NeoDGM 픽셀 폰트 |

## 팩 B에서 Phase별로 연결 예정

- **Phase 2**: `buildings/pickling_barrel.png`(절임통), `ui/inventory_slot*.png`, `ui/quality_star.png`
- **Phase 3**: `buildings/*_broken.png`(식당·빵집·등불탑·축제무대 낡은 상태), `cutscenes/story_01~05`
- **Phase 4**: `buildings/spirit_shrine*.png`(정령 제단), `objects/watering_sparkle.png`, `cutscenes/story_06~08`
- **폴리시**: `ui/joystick_base_art.png`·`joystick_thumb_art.png`, `ui/dialog_box.png`

## 재생성 가이드

공통 프리픽스:
```text
Crisp 16-bit pixel art game asset for a vertical mobile top-down farming RPG,
cozy warm daytime farm readability with subtle magical firefly mystery,
Stardew Valley-like clarity with gentle Ghibli warmth, top-down 3/4 view,
clean bold silhouette, soft rounded pixel shapes, palette anchors cream #FFF3D6,
straw #E8B96B, soil brown #8A5A3B, leaf green #7CB458, roof red #C75B4A,
night navy #2B3A67, firefly gold #FFD97A, no text, no watermark, no logo.
```

투명 배경이 필요한 에셋은 **평평한 마젠타(#ff00ff) 단색 배경**으로 생성 — 파이프라인이 크로마키로 자동 제거·슬라이스함. 피사체에는 #ff00ff 사용 금지, 그림자·그라데이션 없는 균일 배경 유지.
