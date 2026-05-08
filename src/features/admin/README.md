# Admin Feature Scaffold

This folder holds the runtime admin feature scaffolding for Mystery Time.

## Scope

- Admin content shell
- Copy pack wiring points
- Manual review queue presentation
- Hint and override control surfaces
- Review queue normalization for read-only operator summaries

## Non-goals

- Backend contracts
- Player UI
- Real API integration

## Review Queue Shape

- `data/cases/index.json`
  - case file 목록을 제공하고 admin runtime loader는 이를 기준으로 실제 case fixture를 읽는다.
- `src/features/admin/adminCaseData.ts`
  - case detail 타입과 difficulty/status/hint count summary를 AdminShell용 read model로 정규화한다.
- `data/admin/review-queue.json`
  - `question_review`, `answer_review`, `override_follow_up` category를 명시한다.
  - 각 item은 `queueStatus`, `priority`, `status`, `nextAction`, `links`, `followUp`를 가진다.
- `data/admin/ai-review-flow.json`
  - `POST /api/ai/text` 예시 request/normalized response, review routing rule, override transition sample을 같이 둔다.
- `data/admin/override-log.json`
  - operator 정보와 public/internal 결과 payload를 분리하고, queue item link를 같이 둔다.
- `src/features/admin/adminReviewData.ts`
  - raw JSON을 AdminShell용 summary/count/grouped view로 정규화한다.
- `src/features/admin/adminAiFlowData.ts`
  - AI route 예시와 review/override 흐름 연결을 AdminShell용 read model로 정규화한다.
- [`AI_REVIEW_OVERRIDE_FLOW.md`](/home/yusin/mysteryGame/app/src/features/admin/AI_REVIEW_OVERRIDE_FLOW.md)
  - 운영자가 AI route 예시에서 review queue/override log까지 따라가는 빠른 읽기 문서다.
