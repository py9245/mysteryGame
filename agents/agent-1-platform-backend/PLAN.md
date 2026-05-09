# Agent 1 Plan

## 역할명

`Platform / Backend Owner`

---

## 선독 문서

작업 전에 반드시 아래 문서를 이 순서대로 읽는다.

1. [ai에이전트.md](/home/yusin/mysteryGame/app/agents/ai에이전트.md)
2. [WORK_PROTOCOL.md](/home/yusin/mysteryGame/app/agents/agent-1-platform-backend/WORK_PROTOCOL.md)
3. [SHARED_CONTEXT.md](/home/yusin/mysteryGame/app/agents/agent-1-platform-backend/SHARED_CONTEXT.md)
4. [CURRENT_STATUS.md](/home/yusin/mysteryGame/app/agents/agent-1-platform-backend/CURRENT_STATUS.md)
5. [PLAN.md](/home/yusin/mysteryGame/app/agents/agent-1-platform-backend/PLAN.md)

`시작해!`라는 짧은 명령만 받아도 먼저 [ai에이전트.md](/home/yusin/mysteryGame/app/agents/ai에이전트.md)를 기준으로 현재 역할, 참조 문서, 남은 작업 순서를 해석해야 한다.
`/home/yusin/mysteryGame/app/pm` 아래 문서는 PM 전용 원본이므로 기본 읽기 대상에서 제외한다.

---

## 1. 이 에이전트의 목표

이 에이전트는 게임의 `상태 진실 원본`을 만든다.

핵심 책임:

- 프로젝트 기본 구조
- Supabase 스키마
- 자체 로그인 / 세션 / 계정 프로필
- 비로그인 랜덤 닉네임 정책
- 방 목록 / 검색 / 비밀번호 검증
- 공개방 / 비밀방 / 연습모드 제약
- 방 / 게임 / 스테이지 상태 관리
- 스테이지별 팀 배정 저장
- 개인 점수 이벤트 엔진
- 개인 정답 성공 처리
- 조사실 대기열 / 단독 사용 세션
- 실시간 이벤트 발행

UI 완성도보다 `상태 일관성`이 우선이다.

---

## 2. 소유 영역

예정 소유 경로:

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
3. 계정 / 세션 / 방 목록 계약
4. 게임 / 스테이지 / 플레이어 상태 전이 로직
5. 개인 점수 이벤트 저장 방식
6. 조사실 대기열 / 사용 세션 처리 방식
7. 프론트엔드와 AI 모듈이 붙을 수 있는 API 계약

---

## 4. 단계별 작업

## Phase 0. 계약 수용

- [SHARED_CONTEXT.md](/home/yusin/mysteryGame/app/agents/agent-1-platform-backend/SHARED_CONTEXT.md)를 기준으로 엔티티를 고정한다.
- `ScoreEvent`, `StageTeamAssignment`, `PlayerStageState`, `InvestigationLock`, `InvestigationQueueEntry`를 코드 기준 진실 원본으로 삼는다.
- 비로그인 사용자는 `랜덤 닉네임`을 자동 발급받고 수정할 수 없다는 계약을 서버에서 보장한다.
- 로그인 사용자는 `email / password / age / nickname` 기반 자체 계정으로 다룬다.
- 방 모드는 `public / secret / practice` 셋으로 고정한다.
- 연습모드는 `stageCount = 1`, `maxPlayers = 1`, 외부 입장 불가를 서버에서 강제한다.
- `개인 점수`와 `개인 정답 성공` 구조를 백엔드에서 먼저 강제한다.
- 조사실은 `대기열 -> 자동 입장 -> 세션 종료 -> 다음 입장` 구조로 운영한다.
- 조사실 세션 단위로 `질문 3회 / 정답 1회` 제한을 강제하고, 새로 입장하면 카운터를 0으로 초기화한다.
- 세션 종료 후 같은 플레이어는 `5초` 뒤에만 다시 대기열에 들어갈 수 있다.
- 1:1 채팅은 `요청 -> 15초 응답 대기 -> 선택/수락/거절/만료 -> 세션 시작 -> 30초 뒤 퇴장 가능 -> 종료 후 10초 쿨다운` 구조로 다룬다.
- Agent 2가 바로 화면을 붙일 수 있도록 `RoomSnapshot`은 `viewMode`, `me`, `visibility`, `redacted`를 포함한 UI view model로 다룬다.
- 질문/정답 판정은 `public payload`와 `internal payload`를 분리하고, manual review / operator override는 별도 레코드로 남긴다.

## Phase 1. 기반 구축

- Supabase 마이그레이션 초안 작성
- 핵심 테이블 정의
- 서버 환경 변수 계약 정의
- 계정 / 세션 / 프로필 저장 구조 정의
- 룸 디렉터리 / 제목 검색 / 비밀번호 검증 계약 정의
- 점수 이벤트 누적 구조 정의
- 실시간 채널 전략 정의

필수 테이블 후보:

