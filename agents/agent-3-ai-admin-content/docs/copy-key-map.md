# Copy Key Map

이 문서는 Agent 2가 바로 주입할 수 있도록 copy를 `slot/key` 단위로 고정한 매핑표다.

## 1. key 설계 원칙

- key는 `.`로 구분된 경로형 문자열을 사용한다.
- 각 key는 하나의 UI slot 또는 하나의 의미 단위를 대표한다.
- 플레이어용 copy와 운영자용 copy는 같은 그룹 안에서도 분리한다.
- Agent 1은 저장 시 `category`, `channel`, `visibility`를 같이 보관한다.

## 2. 공통 key 규칙

- `stage.briefing.*`
- `stage.hint.*`
- `stage.questionJudge.*`
- `stage.answerResult.*`
- `stage.spectator.*`
- `stage.results.*`
- `game.results.*`
- `review.*`
- `admin.*`

## 3. slot to key 매핑

### Briefing

- `StageBriefingPanel.title` -> `stage.briefing.title`
- `StageBriefingPanel.body` -> `stage.briefing.body`
- `StageRuleBulletList.items[]` -> `stage.briefing.rules[]`
- `StageStartCountdown.label` -> `stage.briefing.countdownLabel`

### Hint

- `HintRail.items[].player` -> `stage.hint.items[].player`
- `HintRail.items[].admin` -> `stage.hint.items[].admin`
- `HintRail.items[].strength` -> `stage.hint.items[].strength`
- `HintRail.items[].triggerType` -> `stage.hint.items[].triggerType`

### Question Judge

- `QuestionJudgeBadge.YES` -> `stage.questionJudge.YES`
- `QuestionJudgeBadge.NO` -> `stage.questionJudge.NO`
- `QuestionJudgeBadge.MAYBE` -> `stage.questionJudge.MAYBE`
- `QuestionJudgeBadge.IRRELEVANT` -> `stage.questionJudge.IRRELEVANT`
- `QuestionComposer.helperText` -> `stage.questionJudge.helperText`

### Answer Result

- `AnswerJudgeBadge.success` -> `stage.answerResult.success`
- `AnswerJudgeBadge.failure` -> `stage.answerResult.failure`
- `AnswerJudgeBadge.needsReview` -> `review.answer.needsReview`
- `AnswerComposer.helperText` -> `stage.answerResult.helperText`

### Spectator

- `SpectatorBanner.title` -> `stage.spectator.title`
- `SpectatorBanner.body` -> `stage.spectator.body`
- `SolvedLockSummary.title` -> `stage.spectator.lockTitle`
- `ProgressLogFeed.title` -> `stage.spectator.logTitle`

### Stage Results

- `StageResultsSummary.title` -> `stage.results.title`
- `StageResultsSummary.summary` -> `stage.results.summary`
- `StageResultsSummary.personalDeltaLabel` -> `stage.results.personalDeltaLabel`
- `StageResultsSummary.solveOrderLabel` -> `stage.results.solveOrderLabel`

### Game Results

- `GameResultsSummary.title` -> `game.results.title`
- `GameResultsSummary.summary` -> `game.results.summary`
- `RankingTable.title` -> `game.results.rankingTitle`
- `PersonalScoreBreakdown.title` -> `game.results.personalScoreTitle`

### Privacy / Score

- `PrivacyMask.otherPlayerName` -> `privacy.otherPlayerName`
- `PrivacyMask.otherScore` -> `privacy.otherScore`
- `RedactedField.label` -> `privacy.redactedLabel`
- `RedactedPlayerRow.label` -> `privacy.redactedPlayerRow`
- `ScoreCard.totalLabel` -> `score.totalLabel`
- `ScoreDeltaBadge.label` -> `score.deltaLabel`

### Review / Admin

- `manualReview.notice` -> `review.notice`
- `manualReview.adminNotice` -> `admin.manualReviewNotice`
- `admin.questionHold` -> `admin.questionHold`
- `admin.answerHold` -> `admin.answerHold`
- `admin.scoreAdjustment` -> `admin.scoreAdjustment`
- `admin.hintForce` -> `admin.hintForce`
- `admin.stageClose` -> `admin.stageClose`

## 4. 1:1 주입 지점 정리

- `StageBriefingPanel`는 `stage.briefing.title`, `stage.briefing.body`
- `StageRuleBulletList`는 `stage.briefing.rules[]`
- `StageStartCountdown`는 `stage.briefing.countdownLabel`
- `HintRail`는 `stage.hint.items[]`
- `QuestionJudgeBadge`는 `stage.questionJudge.*`
- `AnswerJudgeBadge`는 `stage.answerResult.*`
- `SpectatorBanner`는 `stage.spectator.*`
- `StageResultsSummary`는 `stage.results.*`
- `GameResultsSummary`는 `game.results.*`
- `PrivacyMask`는 `privacy.*`
- `RedactedField`는 `privacy.redactedLabel`
- `ScoreCard`는 `score.*`

## 5. Agent 1 전달용 category 메모

- `category=briefing`는 스테이지 시작 전 공개 문구다.
- `category=hint`는 시간 경과나 트리거에 따라 공개되는 문구다.
- `category=judgement.question`은 플레이어 질문 판정 결과다.
- `category=judgement.answer`는 정답 결과와 검토 문구다.
- `category=spectator`는 solved 상태와 관전 전환 문구다.
- `category=results.stage`는 스테이지 종료 요약이다.
- `category=results.game`는 게임 종료 요약이다.
- `category=review`는 manual_review 공개 문구다.
- `category=admin`는 운영자 전용 문구다.

## 6. Agent 2 연결 메모

- Agent 2는 slot 이름을 바꾸지 말고 key만 주입받는다.
- 화면별 summary 컴포넌트가 최상위 copy 소유자가 된다.
- `manual_review`는 플레이어에게 `review.notice`만 보여주고, 내부 사유는 숨긴다.
- `publicOutcome`은 `stage.answerResult.*`와 같이 요약형 key로만 쓰고 내부 필드는 받지 않는다.
