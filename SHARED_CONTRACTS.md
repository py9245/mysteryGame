# Shared Contracts

## 1. 목적

이 문서는 병렬 작업 중 충돌을 줄이기 위한 `공통 계약 문서`다.

세 에이전트는 구현 전에 이 문서를 기준으로 동일한 개념을 사용해야 한다.  
에이전트 작업 지시와 완료 신호 규칙은 [AGENT_COMMAND_PROTOCOL.md](/home/yusin/mysteryGame/app/AGENT_COMMAND_PROTOCOL.md)를 따른다.
AI provider / transport 기준은 [AI_PROVIDER_NOTES.md](/home/yusin/mysteryGame/app/AI_PROVIDER_NOTES.md)를 따른다.

---

## 2. 구현 해석 기준

최신 기획안에는 과거 팀 점수 표현과 최신 개인 점수 표현이 섞여 있다.  
현재 구현은 아래 기준을 `진실 원본`으로 본다.

1. 게임 구조는 `6명 / 3팀 / 팀당 2명`이다.
2. 팀은 `협력, 팀 채팅, 스테이지별 조합 변경`을 위한 구조다.
3. 점수의 진실 원본은 `개인 점수`다.
4. 정답 성공의 진실 원본도 `개인 성공`이다.
5. 스테이지는 `2명의 개인 플레이어가 정답 성공`하거나 `시간이 종료`되면 끝난다.
6. 최종 승자는 `3스테이지 누적 개인 점수`가 가장 낮은 플레이어다.
7. 기획안에 남아 있는 `팀 점수`, `팀 정답 처리` 표현은 구버전 표현으로 보고, 구현 계약은 이 문서 기준으로 맞춘다.

즉 팀전의 성격은 유지하되, 점수 집계와 승패 판정은 `개인 기준`으로 설계한다.

---

## 3. 고정 기술 방향

- 프론트엔드: `Next.js`
- 데이터/실시간: `Supabase`
- AI 판정: `서버 함수 또는 API 라우트`
- AI transport: `GMS_KEY + GMS proxy`
- 첫 목표: `고정 사건 1개`, `한 스테이지 MVP`
- 확장 목표: `3스테이지`, `스테이지별 팀 재편`, `개인 누적 랭킹`

---

## 4. 에이전트별 예정 소유 경로

### Agent 1

- `supabase/*`
- `src/server/*`
- `src/lib/supabase/*`
- `src/contracts/*`
- `src/app/api/room/*`
- `src/app/api/game/*`
- `src/app/api/chat/*`
- `src/app/api/private-chat/*`

### Agent 2

- `src/app/(player)/*`
- `src/components/*`
- `src/features/lobby/*`
- `src/features/gameplay/*`
- `src/features/chat-ui/*`
- `src/features/private-chat-ui/*`
- `src/features/results/*`

### Agent 3

- `src/app/admin/*`
- `src/app/api/ai/*`
- `src/lib/ai/*`
- `src/features/admin/*`
- `src/features/cases/*`
- `data/cases/*`
- `prompts/*`

경로는 실제 코드 구조에 맞게 조정할 수 있지만 `소유권 분리 원칙`은 유지한다.

---

## 5. 핵심 엔티티

### Room

- 플레이어들이 입장하는 대기 공간
- 상태: `waiting`, `ready`, `assigning`, `in_game`, `closed`

### Player

- 방에 참여한 개인 사용자
- 필드 최소값:
  - `id`
  - `nickname`
  - `roomId`
  - `isReady`
  - `connectionStatus`
  - `totalScore`
  - `solvedCount`
  - `bonusKeywordCount`

### TeamSlot

- 한 스테이지에서 사용할 팀 슬롯
- 필드 최소값:
  - `id`
  - `roomId`
  - `label`

### StageTeamAssignment

- 특정 스테이지에서 어떤 플레이어가 어떤 팀에 속하는지 기록
- 필드 최소값:
  - `stageId`
  - `playerId`
  - `teamSlotId`

### Game

- 방 안에서 실제 진행되는 경기 단위
- 필드 최소값:
  - `id`
  - `roomId`
  - `status`
  - `currentStageNumber`

### Stage

- 하나의 사건 라운드
- 상태:
  - `pending`
  - `briefing`
  - `in_progress`
  - `ended`
  - `revealed`

