# Case Schema

이 문서는 사건 데이터의 사람 읽기 기준을 정의한다.

## 목적

- 사건을 수동 작성하거나 AI 생성 후 검수할 때 동일한 필드를 사용한다.
- Agent 1이 저장 구조로 옮기기 쉽게 한다.
- Agent 2가 화면에 어떤 값을 노출할지 구분할 수 있게 한다.

## 핵심 원칙

- `truth`는 운영자와 AI 내부용이다.
- 플레이어에게는 `publicDescription`, `question`, `hints`만 주로 노출된다.
- `requiredKeywords`는 정답 판정의 필수 조건이다.
- `bonusKeywords`는 보너스 점수 또는 추가 보정용이다.

## 권장 필드

- `id`
- `stageNumber`
- `difficulty`
- `title`
- `publicDescription`
- `question`
- `truth`
- `requiredKeywords`
- `bonusKeywords`
- `acceptedAnswerSummary`
- `hints`
- `reviewNotes`
- `status`
- `version`

## 힌트 구조

각 힌트는 아래 정보가 필요하다.

- `hintId`
- `order`
- `triggerType`
- `strength`
- `publicText`
- `internalNote`

## 작성 규칙

- 사건 한 개는 반드시 사람이 검증 가능해야 한다.
- 정답은 하나의 명확한 결론으로 수렴해야 한다.
- 필수 키워드는 인과관계 속에서 자연스럽게 들어가야 한다.
- 힌트는 점점 강해져야 하고, 서로 모순되면 안 된다.