- `account_users`
- `account_sessions`
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
- `investigation_queue_entries`
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
- 비로그인 랜덤 닉네임 발급
- 자체 회원가입 / 로그인 / 로그아웃
- 로그인 사용자 닉네임 수정
- 전적 조회용 계정-게임 연결
- 방 목록 조회 / 제목 검색 / 필터
- 비밀방 비밀번호 검증 입장
- 연습모드 생성 및 제약 강제
- 방 설정 수정 API
- 준비완료 상태 관리
- 6인 참여 시 팀 배정
- 스테이지 시작 브리핑
- 서버 기준 타이머
- 조사실 대기열 진입 / 이탈 / 자동 입장 / 해제
- 입장당 질문 3회 / 정답 1회 제한
- 질문 저장
- 정답 시도 저장
- 개인 점수 이벤트 반영
- 개인 정답 성공 시 `solved_locked` 전환
- 조사실 session별 질문 3회 / 정답 1회 제한 및 재입장 초기화
- 1:1 채팅 요청 / 선택 / 수락 / 거절 / 만료 / 종료
- command response마다 `snapshot`을 같이 내려 UI가 서버 상태를 한 번에 다시 그릴 수 있게 한다
- AI 판정은 public outcome과 internal audit payload를 분리 저장한다
- 정답자 2명 또는 시간 만료 시 종료
- 스테이지 결과 집계

## Phase 3. 확장 구현

- 3스테이지 루프
- 스테이지별 팀 재배정 저장
- 힌트 공개 트리거
- 개인 누적 순위 계산
- 1:1 채팅 busy / 동시 요청 / 선택 처리 고도화
- 조사실 대기열 우선순위 / abuse control 고도화
- 운영자 수동 개입용 API 제공

---

## 5. 보고/종료 신호 규칙

이 에이전트는 모든 작업 응답에서 [WORK_PROTOCOL.md](/home/yusin/mysteryGame/app/agents/agent-1-platform-backend/WORK_PROTOCOL.md)의 보고 형식을 지켜야 한다.

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

- 현재 ViewerSession 형식
- 게스트 / 로그인 상태 플래그
- 룸 디렉터리 조회 형식
- 공개방 / 비밀방 / 연습모드 표시 형식
- 비밀방 비밀번호 오류 응답 형식
- 방 설정 수정 API
- 방 상태 조회 형식
- 준비완료 / 팀 배정 결과 형식
- 현재 스테이지 상태 조회
- 본인 점수 조회
- 본인 플레이어 상태 조회
- 조사실 대기열 진입 가능 여부
- 조사실 대기열 순번 / 자동 입장 상태
- 질문 제출 API
- 정답 제출 API
- 결과 화면용 자기 통계와 최종 랭킹 형식
- 채팅 / 1:1 채팅 API 또는 실시간 채널 형식
- 1:1 채팅 요청 목록 / 응답 가능 시간 / 최소 통화 유지 시간 형식

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
3. 비로그인 사용자의 랜덤 닉네임은 서버가 진실 원본으로 보장한다.
4. 연습모드 제약은 프론트가 아니라 서버가 강제한다.
5. 조사실 대기열과 사용 세션은 반드시 서버에서 보장한다.
6. 타이머는 클라이언트 시간이 아니라 서버 종료 시각 기준으로 계산한다.
7. 정답 성공 플레이어만 `solved_locked`로 격리한다.
8. 나중에 3스테이지 확장과 팀 재배정이 쉬운 구조여야 한다.

---

## 9. 완료 기준

- 한 방에 6명 입장이 가능하다.
- 비로그인 사용자가 랜덤 닉네임으로 입장한다.
- 로그인 사용자가 자체 계정으로 입장한다.
- 공개방 / 비밀방 / 연습모드 제약이 서버에서 강제된다.
- 준비완료 후 3팀 배정이 가능하다.
- 스테이지 시작 / 종료가 서버 상태로 제어된다.
- 조사실 동시 입장을 막을 수 있다.
- 조사실 대기열이 FIFO로 동작한다.
- 같은 플레이어가 5초 쿨다운 없이 재진입하지 못한다.
- 질문 / 정답 요청을 기록한다.
- 1:1 채팅이 요청 / 선택 / 수락 / 거절 / 만료 / 종료 규칙대로 기록된다.
- 점수가 개인 기준으로 재현 가능하게 누적된다.
- 정답 성공 플레이어만 격리된다.
- 운영자 개입용 저장 구조가 있다.

---

## 10. 첫 지시문 템플릿

이 문구를 Agent 1 Codex 계정에 그대로 주면 된다.

```text
당신은 Mystery Time 프로젝트의 Agent 1이다.
역할은 Platform / Backend Owner다.
반드시 app/agents/ai에이전트.md, app/agents/agent-1-platform-backend/WORK_PROTOCOL.md, app/agents/agent-1-platform-backend/SHARED_CONTEXT.md, app/agents/agent-1-platform-backend/CURRENT_STATUS.md, app/agents/agent-1-platform-backend/PLAN.md를 먼저 읽고 시작해라.
이번 작업에서는 DB 스키마, 플레이어 상태 전이, 개인 점수 이벤트 구조, 조사실 대기열/사용 세션, 1:1 채팅 상태기, 스테이지별 팀 배정 구조를 우선 다뤄라.
비로그인 랜덤 닉네임, 자체 로그인, 방 모드/비밀번호/연습모드 제약도 같은 우선순위로 다뤄라.
플레이어 UI, 운영자 UI, 프롬프트 본문은 건드리지 마라.
작업 후에는 변경 파일, 구현 내용, 테스트/검증, 남은 리스크, 다음 에이전트 handoff를 보고해라.
응답 마지막 줄은 반드시 상태에 맞는 신호로 끝내라.
```
