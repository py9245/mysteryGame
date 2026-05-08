# Component Prop Contracts

이 문서는 Agent 3의 copy key map을 Agent 2 UI 컴포넌트 prop 계약으로 번역한 문서다.

## 1. 공통 입력 규칙

- 모든 prop 계약은 `RoomSnapshot`을 source of truth로 삼는다.
- copy는 `copyKey`로 주입하고, 화면은 `copyValue` 또는 `copyPack`을 받아 렌더링한다.
- `public`, `self`, `redacted`, `ai_internal`, `not_visible_yet` 구분은 `visibility`와 `redacted`로 처리한다.
- copy key는 slot 이름을 바꾸지 않고 key만 교체하는 방식으로 유지한다.

## 2. 컴포넌트별 prop 계약

### `StageBriefingPanel`

```ts
type StageBriefingPanelProps = {
  viewMode: RoomSnapshot["viewMode"];
  stage: RoomSnapshot["stage"];
  me: RoomSnapshot["me"];
  titleKey: "stage.briefing.title";
  bodyKey: "stage.briefing.body";
};
```

- `titleKey`는 브리핑 헤드라인이다.
- `bodyKey`는 스테이지 요약 설명이다.

### `StageRuleBulletList`

```ts
type StageRuleBulletListProps = {
  rulesKey: "stage.briefing.rules[]";
  stage: RoomSnapshot["stage"];
};
```

- 규칙 목록은 bullet array로만 렌더링한다.

### `StageStartCountdown`

```ts
type StageStartCountdownProps = {
  labelKey: "stage.briefing.countdownLabel";
  remainingSeconds: number;
};
```

### `HintRail`

```ts
type HintRailProps = {
  itemsKey: "stage.hint.items[]";
  visibleHints: RoomSnapshot["stage"]["visibleHints"];
  visibility: RoomSnapshot["visibility"];
};
```

- `items.player`는 플레이어용 문구다.
- `items.admin`는 표시하지 않고 metadata로만 보관한다.
- `items.strength`와 `items.triggerType`은 hint grouping 기준이다.

### `QuestionJudgeBadge`

```ts
type QuestionJudgeBadgeProps = {
  resultKey: "stage.questionJudge.YES" | "stage.questionJudge.NO" | "stage.questionJudge.MAYBE" | "stage.questionJudge.IRRELEVANT";
  visibility: RoomSnapshot["visibility"];
  redacted: RoomSnapshot["redacted"];
};
```

- `resultKey`는 공개 문구만 선택한다.
- 내부 판단값은 prop으로 넘기지 않는다.

### `QuestionComposer`

```ts
type QuestionComposerProps = {
  helperTextKey: "stage.questionJudge.helperText";
  remainingQuestionCount: number;
  visibility: RoomSnapshot["visibility"];
};
```

### `AnswerJudgeBadge`

```ts
type AnswerJudgeBadgeProps = {
  successKey: "stage.answerResult.success";
  failureKey: "stage.answerResult.failure";
  needsReviewKey: "review.answer.needsReview";
  visibility: RoomSnapshot["visibility"];
  redacted: RoomSnapshot["redacted"];
};
```

### `AnswerComposer`

```ts
type AnswerComposerProps = {
  helperTextKey: "stage.answerResult.helperText";
  remainingAnswerAttemptCount: number;
  visibility: RoomSnapshot["visibility"];
};
```

### `SpectatorBanner`

```ts
type SpectatorBannerProps = {
  titleKey: "stage.spectator.title";
  bodyKey: "stage.spectator.body";
  viewMode: RoomSnapshot["viewMode"];
  me: RoomSnapshot["me"];
  stage: RoomSnapshot["stage"];
};
```

### `SolvedLockSummary`

```ts
type SolvedLockSummaryProps = {
  titleKey: "stage.spectator.lockTitle";
  stage: RoomSnapshot["stage"];
  me: RoomSnapshot["me"];
};
```

### `ProgressLogFeed`

