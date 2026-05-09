# Agent 2 Plan

## 역할명

`Gameplay / Frontend Owner`

---

## 선독 문서

작업 전에 반드시 아래 문서를 이 순서대로 읽는다.

1. [ai에이전트.md](/home/yusin/mysteryGame/app/agents/ai에이전트.md)
2. [WORK_PROTOCOL.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/WORK_PROTOCOL.md)
3. [SHARED_CONTEXT.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/SHARED_CONTEXT.md)
4. [CURRENT_STATUS.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/CURRENT_STATUS.md)
5. [README.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/README.md)
6. [SCREEN_SPEC.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/SCREEN_SPEC.md)
7. [API_EXPECTATIONS.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/API_EXPECTATIONS.md)
8. [MOCK_STATE.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/MOCK_STATE.md)
9. [STRUCTURE_INDEX.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/STRUCTURE_INDEX.md)
10. [COMPONENT_PROP_CONTRACTS.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/COMPONENT_PROP_CONTRACTS.md)
11. [JUDGEMENT_PROP_CONTRACTS.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/JUDGEMENT_PROP_CONTRACTS.md)
12. [INTEGRATION_CHECKLIST.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/INTEGRATION_CHECKLIST.md)
13. [UI_DIRECTION.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/UI_DIRECTION.md)
14. [PLAN.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/PLAN.md)

`시작해!`라는 짧은 명령만 받아도 먼저 [ai에이전트.md](/home/yusin/mysteryGame/app/agents/ai에이전트.md)를 기준으로 현재 역할, 참조 문서, 남은 작업 순서를 해석해야 한다.
`/home/yusin/mysteryGame/app/pm` 아래 문서는 PM 전용 원본이므로 기본 읽기 대상에서 제외한다.

---

## 1. 이 에이전트의 목표

이 에이전트는 플레이어가 실제로 게임을 `보면서 이해하고 조작하는 경험`을 만든다.

핵심 책임:

- 메인 페이지 / 로그인 / 회원가입 / 전적 UI
- 방 목록 / 검색 / 필터 / 비밀번호 모달
- 방 설정 모달
- 룰북 모달
- 대기실 / 준비완료 화면
- 팀 배정 화면
- 메인 게임 화면
- 조사실 화면
- 정답 성공 후 개인 관전 화면
- 결과 화면
- 메인 게임 `40 / 40 / 20` 레이아웃
- 개인 점수 노출 규칙
- 비공개 정보 차단 규칙

가장 중요한 기준은 `현재 게임 상태가 틀리지 않게 보이는 것`이다.

이번 라운드의 추가 기준은 `기능을 유지하면서 서비스처럼 보이게 만드는 것`이다.

---

## 2. 소유 영역

예정 소유 경로:

- `src/app/(player)/*`
- `src/features/home-entry/*`
- `src/features/auth-ui/*`
- `src/components/*`
- `src/features/lobby/*`
- `src/features/gameplay/*`
- `src/features/chat-ui/*`
- `src/features/private-chat-ui/*`
- `src/features/results/*`
- `docs/*` 또는 이 폴더의 스펙 문서
- 이 폴더의 구조 스캐폴드 문서
- `VISIBILITY_UI_MAP.md`
- `COMPONENT_PROP_CONTRACTS.md`
- `JUDGEMENT_PROP_CONTRACTS.md`
- `INTEGRATION_CHECKLIST.md`

이 에이전트는 기본적으로 아래 영역을 직접 수정하지 않는다.

- DB 스키마
- 서버 점수 로직
- 조사실 락 서버 규칙
- AI 프롬프트
- 사건 원문 데이터
- 운영자 전용 로직

---

## 2. 최신 기획 해석

이 폴더의 구현 기준은 최신 기획과 [SHARED_CONTEXT.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/SHARED_CONTEXT.md)를 따른다.

