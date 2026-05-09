# Agent Command Protocol

## 1. 목적

이 문서는 `PM인 나`가 `agent-1`, `agent-2`, `agent-3` Codex 세션을 병렬로 운용할 때 사용하는 `명령 전달 / 완료 감지 / 다음 지시 연계` 프로토콜이다.

핵심 목표는 3가지다.

1. 각 에이전트에게 `명확한 작업 패킷`으로 지시한다.
2. 각 에이전트가 작업 종료 여부를 `특정 텍스트 신호`로 반드시 알려준다.
3. PM은 그 신호와 보고 내용을 기반으로 다음 명령을 이어서 보낸다.

이 문서는 제품 기능 계약 문서가 아니라 `에이전트 운영 문서`다.  
제품 공통 계약은 [SHARED_CONTRACTS.md](/home/yusin/mysteryGame/app/pm/SHARED_CONTRACTS.md)를 따른다.

---

## 2. 기본 운영 원칙

- PM은 `spawn_agent` 같은 내장 서브에이전트를 쓰지 않는다.
- PM이 에이전트로 인정하는 것은 오직 `폴더별로 라우팅된 외부 codex CLI 세션` 3개뿐이다.
- 세 에이전트 세션은 반드시 아래 3개 폴더에서 시작한다.
  - `/home/yusin/mysteryGame/app/agents/agent-1-platform-backend`
  - `/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend`
  - `/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content`
- 각 터미널은 `codex` 실행 전에 반드시 `/home/yusin/mysteryGame/app/agents/.codex-session-router.sh`를 현재 셸에 적용해야 한다.
- 위 절차를 타지 않은 세션은 `계정 분리 보장 없는 잘못된 세션`으로 간주한다.
- 세 에이전트는 각각 `지속적인 Codex 대화 세션`을 유지한다.
- PM은 한 에이전트에 동시에 `활성 작업 1개`만 준다.
- 모든 작업에는 반드시 `TASK_ID`를 붙인다.
- 모든 응답은 `작업 보고 형식`을 지켜야 한다.
- 모든 완료/보류/검토요청 응답의 `마지막 줄`에는 지정된 신호 텍스트만 단독으로 둔다.
- 공유 계약 변경이 필요하면 구현보다 먼저 `계약변경요청 신호`를 보내야 한다.

### 2.1 세션 부팅 절차

각 에이전트는 아래 순서로만 기동한다.

```bash
cd /home/yusin/mysteryGame/app/agents/agent-1-platform-backend
source /home/yusin/mysteryGame/app/agents/.codex-session-router.sh
codex
```

```bash
cd /home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend
source /home/yusin/mysteryGame/app/agents/.codex-session-router.sh
codex
```

```bash
cd /home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content
source /home/yusin/mysteryGame/app/agents/.codex-session-router.sh
codex
```

검증 원칙:

- 각 세션은 서로 다른 계정의 `/status`가 보여야 한다.
- PM은 작업 시작 전에 `어떤 폴더의 codex 세션인지`를 먼저 확인한다.

---

## 3. TASK_ID 규칙

- Agent 1 작업 ID 예시: `A1-001`, `A1-002`
- Agent 2 작업 ID 예시: `A2-001`, `A2-002`
- Agent 3 작업 ID 예시: `A3-001`, `A3-002`

권장 규칙:

- 에이전트 번호 접두어를 유지한다.
- 한 번 쓴 ID는 재사용하지 않는다.
- 후속 수정도 새 작업으로 발급한다.

---

## 4. PM 명령 패킷 형식

PM은 각 에이전트에게 가능한 한 아래 형식으로만 지시한다.

