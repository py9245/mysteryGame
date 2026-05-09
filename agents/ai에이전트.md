# AI 에이전트 시작 문서

## 목적

이 문서는 `Agent 1`, `Agent 2`, `Agent 3`가 `시작해!`라는 짧은 명령만 받아도 자기 역할과 다음 작업을 바로 해석하도록 만드는 `에이전트 시작 문서`다.

중요:

- `PM 전용 문서`는 `/home/yusin/mysteryGame/app/pm` 아래에 모아뒀다.
- 에이전트는 `기본적으로 /app/pm 폴더를 읽지 않는다.`
- 에이전트는 `자기 폴더 안 문서만` 먼저 읽는다.

---

## 공통 시작 규칙

모든 에이전트는 `시작해!`를 받으면 아래 순서대로 행동한다.

1. 현재 폴더명으로 자기 역할을 판정한다.
2. 이 문서를 끝까지 읽는다.
3. 자기 역할 섹션의 `전용 참조 문서 절대 경로`를 순서대로 읽는다.
4. 자기 폴더의 `CURRENT_STATUS.md`에서 맨 위 미완료 작업 1개를 고른다.
5. 그 작업만 수행한다.
6. 작업이 끝나면 자기 `WORK_PROTOCOL.md` 형식으로 보고한다.
7. 마지막 줄은 자기 상태 신호로 정확히 끝낸다.

---

## 공통 해석 기준

1. 게임은 `6명 / 3팀 / 팀당 2명`이다.
2. 점수와 정답 성공의 진실 원본은 `개인`이다.
3. 비로그인 사용자는 `랜덤 닉네임`으로 입장하고 수정할 수 없다.
4. 로그인 사용자는 `email / password / age / nickname` 기반 자체 계정을 쓴다.
5. 방은 `공개방 / 비밀방 / 연습모드`를 지원한다.
6. 연습모드는 `1인`, `1스테이지`, `외부 입장 불가`를 강제한다.
7. 룰북은 `메인 / 대기방 / 게임중`에서 항상 모달로 열 수 있어야 한다.
8. 질문방은 `서버 FIFO 대기열 -> 자동 입장` 구조다.
9. 1:1 채팅은 `전화형 요청-선택-수락` 구조다.

---

## 공통 금지사항

1. 자기 소유 영역 밖 파일을 먼저 수정하지 않는다.
2. 공통 계약을 바꿔야 하면 구현보다 먼저 보고한다.
3. 내부 용어 `sample`, `bootstrap`, `roomId`, `playerId`, `command`를 플레이어 UI에 노출하지 않는다.
4. 마지막 줄 상태 신호 없이 보고를 끝내지 않는다.

---

## PM 전용 문서 위치

아래 문서는 `PM 전용 원본`이다.

- [README.md](/home/yusin/mysteryGame/app/pm/README.md)
- [AGENT_COMMAND_PROTOCOL.md](/home/yusin/mysteryGame/app/pm/AGENT_COMMAND_PROTOCOL.md)
- [AGENT_PROGRESS_LEDGER.md](/home/yusin/mysteryGame/app/pm/AGENT_PROGRESS_LEDGER.md)
- [PM_PARALLEL_EXECUTION_PLAN.md](/home/yusin/mysteryGame/app/pm/PM_PARALLEL_EXECUTION_PLAN.md)
- [SHARED_CONTRACTS.md](/home/yusin/mysteryGame/app/pm/SHARED_CONTRACTS.md)
- [CLOUDFLARE_DEPLOYMENT.md](/home/yusin/mysteryGame/app/pm/CLOUDFLARE_DEPLOYMENT.md)
- [SUPABASE_SETUP.md](/home/yusin/mysteryGame/app/pm/SUPABASE_SETUP.md)

에이전트는 이 문서들을 기본 읽기 목록으로 삼지 않는다.

---

## Agent 1

### 역할

`Platform / Backend Owner`

### 역할 판정 기준

현재 폴더가 `/home/yusin/mysteryGame/app/agents/agent-1-platform-backend`이면 Agent 1이다.

### 전용 참조 문서 절대 경로

1. [WORK_PROTOCOL.md](/home/yusin/mysteryGame/app/agents/agent-1-platform-backend/WORK_PROTOCOL.md)
2. [SHARED_CONTEXT.md](/home/yusin/mysteryGame/app/agents/agent-1-platform-backend/SHARED_CONTEXT.md)
3. [CURRENT_STATUS.md](/home/yusin/mysteryGame/app/agents/agent-1-platform-backend/CURRENT_STATUS.md)
4. [PLAN.md](/home/yusin/mysteryGame/app/agents/agent-1-platform-backend/PLAN.md)
5. [README.md](/home/yusin/mysteryGame/app/agents/agent-1-platform-backend/README.md)
6. [backend-integration-checklist.md](/home/yusin/mysteryGame/app/agents/agent-1-platform-backend/docs/backend-integration-checklist.md)
7. [ai-judgement-flow.md](/home/yusin/mysteryGame/app/agents/agent-1-platform-backend/docs/ai-judgement-flow.md)
8. [ACTIVE_TASK.md](/home/yusin/mysteryGame/app/agents/agent-1-platform-backend/ACTIVE_TASK.md)
9. [LAST_REPORT.md](/home/yusin/mysteryGame/app/agents/agent-1-platform-backend/LAST_REPORT.md)

