# Agent 1 Plan

## 역할명

`Platform / Backend Owner`

---

## 선독 문서

작업 전에 반드시 아래 문서를 이 순서대로 읽는다.

1. [AGENT_COMMAND_PROTOCOL.md](/home/yusin/mysteryGame/app/AGENT_COMMAND_PROTOCOL.md)
2. [SHARED_CONTRACTS.md](/home/yusin/mysteryGame/app/SHARED_CONTRACTS.md)
3. [PLAN.md](/home/yusin/mysteryGame/app/agents/agent-1-platform-backend/PLAN.md)

---

## 1. 이 에이전트의 목표

이 에이전트는 게임의 `상태 진실 원본`을 만든다.

핵심 책임:

- 프로젝트 기본 구조
- Supabase 스키마
- 방 / 게임 / 스테이지 상태 관리
- 스테이지별 팀 배정 저장
- 개인 점수 이벤트 엔진
- 개인 정답 성공 처리
- 조사실 단독 입장 락
- 실시간 이벤트 발행

UI 완성도보다 `상태 일관성`이 우선이다.

---

## 2. 소유 영역

예정 소유 경로:

- `supabase/*`
- `src/server/*`
- `src/lib/supabase/*`
- `src/contracts/*`
- `src/app/api/room/*`
- `src/app/api/game/*`
- `src/app/api/chat/*`
- `src/app/api/private-chat/*`

이 에이전트는 기본적으로 아래 영역을 직접 수정하지 않는다.

- 플레이어 화면 UI
- 운영자 화면 UI
- AI 프롬프트 본문
- 사건 콘텐츠 문안

---

## 3. 1차 산출물

이 에이전트가 가장 먼저 내야 할 결과물:

1. 프로젝트 초기 구조안
2. Supabase 테이블 초안
3. 게임 / 스테이지 / 플레이어 상태 전이 로직
4. 개인 점수 이벤트 저장 방식
5. 조사실 락 처리 방식
6. 프론트엔드와 AI 모듈이 붙을 수 있는 API 계약

---

## 4. 단계별 작업

## Phase 0. 계약 수용

- [SHARED_CONTRACTS.md](/home/yusin/mysteryGame/app/SHARED_CONTRACTS.md)를 기준으로 엔티티를 고정한다.
- `ScoreEvent`, `StageTeamAssignment`, `PlayerStageState`, `InvestigationLock`을 코드 기준 진실 원본으로 삼는다.
- `개인 점수`와 `개인 정답 성공` 구조를 백엔드에서 먼저 강제한다.
- 조사실은 lock session 단위로 `질문 3회 / 정답 1회` 제한을 강제하고, 새로 잠그면 카운터를 0으로 초기화한다.
- Agent 2가 바로 화면을 붙일 수 있도록 `RoomSnapshot`은 `viewMode`, `me`, `visibility`, `redacted`를 포함한 UI view model로 다룬다.
- 질문/정답 판정은 `public payload`와 `internal payload`를 분리하고, manual review / operator override는 별도 레코드로 남긴다.

## Phase 1. 기반 구축

- Supabase 마이그레이션 초안 작성
- 핵심 테이블 정의
- 서버 환경 변수 계약 정의
- 점수 이벤트 누적 구조 정의
- 실시간 채널 전략 정의

필수 테이블 후보:

- `rooms`
- `players`
- `team_slots`
- `games`
- `stages`
- `stage_team_assignments`
- `player_stage_states`
- `questions`
- `answer_attempts`
- `score_events`
- `chat_messages`
- `investigation_locks`
- `hint_reveals`
- `private_chat_requests`
- `private_chat_sessions`
- `admin_logs`
- `src/server/game/bootstrap.ts`
- `src/contracts/view.ts`
- `src/contracts/judgement.ts`
- `docs/ai-judgement-flow.md`

## Phase 2. 1차 MVP 구현

- 방 생성
- 닉네임 기반 입장
- 준비완료 상태 관리
- 6인 참여 시 팀 배정
- 스테이지 시작 브리핑
- 서버 기준 타이머
- 조사실 락 획득 / 해제
- 입장당 질문 3회 / 정답 1회 제한
- 질문 저장
- 정답 시도 저장
- 개인 점수 이벤트 반영
- 개인 정답 성공 시 `solved_locked` 전환
- 조사실 lock session별 질문 3회 / 정답 1회 제한 및 재입장 초기화
- command response마다 `snapshot`을 같이 내려 UI가 서버 상태를 한 번에 다시 그릴 수 있게 한다
- AI 판정은 public outcome과 internal audit payload를 분리 저장한다
- 정답자 2명 또는 시간 만료 시 종료
- 스테이지 결과 집계