```text
[TASK]
TASK_ID: A1-001
ROLE: Agent 1 / Platform Backend
READ_FIRST:
- app/pm/AGENT_COMMAND_PROTOCOL.md
- app/pm/SHARED_CONTRACTS.md
- app/agents/agent-1-platform-backend/PLAN.md

OBJECTIVE:
- 이번 작업의 목표

IN_SCOPE:
- 이번 작업에 포함되는 것

OUT_OF_SCOPE:
- 이번 작업에 포함되지 않는 것

DELIVERABLE:
- 작업 완료 시 남겨야 할 산출물

DEPENDENCY:
- 필요한 입력이 있으면 명시

REPORT_RULE:
- 아래 보고 형식을 지켜서 답할 것
- 마지막 줄에 신호 텍스트만 단독으로 둘 것
[/TASK]
```

---

## 5. 에이전트 응답 형식

모든 에이전트는 아래 형식으로 작업 결과를 보고한다.

```text
[AGENT_REPORT]
AGENT: Agent 1
TASK_ID: A1-001
STATUS: DONE

변경 파일:
- file/path

구현/설계 내용:
- 무엇을 했는지

테스트/검증:
- 무엇을 확인했는지

리스크:
- 남은 문제

다음 에이전트 handoff:
- Agent 2: 필요한 입력
- Agent 3: 필요한 입력

에이전트1_명령_마무리
```

원칙:

- `STATUS`와 마지막 줄 신호는 일치해야 한다.
- 마지막 줄에는 `신호 텍스트 외 다른 말`을 붙이지 않는다.
- 완료가 아니어도 반드시 같은 구조로 보고한다.

---

## 6. 상태 신호 표준

### Agent 1

- 완료: `에이전트1_명령_마무리`
- 작업 보류: `에이전트1_명령_보류`
- PM 검토 요청: `에이전트1_검토요청`
- 공유 계약 변경 요청: `에이전트1_계약변경요청`

### Agent 2

- 완료: `에이전트2_명령_마무리`
- 작업 보류: `에이전트2_명령_보류`
- PM 검토 요청: `에이전트2_검토요청`
- 공유 계약 변경 요청: `에이전트2_계약변경요청`

### Agent 3

- 완료: `에이전트3_명령_마무리`
- 작업 보류: `에이전트3_명령_보류`
- PM 검토 요청: `에이전트3_검토요청`
- 공유 계약 변경 요청: `에이전트3_계약변경요청`

---

## 7. 상태별 보고 규칙

### 7.1 완료

- `STATUS: DONE`
- 변경 파일, 구현 내용, 검증, 리스크, handoff를 모두 적는다.
- 마지막 줄은 `..._명령_마무리`

### 7.2 작업 보류

- `STATUS: BLOCKED`
- 왜 막혔는지 적는다.
- PM이나 다른 에이전트에게 무엇이 필요한지 적는다.
- 마지막 줄은 `..._명령_보류`

### 7.3 PM 검토 요청

- `STATUS: NEEDS_PM_REVIEW`
- 설계 선택지 또는 확인 포인트를 적는다.
- 구현을 어느 수준까지 마쳤는지 적는다.
- 마지막 줄은 `..._검토요청`

### 7.4 공유 계약 변경 요청

- `STATUS: CONTRACT_CHANGE_REQUEST`
- 왜 현재 계약으로는 진행이 안 되는지 적는다.
- 어떤 계약 항목을 어떻게 바꿔야 하는지 적는다.
- 마지막 줄은 `..._계약변경요청`

---

## 8. PM 관제 루프

PM은 아래 순서로 세 에이전트를 운용한다.

1. 각 에이전트에 `활성 작업 1개`만 보낸다.
2. 각 작업의 `TASK_ID`, 목표, 의존성을 기록한다.
3. 에이전트 응답의 `마지막 줄 신호`를 본다.
4. `..._명령_마무리`가 오면 보고 본문에서 변경 파일과 handoff를 읽는다.
5. handoff 내용을 바로 다음 명령 패킷에 반영한다.
6. `..._명령_보류`가 오면 해당 입력을 해결하거나 다른 에이전트에 선행 작업을 보낸다.
7. `..._계약변경요청`이 오면 구현을 멈추고 [SHARED_CONTRACTS.md](/home/yusin/mysteryGame/app/pm/SHARED_CONTRACTS.md)를 먼저 수정한다.
8. 수정된 계약은 세 에이전트 모두에게 다시 동기화한다.

