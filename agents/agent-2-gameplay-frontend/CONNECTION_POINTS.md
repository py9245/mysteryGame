# Connection Points

## 1. Agent 1 API 연결점

Agent 1이 주면 바로 붙일 API 포인트:

- `RoomSnapshot.viewMode`
- `RoomSnapshot.me`
- `RoomSnapshot.visibility`
- `RoomSnapshot.redacted`
- `RoomSnapshot.players`
- `RoomSnapshot.stage`
- `RoomSnapshot.scores`
- `RoomSnapshot.room`
- `RoomSnapshot.game`
- `RoomSnapshot.teamSlots`
- `RoomSnapshot.currentAssignments`
- `RoomSnapshot.playerStates`
- `RoomSnapshot.activeLock`
- `RoomSnapshot.privateChat`
- `RoomSnapshot.results`
- 실시간 이벤트 구독 payload

## 2. Agent 3 copy / hint 연결점

Agent 3가 주면 바로 붙일 copy 포인트:

- 스테이지 브리핑 문구
- 공개 힌트 문구
- 질문 판정 문구
- 정답 판정 문구
- 결과 화면 공개 설명
- 운영자 복구 안내 문구
- 검토 중 안내 문구
- copy pack slot map
- publicReply / publicOutcome / publicSummary copy pack

## 3. 화면별 연결 매핑

### Lobby

- Agent 1: room state, readiness
- Agent 3: 없음

### Briefing

- Agent 1: stage status
- Agent 3: briefing copy, hint copy

### Gameplay

- Agent 1: case state, timer, chat, score
- Agent 3: hint payload, visibility copy

### Investigation

- Agent 1: lock state, question/answer endpoints
- Agent 3: question judge labels, answer judge labels

### Spectator

- Agent 1: solved lock state, stage progress
- Agent 3: result copy

### Results

- Agent 1: final ranking, summary data
- Agent 3: public answer summary, result copy

## 4. visibility matrix 반영 규칙

- `PrivacyMask`는 Agent 3가 정의한 비공개 경계를 최우선으로 적용한다.
- `RedactedField`는 `manual_review`, 비공개 점수, 비공개 제출 원문 같은 단일 필드를 축약한다.
- `SpectatorBanner`는 `publicOutcome`만 노출하고 내부 reasonCode는 숨긴다.
- `ResultsSummary`는 공개 가능한 사건 해설만 받고, 전체 판정 원문은 받지 않는다.
- `QuestionJudgeBadge`와 `AnswerJudgeBadge`는 Agent 3의 문구를 그대로 받되, 내부 판정 세부값은 props로 넘기지 않는다.

## 5. copy key slot 메모

- `StageBriefingPanel`은 `stage.briefing.title/body`를 직접 받는다.
- `HintRail`은 `stage.hint.items[]`를 받으며 `player/admin/strength/triggerType` 슬롯을 분리한다.
- `QuestionJudgeBadge`는 `stage.questionJudge.*`와 `publicReply`만 받고 내부 reasonCode를 받지 않는다.
- `AnswerJudgeBadge`는 `stage.answerResult.*`, `review.answer.needsReview`, `publicOutcome`만 받고 AI 내부 판정은 받지 않는다.
- `SpectatorBanner`는 `stage.spectator.*`와 `publicSummary`만 받고 관전 전환에 필요한 최소 문구만 렌더한다.
- `StageResultsSummary`와 `GameResultsSummary`는 각각 `stage.results.*`, `game.results.*`, `publicSummary`만 받는다.
- `PrivacyMask`와 `RedactedField`는 `privacy.*` key를 받는다.
- `ScoreCard`와 `ScoreDeltaBadge`는 `score.*` key를 받는다.

## 5. RoomSnapshot to UI shortcut

- `viewMode` -> screen routing / state gating
- `me` -> personal panels / ready / score / spectator state
- `visibility` -> privacy layer defaults
- `redacted` -> fallback label source
- `players` -> roster / team board
- `stage` -> gameplay / investigation / spectator / results
- `scores` -> my score card / ranking / summary
