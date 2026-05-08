# Visibility UI Map

이 문서는 Agent 3의 `visibility-matrix`를 Agent 2의 UI 컴포넌트 책임으로 번역한 문서다.

## 1. 공통 원칙

- 플레이어에게는 항상 `최소 표현`만 보여준다.
- 내부 판정 이유, 점수 상세 분해, 비공개 행동은 `PrivacyMask` 또는 `RedactedField`로 가린다.
- `manual_review` 상황도 플레이어에게는 진행 중 상태처럼 보이되 내부 큐는 숨긴다.
- 공개 가능한 copy는 각 화면의 최상위 summary 컴포넌트가 소유한다.
- `RoomSnapshot.visibility`와 `RoomSnapshot.redacted`를 기준으로 표시 여부를 결정한다.
- copy key는 `copyPack`에서 주입되며, slot별 key는 `copy-key-map`과 1:1로 대응한다.
- judgement/result UI는 `publicReply`, `publicOutcome`, `publicSummary`만 받는다.

## 2. 컴포넌트별 책임

### `PrivacyMask`

- 타 플레이어 점수와 비공개 행동을 가린다.
- 관전 상태 이전에는 `QuestionComposer`, `AnswerComposer`, `RedactedPlayerRow`를 함께 덮는다.
- 다른 플레이어의 질문/정답 영역이 렌더되더라도 원문이 드러나지 않게 한다.
- 비공개 정보가 표시될 가능성이 있는 화면에서는 기본 레이어로 항상 존재한다.

### `RedactedField`

- 한 필드 전체를 `비공개` 또는 `확인 필요` 상태로 축약한다.
- 점수, 제출 원문, 내부 reasonCode처럼 세부가 위험한 값을 한 줄로 축소한다.
- `publicOutcome`은 유지하되 내부 근거만 제거할 때 쓴다.

### `SpectatorBanner`

- 정답 성공 후 `관전 전환`을 명시한다.
- `정답을 맞혔습니다.`와 `이제 입력은 불가능합니다.` 같은 전환 copy를 소유한다.
- 관전 상태에서만 보이는 진행 로그의 머리말을 제공한다.

### `ResultsSummary`

- 스테이지 결과와 게임 결과의 공개 가능한 설명을 소유한다.
- `정답 성공 순서`, `공개 가능한 사건 요약`, `최종 개인 점수`를 보여준다.
- AI 내부 reasoning, 필수 키워드 전체 목록, 비공개 채팅 내용은 절대 직접 렌더링하지 않는다.

### `MyScoreCard`

- 내 점수와 내 점수 변화만 보여준다.
- 타인 점수는 이 컴포넌트의 책임이 아니다.

### `RankingTable`

- 게임 종료 후에만 전체 개인 순위를 보여준다.
- 종료 전에는 placeholder 상태만 허용한다.

### `QuestionJudgeBadge`

- `YES`, `NO`, `MAYBE`, `IRRELEVANT` 중 하나를 플레이어 문구로 바꾼다.
- 내부 judgement / reasonCode는 노출하지 않는다.

### `AnswerJudgeBadge`

- `정답`, `오답`, `운영자 확인이 필요합니다.` 중 하나를 보여준다.
- 검토 중일 때도 과도한 내부 정보는 숨긴다.

## 3. 화면별 copy 소유권

### Gameplay

- 소유: `StageHUD`, `CasePanel`, `HintRail`, `MyScoreCard`
- copy 책임: 사건 제목, 설명, 공개 힌트, 타이머, 내 점수 요약

### Investigation

- 소유: `InvestigationDrawer`, `QuestionComposer`, `AnswerComposer`, `QuestionJudgeBadge`, `AnswerJudgeBadge`
- copy 책임: 질문 입력 안내, 제출 제한, 판정 최소 표현, 검토 중 안내

### Spectator

- 소유: `SpectatorBanner`, `SolvedLockSummary`, `ProgressLogFeed`
- copy 책임: 관전 전환, 읽기 전용 안내, 공개 로그 머리말

### Results

- 소유: `StageResultsSummary`, `GameResultsSummary`, `RankingTable`, `PersonalScoreBreakdown`
- copy 책임: 종료 요약, 개인 성과, 공개 가능한 해설, 최종 순위

## 4. Agent 3 copy 주입 지점

