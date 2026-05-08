# View Model Boundary

이 문서는 Agent 1이 확정한 view model 기준으로 Agent 3의 공개/비공개 문구와 copy를 맞추기 위한 기준표다.

## 1. StageView 기준

### 공개 가능 필드

- `stageId`
- `gameId`
- `roomId`
- `stageNumber`
- `status`
- `publicTitle`
- `publicDescription`
- `imageUrl`
- `remainingSeconds`
- `solvedPlayerIds`
- `endReason`
- `myTeamSlotId`
- `visibleHints`
- `investigation`
- `lastQuestionJudgement`
- `lastAnswerResult`

### redacted 필드

- `caseKey`
- `redacted.truth`
- `redacted.requiredKeywords`
- `redacted.bonusKeywords`
- `redacted.acceptedAnswerSummary`

### Agent 2 연결 메모

- `publicTitle` / `publicDescription`는 `StageBriefingPanel`과 `CasePanel`에서 그대로 쓴다.
- `visibleHints`는 `HintRail`이 순서대로 렌더링한다.
- `lastQuestionJudgement`와 `lastAnswerResult`는 `QuestionJudgeBadge`, `AnswerJudgeBadge`에만 전달한다.
- `redacted.*`는 플레이어 화면에서 원문 대신 축약 상태로만 보이게 한다.

## 2. InvestigationLockView 기준

### 공개 가능 필드

- `stageId`
- `roomId`
- `lockedByPlayerId`
- `lockedAt`
- `expiresAt`
- `remainingSeconds`
- `questionCountRemaining`
- `answerAttemptCountRemaining`
- `visibility`

### 숨김 규칙

- `lockedByPlayerId`는 본인이 아니면 축약 표시한다.
- `lockedAt`, `expiresAt`는 숫자/상태 중심으로만 보여주고 내부 계산 근거는 숨긴다.
- 제한 수치가 0이거나 만료되면 상태 문구로 축약한다.

### Agent 2 연결 메모

- `InvestigationDrawer`는 `remainingSeconds`, `questionCountRemaining`, `answerAttemptCountRemaining`만 핵심 지표로 받는다.
- `visibility`가 `redacted`면 다른 플레이어의 점유 상세는 가린다.
- 조사실 충돌은 copy로 설명하지 말고 상태 배지로만 드러낸다.

## 3. ScoreView 기준

### 공개 가능 필드

- `playerId`
- `total`
- `stageTotal`
- `lastEventAt`
- `eventCount`
- `visibility`
- `isMe`

### 공개 범위

- 스테이지 중에는 `isMe: true`인 값만 원문 숫자로 보여준다.
- 다른 플레이어의 `ScoreView`는 `redacted` 또는 요약 상태로 축약한다.
- 게임 종료 후에는 전체 순위에서 `total`을 공개할 수 있다.

### Agent 2 연결 메모

- `MyScoreCard`는 본인 `ScoreView`만 직접 사용한다.
- `RankingTable`은 게임 종료 후에만 `ScoreView.total`을 전체 공개한다.
- `ScoreCard`는 스테이지 중 개인 변화 요약을 보여주되 타인 수치는 숨긴다.

## 4. Judgement / Manual Review 대응

### 질문 판정

- `lastQuestionJudgement.publicReply` -> 플레이어 문구
- `reasonCode`, `safetyFlags` -> 운영자 내부
- `manualReviewRequired` -> 운영자 경고 배지

### 정답 판정

- `lastAnswerResult.publicOutcome` -> 플레이어 문구
- `needsOperatorOverride` -> 운영자 확인 필요 배지
- `matchedRequiredKeywords`, `missingRequiredKeywords`, `matchedBonusKeywords` -> 운영자 내부

### manual_review

- 플레이어는 `운영자 확인이 필요합니다.`만 본다.
- 운영자는 `manual_review 대기`와 함께 reason/키워드 매칭을 본다.
- Agent 2는 검토 중에도 UI 흐름이 끊기지 않게 `pending` 스타일로 보여준다.

## 5. Agent 1 전달 메모

- `public`은 UI가 즉시 그릴 수 있는 값이다.
- `self`는 본인에게만 원문 또는 숫자를 보여준다.
- `redacted`는 다른 플레이어 또는 미공개 상태다.
- `ai_internal`은 운영자나 검토 큐 전용이다.
- `not_visible_yet`은 아직 단계상 드러나면 안 되는 값이다.

## 6. Agent 2 주입 지점 재확인

- `StageBriefingPanel` <- `publicTitle`, `publicDescription`
- `HintRail` <- `visibleHints`
- `QuestionJudgeBadge` <- `lastQuestionJudgement.publicReply`
- `AnswerJudgeBadge` <- `lastAnswerResult.publicOutcome`
- `SpectatorBanner` <- `status`, `solvedPlayerIds`, `endReason`
- `StageResultsSummary` <- `stageNumber`, `endReason`, `visibleHints`, `public summary`
- `GameResultsSummary` <- `ScoreView.total`, final ranking, public explanation
