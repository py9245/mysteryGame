# Agent 3 Shared Context

## 제품 해석

1. 점수와 정답 성공은 `개인 기준`이다.
2. 팀은 협력 단위이며, AI 판정/저장은 `playerId` 중심이다.
3. 질문 판정은 `YES / NO / MAYBE / IRRELEVANT` 네 개로 제한한다.
4. 정답 판정은 구조화 JSON과 manual review fallback을 가진다.
5. 룰북, 온보딩, private chat, investigation queue, results 카피는 Agent 2가 바로 붙일 수 있어야 한다.

## Agent 3가 책임질 것

- 질문/정답 prompt
- case schema
- hint policy
- review / override 운영 흐름
- 플레이어 공개 카피
- 운영자 상태 카피

## 현재 핵심 미완료

- AI prompt / schema 실사용 규격 마감
- 힌트 정책 / 결과 설명 마감
- 운영자 review / override 콘텐츠 마감
- 사건 품질 보강
- 최종 카피/온보딩 정제