1. 점수와 정답 성공의 진실 원본은 `개인`이다.
2. 팀은 협력, 채팅, 시각적 배치 단위다.
3. 스테이지 중에는 `본인 점수`만 보여준다.
4. 다른 플레이어의 질문 내용, 정답 시도 내용, 오답 여부는 보여주지 않는다.
5. 정답 성공한 플레이어는 즉시 관전 상태로 전환한다.
6. 게임 종료 후에만 전체 개인 순위와 공개 가능한 정답 설명을 보여준다.
7. 메인 게임 화면은 `왼쪽 40 / 가운데 40 / 오른쪽 20` 구조를 기본으로 한다.
8. 오른쪽 20%는 `질문방 / 1:1 채팅 / 본인 점수 / 상태`를 모은 utility rail이다.
9. 1:1 채팅은 `전화형 요청-선택-수락` UX를 기준으로 본다.
10. 조사실은 `대기열 진입 -> 자동 입장` UX를 기준으로 본다.
11. 비로그인 상태에서는 랜덤 닉네임만 보여주고 수정 UI를 주지 않는다.
12. 로그인 상태에서는 닉네임 수정과 전적 확인 UI를 제공한다.
13. 방 만들기는 `공개방 / 비밀방 / 연습모드` 셋으로 시작한다.
14. 메인 / 대기방 / 게임중 화면 모두 룰북 모달 진입점을 가져야 한다.
15. route tree, feature tree, component inventory, state slices 문서를 먼저 맞추고 구현으로 들어간다.
16. visibility matrix를 UI 책임과 copy 책임으로 번역한 뒤 구현으로 들어간다.
17. publicReply / publicOutcome / publicSummary는 judgment/result UI의 유일한 공개 입력이다.
18. 공유 app 루트 반입 전에는 integration checklist로 우선순위를 고정한다.

---

## 3. 1차 산출물

이 에이전트가 가장 먼저 내야 할 결과물:

1. 대기실 화면 구조
2. 메인 페이지 / 인증 / 룸 디렉터리 구조
3. 방 설정 모달 구조
4. 룰북 모달 구조
5. 준비완료 상태 구조
6. 팀 배정 화면 구조
7. 메인 게임 화면 구조
8. 조사실 UI 구조
9. 우측 utility rail 구조
10. 정답 성공 후 관전 화면 구조
11. 결과 화면 구조
12. 개인 점수 노출 규칙
13. 비공개 정보 차단 규칙
14. 실시간 상태를 붙일 수 있는 컴포넌트 경계

---

## 4. 단계별 작업

## Phase 0. 계약 수용

- [SHARED_CONTEXT.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/SHARED_CONTEXT.md)를 읽고 UI에 필요한 상태값을 정리한다.
- [SCREEN_SPEC.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/SCREEN_SPEC.md)를 읽고 화면 전이와 차단 규칙을 먼저 맞춘다.
- `개인 점수`, `개인 정답 성공`, `자기 정보만 우선 노출` 규칙을 UI 기준으로 고정한다.
- `게스트 랜덤 닉네임`, `로그인 전적`, `공개방/비밀방/연습모드`, `룰북 모달` 진입점을 UI 계약으로 먼저 고정한다.

## Phase 1. UI 뼈대

- 메인 페이지 shell
- 로그인 / 회원가입 / 게스트 진입 카드
- 방 목록 / 필터 / 제목 검색 패널
- 비밀방 비밀번호 모달
- 방 만들기 패널
- 방 설정 모달
- 메인 룰북 모달
- 대기실 화면
- 대기방 룰북 모달
- 준비완료 버튼
- 팀 배정 결과 영역
- 메인 레이아웃
- 메인 게임 `40 / 40 / 20` 3열 구조
- 왼쪽 40%의 `이미지 70 / 요약 30` 구조
- 가운데 40%의 `전체채팅 상단 / 팀채팅-전체채팅 하단` 구조
- 오른쪽 20% utility rail
- 팀 채팅 / 전체 채팅 패널
- 개인 점수 / 타이머 패널
- 조사실 대기열 진입 버튼 / 순번 패널
- 1:1 채팅 신청 / 수신 요청 목록 / 통화 상태 패널
- 힌트 영역
- 게임중 룰북 모달
- 관전 배너
- 결과 화면 기본 레이아웃
- 구조 스캐폴드의 placeholder 경로를 반영한 파일 배치 초안
- visibility matrix 반영 책임 분리
- judgement/result public payload 안정화

## Phase 2. 1차 MVP 연결

