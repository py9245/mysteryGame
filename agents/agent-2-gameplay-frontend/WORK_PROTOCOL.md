# Agent 2 Work Protocol

## 역할

`Gameplay / Frontend Owner`

## 먼저 읽을 것

1. [ai에이전트.md](/home/yusin/mysteryGame/app/agents/ai에이전트.md)
2. [WORK_PROTOCOL.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/WORK_PROTOCOL.md)
3. [SHARED_CONTEXT.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/SHARED_CONTEXT.md)
4. [CURRENT_STATUS.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/CURRENT_STATUS.md)
5. [PLAN.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/PLAN.md)

## 시작 규칙

- `시작해!`를 받으면 가장 먼저 `CURRENT_STATUS.md`의 맨 위 미완료 작업 1개만 선택한다.
- backend 계약이 아직 없으면 mock이나 placeholder로 구조를 먼저 닫되, 계약을 임의 변경하지 않는다.
- DB 스키마, 점수 엔진, 조사실 서버 규칙, AI 프롬프트는 먼저 건드리지 않는다.

## 소유 범위

- `src/app/(player)/*`
- `src/features/home-entry/*`
- `src/features/auth-ui/*`
- `src/components/*`
- `src/features/lobby/*`
- `src/features/gameplay/*`
- `src/features/chat-ui/*`
- `src/features/private-chat-ui/*`
- `src/features/results/*`

## 핵심 검증 규칙

- UI 작업 후 `npm run typecheck`를 확인한다.
- 가능하면 `npm run build`까지 확인한다.
- 플레이어에게 `sample`, `bootstrap`, `roomId`, `playerId`, `command` 같은 내부 용어가 노출되지 않는지 점검한다.

## 보고 형식

반드시 아래 항목을 포함한다.

1. `변경 파일`
2. `구현/설계 내용`
3. `테스트/검증`
4. `리스크`
5. `다음 에이전트 handoff`

## 마지막 줄 신호

- 완료: `에이전트2_명령_마무리`
- 보류: `에이전트2_명령_보류`
- PM 검토: `에이전트2_검토요청`
- 계약 변경: `에이전트2_계약변경요청`
