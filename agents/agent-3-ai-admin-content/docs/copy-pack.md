# Copy Pack

이 문서는 Agent 2가 화면에 바로 붙일 수 있는 copy를 모아둔 운영 기준이다.

## 1. 설계 원칙

- 모든 문구는 `공개 범위`와 `렌더링 지점`이 함께 있어야 한다.
- 플레이어 copy는 짧고 단정하게 유지한다.
- 운영자 copy는 이유와 후속 행동이 분명해야 한다.
- 내부 reasoning, 원문, 민감한 판정 기준은 절대 포함하지 않는다.

## 2. Agent 2 주입 키

### 공통 키

- `stageBriefing.title`
- `stageBriefing.body`
- `hintReveal.items[]`
- `questionJudge.publicReply`
- `answerResult.success`
- `answerResult.failure`
- `answerResult.needsReview`
- `solvedSpectator.banner`
- `stageResults.summary`
- `gameResults.summary`
- `manualReview.notice`
- `adminCopy.*`

### UI 매핑

- `StageBriefingPanel` -> `stageBriefing.*`
- `HintRail` -> `hintReveal.items[]`
- `QuestionJudgeBadge` -> `questionJudge.publicReply`
- `AnswerJudgeBadge` -> `answerResult.*`
- `SpectatorBanner` -> `solvedSpectator.banner`
- `StageResultsSummary` -> `stageResults.summary`
- `GameResultsSummary` -> `gameResults.summary`
- `AdminConsole` -> `adminCopy.*`

## 3. Stage Briefing Copy

### 플레이어

- 제목: `이번 스테이지 사건이 공개되었습니다.`
- 본문: `사건 설명을 읽고 팀과 정보를 나눠주세요. 질문과 정답은 조사실에서 진행됩니다.`
- 보조문: `시간이 지나면 점수가 오르니 너무 오래 머물지 마세요.`

### 운영자

- 제목: `스테이지 브리핑 대기`
- 본문: `사건 공개 전환 준비 완료. 공개 범위와 힌트 순서를 확인하세요.`

## 4. Hint Reveal Copy

### 약한 힌트

- 플레이어: `아직 직접적인 단서는 부족합니다.`
- 운영자: `약한 힌트 공개`

### 중간 힌트

- 플레이어: `사건의 핵심 관계가 드러납니다.`
- 운영자: `중간 힌트 공개`

### 강한 힌트

- 플레이어: `정답 방향이 거의 드러납니다.`
- 운영자: `강한 힌트 공개`

### 최종 힌트

- 플레이어: `이제는 범인, 수단, 동기를 함께 맞춰야 합니다.`
- 운영자: `최종 힌트 공개`

## 5. Question Judgement Copy

### 플레이어

- `네, 그렇습니다.`
- `아니오, 그렇지 않습니다.`
- `그럴 수도 있습니다.`
- `중요하지 않습니다.`

### 운영자

- `질문 판정 보류`
- `질문 판정 수정 필요`
- `질문 판정 확정`

## 6. Answer Result Copy

### 성공

- 플레이어: `정답을 맞혔습니다.`
- 관전 전환: `정답 성공으로 관전 상태로 전환됩니다.`

### 실패

- 플레이어: `정답이 아닙니다.`

### 검토

- 플레이어: `운영자 확인이 필요합니다.`
- 운영자: `manual_review 대기`

## 7. Solved Spectator Copy

- `정답 성공`
- `이제 이 스테이지에서는 입력할 수 없습니다.`
- `공개 로그만 확인할 수 있습니다.`
- `남은 진행은 관전 모드로 표시됩니다.`

## 8. Stage / Game Results Copy

### 스테이지 결과

- `스테이지가 종료되었습니다.`
- `당신의 점수 변화`
- `당신의 질문 횟수`
- `당신의 정답 시도 횟수`
- `정답 성공 순서`
- `공개 가능한 사건 요약`

### 게임 결과

- `게임이 종료되었습니다.`
- `최종 개인 누적 점수`
- `개인별 정답 성공 수`
- `개인별 추가 키워드 기여`
- `공개 가능한 최종 사건 해설`

## 9. Manual Review Copy

- 플레이어: `운영자 확인이 필요합니다.`
- 운영자: `manual_review 대기`
- 운영자: `판정 근거 검토 후 최종 상태를 확정하세요.`

## 10. Admin-only Copy

- `질문 판정 보류`
- `정답 판정 보류`
- `수동 승인 필요`
- `점수 보정 필요`
- `힌트 강제 공개 가능`
- `스테이지 강제 종료 가능`

## 11. Agent 1 메모

- `copyCategory`는 `stage`, `hint`, `questionJudge`, `answerResult`, `spectator`, `stageResults`, `gameResults`, `manualReview`, `adminOnly` 중 하나를 사용한다.
- Agent 1은 저장 시 원문 copy와 공개 범주를 같이 보관해야 한다.
- Agent 1은 `manual_review`를 `publicOutcome: needs_review`와 분리해 저장해야 한다.
