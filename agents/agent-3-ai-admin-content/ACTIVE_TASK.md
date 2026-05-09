[TASK]
AGENT: Agent 3
TASK_ID: A3-016
OWNER_SCOPE:
- src/app/admin/*
- src/app/api/ai/*
- src/lib/ai/*
- src/features/admin/*
- data/admin/*
- prompts/*

당신은 혼자 작업하는 것이 아니다. 다른 에이전트가 동시에 같은 저장소를 만지고 있으니, 다른 사람의 변경을 되돌리지 말고 자신의 소유 범위 안에서만 additive하게 작업하라.

목표:
현재 AI runtime은 route와 helper는 있지만, `/admin`에서 운영자가 `지금 어떤 provider/model/env 전략으로 AI가 동작하는지` 읽기 좋게 확인하는 read-only surface가 더 필요하다. 이번 라운드에서는 [AI_PROVIDER_NOTES.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/AI_PROVIDER_NOTES.md)를 기준으로 `/admin`의 `AI Runtime` 섹션을 강화하라.

요구사항:
1. GMS text/image provider 구조, 기본 모델, fallback/provider 선택 기준을 운영자가 읽기 좋게 보여라.
2. 현재 존재하는 `/api/ai/text`, `/api/ai/image`, `src/lib/ai/*`와 어긋나지 않게 유지하라.
3. 가능하면 `data/admin/*` read-only 자산으로 연결하라.
4. 플레이어 메인 UI나 게임 서버 핵심 로직은 건드리지 마라.
5. build/typecheck를 확인하라.

응답 형식:
- 변경 파일
- 구현 내용
- 테스트/검증
- 리스크
- 다음 handoff
- 마지막 줄은 반드시 `에이전트3_명령_마무리`
