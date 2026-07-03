# 🎨 에셋 현황

원본: AI 생성 시트 21장 → 크로마키·슬라이스 파이프라인으로 `assets/`에 221개 파일 배치 완료.

## 배치 완료 (Phase 1~4에서 사용)

| 폴더 | 개수 | 내용 |
|---|---|---|
| maps/ | 4 | 농장·집·마을·숲 배경 (1254×1254) |
| characters/ | 17 | 주인공 4방향×2 (우측은 좌측 반전), NPC 6, 할머니, 루미, 반딧불 정령 |
| portraits/ | 4 | 주인공·반디·할머니·루미 |
| crops/ | 23 | 작물 18종 성숙 + 공용 새싹 3단계 + 반딧꽃·별빛벼 |
| items/ | 37 | 수확물·생산물·가공품 아이콘 |
| animals/ | 15 | 7종 성체+새끼, 별양(전설) |
| dishes/ | 44 | 요리 아이콘 (달빛 스튜·수상한 죽 포함) |
| buildings/ | 20 | 마을 시설 (게시판·우물 낡음/수리 페어), 온실 2상태, 조리도구 화로 |
| objects/ | 12 | 나무·돌·표지판·등불·반딧불 등 소품 |
| ui/ | 31 | 패널·버튼·아이콘·조이스틱 |
| cutscenes/ | 5 | 타이틀(세로)·레시피북·키비주얼 3종 |
| fonts/ | 1 | NeoDGM 픽셀 폰트 |

## 추가 생성 필요 (급하지 않음)

- [ ] 절임통 단독 오브젝트 (Phase 2 — 임시로 냄비 화로 색변형 사용 가능)
- [ ] 식당·빵집·등불탑·축제무대 **낡은 상태** (Phase 3 — 임시로 채도/명도 코드 처리)
- [ ] 정령 제단 (Phase 4)
- [ ] 스토리 컷씬 일러스트 6~8장 (Phase 3~4 — 프롤로그·챕터 엔딩·최종 엔딩)

## 스타일 가이드 (추가 생성 시)

```
16-bit pixel art game asset, cozy warm color palette (cream #FFF3D6, straw #E8B96B,
soil brown #8A5A3B, leaf green #7CB458, roof red #C75B4A, firefly gold #FFD97A),
top-down 3/4 view, soft rounded pixel shapes, Stardew Valley meets Ghibli mood,
clean bold silhouette, no text, no watermark, isolated on transparent background
```
투명 배경 대신 **마젠타(#FF00FF) 단색 배경**으로 뽑아도 됨 — 파이프라인이 자동 제거.