### PlayerStageState

- 한 스테이지에서 플레이어 개인의 상태
- 상태:
  - `active`
  - `solved_locked`
  - `inactive_penalized`
  - `timed_out`
  - `disconnected`

### Case

- 사건 데이터
- 필드 최소값:
  - `stage`
  - `title`
  - `publicDescription`
  - `question`
  - `imagePrompt`
  - `imageUrl`
  - `truth`
  - `requiredKeywords`
  - `bonusKeywords`
  - `acceptedAnswerSummary`
  - `hints`

### InvestigationLock

- 조사실 독점 사용 상태
- 필드 최소값:
  - `stageId`
  - `lockedByPlayerId`
  - `lockedAt`
  - `expiresAt`
  - `questionCount`
  - `answerAttemptCount`

### Question

- 조사실에서 제출한 질문
- 필드 최소값:
  - `id`
  - `stageId`
  - `playerId`
  - `teamSlotId`
  - `content`
  - `judgement`
  - `reasonCode`
  - `createdAt`

### AnswerAttempt

- 조사실에서 제출한 정답 시도
- 필드 최소값:
  - `id`
  - `stageId`
  - `playerId`
  - `teamSlotId`
  - `content`
  - `result`
  - `matchedBonusKeywords`
  - `createdAt`

### ScoreEvent

- 점수 변경의 단위 기록
- 필드 최소값:
  - `id`
  - `playerId`
  - `stageId`
  - `type`
  - `delta`
  - `reason`
  - `createdAt`

### ChatMessage

- 채팅 메시지
- 채널 타입:
  - `team`
  - `global`
  - `private`

### PrivateChatRequest

- 타 팀 1:1 채팅 신청 기록
- 필드 최소값:
  - `id`
  - `stageId`
  - `requesterPlayerId`
  - `targetPlayerId`
  - `status`
  - `createdAt`

### PrivateChatSession

- 수락된 1:1 채팅 세션
- 필드 최소값:
  - `id`
  - `stageId`
  - `requestId`
  - `playerAId`
  - `playerBId`
  - `startedAt`
  - `endsAt`

### HintReveal

- 힌트 공개 기록
- 필드 최소값:
  - `id`
  - `stageId`
  - `hintIndex`
  - `triggerType`
  - `revealedAt`

### AdminLog

- 운영자 개입 및 시스템 판단 로그
- 필드 최소값:
  - `id`
  - `stageId`
  - `actor`
  - `action`
  - `payload`
  - `createdAt`

---

## 6. 점수 계약

점수는 반드시 `ScoreEvent` 합산으로 계산한다.  
`Player.totalScore` 같은 값은 캐시일 수 있지만 진실 원본은 아니다.

초기 고정값:

- `time_tick`: `+1 / sec`
- `question_cost`: `+30`
- `wrong_answer_cost`: `+100`
- `bonus_keyword_reward`: `-60`
- `inactivity_penalty`: `+150`
- `unsolved_penalty`: `+300`
- `macro_penalty`: `+300`

추가 원칙:

1. 모든 점수 이벤트는 `playerId`에 귀속된다.
2. 과거 팀 패널티 개념이 필요해도 서버는 `팀 합산`이 아니라 `해당 팀원 각각의 ScoreEvent`로 풀어쓴다.
3. 스테이지 중에는 `본인 점수`만 공개한다.
4. 전체 누적 순위는 게임 종료 후 공개한다.

---

## 7. 조사실 계약

- 조사실은 한 번에 한 명만 입장 가능하다.
- 입장 시간은 최대 `20초`다.
- 재입장 쿨타임은 `5초`다.
- 한 번 입장했을 때:
  - 질문 최대 `3회`
  - 정답 시도 최대 `1회`
- 재입장해서 새로 lock을 잡으면 위 카운터는 `0`부터 다시 시작한다.
- 조사실 밖 플레이어는 아래를 알 수 없다.
  - 질문 여부
  - 정답 시도 여부
  - 질문 내용
  - AI 답변
  - 오답 여부
- 정답 성공은 전체에 공지되지만, 오답은 공지하지 않는다.

---

## 8. 질문 판정 응답 계약

AI 질문 판정 내부 enum:

- `YES`
- `NO`
- `MAYBE`
- `IRRELEVANT`

플레이어 표시 문구 매핑:

