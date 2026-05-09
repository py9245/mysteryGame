# AI Runtime Routes

This folder exposes the Agent 3 AI runtime scaffold through two Node.js routes backed by the `GMS_KEY` proxy.

## Routes

- `GET /api/ai/text`
  - Returns self-documenting metadata for the text provider contract, required env, and example request shape.
- `POST /api/ai/text`
  - Accepts `TextCompletionInput` and forwards it to the GMS OpenAI-compatible chat completion proxy.
- `GET /api/ai/image`
  - Returns provider metadata and example request payloads for `openai_gpt_image` and `google_imagen`.
- `POST /api/ai/image`
  - Accepts `ImageGenerationInput` and returns normalized `assets` plus the raw upstream payload.

## Request Examples

Text:

```bash
curl http://localhost:3000/api/ai/text \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai_chat_gms",
    "model": "gpt-5-mini",
    "messages": [
      {
        "role": "developer",
        "content": "Answer in Korean. Return concise plain text."
      },
      {
        "role": "user",
        "content": "운영자 공지 문구 한 줄만 작성해줘."
      }
    ]
  }'
```

Image with OpenAI:

```bash
curl http://localhost:3000/api/ai/image \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai_gpt_image",
    "prompt": "A tense locked-room mystery crime scene, cinematic illustration",
    "n": 1,
    "size": "1024x1024"
  }'
```

Image with Google Imagen:

```bash
curl http://localhost:3000/api/ai/image \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google_imagen",
    "prompt": "A tense locked-room mystery crime scene, cinematic illustration",
    "sampleCount": 1
  }'
```

## Operational Notes

- Required env: `GMS_KEY`
- Text default: `openai_chat_gms` + `gpt-5-mini`
- Image defaults:
  - `openai_gpt_image` -> `gpt-image-1.5`
  - `google_imagen` -> `imagen-4.0-ultra-generate-001`
- Route responses are intentionally split into normalized fields and `raw` provider payload so admin/backend code can start with stable keys and still inspect upstream details when needed.
- Prompt assets live in [`prompts/`](../../../../prompts/README.md). The runtime accepts plain request bodies and does not hard-bind prompt files yet; callers are expected to compose prompt content before invoking these routes.
- Callers that expect judgement JSON should validate `data.text` against the matching schema before writing to storage.
- If schema validation fails, retry the same prompt once with a stricter JSON-only reminder.
- If the second attempt still fails, route the item to manual review and keep a raw text snippet for operators.
