# Frontend Integration Checklist

이 문서는 Agent 2 산출물을 실제 공유 `app` 루트에 반입해서 UI 구현을 시작할 때 사용하는 체크리스트다.

## 1. 시작 순서

1. `RoomSnapshot`을 기준 데이터로 고정한다.
2. `viewMode`별 라우트 가드와 화면 분기를 연결한다.
3. feature tree를 lobby / briefing / gameplay / investigation / spectator / results로 나눈다.
4. component inventory를 바탕으로 화면별 컴포넌트를 먼저 스캐폴드한다.
5. `COMPONENT_PROP_CONTRACTS.md`와 `JUDGEMENT_PROP_CONTRACTS.md`를 기준으로 prop 계약을 붙인다.
6. 마지막에 copy pack key를 주입한다.

## 2. 실제 구현 우선순위

### Priority 1: shell and routing

- `lobby`
- `room/[roomCode]`
- `stage/[stageNumber]/briefing`
- `stage/[stageNumber]/gameplay`

### Priority 2: state consumption

- `RoomSnapshot.viewMode`
- `RoomSnapshot.me`
- `RoomSnapshot.visibility`
- `RoomSnapshot.redacted`
- `RoomSnapshot.players`
- `RoomSnapshot.stage`
- `RoomSnapshot.scores`

### Priority 3: core gameplay components

- `LobbyShell`
- `ReadyPanel`
- `StageHUD`
- `CasePanel`
- `HintRail`
- `MyScoreCard`
- `InvestigationDrawer`

### Priority 4: transition states

- `SpectatorBanner`
- `SolvedLockSummary`
- `ProgressLogFeed`
- `StageResultsSummary`
- `GameResultsSummary`
- `RankingTable`

### Priority 5: privacy and judgement

- `PrivacyMask`
- `RedactedField`
- `RedactedPlayerRow`
- `QuestionJudgeBadge`
- `AnswerJudgeBadge`

## 3. Mock to real API 전환 순서

1. `MOCK_STATE.md`로 화면 상태를 먼저 고정한다.
2. `ROOM_SNAPSHOT_BINDINGS.md`로 각 필드가 들어갈 위치를 맞춘다.
3. `COMPONENT_PROP_CONTRACTS.md`로 컴포넌트 prop shape를 확정한다.
4. `JUDGEMENT_PROP_CONTRACTS.md`로 공개 판정 payload를 확정한다.
5. 실제 `RoomSnapshot` response를 붙인다.
6. realtime 이벤트를 추가한다.
7. mock fallback을 제거한다.

## 4. Agent 1 합류 지점

- `RoomSnapshot.viewMode`
- `RoomSnapshot.me`
- `RoomSnapshot.visibility`
- `RoomSnapshot.redacted`
- `RoomSnapshot.players`
- `RoomSnapshot.stage`
- `RoomSnapshot.scores`
- `RoomSnapshot.results`

Agent 1이 이 필드를 안정적으로 주면 UI는 raw backend state 없이 바로 붙을 수 있다.

## 5. Agent 3 합류 지점

- `stage.briefing.*`
- `stage.hint.*`
- `stage.questionJudge.*`
- `stage.answerResult.*`
- `stage.spectator.*`
- `stage.results.*`
- `game.results.*`
- `review.*`
- `privacy.*`
- `score.*`

Agent 3 copy pack은 `publicReply`, `publicOutcome`, `publicSummary`와 함께 이 key들로 주입한다.

## 6. blocker 메모

- `viewMode`가 없으면 라우트 가드와 화면 전환을 시작하지 않는다.
- `visibility`와 `redacted`가 없으면 privacy 레이어를 붙이지 않는다.
- `publicReply`, `publicOutcome`, `publicSummary`가 없으면 judgement/result 컴포넌트 렌더를 보류한다.
- `stage`, `scores`, `results` 중 하나라도 비면 gameplay / results 화면을 실데이터로 전환하지 않는다.
- `QuestionJudgeBadge`와 `AnswerJudgeBadge`에 내부 reason/keyword payload가 들어오면 계약 위반으로 본다.

## 7. dependency 메모

- `lobby`와 `briefing`은 Agent 1의 `RoomSnapshot`만으로 시작 가능하다.
- `gameplay`는 Agent 3의 briefing / hint copy가 들어오면 완성도가 높아진다.
- `investigation`은 Agent 1의 stage/investigation payload와 Agent 3의 judgement copy가 모두 필요하다.
- `spectator`와 `results`는 Agent 1의 `results`와 Agent 3의 `publicSummary`가 모두 필요하다.

## 8. 구현자가 바로 보는 한 줄 규칙

- 먼저 `RoomSnapshot`, 그다음 `viewMode`, 그다음 `component prop`, 마지막이 `copy key`다.
