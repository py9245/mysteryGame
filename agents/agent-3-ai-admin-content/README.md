# Agent 3 AI / Admin / Content Scaffold

이 폴더는 Mystery Time 프로젝트의 `AI 판정`, `사건 콘텐츠`, `운영자 개입` 기준을 담는다.

이 에이전트의 핵심 역할은 `정답을 더 똑똑하게 맞히는 것`이 아니라, `AI가 틀려도 게임이 계속 돌아가게 만드는 것`이다.

## 읽는 순서

1. [ai에이전트.md](/home/yusin/mysteryGame/app/agents/ai에이전트.md)
2. [WORK_PROTOCOL.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/WORK_PROTOCOL.md)
3. [SHARED_CONTEXT.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/SHARED_CONTEXT.md)
4. [CURRENT_STATUS.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/CURRENT_STATUS.md)
5. [PLAN.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/PLAN.md)
6. [docs/judgement-contract.md](./docs/judgement-contract.md)
7. [docs/admin-flow.md](./docs/admin-flow.md)
8. [docs/visibility-matrix.md](./docs/visibility-matrix.md)
9. [docs/private-chat-policy.md](./docs/private-chat-policy.md)
10. [docs/investigation-queue-policy.md](./docs/investigation-queue-policy.md)
11. [docs/copy-pack.md](./docs/copy-pack.md)
12. [docs/view-model-boundary.md](./docs/view-model-boundary.md)
13. [docs/copy-key-map.md](./docs/copy-key-map.md)
14. [docs/integration-checklist.md](./docs/integration-checklist.md)

## 현재 포함물

- `schemas/`: 사건, 질문 판정, 정답 판정, 힌트 공개 JSON Schema
- `data/cases/`: 수동 사건 샘플 3개와 인덱스
- `prompts/`: AI 판정 및 사건 생성용 프롬프트 초안
- `docs/`: 사람이 읽는 운영 규칙과 계약 설명
- `data/`: Agent 2와 Agent 1이 참조할 copy pack 구조

## 설계 기준

- 점수와 정답 성공은 `개인 기준`이다.
- 팀은 협력 단위이고, 저장/판정의 기본 단위는 `playerId`다.
- 질문 판정은 4개 답변 타입으로 제한한다.
- 정답 판정은 `accepted`, `rejected`, `ambiguous`, `manual_review`의 흐름을 가진다.
- AI 실패는 숨기지 않고 운영자 개입으로 넘긴다.
- 플레이어/운영자 노출 문구는 `docs/visibility-matrix.md`를 따른다.
- 화면별 copy는 `docs/copy-pack.md`와 `data/copy-pack.json`을 따른다.
- view model 공개/비공개 경계는 `docs/view-model-boundary.md`를 따른다.
- slot/key 1:1 매핑은 `docs/copy-key-map.md`와 `data/copy-key-map.json`을 따른다.
- 실제 공용 루트 반입 순서는 `docs/integration-checklist.md`를 따른다.

## 완료 조건

- 수동 사건 3개가 실제 테스트에 쓸 수 있어야 한다.
- 질문/정답 판정 계약이 Agent 1이 바로 흡수할 수 있는 구조여야 한다.
- 운영자는 로그를 보고 판정 수정, 점수 보정, 힌트 강제 공개를 할 수 있어야 한다.
