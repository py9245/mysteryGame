# Judgement Prop Contracts

이 문서는 `QuestionJudgeBadge`, `AnswerJudgeBadge`, `SpectatorBanner`, `ResultsSummary`가 받는 공개 판정 입력을 고정한다.

## 1. 공통 원칙

- UI는 `publicReply`, `publicOutcome`, `publicSummary`만 직접 소비한다.
- `reasonCode`, `matchedRequiredKeywords`, `missingRequiredKeywords`, `matchedBonusKeywords`, `safetyFlags`, `logSummary`는 prop으로 받지 않는다.
- `manual_review`도 플레이어 화면에서는 `publicOutcome=needs_review` 수준까지만 보인다.

## 2. QuestionJudgeBadge

```ts
type QuestionJudgeBadgeProps = {
  resultKey: "stage.questionJudge.YES" | "stage.questionJudge.NO" | "stage.questionJudge.MAYBE" | "stage.questionJudge.IRRELEVANT";
  publicReply: "네, 그렇습니다." | "아니오, 그렇지 않습니다." | "그럴 수도 있습니다." | "중요하지 않습니다.";
  visibility: RoomSnapshot["visibility"];
  redacted: RoomSnapshot["redacted"];
};
```

- `resultKey`는 로컬 copy lookup key다.
- `publicReply`가 화면에 노출되는 유일한 판정 문장이다.
- 내부 `judgement`와 `reasonCode`는 받지 않는다.

## 3. AnswerJudgeBadge

```ts
type AnswerJudgeBadgeProps = {
  successKey: "stage.answerResult.success";
  failureKey: "stage.answerResult.failure";
  needsReviewKey: "review.answer.needsReview";
  publicOutcome: "correct" | "wrong" | "needs_review";
  visibility: RoomSnapshot["visibility"];
  redacted: RoomSnapshot["redacted"];
};
```

- `publicOutcome`은 `correct`, `wrong`, `needs_review` 셋만 허용한다.
- 내부 `result`와 keyword arrays는 받지 않는다.

## 4. SpectatorBanner

```ts
type SpectatorBannerProps = {
  titleKey: "stage.spectator.title";
  bodyKey: "stage.spectator.body";
  publicOutcome: "correct" | "wrong" | "needs_review" | null;
  publicSummary: string | null;
  viewMode: RoomSnapshot["viewMode"];
  me: RoomSnapshot["me"];
};
```

- `publicSummary`는 공개 로그의 첫 문장 또는 관전 전환 요약이다.
- `reasonCode`와 `keywords`는 받지 않는다.

## 5. ResultsSummary

```ts
type ResultsSummaryProps = {
  titleKey: "stage.results.title" | "game.results.title";
  summaryKey: "stage.results.summary" | "game.results.summary";
  publicSummary: string | null;
  publicOutcome: "correct" | "wrong" | "needs_review" | null;
  stage: RoomSnapshot["stage"];
  scores: RoomSnapshot["scores"];
  results: RoomSnapshot["results"];
};
```

- `publicSummary`는 공개 가능한 사건 해설이다.
- `ResultsSummary`는 `reasonCode`, keyword arrays, safety payload를 받지 않는다.

## 6. copy key 연결점

- `QuestionJudgeBadge` -> `stage.questionJudge.*`
- `AnswerJudgeBadge` -> `stage.answerResult.*`, `review.answer.needsReview`
- `SpectatorBanner` -> `stage.spectator.*`
- `ResultsSummary` -> `stage.results.*`, `game.results.*`

## 7. Agent 1 안정화 포인트

- `publicReply`는 질문 판정 UI의 최종 안정화 필드다.
- `publicOutcome`은 정답 판정 UI의 최종 안정화 필드다.
- `publicSummary`는 관전 및 결과 화면의 공개 서술 안정화 필드다.
- 내부 payload와 공개 payload는 분리된 상태로 유지돼야 한다.

## 8. Agent 3 확인 포인트

- Agent 3는 copy pack에서 `stage.questionJudge.*`, `stage.answerResult.*`, `review.answer.needsReview`, `stage.spectator.*`, `stage.results.*`, `game.results.*`만 채우면 된다.
- `publicReply`와 `publicOutcome`은 key lookup 결과로만 렌더링한다.
- `publicSummary`는 공개 해설 슬롯에서만 온다.
