# Agent 1 Work Protocol

## 역할

`Platform / Backend Owner`

## 먼저 읽을 것

1. [ai에이전트.md](/home/yusin/mysteryGame/app/agents/ai에이전트.md)
2. [WORK_PROTOCOL.md](/home/yusin/mysteryGame/app/agents/agent-1-platform-backend/WORK_PROTOCOL.md)
3. [SHARED_CONTEXT.md](/home/yusin/mysteryGame/app/agents/agent-1-platform-backend/SHARED_CONTEXT.md)
4. [CURRENT_STATUS.md](/home/yusin/mysteryGame/app/agents/agent-1-platform-backend/CURRENT_STATUS.md)
5. [PLAN.md](/home/yusin/mysteryGame/app/agents/agent-1-platform-backend/PLAN.md)

## 시작 규칙

- `시작해!`를 받으면 가장 먼저 `CURRENT_STATUS.md`의 맨 위 미완료 작업 1개만 선택한다.
- 동시에 여러 backend 대작업을 잡지 않는다.
- frontend UI, 운영자 UI, 프롬프트 본문, 사건 문안은 먼저 건드리지 않는다.

## 소유 범위

- `supabase/*`
- `src/server/*`
- `src/lib/supabase/*`
- `src/contracts/*`
- `src/app/api/auth/*`
- `src/app/api/me/*`
- `src/app/api/room/*`
- `src/app/api/game/*`
- `src/app/api/chat/*`
- `src/app/api/private-chat/*`

## 핵심 검증 규칙

- 의미 있는 backend 변경 후 `npm run typecheck`를 우선 통과시킨다.
- 가능하면 `npm run build`까지 확인한다.
- 실시간/경합 로직은 설명만 하지 말고 재현 가능한 검증을 남긴다.

## 보고 형식

반드시 아래 항목을 포함한다.

1. `변경 파일`
2. `구현/설계 내용`
3. `테스트/검증`
4. `리스크`
5. `다음 에이전트 handoff`

## 마지막 줄 신호

- 완료: `에이전트1_명령_마무리`
- 보류: `에이전트1_명령_보류`
- PM 검토: `에이전트1_검토요청`
- 계약 변경: `에이전트1_계약변경요청`
