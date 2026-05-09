# Agent 2 Frontend Owner

이 폴더는 `Mystery Time` 프로젝트의 `Gameplay / Frontend Owner`가 소유하는 문서와 스캐폴드만 둔다.

## 읽는 순서

1. [ai에이전트.md](/home/yusin/mysteryGame/app/agents/ai에이전트.md)
2. [WORK_PROTOCOL.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/WORK_PROTOCOL.md)
3. [SHARED_CONTEXT.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/SHARED_CONTEXT.md)
4. [CURRENT_STATUS.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/CURRENT_STATUS.md)
5. [PLAN.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/PLAN.md)
6. [SCREEN_SPEC.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/SCREEN_SPEC.md)
7. [API_EXPECTATIONS.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/API_EXPECTATIONS.md)
8. [MOCK_STATE.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/MOCK_STATE.md)
9. [STRUCTURE_INDEX.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/STRUCTURE_INDEX.md)
10. [COMPONENT_PROP_CONTRACTS.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/COMPONENT_PROP_CONTRACTS.md)
11. [JUDGEMENT_PROP_CONTRACTS.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/JUDGEMENT_PROP_CONTRACTS.md)
12. [INTEGRATION_CHECKLIST.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/INTEGRATION_CHECKLIST.md)

## 소유 원칙

- 이 폴더는 플레이어가 실제로 보는 화면과 그 화면이 소비하는 상태만 다룬다.
- DB 스키마, 점수 계산, AI 판정, 운영자 제어는 다른 에이전트 소유다.
- 중간 단계에서는 더미 상태를 써도 되지만, 공개/비공개 정보 경계는 `SHARED_CONTEXT.md`를 따른다.
- 다른 에이전트가 만든 계약을 임의로 바꾸지 않는다. 바꿔야 하면 PM에게 계약 변경을 요청한다.
- route tree, feature tree, component inventory, state slices는 구조 문서로 먼저 고정한다.
- 실제 공유 app 루트 반입 전에는 `INTEGRATION_CHECKLIST.md`를 먼저 읽는다.

## 현재 목표

- 대기실, 준비완료, 팀 배정, 메인 게임 화면, 조사실, 정답 성공 후 관전 화면, 결과 화면을 분리해서 설계한다.
- 개인 점수와 비공개 정보 차단 규칙을 화면 수준에서 명시한다.
- API가 없어도 UI 흐름을 검증할 수 있도록 mock state를 둔다.