### 시작 후 바로 고를 작업 우선순위

1. `private chat backend 완성`
2. `investigation queue hardening`
3. `hint / inactivity penalty 자동화`
4. `operator review / override 실동작`
5. `실배포 backend 검증`

### 완료 정의

- private chat, investigation queue, hint/penalty, override, 실배포 검증까지 backend 기준으로 닫는다.

---

## Agent 2

### 역할

`Gameplay / Frontend Owner`

### 역할 판정 기준

현재 폴더가 `/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend`이면 Agent 2다.

### 전용 참조 문서 절대 경로

1. [WORK_PROTOCOL.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/WORK_PROTOCOL.md)
2. [SHARED_CONTEXT.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/SHARED_CONTEXT.md)
3. [CURRENT_STATUS.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/CURRENT_STATUS.md)
4. [PLAN.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/PLAN.md)
5. [README.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/README.md)
6. [SCREEN_SPEC.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/SCREEN_SPEC.md)
7. [API_EXPECTATIONS.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/API_EXPECTATIONS.md)
8. [MOCK_STATE.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/MOCK_STATE.md)
9. [STRUCTURE_INDEX.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/STRUCTURE_INDEX.md)
10. [ROUTE_TREE.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/ROUTE_TREE.md)
11. [FEATURE_TREE.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/FEATURE_TREE.md)
12. [STATE_SLICES.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/STATE_SLICES.md)
13. [COMPONENT_INVENTORY.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/COMPONENT_INVENTORY.md)
14. [COMPONENT_PROP_CONTRACTS.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/COMPONENT_PROP_CONTRACTS.md)
15. [JUDGEMENT_PROP_CONTRACTS.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/JUDGEMENT_PROP_CONTRACTS.md)
16. [VISIBILITY_UI_MAP.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/VISIBILITY_UI_MAP.md)
17. [ROOM_SNAPSHOT_BINDINGS.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/ROOM_SNAPSHOT_BINDINGS.md)
18. [CONNECTION_POINTS.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/CONNECTION_POINTS.md)
19. [INTEGRATION_CHECKLIST.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/INTEGRATION_CHECKLIST.md)
20. [UI_DIRECTION.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/UI_DIRECTION.md)
21. [ACTIVE_TASK.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/ACTIVE_TASK.md)
22. [LAST_REPORT.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/LAST_REPORT.md)

### 시작 후 바로 고를 작업 우선순위

1. `메인 / 인증 / 방 찾기 화면 마감`
2. `룰북 / 온보딩 모달 마감`
3. `40/40/20 gameplay 레이아웃 정리`
4. `private chat / queue UI 실연결`
5. `결과 / 전적 / 모바일 마감`

### 완료 정의

- 메인, 대기방, 게임중, 결과 화면이 서비스형으로 닫히고, 룰북/온보딩/queue/private chat 상태가 모두 명확해야 한다.

---

## Agent 3

### 역할

`AI / Admin / Content Owner`

### 역할 판정 기준

현재 폴더가 `/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content`이면 Agent 3다.

### 전용 참조 문서 절대 경로

1. [WORK_PROTOCOL.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/WORK_PROTOCOL.md)
2. [SHARED_CONTEXT.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/SHARED_CONTEXT.md)
3. [CURRENT_STATUS.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/CURRENT_STATUS.md)
4. [PLAN.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/PLAN.md)
5. [README.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/README.md)
6. [AI_PROVIDER_NOTES.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/AI_PROVIDER_NOTES.md)
7. [case-schema.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/docs/case-schema.md)
8. [judgement-contract.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/docs/judgement-contract.md)
9. [hint-policy.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/docs/hint-policy.md)
10. [admin-flow.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/docs/admin-flow.md)
11. [visibility-matrix.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/docs/visibility-matrix.md)
12. [copy-pack.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/docs/copy-pack.md)
13. [copy-key-map.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/docs/copy-key-map.md)
14. [view-model-boundary.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/docs/view-model-boundary.md)
15. [integration-checklist.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/docs/integration-checklist.md)
16. [ACTIVE_TASK.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/ACTIVE_TASK.md)
17. [LAST_REPORT.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/LAST_REPORT.md)

### 시작 후 바로 고를 작업 우선순위

1. `AI 판정 실사용 규격 마감`
2. `힌트 정책 / 결과 설명 마감`
3. `운영자 review / override 콘텐츠 마감`
4. `사건 품질 보강`
5. `최종 카피/온보딩 정제`

### 완료 정의

- AI prompt / schema / fallback, 힌트/결과 정책, 운영자 개입 문서, 사건 세트, 카피 슬롯이 모두 마감된다.

---

## PM이 실제로 보낼 최소 명령

각 에이전트 세션에는 아래 한 줄이면 충분하다.

```text
시작해!
```

더 명시적으로 보내려면:

```text
/home/yusin/mysteryGame/app/agents/ai에이전트.md 읽고 시작해!
```
