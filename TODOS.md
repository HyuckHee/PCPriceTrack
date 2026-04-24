# TODOS

## Ghost Row — 예산 대비 성능 최적화 뷰
- **What:** CPU/GPU 카테고리에서 '예산 N 더 쓰면 성능 +X%' ghost row 표시
- **Why:** 예산 대비 성능 최적화 의사결정 지원. PCPartPicker에 없는 차별화 포인트.
- **Cons:** performanceScore 데이터 품질 확인 필요, ratio를 BuildEstimatorContext로 리팩터링 필요
- **Context:** 디자인 문서 4.2절 참조 (`~/.gstack/projects/HyuckHee-PCPriceTrack/husker-main-design-20260423-143200.md`). 선행 작업: `SELECT category_id, COUNT(*) FILTER (WHERE performance_score IS NOT NULL) FROM products GROUP BY category_id` 실행하여 데이터 커버리지 확인.
- **Depends on:** 스펙 필터 + 견적 연동 PR 완료 후
- **Added:** 2026-04-24
