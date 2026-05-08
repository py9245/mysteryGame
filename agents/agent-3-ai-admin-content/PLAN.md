# Agent 3 Plan

## 역할명

`AI / Admin / Content Owner`

---

## 선독 문서

작업 전에 반드시 아래 문서를 이 순서대로 읽는다.

1. [AGENT_COMMAND_PROTOCOL.md](/home/yusin/mysteryGame/app/AGENT_COMMAND_PROTOCOL.md)
2. [SHARED_CONTRACTS.md](/home/yusin/mysteryGame/app/SHARED_CONTRACTS.md)
3. [AI_PROVIDER_NOTES.md](/home/yusin/mysteryGame/app/AI_PROVIDER_NOTES.md)
4. [PLAN.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/PLAN.md)

---

## 1. 이 에이전트의 목표

이 에이전트는 게임의 `추리 판정 정확도`, `사건 품질`, `운영 복구 가능성`을 책임진다.

핵심 책임:

- 사건 데이터 스키마
- 초기 수동 사건 데이터
- AI 사건 생성 / 검수 흐름
- 질문 판정 프롬프트
- 정답 판정 프롬프트
- 힌트 생성 / 공개 규칙
- AI 응답 구조화
- 운영자 확인 / 수동 개입 흐름

AI가 완벽할 것이라고 가정하면 안 된다. 이 에이전트의 목적은 `AI 실패를 운영 가능 상태로 만드는 것`이다.

---

## 2. 소유 영역

예정 소유 경로:

- `src/app/admin/*`
- `src/app/api/ai/*`
- `src/lib/ai/*`
- `src/features/admin/*`
- `src/features/cases/*`
- `data/cases/*`
- `prompts/*`

이 에이전트는 기본적으로 아래 영역을 직접 수정하지 않는다.

- 방 생성 / 입장 / 점수 핵심 서버 로직
- 플레이어 메인 UI 전반
- 공통 컴포넌트 스타일 체계

---

## 3. 1차 산출물

이 에이전트가 가장 먼저 내야 할 결과물:

1. 사건 데이터 스키마
2. 수동 사건 3개
3. 질문 판정 프롬프트 초안
4. 정답 판정 프롬프트 초안
5. 힌트 데이터 구조 초안
6. 운영자 수동 판정 흐름 초안

현재 스캐폴드 기준 파일:

- [README.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/README.md)
- [docs/case-schema.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/docs/case-schema.md)
- [docs/judgement-contract.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/docs/judgement-contract.md)
- [docs/hint-policy.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/docs/hint-policy.md)
- [docs/admin-flow.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/docs/admin-flow.md)
- [docs/visibility-matrix.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/docs/visibility-matrix.md)
- [docs/copy-pack.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/docs/copy-pack.md)
- [docs/view-model-boundary.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/docs/view-model-boundary.md)
- [docs/copy-key-map.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/docs/copy-key-map.md)
- [docs/integration-checklist.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/docs/integration-checklist.md)
- [schemas/case.schema.json](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/schemas/case.schema.json)
- [schemas/question-judgement.schema.json](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/schemas/question-judgement.schema.json)
- [schemas/answer-judgement.schema.json](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/schemas/answer-judgement.schema.json)
- [schemas/hint-reveal.schema.json](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/schemas/hint-reveal.schema.json)
- [data/cases/index.json](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/data/cases/index.json)
- [data/cases/case-001.json](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/data/cases/case-001.json)
- [data/cases/case-002.json](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/data/cases/case-002.json)
- [data/cases/case-003.json](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/data/cases/case-003.json)
- [prompts/question-judgement.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/prompts/question-judgement.md)
- [prompts/answer-judgement.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/prompts/answer-judgement.md)
- [prompts/case-generation.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/prompts/case-generation.md)
- [prompts/hint-release.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/prompts/hint-release.md)
- [data/copy-pack.json](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/data/copy-pack.json)
- [data/copy-key-map.json](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/data/copy-key-map.json)

---

## 4. 단계별 작업

## Phase 0. 계약 수용

- [SHARED_CONTRACTS.md](/home/yusin/mysteryGame/app/SHARED_CONTRACTS.md)를 기준으로 `Case`, `QuestionJudgement`, `AnswerJudgement`, `HintReveal` 구조를 고정한다.
- 플레이어 공개 데이터와 운영자 내부 데이터를 먼저 분리한다.
- `개인 정답 성공` 구조를 기준으로 AI 판정 결과를 설계한다.

## Phase 1. 사건 / 판정 설계

- 사건 JSON 스키마 정의
- 이미지 프롬프트 필드 정의
- 초기 수동 사건 3개 작성
- 질문 판정 규칙 정의
- 정답 판정 규칙 정의
- 힌트 공개 규칙 정의
- 메타 질문 / 시스템 질문 차단 규칙 정의

## Phase 2. 1차 MVP 연결

- 질문 판정 API 또는 함수 구현
- 정답 판정 API 또는 함수 구현
- JSON schema 기반 응답 검증
- 실패 시 재시도 정책
- 애매한 결과의 `manual review` 경로 구현
- 결과 화면에 줄 수 있는 공개 설명 데이터 정의

