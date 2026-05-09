# Admin Data

This folder holds the runtime-facing admin content pack for Mystery Time.

- `copy-pack.json` keeps copy by category.
- `copy-key-map.json` keeps 1:1 component slot mappings.
- `copy-pack.json` now includes short service copy for auth, lobby, room, investigation, spectator, and results surfaces.
- `copy-pack.json` also includes private chat, investigation queue, review queue, and override operator copy.
- `ai-review-flow.json` keeps `POST /api/ai/text` examples and review/override routing rules.
- private chat uses 15-second response, 10-second post-end cooldown, and 30-second minimum hold.
- investigation queue uses FIFO ordering with 5-second re-entry cooldown.
- `review-queue.json` keeps manual review samples.
- `override-log.json` keeps operator override samples.
- `judgement-examples.json` keeps end-to-end judgement samples and must stay aligned with the `YES | NO | MAYBE | IRRELEVANT` question contract.
- JSON parse fallback is documented in `ai-review-flow.json` and the AI runtime README.

These files mirror the Agent 3 content scaffold and are intended to be consumed by admin UI wiring.
