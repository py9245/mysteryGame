# Integration Checklist

이 문서는 Agent 3 산출물을 공용 app 루트와 운영 플로우에 반입할 때의 순서, blocker, 합류 지점을 정리한다.

## 1. 반입 순서

1. `schemas/` 확정
2. `prompts/` 확정
3. `data/cases/` 확정
4. `data/copy-pack.json` / `data/copy-key-map.json` 확정
5. `docs/judgement-contract.md` / `docs/view-model-boundary.md` 확정
6. `docs/copy-pack.md` / `docs/copy-key-map.md` 확정
7. `docs/integration-checklist.md`를 기준으로 Agent 1 저장 contract에 합류
8. Agent 2 UI 주입 지점에 copy/key를 연결

## 2. 구현 우선순위

### P0

- 질문 판정 schema
- 정답 판정 schema
- 질문 judgement enum `YES | NO | MAYBE | IRRELEVANT`
- `publicReply` / `publicOutcome` / `publicSummary` 정렬
- `manualReviewRequired` / `needsOperatorOverride` 분리
- JSON parse 실패 시 1회 재시도 후 manual review 전환
- `copy-key-map.json`의 slot/key 확정

### P1

- `data/cases/` 3개 샘플 사건
- `data/copy-pack.json`
- `docs/view-model-boundary.md`
- `docs/visibility-matrix.md`

### P2

- 운영자 copy 세부 문구
- hint 공개 연출 문구
- stage/game results 보조 문구
- `publicCaseSummary` / `publicCaseExplanation` 공개 범위 정리

## 3. Blocker

- Agent 1의 `JudgementStorageEnvelope`가 확정되지 않으면 Agent 3의 prompt와 schema는 저장 경계가 흔들린다.
- Agent 1의 `view.ts` 필드가 바뀌면 `docs/view-model-boundary.md`와 `docs/copy-key-map.md`를 먼저 다시 맞춰야 한다.
- Agent 2의 `VISIBILITY_UI_MAP.md`와 `COMPONENT_INVENTORY.md`가 바뀌면 copy key slot 매핑을 다시 고쳐야 한다.
- `manual_review` 공개 문구가 바뀌면 `review.*`와 `admin.*` key를 동시에 수정해야 한다.

## 4. Agent 1 합류 지점

- 질문/정답 AI 응답은 `QuestionJudgementResponse`, `AnswerJudgementResponse`로만 들어간다.
- 저장은 `JudgementStorageEnvelope`를 기준으로 하고, public/internal payload를 분리한다.
- `publicSummary`는 질문/정답 모두 `publicPayload`에 들어간다.
- 운영자 override는 원본 AI 응답을 덮어쓰지 않고 별도 action으로 쌓는다.

## 5. Agent 2 합류 지점

- `StageBriefingPanel` -> `stage.briefing.*`
- `HintRail` -> `stage.hint.*`
- `QuestionJudgeBadge` -> `stage.questionJudge.*`
- `AnswerJudgeBadge` -> `stage.answerResult.*`
- `SpectatorBanner` -> `stage.spectator.*`
- `StageResultsSummary` -> `stage.results.*`
- `GameResultsSummary` -> `game.results.*`
- `PrivacyMask` -> `privacy.*`
- `manualReview.notice` -> `review.notice`

## 6. 운영자 manual review / override blockers

- `manualReviewRequired=true`는 운영자 큐 진입 blocker다.
- `needsOperatorOverride=true`는 UI 최종 확정 blocker다.
- reason/keyword 매칭이 없으면 운영자는 승인하지 말고 `pending` 상태를 유지한다.
- 플레이어 화면에는 내부 blocker를 그대로 노출하지 말고 `review.notice`만 보여준다.
- JSON이 schema를 통과하지 못하면 같은 프롬프트로 1회 재시도 후 `manual_review`로 넘긴다.

## 7. 반입 체크

- schema가 먼저다.
- prompt는 schema보다 넓어지면 안 된다.
- data는 prompt가 검증 가능할 정도로만 넣는다.
- copy는 view model과 key map이 확정된 뒤에만 유입한다.
- Agent 1과 Agent 2가 쓰는 필드가 합류되기 전에는 UI 문구를 추가하지 않는다.
