# Judgement Contract

이 문서는 질문 판정과 정답 판정의 계약을 정의한다.

## 1. 질문 판정 계약

질문 판정은 반드시 다음 4개 타입 중 하나로 정규화된다.

- `네, 그렇습니다.`
- `아니오, 그렇지 않습니다.`
- `그럴 수도 있습니다.`
- `중요하지 않습니다.`

### 입력

- `caseId`
- `stageNumber`
- `playerId`
- `teamSlotId`
- `questionText`
- `conversationContext`
- `visibilityContext`

### 출력

- `judgement`
- `reasonCode`
- `publicReply`
- `publicSummary`
- `manualReviewRequired`
- `safetyFlags`
- `logSummary`

### 판단 규칙

- 메타 질문은 `중요하지 않습니다.`로 처리할 수 있다.
- 단일 사실 질문은 가능하면 명확한 yes/no로 수렴한다.
- 사실과 거짓이 섞이면 `그럴 수도 있습니다.`를 사용한다.
- 질문이 사건 해결에 무관하면 `중요하지 않습니다.`를 사용한다.

## 2. 정답 판정 계약

정답 판정은 내부적으로 구조화된 JSON으로 남긴다.

### 출력

- `result`: `accepted | rejected | ambiguous | manual_review`
- `publicOutcome`: `correct | wrong | needs_review`
- `matchedRequiredKeywords`
- `missingRequiredKeywords`
- `matchedBonusKeywords`
- `reasonCode`
- `publicSummary`
- `needsOperatorOverride`

### 판단 규칙

- 필수 키워드가 모두 충족되어야 `accepted`가 가능하다.
- 키워드는 단순 포함이 아니라 맥락 일치까지 본다.
- 모호하지만 가능성 있는 답변은 `ambiguous`로 남긴다.
- AI가 확신하지 못하면 `manual_review`로 넘긴다.

## 3. 공개 범위

- 플레이어에게는 `correct` 또는 `wrong` 같은 제한된 결과만 노출한다.
- 운영자에게는 이유 코드와 키워드 매칭 결과까지 보여준다.
- 사건 원문 전체는 운영자 내부에서만 유지한다.

## 4. Agent 1 전달 메모

- `QuestionJudgement`는 `publicReply`와 `manualReviewRequired`를 분리해 저장한다.
- `AnswerResult`는 `publicOutcome`과 `needsOperatorOverride`를 분리해 저장한다.
- `manual_review` 상태는 내부 상태이고, 플레이어 공개 상태는 `needs_review`에 가깝게 축약한다.
- 운영자 필드인 `reasonCode`, `matchedRequiredKeywords`, `missingRequiredKeywords`, `matchedBonusKeywords`는 기본 공개 대상이 아니다.
- Agent 1 저장 envelope의 `publicPayload.publicSummary`는 질문/정답 모두에서 필수로 채운다.
- 질문 응답의 `publicSummary`는 `publicReply`와 함께 UI 요약으로 내려간다.

## 5. Agent 2 public-facing field memo

- 질문 카드: `publicReply`, `publicSummary`
- 정답 카드: `publicOutcome`, `publicSummary`
- 검토 카드: `needs_review` 또는 `운영자 확인이 필요합니다.`
- 결과 카드: `publicSummary`, `stageSummary`, `gameSummary`
- 운영자 내부 필드: `reasonCode`, `safetyFlags`, `matchedRequiredKeywords`, `missingRequiredKeywords`, `matchedBonusKeywords`, `logSummary`