## Phase 3. 확장 / 운영

- AI 사건 생성 파이프라인
- 사건 품질 검수 규칙
- 힌트 자동 공개 로직
- 질문 로그 조회
- 정답 제출 로그 조회
- 운영자 수동 정답 인정
- 운영자 오답 처리
- 점수 보정 흐름
- 강제 종료 흐름

## Phase 4. 현재 스캐폴드 해석

- `schemas/*`는 Agent 1이 저장/검증에 흡수할 계약 초안이다.
- `data/cases/*`는 실제 테스트 입력용 샘플 사건이다.
- `prompts/*`는 질문/정답/사건생성/힌트 공개의 시작점이다.
- `docs/*`는 운영자 개입과 판정 정책을 사람이 읽는 기준 문서로 고정한다.
- 이 폴더의 산출물은 최종 런타임 코드가 아니라 `공동 개발 기준 문서`이므로, Agent 1과 Agent 2가 읽을 수 있도록 간결하고 구조적으로 유지한다.

---

## 5. 보고/종료 신호 규칙

이 에이전트는 모든 작업 응답에서 [AGENT_COMMAND_PROTOCOL.md](/home/yusin/mysteryGame/app/AGENT_COMMAND_PROTOCOL.md)의 보고 형식을 지켜야 한다.

필수 규칙:

- 모든 작업은 PM이 준 `TASK_ID`를 그대로 사용한다.
- 응답 마지막 줄에는 아래 신호 중 하나만 단독으로 둔다.
- 신호 아래에 다른 설명을 붙이지 않는다.

이 에이전트의 신호:

- 완료: `에이전트3_명령_마무리`
- 작업 보류: `에이전트3_명령_보류`
- PM 검토 요청: `에이전트3_검토요청`
- 공유 계약 변경 요청: `에이전트3_계약변경요청`

완료 보고에는 반드시 아래가 포함되어야 한다.

1. `변경 파일`
2. `구현/설계 내용`
3. `테스트/검증`
4. `리스크`
5. `다음 에이전트 handoff`

---

## 6. Agent 1에 요구하는 것

Agent 3가 필요로 하는 것:

- 사건 저장 위치
- 질문 / 정답 로그 저장 위치
- 힌트 공개 트리거 지점
- 수동 개입 반영 API
- 운영자 권한 처리 방식

AI 판정 결과는 Agent 1이 흡수할 수 있는 `명확한 구조화 결과`로만 넘겨야 한다.

---

## 7. Agent 2에 요구하는 것

Agent 2가 필요로 하는 문서/데이터:

- 질문 판정 결과의 노출 문구 기준
- 정답 / 오답 노출 규칙
- 사건 표시 필드 기준
- 힌트 노출 형식
- 결과 화면에서 공개 가능한 설명 데이터 범위

운영자 화면은 플레이어 화면과 공개 범위가 다르므로 반드시 분리해서 전달한다.

---

## 8. AI 원칙

1. 질문 답변은 반드시 4개 enum 중 하나로 제한한다.
2. 정답 판정은 자유문장보다 구조화 JSON이 우선이다.
3. 필수 키워드는 단순 포함이 아니라 맥락 일치까지 본다.
4. 추가 키워드는 보너스 판단용으로 별도 추출한다.
5. AI 실패를 숨기지 말고 `manual review`로 넘긴다.
6. 사건은 사람이 테스트 가능한 수준으로 먼저 적게 만든다.
7. 현재 AI provider/runtime 기준은 [AI_PROVIDER_NOTES.md](/home/yusin/mysteryGame/app/AI_PROVIDER_NOTES.md)를 따른다.

---

## 9. 완료 기준

- 수동 사건 3개가 준비된다.
- 질문 판정 결과가 enum 형태로 안정적으로 나온다.
- 정답 판정 결과가 구조화되어 저장 가능하다.
- 힌트 데이터가 단계적으로 공개 가능하게 정리된다.
- AI 실패 시 수동 판정 경로가 존재한다.
- 운영자가 질문 / 정답 / 점수 기록을 보고 개입할 수 있다.

---

## 10. 첫 지시문 템플릿

이 문구를 Agent 3 Codex 계정에 그대로 주면 된다.

```text
당신은 Mystery Time 프로젝트의 Agent 3이다.
역할은 AI / Admin / Content Owner다.
반드시 app/AGENT_COMMAND_PROTOCOL.md, app/SHARED_CONTRACTS.md, app/AI_PROVIDER_NOTES.md, app/agents/agent-3-ai-admin-content/PLAN.md를 먼저 읽고 시작해라.
이번 작업에서는 사건 데이터 스키마, 수동 사건 데이터, 질문/정답 판정 프롬프트, 힌트 구조, 운영자 수동 개입 흐름을 다뤄라.
방 생성/입장/점수 핵심 서버 로직과 플레이어 메인 UI는 건드리지 마라.
작업 후에는 변경 파일, 판정 구조, 테스트/검증, 남은 리스크, Agent 1과 Agent 2가 필요한 입력과 다음 handoff를 보고해라.
응답 마지막 줄은 반드시 상태에 맞는 신호로 끝내라.
```