- `YES` -> `네, 그렇습니다.`
- `NO` -> `아니오, 그렇지 않습니다.`
- `MAYBE` -> `그럴 수도 있습니다.`
- `IRRELEVANT` -> `중요하지 않습니다.`

추가 원칙:

1. 메타 질문, 시스템 질문, 외부 정보 질문은 별도 `reasonCode`로 무효 처리할 수 있다.
2. 플레이어에게는 프롬프트 구조나 필수 키워드 존재를 절대 노출하지 않는다.
3. 질문 길이 제한은 최대 `100자`다.

---

## 9. 정답 판정 응답 계약

AI 정답 판정 내부 응답 형식 초안:

```json
{
  "result": "correct",
  "missingRequiredKeywords": [],
  "matchedBonusKeywords": ["상속"],
  "reasonCode": "ALL_REQUIRED_AND_CONTEXT_VALID",
  "needsManualReview": false,
  "shouldLockPlayer": true
}
```

`result` 허용값:

- `correct`
- `incorrect`
- `ambiguous`

추가 원칙:

1. 플레이어에게는 최종적으로 `정답` 또는 `오답`만 보여준다.
2. `correct`면 그 플레이어의 스테이지 상태는 `solved_locked`가 된다.
3. 정답 성공 시 `그 플레이어만` 격리한다.
4. 같은 팀원은 스테이지를 계속 진행할 수 있다.
5. 스테이지는 `정답 성공 플레이어 2명`이 나오면 종료된다.

---

## 10. 실시간 이벤트 이름

초기 고정 이벤트:

- `room.updated`
- `room.ready_changed`
- `teams.assigned`
- `stage.briefing_started`
- `stage.started`
- `stage.timer_updated`
- `hint.revealed`
- `investigation.locked`
- `investigation.released`
- `question.submitted`
- `question.judged`
- `answer.submitted`
- `answer.judged`
- `player.solved`
- `player.locked`
- `score.updated`
- `private_chat.requested`
- `private_chat.accepted`
- `private_chat.rejected`
- `private_chat.ended`
- `stage.ended`
- `stage.results_revealed`
- `game.finished`

---

## 11. 공개 범위 계약

### 플레이어가 항상 볼 수 있는 것

- 현재 스테이지 번호
- 사건 제목 / 설명 / 이미지
- 남은 시간
- 본인 점수
- 현재 팀 구성
- 다른 팀 구성
- 공개된 힌트

### UI view model 규칙

- Agent 2는 `RoomSnapshot.viewMode`, `me`, `visibility`, `redacted`를 먼저 읽고 화면을 결정한다.
- 스테이지 중 다른 플레이어 점수는 `redacted`가 기본이며, 본인 점수만 실수치로 내려간다.
- `RoomSnapshot`은 raw storage model이 아니라 `UI view model`로 취급한다.

### 플레이어가 보면 안 되는 것

- 다른 플레이어의 실시간 점수
- 다른 플레이어의 질문 내용
- 다른 플레이어의 정답 시도 내용
- 오답 여부
- 필수 키워드 / 추가 키워드 / 정답 판정 기준
- 1:1 채팅 상대 정보

### 게임 종료 후 공개 가능한 것

- 전체 누적 개인 순위
- 정답 성공 순서
- 공개 가능한 범위의 스테이지 정답

---

## 12. AI 판정 경계

- Agent 3는 질문/정답 판정의 `public` 출력만 UI용 문구로 맞춘다.
- Agent 1은 `judgement_records`, `judgement_review_queue`, `judgement_overrides` 같은 내부 저장 구조와 상태 전이를 책임진다.
- Agent 2는 `viewMode`, `me`, `visibility`, `redacted`, `publicReply`, `publicOutcome`, `publicSummary`만 본다.
- `reasonCode`, `safetyFlags`, `matchedRequiredKeywords`, `missingRequiredKeywords`, `matchedBonusKeywords`, `logSummary`는 운영자와 감사 용도다.

---

## 13. 변경 규칙

이 문서에 적힌 계약을 바꾸고 싶으면 아래 순서를 지킨다.

1. 변경 이유를 먼저 정리
2. 이 문서를 수정
3. 관련 에이전트에 동기화
4. 그 다음 구현 변경

구현이 계약보다 먼저 바뀌면 병렬 작업이 깨진다.
