# AI Judgement Flow

## 1. Purpose

This memo locks the backend-owned flow for question and answer judgement records.

Agent 3 owns the model prompt and policy language.
Agent 1 owns the stored contract, review queue, override trail, and UI-facing snapshot.

## 2. Storage split

### Internal payload

Stored for operators, debugging, and replay.

- `judgement`
- `reasonCode`
- `safetyFlags`
- `matchedRequiredKeywords`
- `missingRequiredKeywords`
- `matchedBonusKeywords`
- `logSummary`

### Public payload

Safe to surface to the player-facing snapshot.

- question: `publicReply`
- answer: `publicOutcome`
- both: `publicSummary`

## 3. Persistence tables

### `judgement_records`

- One row per AI judgement request/response pair.
- Stores the raw request, raw response, public payload, internal payload, and persistence state.
- This is the canonical audit row and the source row for replays.

### `judgement_review_queue`

- One row for each judgement that requires human review.
- References `judgement_records` by `judgement_id`.
- Stores queue status, review summary, and the current public outcome.

### `judgement_overrides`

- Append-only operator override trail.
- Never edits the original judgement row.
- Used to reconstruct how a pending or rejected judgement became the active public outcome.

## 4. Manual review flow

1. Agent 3 returns a judgement with `manualReviewRequired` or `needsOperatorOverride`.
2. Agent 1 writes `judgement_records`.
3. If review is needed, Agent 1 also writes `judgement_review_queue`.
4. Agent 1 stores only the public payload in the UI-facing snapshot.
5. Operator can override the public outcome later without mutating the original AI response.
6. Agent 1 appends a row to `judgement_overrides` and updates the queue state.

## 5. Operator override rule

- Operator override changes the public outcome, not the original AI raw response.
- Original AI fields remain available for audit and replay.
- If the override conflicts with previous public state, the latest override wins for UI state.

## 6. Persistence memo for command handlers

- Question commands should persist `question` judgement rows before broadcasting the public reply.
- Answer commands should persist `answer` judgement rows before applying `solved_locked` or score changes.
- If `manualReviewRequired` or `needsOperatorOverride` is true, queue the row and keep the UI in a pending state.
- Operator override commands should append to `judgement_overrides`, then update the matching review row status and public outcome.
- UI snapshots should only read the public payload and the high-level review state, never the raw internal payload.

## 7. Agent handoff

- Agent 2 consumes only `publicReply`, `publicOutcome`, `publicSummary`, `viewMode`, `me`, `visibility`, and `redacted`.
- Agent 3 emits `QuestionJudgementResponse`, `AnswerJudgementResponse`, and `JudgementStorageEnvelope` shaped data.