핵심은 `신호를 기준으로 상태를 판정`하고, `보고 본문을 기준으로 다음 작업을 설계`하는 것이다.

---

## 9. 병렬 운영 방식

### 9.1 독립 작업 단계

서로 직접 막지 않는 일부터 병렬로 보낸다.

- Agent 1: DB / 상태 / API 계약
- Agent 2: 더미 데이터 기반 UI 뼈대
- Agent 3: 사건 스키마 / 프롬프트 / 운영 흐름

### 9.2 합류 작업 단계

다른 에이전트 출력이 필요한 순간부터 handoff 기반으로 잇는다.

예시:

- Agent 1이 API 응답 형식을 확정한다.
- Agent 2는 그 형식을 받아 UI 연결을 진행한다.
- Agent 3은 질문/정답 판정 결과 형식을 확정한다.
- Agent 1은 Agent 3 형식에 맞게 AI adapter를 연결한다.

### 9.3 통합 단계

세 에이전트가 각자 구현한 결과를 기준으로 PM이 다음 검증 작업을 나눈다.

- Agent 1: 상태/동기화 검증
- Agent 2: 플레이 흐름 검증
- Agent 3: AI/운영 복구 검증

---

## 10. 작업 재할당 규칙

- 한 에이전트가 두 번 연속 `보류` 신호를 보내면, PM은 작업 범위를 줄이거나 선행 의존성을 따로 떼어낸다.
- 한 작업이 공통 계약 변경을 요구하면, 다른 에이전트에게도 즉시 영향 범위를 공지한다.
- 에이전트는 자기 소유 영역 밖 수정을 시작하기 전에 반드시 PM 승인 또는 계약 변경을 요청한다.

---

## 11. 실제 사용 예시

### Agent 1에게 보내는 예시

```text
[TASK]
TASK_ID: A1-001
ROLE: Agent 1 / Platform Backend
READ_FIRST:
- app/pm/AGENT_COMMAND_PROTOCOL.md
- app/pm/SHARED_CONTRACTS.md
- app/agents/agent-1-platform-backend/PLAN.md

OBJECTIVE:
- Supabase 핵심 테이블 초안과 게임 상태 전이 구조를 문서 또는 코드로 잡아라.

IN_SCOPE:
- rooms, players, teams, games, stages, score_events
- 상태 enum

OUT_OF_SCOPE:
- 플레이어 UI
- 운영자 UI
- 프롬프트 본문

DELIVERABLE:
- 변경 파일
- 상태 전이 설명
- Agent 2와 Agent 3가 바로 쓸 수 있는 handoff

REPORT_RULE:
- 마지막 줄은 반드시 에이전트1_명령_마무리 또는 대응 신호여야 한다.
[/TASK]
```

### Agent 1의 올바른 종료 예시

```text
[AGENT_REPORT]
AGENT: Agent 1
TASK_ID: A1-001
STATUS: DONE

변경 파일:
- supabase/migrations/20260507_init.sql
- src/contracts/game.ts

구현/설계 내용:
- 상태 enum 정의
- 핵심 테이블 초안 작성

테스트/검증:
- 마이그레이션 문법 점검

리스크:
- 조사실 락 정책은 Agent 3의 운영 요구사항 반영이 추가로 필요

다음 에이전트 handoff:
- Agent 2: 상태값 waiting, ready, in_game, ended를 UI에서 사용 가능
- Agent 3: questions, answer_attempts 저장 구조를 참고해 AI 판정 결과 형식 정리 필요

에이전트1_명령_마무리
```

---

## 12. 금지 사항

- 신호 없이 작업이 끝났다고 말하지 않는다.
- 마지막 줄 신호 아래에 다른 문장을 추가하지 않는다.
- 공유 계약을 몰래 바꾸지 않는다.
- 소유 영역 밖 파일을 임의로 수정하지 않는다.
- handoff 없이 끝내지 않는다.