- 비로그인 랜덤 닉네임 표시
- 자체 로그인 / 회원가입 / 로그아웃 / 닉네임 수정
- 전적 / 최근 기록 노출
- 공개방 / 비밀방 / 연습모드 생성
- 방 목록 / 제목 검색 / 필터 연결
- 비밀방 비밀번호 입력 후 입장
- 방장 설정 모달 연결
- 방 상태 / 준비 상태 표시
- 현재 팀 / 다른 팀 목록 표시
- 사건 제목 / 설명 / 이미지 / 문제 표시
- 남은 시간 표시
- 본인 점수 표시
- 조사실 대기열 진입 / 자동 입장 / 퇴장 흐름
- 질문 입력창 / 정답 입력창
- 팀 채팅 / 전체 채팅 연결
- 1:1 채팅 신청 / 수락 / 거절 / 선택 / 만료 / 통화중 / 종료 상태 UI
- 정답 성공 시 본인만 관전 화면으로 전환
- 스테이지 종료 후 자기 지표 중심 결과 표시
- 공개 / 비공개 상태 마스크 적용

## Phase 3. 확장 UI

- 스테이지 시작 전 1분 브리핑 화면
- 스테이지 종료 후 팀 재배정 화면
- 1:1 채팅 전화형 상호작용 polish
- 힌트 공개 연출
- 3스테이지 누적 순위 화면
- 재접속 / 끊김 / 조사실 대기열 충돌 처리

---

## 5. 보고/종료 신호 규칙

이 에이전트는 모든 작업 응답에서 [WORK_PROTOCOL.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/WORK_PROTOCOL.md)의 보고 형식을 지켜야 한다.

필수 규칙:

- 모든 작업은 PM이 준 `TASK_ID`를 그대로 사용한다.
- 응답 마지막 줄에는 아래 신호 중 하나만 단독으로 둔다.
- 신호 아래에 다른 설명을 붙이지 않는다.

이 에이전트의 신호:

- 완료: `에이전트2_명령_마무리`
- 작업 보류: `에이전트2_명령_보류`
- PM 검토 요청: `에이전트2_검토요청`
- 공유 계약 변경 요청: `에이전트2_계약변경요청`

완료 보고에는 반드시 아래가 포함되어야 한다.

1. `변경 파일`
2. `구현/설계 내용`
3. `테스트/검증`
4. `리스크`
5. `다음 에이전트 handoff`

---

## 6. Agent 1에 요구하는 것

Agent 2가 막히지 않으려면 Agent 1이 먼저 아래를 넘겨야 한다.

- 현재 ViewerSession 형식
- 게스트 / 로그인 상태 플래그
- 방 목록 / 필터 / 검색 응답 형식
- 비밀방 입장 오류 형식
- 방 설정 수정 응답 형식
- 화면에 필요한 응답 JSON 형식
- 게임 상태값 목록
- 준비완료 / 팀 배정 / 팀 재배정 조회 방식
- 본인 점수 / 본인 상태 조회 방식
- 조사실 대기열 진입 / 이탈 / 현재 순번 / 자동 입장 API 계약
- 질문 제출 / 정답 제출 API 계약
- 결과 화면용 자기 통계 형식
- 채팅 / 1:1 채팅 송수신 방식
- 1:1 채팅 요청 목록 / 응답 가능 시간 / 최소 통화 유지 시간

화면은 API가 완성되기 전에도 더미 데이터로 먼저 만들어도 된다.

---

## 7. Agent 3에 요구하는 것

Agent 3가 먼저 넘겨야 하는 것:

- 로그인 / 비로그인 상태 문구
- 방 타입 / 비밀번호 / 룰북 카피
- 질문 판정 결과 표시 문구 기준
- 정답 판정 후 노출 문구 기준
- 사건 데이터 최소 표시 필드
- 힌트 데이터 구조
- 결과 화면에서 공개 가능한 설명 데이터 범위

특히 질문 판정은 UI가 아래 4개 상태만 렌더링할 수 있게 고정되어야 한다.

- `YES`
- `NO`
- `MAYBE`
- `IRRELEVANT`

---

## 8. UI 원칙

