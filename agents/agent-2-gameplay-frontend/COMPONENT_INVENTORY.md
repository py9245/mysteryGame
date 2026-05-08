# Component Inventory

## 1. 공통 원칙

- 화면별 컴포넌트와 재사용 컴포넌트를 분리한다.
- `privacy` 컴포넌트는 어떤 화면에서도 항상 우선 적용한다.
- `score` 컴포넌트는 `me` 기반 데이터만 기본 입력으로 받는다.
- `RoomSnapshot`은 화면 입력의 기본 단위다.
- copy는 `copyKey`로, 화면 데이터는 `RoomSnapshot`으로 분리한다.
- judgement/result 계열은 `publicReply`, `publicOutcome`, `publicSummary`만 받는다.

## 2. 컴포넌트 목록

### Lobby

- `LobbyShell`
- `RoomCodeCard`
- `ReadyPanel`
- `PlayerRoster`
- `ConnectionPill`

### Briefing

- `StageBriefingPanel`
- `StageStartCountdown`
- `StageRuleBulletList`

### Gameplay

- `StageHUD`
- `CasePanel`
- `CaseImageFrame`
- `HintRail`
- `InvestigationEntryButton`
- `MyScoreCard`

### Investigation

- `InvestigationDrawer`
- `InvestigationLimitMeter`
- `QuestionComposer`
- `AnswerComposer`
- `QuestionJudgeBadge`
- `AnswerJudgeBadge`

### Spectator

- `SpectatorBanner`
- `SolvedLockSummary`
- `ProgressLogFeed`

### Results

- `StageResultsSummary`
- `GameResultsSummary`
- `RankingTable`
- `PersonalScoreBreakdown`

### Chat

- `ChatRail`
- `TeamChatPanel`
- `GlobalChatPanel`
- `ChatComposer`

### Privacy / Score

- `PrivacyMask`
- `RedactedField`
- `RedactedPlayerRow`
- `ScoreCard`
- `ScoreDeltaBadge`

## 3. 컴포넌트 연결 규칙

- `LobbyShell`은 `RoomSnapshot.viewMode`, `me`, `players`, `visibility`, `redacted`를 받는다.
- `StageHUD`는 `RoomSnapshot.stage`, `me`, `scores`, `visibility`를 받는다.
- `InvestigationDrawer`는 `RoomSnapshot.stage.investigation`, `stage.lastQuestionJudgement`, `stage.lastAnswerResult`, `visibility`를 받는다.
- `SpectatorBanner`는 `RoomSnapshot.viewMode`, `me.solvedLocked`, `stage.solvedPlayerIds`, `redacted`, `publicOutcome`, `publicSummary`를 받는다.
- `GameResultsSummary`는 `RoomSnapshot.results`, `scores`, `stage`, `redacted`, `publicSummary`를 받는다.
- `RedactedField`는 `redacted` 또는 `visibility`가 redacted/self가 아닌 필드를 렌더하지 않는다.

## 4. copy key slots

- `StageBriefingPanel.titleKey` -> `stage.briefing.title`
- `StageBriefingPanel.bodyKey` -> `stage.briefing.body`
- `StageRuleBulletList.rulesKey` -> `stage.briefing.rules[]`
- `StageStartCountdown.labelKey` -> `stage.briefing.countdownLabel`
- `HintRail.itemsKey` -> `stage.hint.items[]`
- `QuestionJudgeBadge.resultKey` -> `stage.questionJudge.*`
- `QuestionJudgeBadge.publicReply` -> `stage.questionJudge.*`
- `QuestionComposer.helperTextKey` -> `stage.questionJudge.helperText`
- `AnswerJudgeBadge.successKey` -> `stage.answerResult.success`
- `AnswerJudgeBadge.failureKey` -> `stage.answerResult.failure`
- `AnswerJudgeBadge.needsReviewKey` -> `review.answer.needsReview`
- `AnswerJudgeBadge.publicOutcome` -> `stage.answerResult.*`
- `AnswerComposer.helperTextKey` -> `stage.answerResult.helperText`
- `SpectatorBanner.titleKey` -> `stage.spectator.title`
- `SpectatorBanner.bodyKey` -> `stage.spectator.body`
- `SpectatorBanner.publicOutcome` -> `stage.answerResult.*`
- `SpectatorBanner.publicSummary` -> `stage.spectator.*`
- `SolvedLockSummary.titleKey` -> `stage.spectator.lockTitle`
- `ProgressLogFeed.titleKey` -> `stage.spectator.logTitle`
- `StageResultsSummary.*Key` -> `stage.results.*`
- `StageResultsSummary.publicSummary` -> `stage.results.*`
- `GameResultsSummary.*Key` -> `game.results.*`
- `GameResultsSummary.publicSummary` -> `game.results.*`
- `RankingTable.titleKey` -> `game.results.rankingTitle`
- `PersonalScoreBreakdown.titleKey` -> `game.results.personalScoreTitle`
- `PrivacyMask.otherPlayerNameKey` -> `privacy.otherPlayerName`
- `PrivacyMask.otherScoreKey` -> `privacy.otherScore`
- `RedactedField.labelKey` -> `privacy.redactedLabel`
- `RedactedPlayerRow.labelKey` -> `privacy.redactedPlayerRow`
- `ScoreCard.totalLabelKey` -> `score.totalLabel`
- `ScoreDeltaBadge.labelKey` -> `score.deltaLabel`
