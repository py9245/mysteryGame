# AI Review Override Flow

This document ties the AI runtime route examples to the read-only operator review assets.

## Files To Open

- [`src/app/api/ai/README.md`](/home/yusin/mysteryGame/app/src/app/api/ai/README.md)
- [`data/admin/ai-review-flow.json`](/home/yusin/mysteryGame/app/data/admin/ai-review-flow.json)
- [`data/admin/review-queue.json`](/home/yusin/mysteryGame/app/data/admin/review-queue.json)
- [`data/admin/override-log.json`](/home/yusin/mysteryGame/app/data/admin/override-log.json)

## Fast Path

1. Start with `routeSamples[*]` in `ai-review-flow.json`.
2. Use the sample `request` body as the shape for `POST /api/ai/text`.
3. Inspect the normalized route response fields:
   - `data.text`
   - `data.finishReason`
   - `data.usage`
4. Parse `data.text` into the judgement contract.
5. Apply `reviewRoutingRules[*]`:
   - `manualReviewRequired === true` -> create `question_review`
   - `needsOperatorOverride === true` or `publicOutcome === needs_review` -> create `answer_review`
   - otherwise skip queue creation
6. After operator approval or rejection, apply `overrideTransitions[*]` to see which `override-log.json` record and `override_follow_up` queue item should exist.

## How Operators Use The Samples

- `Question Judgement -> Manual Review`
  - shows a `manualReviewRequired: true` sample
  - links to `review-q-002`
- `Answer Judgement -> Override Candidate`
  - shows a `needsOperatorOverride: true` sample
  - links to `review-a-002`
- `overrideTransitions`
  - shows historical examples of approval/rejection flowing into:
    - `override-001` -> `followup-a-001`
    - `override-002` -> `followup-q-001`

## Why This Exists

- the AI route README explains transport and payload shape
- the admin review assets explain operator queue state
- `ai-review-flow.json` is the glue between those two views