```ts
type ProgressLogFeedProps = {
  titleKey: "stage.spectator.logTitle";
  stage: RoomSnapshot["stage"];
  visibility: RoomSnapshot["visibility"];
};
```

### `StageResultsSummary`

```ts
type StageResultsSummaryProps = {
  titleKey: "stage.results.title";
  summaryKey: "stage.results.summary";
  personalDeltaLabelKey: "stage.results.personalDeltaLabel";
  solveOrderLabelKey: "stage.results.solveOrderLabel";
  stage: RoomSnapshot["stage"];
  scores: RoomSnapshot["scores"];
};
```

### `GameResultsSummary`

```ts
type GameResultsSummaryProps = {
  titleKey: "game.results.title";
  summaryKey: "game.results.summary";
  results: RoomSnapshot["results"];
  scores: RoomSnapshot["scores"];
  stage: RoomSnapshot["stage"];
};
```

### `RankingTable`

```ts
type RankingTableProps = {
  titleKey: "game.results.rankingTitle";
  scores: RoomSnapshot["scores"];
  results: RoomSnapshot["results"];
};
```

### `PersonalScoreBreakdown`

```ts
type PersonalScoreBreakdownProps = {
  titleKey: "game.results.personalScoreTitle";
  scores: RoomSnapshot["scores"];
  me: RoomSnapshot["me"];
};
```

### `PrivacyMask`

```ts
type PrivacyMaskProps = {
  otherPlayerNameKey: "privacy.otherPlayerName";
  otherScoreKey: "privacy.otherScore";
  visibility: RoomSnapshot["visibility"];
  redacted: RoomSnapshot["redacted"];
};
```

### `RedactedField`

```ts
type RedactedFieldProps = {
  labelKey: "privacy.redactedLabel";
  visibility: RoomSnapshot["visibility"];
  redacted: RoomSnapshot["redacted"];
};
```

### `RedactedPlayerRow`

```ts
type RedactedPlayerRowProps = {
  labelKey: "privacy.redactedPlayerRow";
  visibility: RoomSnapshot["visibility"];
  redacted: RoomSnapshot["redacted"];
};
```

### `ScoreCard`

```ts
type ScoreCardProps = {
  totalLabelKey: "score.totalLabel";
  score: RoomSnapshot["scores"][number] | RoomSnapshot["me"];
  visibility: RoomSnapshot["visibility"];
};
```

### `ScoreDeltaBadge`

```ts
type ScoreDeltaBadgeProps = {
  labelKey: "score.deltaLabel";
  delta: number;
  visibility: RoomSnapshot["visibility"];
};
```

## 3. slot to key summary

- briefing -> `stage.briefing.*`
- hint -> `stage.hint.*`
- question judgement -> `stage.questionJudge.*`
- answer result -> `stage.answerResult.*`
- spectator -> `stage.spectator.*`
- results stage -> `stage.results.*`
- results game -> `game.results.*`
- review -> `review.*`
- privacy -> `privacy.*`
- score -> `score.*`

## 4. Agent 1 확인 포인트

- `RoomSnapshot`에서 위 prop에 들어갈 필드가 빠지지 않아야 한다.
- `visibility`와 `redacted`는 prop 레벨에서 삭제하지 않는다.
- `results`는 게임 종료 전 `null`일 수 있다.
- `score`는 스테이지 중 `self` 노출과 결과 화면 전체 공개를 동시에 처리할 수 있어야 한다.

## 5. Agent 3 확인 포인트

- `stage.briefing.*`, `stage.hint.*`, `stage.questionJudge.*`, `stage.answerResult.*`, `stage.spectator.*`, `stage.results.*`, `game.results.*`, `review.*`, `privacy.*`, `score.*` key를 유지한다.
- copy key는 UI slot과 1:1 관계를 유지한다.
- admin copy는 `admin.*`로 분리하되 Agent 2 플레이어 UI에는 직접 주입하지 않는다.
