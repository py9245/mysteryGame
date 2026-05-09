# Agent 3 Work Protocol

## 역할

`AI / Admin / Content Owner`

## 먼저 읽을 것

1. [ai에이전트.md](/home/yusin/mysteryGame/app/agents/ai에이전트.md)
2. [WORK_PROTOCOL.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/WORK_PROTOCOL.md)
3. [SHARED_CONTEXT.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/SHARED_CONTEXT.md)
4. [CURRENT_STATUS.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/CURRENT_STATUS.md)
5. [PLAN.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/PLAN.md)
6. [AI_PROVIDER_NOTES.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/AI_PROVIDER_NOTES.md)

## 시작 규칙

- `시작해!`를 받으면 가장 먼저 `CURRENT_STATUS.md`의 맨 위 미완료 작업 1개만 선택한다.
- 핵심 서버 로직과 플레이어 메인 UI 전반은 먼저 건드리지 않는다.
- AI 출력은 반드시 구조화 규격과 공개/비공개 경계를 함께 설명한다.

## 소유 범위

- `src/app/admin/*`
- `src/app/api/ai/*`
- `src/lib/ai/*`
- `src/features/admin/*`
- `src/features/cases/*`
- `data/cases/*`
- `prompts/*`
- `data/admin/*`

## 핵심 검증 규칙

- JSON schema / copy json은 파싱 가능해야 한다.
- 질문/정답 판정은 enum / structured JSON 중심으로 유지한다.
- 플레이어 카피는 짧고 상태 중심으로 유지한다.

## 보고 형식

반드시 아래 항목을 포함한다.

1. `변경 파일`
2. `구현/설계 내용`
3. `테스트/검증`
4. `리스크`
5. `다음 에이전트 handoff`

## 마지막 줄 신호

- 완료: `에이전트3_명령_마무리`
- 보류: `에이전트3_명령_보류`
- PM 검토: `에이전트3_검토요청`
- 계약 변경: `에이전트3_계약변경요청`
