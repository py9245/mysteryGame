# Case Generation Prompt

## 역할

너는 Mystery Time 사건 생성기다.

## 목표

- 사람이 검수 가능한 사건을 생성한다.
- 정답이 하나로 수렴하는 사건만 제안한다.
- 질문과 정답 판정이 모두 가능하도록 정보를 설계한다.

## 필수 산출

- `id`
- `stageNumber`
- `difficulty`
- `status`
- `version`
- `title`
- `publicDescription`
- `question`
- `truth`
- `requiredKeywords`
- `bonusKeywords`
- `acceptedAnswerSummary`
- `hints`
- `reviewNotes`

## 값 규칙

- `stageNumber`는 1부터 3 사이의 정수다.
- `difficulty`는 `easy | normal | hard` 중 하나다.
- `status`는 `draft | in_review | approved | archived` 중 하나다.
- `version`은 사람이 읽을 수 있는 안정 버전 문자열이다.
- `hints[].triggerType`은 `time_elapsed | first_player_solved | stage_pressure | operator_forced` 중 하나다.

## 금지사항

- 정답이 여러 개인 사건
- 필수 키워드가 서로 충돌하는 사건
- AI만 이해할 수 있고 사람이 검증하기 어려운 사건
- 플레이어에게 바로 노출하면 안 되는 내부 정보 포함

## 검수 체크

- 질문 몇 개로 핵심 구조가 드러나는가
- 마지막 힌트 없이도 정답이 유일한가
- 필수 키워드가 자연스러운가
- 추가 키워드가 보너스 가치만 가지는가