## Phase 3. 확장 구현

- 3스테이지 루프
- 스테이지별 팀 재배정 저장
- 힌트 공개 트리거
- 개인 누적 순위 계산
- 1:1 채팅 신청 / 수락 / 종료 구조
- 운영자 수동 개입용 API 제공

---

## 5. 보고/종료 신호 규칙

이 에이전트는 모든 작업 응답에서 [AGENT_COMMAND_PROTOCOL.md](/home/yusin/mysteryGame/app/AGENT_COMMAND_PROTOCOL.md)의 보고 형식을 지켜야 한다.

필수 규칙:

- 모든 작업은 PM이 준 `TASK_ID`를 그대로 사용한다.
- 응답 마지막 줄에는 아래 신호 중 하나만 단독으로 둔다.
- 신호 아래에 다른 설명을 붙이지 않는다.

이 에이전트의 신호:

- 완료: `에이전트1_명령_마무리`
- 작업 보류: `에이전트1_명령_보류`
- PM 검토 요청: `에이전트1_검토요청`
- 공유 계약 변경 요청: `에이전트1_계약변경요청`

완료 보고에는 반드시 아래가 포함되어야 한다.

1. `변경 파일`
2. `구현/설계 내용`
3. `테스트/검증`
4. `리스크`
5. `다음 에이전트 handoff`

---

## 6. Agent 2와의 인터페이스

Agent 2가 필요로 하는 것:

- 방 상태 조회 형식
- 준비완료 / 팀 배정 결과 형식
- 현재 스테이지 상태 조회
- 본인 점수 조회
- 본인 플레이어 상태 조회
- 조사실 입장 가능 여부
- 질문 제출 API
- 정답 제출 API
- 결과 화면용 자기 통계와 최종 랭킹 형식
- 채팅 / 1:1 채팅 API 또는 실시간 채널 형식

이 에이전트는 Agent 2가 더미 UI를 붙일 수 있게 `응답 JSON 형식`을 먼저 고정해서 넘겨야 한다.

---

## 7. Agent 3와의 인터페이스

Agent 3가 필요로 하는 것:

- 사건 데이터 저장 형식
- 질문 판정 호출 지점
- 정답 판정 호출 지점
- 힌트 공개 트리거 지점
- 운영자 로그 저장 위치
- 수동 판정 반영 지점

이 에이전트는 AI 모듈을 교체 가능하게 `AI adapter interface`를 분리해서 제공하는 것이 좋다.

---

## 8. 기술 원칙

1. 점수는 반드시 `개인 ScoreEvent` 기반으로 계산한다.
2. 팀은 협력 단위일 뿐 점수의 진실 원본이 아니다.
3. 조사실 락은 반드시 서버에서 보장한다.
4. 타이머는 클라이언트 시간이 아니라 서버 종료 시각 기준으로 계산한다.
5. 정답 성공 플레이어만 `solved_locked`로 격리한다.
6. 나중에 3스테이지 확장과 팀 재배정이 쉬운 구조여야 한다.

---

## 9. 완료 기준

- 한 방에 6명 입장이 가능하다.
- 준비완료 후 3팀 배정이 가능하다.
- 스테이지 시작 / 종료가 서버 상태로 제어된다.
- 조사실 동시 입장을 막을 수 있다.
- 질문 / 정답 요청을 기록한다.
- 점수가 개인 기준으로 재현 가능하게 누적된다.
- 정답 성공 플레이어만 격리된다.
- 운영자 개입용 저장 구조가 있다.

---

## 10. 첫 지시문 템플릿

이 문구를 Agent 1 Codex 계정에 그대로 주면 된다.

```text
당신은 Mystery Time 프로젝트의 Agent 1이다.
역할은 Platform / Backend Owner다.
반드시 app/AGENT_COMMAND_PROTOCOL.md, app/SHARED_CONTRACTS.md, app/agents/agent-1-platform-backend/PLAN.md를 먼저 읽고 시작해라.
이번 작업에서는 DB 스키마, 플레이어 상태 전이, 개인 점수 이벤트 구조, 조사실 락, 스테이지별 팀 배정 구조를 우선 다뤄라.
플레이어 UI, 운영자 UI, 프롬프트 본문은 건드리지 마라.
작업 후에는 변경 파일, 구현 내용, 테스트/검증, 남은 리스크, 다음 에이전트 handoff를 보고해라.
응답 마지막 줄은 반드시 상태에 맞는 신호로 끝내라.
```