- `StageBriefingPanel` <- 브리핑 문구
- `HintRail` <- 공개 힌트 문구
- `QuestionJudgeBadge` <- 질문 판정 문구
- `AnswerJudgeBadge` <- 정답 판정 문구
- `SpectatorBanner` <- 관전 전환 문구
- `StageResultsSummary` <- 스테이지 공개 설명
- `GameResultsSummary` <- 최종 공개 설명
- `PrivacyMask` <- privacy copy
- `RedactedField` <- review/privacy fallback copy
- `QuestionJudgeBadge.publicReply` <- `stage.questionJudge.*`
- `AnswerJudgeBadge.publicOutcome` <- `stage.answerResult.*`
- `SpectatorBanner.publicSummary` <- `stage.spectator.*`
- `ResultsSummary.publicSummary` <- `stage.results.*` / `game.results.*`

## 5. Agent 1 API 필드 위치 메모

- `viewMode` -> route guard, screen mode, `sessionSlice.screenMode`
- `me.isReady`, `me.connectionStatus` -> `ReadyPanel`, `ConnectionPill`
- `me.teamSlotId` -> `TeamAssignmentBoard`, `PlayerRoster`
- `me.totalScore`, `me.stageScore`, `me.solvedLocked` -> `MyScoreCard`, `SpectatorBanner`
- `visibility.players`, `visibility.scores` -> `PrivacyMask`, `RedactedPlayerRow`, `ScoreCard`
- `redacted.otherPlayers`, `redacted.otherScores` -> `RedactedField`, `RankingTable`
- `stage.publicTitle`, `stage.publicDescription`, `stage.imageUrl`, `stage.remainingSeconds` -> `StageHUD`, `CasePanel`
- `stage.visibleHints` -> `HintRail`
- `stage.investigation`, `stage.lastQuestionJudgement`, `stage.lastAnswerResult` -> `InvestigationDrawer`, `QuestionJudgeBadge`, `AnswerJudgeBadge`
- `scores` -> `ScoreCard`, `RankingTable`, `PersonalScoreBreakdown`
- `players` -> `PlayerRoster`, `TeamAssignmentBoard`, `RedactedPlayerRow`
- `results` -> `ResultsSummary`, `GameResultsSummary`
- `publicReply` -> `QuestionJudgeBadge`
- `publicOutcome` -> `AnswerJudgeBadge`, `SpectatorBanner`
- `publicSummary` -> `SpectatorBanner`, `ResultsSummary`

## 6. copy key / slot table

| Slot | Copy key | Owner |
| --- | --- | --- |
| `StageBriefingPanel.title` | `stage.briefing.title` | Agent 3 |
| `StageBriefingPanel.body` | `stage.briefing.body` | Agent 3 |
| `StageRuleBulletList.items[]` | `stage.briefing.rules[]` | Agent 3 |
| `StageStartCountdown.label` | `stage.briefing.countdownLabel` | Agent 3 |
| `HintRail.items[].player` | `stage.hint.items[].player` | Agent 3 |
| `HintRail.items[].admin` | `stage.hint.items[].admin` | Agent 1 / admin |
| `HintRail.items[].strength` | `stage.hint.items[].strength` | Agent 3 |
| `HintRail.items[].triggerType` | `stage.hint.items[].triggerType` | Agent 3 |
| `QuestionJudgeBadge.*` | `stage.questionJudge.*` | Agent 3 |
| `QuestionComposer.helperText` | `stage.questionJudge.helperText` | Agent 3 |
| `AnswerJudgeBadge.success` | `stage.answerResult.success` | Agent 3 |
| `AnswerJudgeBadge.failure` | `stage.answerResult.failure` | Agent 3 |
| `AnswerJudgeBadge.needsReview` | `review.answer.needsReview` | Agent 3 |
| `AnswerComposer.helperText` | `stage.answerResult.helperText` | Agent 3 |
| `SpectatorBanner.title/body` | `stage.spectator.*` | Agent 3 |
| `SolvedLockSummary.title` | `stage.spectator.lockTitle` | Agent 3 |
| `ProgressLogFeed.title` | `stage.spectator.logTitle` | Agent 3 |
| `StageResultsSummary.*` | `stage.results.*` | Agent 3 |
| `GameResultsSummary.*` | `game.results.*` | Agent 3 |
| `RankingTable.title` | `game.results.rankingTitle` | Agent 3 |
| `PersonalScoreBreakdown.title` | `game.results.personalScoreTitle` | Agent 3 |
| `PrivacyMask.*` | `privacy.*` | Agent 3 |
| `RedactedField.label` | `privacy.redactedLabel` | Agent 3 |
| `RedactedPlayerRow.label` | `privacy.redactedPlayerRow` | Agent 3 |
| `ScoreCard.totalLabel` | `score.totalLabel` | Agent 1 |
| `ScoreDeltaBadge.label` | `score.deltaLabel` | Agent 1 |