1. 현재 단계에서 가장 중요한 정보는 `시간`, `본인 점수`, `질문방 상태`, `1:1 채팅 상태`다.
2. 다른 플레이어의 점수는 스테이지 중 노출하지 않는다.
3. 다른 팀의 질문 내용과 정답 시도 내용은 절대 보이면 안 된다.
4. 정답 성공 플레이어는 `개인 관전 상태`로 전환되어야 한다.
5. 인터랙션이 실패했을 때 플레이어가 이유를 이해할 수 있어야 한다.
6. 메인 페이지, 대기방, 게임중 모두 룰북 모달 진입점이 눈에 띄게 있어야 한다.
7. 게스트에게 닉네임 수정 가능성처럼 보이는 UI를 보여주면 안 된다.
8. 화려함보다 상태 정확성이 우선이다.
9. mock state와 실제 상태는 같은 화면 경계를 공유해야 한다.
10. 이번 라운드의 시각 방향은 [UI_DIRECTION.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/UI_DIRECTION.md)를 따른다.
11. 로비 / gameplay / results는 공통 shell, panel, stat 패턴을 공유해야 한다.
12. 메인 게임 화면은 `왼쪽 사건 / 가운데 채팅 / 오른쪽 utility rail` 구조를 유지해야 한다.

---

## 9. 완료 기준

- 플레이어가 입장부터 결과 확인까지 UI만 보고 따라갈 수 있다.
- 메인 페이지에서 게스트 / 로그인 / 방 만들기 / 방 찾기 흐름이 혼동 없이 보인다.
- 비밀방 입장과 방 설정 모달이 자연스럽다.
- 메인 / 대기방 / 게임중 룰북 모달이 모두 동작한다.
- 준비완료 / 팀 배정 흐름이 자연스럽다.
- 조사실 대기열 흐름이 플레이어 입장에서 자연스럽다.
- 메인 게임 3열 구조가 한눈에 읽힌다.
- 본인 점수와 타이머가 실시간으로 보인다.
- 1:1 채팅 신청 / 수락 / 거절 / 선택 / 통화중 상태가 혼동 없이 보인다.
- 정답 성공 후 본인만 관전 상태로 분리된다.
- 스테이지 중 타인의 점수와 비공개 정보가 보이지 않는다.
- 에러 / 충돌 상황에서 빈 화면이 아니라 의미 있는 안내가 나온다.
- Agent 1 / Agent 3 연결점이 문서 기준으로 명확하다.
- privacy mask와 redacted field 책임이 컴포넌트별로 분리된다.
- publicReply / publicOutcome / publicSummary 외의 judgment payload는 UI 계약에서 배제된다.
- 실제 공유 app 루트 반입은 `INTEGRATION_CHECKLIST.md`의 순서대로 진행한다.

---

## 10. 첫 지시문 템플릿

이 문구를 Agent 2 Codex 계정에 그대로 주면 된다.

```text
당신은 Mystery Time 프로젝트의 Agent 2다.
역할은 Gameplay / Frontend Owner다.
반드시 app/agents/ai에이전트.md, app/agents/agent-2-gameplay-frontend/WORK_PROTOCOL.md, app/agents/agent-2-gameplay-frontend/SHARED_CONTEXT.md, app/agents/agent-2-gameplay-frontend/CURRENT_STATUS.md, app/agents/agent-2-gameplay-frontend/README.md, app/agents/agent-2-gameplay-frontend/SCREEN_SPEC.md, app/agents/agent-2-gameplay-frontend/API_EXPECTATIONS.md, app/agents/agent-2-gameplay-frontend/MOCK_STATE.md, app/agents/agent-2-gameplay-frontend/STRUCTURE_INDEX.md, app/agents/agent-2-gameplay-frontend/VISIBILITY_UI_MAP.md, app/agents/agent-2-gameplay-frontend/COMPONENT_PROP_CONTRACTS.md, app/agents/agent-2-gameplay-frontend/JUDGEMENT_PROP_CONTRACTS.md, app/agents/agent-2-gameplay-frontend/INTEGRATION_CHECKLIST.md, app/agents/agent-2-gameplay-frontend/UI_DIRECTION.md, app/agents/agent-2-gameplay-frontend/PLAN.md를 먼저 읽고 시작해라.
이번 작업에서는 대기실, 준비완료, 팀 배정 결과, 메인 게임 화면, 조사실 UI, 정답 성공 후 관전 화면, 결과 화면을 다뤄라.
DB 스키마, 서버 점수 로직, AI 프롬프트, 운영자 로직은 건드리지 마라.
작업 후에는 변경 파일, 구현 내용, 테스트/검증, 남은 리스크, 필요한 API 계약과 다음 에이전트 handoff를 보고해라.
응답 마지막 줄은 반드시 상태에 맞는 신호로 끝내라.
```
