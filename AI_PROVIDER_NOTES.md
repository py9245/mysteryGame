# AI Provider Notes

## 목적

이 문서는 실제 AI 호출 시 사용할 런타임 provider 정보를 정리한다.

이 프로젝트에서 AI 호출은 기본적으로 `GMS 프록시 + GMS_KEY`를 사용한다.

---

## 1. 공통 환경 변수

- 환경 변수 파일: [/.env](/home/yusin/mysteryGame/app/.env)
- 핵심 키: `GMS_KEY`

원칙:

- 런타임 코드는 직접 고정 토큰을 쓰지 않는다.
- 모든 AI 호출은 `GMS_KEY`를 읽는 helper를 통해 수행한다.

---

## 2. 텍스트 / 판정 호출

기본 호출 방식:

```bash
curl "https://gms.ssafy.io/gmsapi/api.openai.com/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GMS_KEY" \
  -d '{
    "model": "gpt-5-mini",
    "messages": [
      {
        "role": "developer",
        "content": "Answer in Korean"
      },
      {
        "role": "user",
        "content": "Summarize the 2024 total production data."
      }
    ]
  }'
```

현재 계약:

- 질문 판정, 정답 판정, 사건 생성용 텍스트 호출은 우선 `OpenAI-compatible GMS proxy`를 사용한다.
- 기본 모델은 `gpt-5-mini`로 시작한다.
- 프롬프트는 Agent 3가 관리하고, transport/client는 root runtime helper로 분리한다.

---

## 3. 이미지 생성 호출

### 후보 1: OpenAI 이미지

```bash
curl https://gms.ssafy.io/gmsapi/api.openai.com/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GMS_KEY" \
  -d '{
    "model": "gpt-image-1.5",
    "prompt": "A cute baby sea otter",
    "n": 1,
    "size": "1024x1024"
  }'
```

### 후보 2: Google Imagen

```bash
curl -X POST \
  "https://gms.ssafy.io/gmsapi/generativelanguage.googleapis.com/v1beta/models/imagen-4.0-ultra-generate-001:predict" \
  -H "x-goog-api-key: $GMS_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "instances": [
      {
        "prompt": "Robot holding a red skateboard"
      }
    ],
    "parameters": {
      "sampleCount": 1
    }
  }'
```

현재 계약:

- 이미지 생성 provider는 `gpt-image-1.5`와 `imagen-4.0-ultra-generate-001` 둘 다 지원 가능한 구조로 만든다.
- 최종 선택은 `품질이 더 좋은 결과`를 기준으로 한다.
- 따라서 runtime 구현은 provider를 하드코딩하지 말고 `provider switch`가 가능해야 한다.

---

## 4. 구현 원칙

1. `src/lib/ai/*`에 transport/client helper를 만든다.
2. 텍스트 호출과 이미지 호출 provider를 분리한다.
3. 이미지 provider는 최소한 아래 2값을 선택할 수 있어야 한다.
   - `openai_gpt_image`
   - `google_imagen`
4. 질문 판정 / 정답 판정 / 사건 생성 / 힌트 생성은 text client를 사용한다.
5. 사건 이미지 생성은 image client를 사용한다.
6. UI나 backend contract는 provider 세부 URL을 직접 알지 않도록 한다.

---

## 5. 다음 작업 영향

- Agent 3:
  - `src/lib/ai` runtime helper와 `src/app/api/ai` placeholder를 만들 때 이 문서를 기준으로 한다.
- Agent 1:
  - judgement/game flow 문서에서 AI provider 세부 구현 대신 `AI runtime helper`를 호출하는 구조로 유지한다.
- Agent 2:
  - 이미지 provider 세부사항은 몰라도 되고, `imageUrl` 또는 생성 상태만 소비하면 된다.
