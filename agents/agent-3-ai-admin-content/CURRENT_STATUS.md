# Agent 3 Current Status

## 이미 완료된 기반

- 사건 3종 기본 세트
- 질문/정답/힌트/운영 문서 초안
- 로그인/비로그인/방 타입/비밀번호/룰북 카피
- 룰북 섹션 순서와 온보딩 3개 가이드
- room list / password / practice / settings edge-state 카피

## 지금부터의 우선순위

### 1. AI 판정 실사용 규격 마감

- question prompt 보강 완료
- answer prompt 보강 완료
- schema / prompt 정합성 1차 정리 완료
- retry / review fallback 문서화 완료
- 남은 것은 실제 UI/운영 슬롯과의 미세 정합성 점검

### 2. 힌트 정책 / 결과 설명 마감

- first solve / timer pressure / final hint
- result explanation 공개 범위
- stage difficulty 템포 점검

### 3. 운영자 review / override 콘텐츠 마감

- review queue 상태 설명 1차 완료
- override 결과 카피 1차 완료
- admin flow와 카피 정합성 1차 완료

### 4. 사건 품질 보강

- case-001~003 재검토
- 필요시 case 추가
- image prompt 보강

### 5. 최종 카피 정제

- 긴 문장 축약
- empty / loading / error / cooldown / blocked 사유 점검
- `private-chat-policy.md`, `investigation-queue-policy.md` 추가 완료
- `privateChat.*`, `investigationQueue.*`, `reviewQueue.*`, `overrideResult.*` slot 반영 완료
