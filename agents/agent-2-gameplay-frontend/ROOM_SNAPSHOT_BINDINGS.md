# RoomSnapshot Bindings

이 문서는 Agent 1이 확정한 `RoomSnapshot` view model을 Agent 2 화면 구조에 직접 연결하기 위한 기준표다.

## 1. 기준 원칙

- Agent 2는 raw backend state를 가정하지 않는다.
- 모든 화면은 `RoomSnapshot`을 입력으로 받는다고 가정한다.
- `viewMode`, `me`, `visibility`, `redacted`, `players`, `stage`, `scores`가 화면 분기와 마스킹의 기준이다.
- 컴포넌트는 필요한 필드만 읽고, 나머지는 `PrivacyMask` / `RedactedField`로 처리한다.

## 2. 핵심 필드 역할

### `viewMode`

- 화면 전환의 1차 기준이다.
- 라우트와 동시에 사용되지만, 최종 렌더 상태는 `viewMode`가 결정한다.

### `me`

- 개인 점수, 준비 상태, 현재 팀, 개인 관전 상태의 기준이다.
- `MyScoreCard`, `ReadyPanel`, `SpectatorBanner`가 직접 읽는다.

### `visibility`

- 어떤 데이터가 공개 / 자기 전용 / 비공개인지 결정한다.
- `PrivacyMask`가 가장 먼저 읽는 필드다.

### `redacted`

- 공개되지 않는 값의 축약본이다.
- `RedactedField`, `PrivacyMask`, `ResultsSummary`가 참조한다.

### `players`

- 참가자 목록, 팀 로스터, 관전용 로스터에 사용한다.
- `PlayerRoster`, `TeamAssignmentBoard`, `RedactedPlayerRow`가 읽는다.

### `stage`

- 사건 정보, 타이머, 힌트, 조사실, 관전, 결과의 기준이다.
- `StageHUD`, `CasePanel`, `HintRail`, `InvestigationDrawer`, `SpectatorBanner`, `ResultsSummary`가 읽는다.
- `QuestionJudgeBadge`, `AnswerJudgeBadge`는 여기서 `publicReply`, `publicOutcome`, `publicSummary`만 추출해 쓴다.

### `scores`

- 본인 점수, 결과 순위, 스테이지 요약의 기준이다.
- `MyScoreCard`, `ScoreCard`, `RankingTable`, `PersonalScoreBreakdown`가 읽는다.

## 3. viewMode to UI mapping

- `lobby_waiting` -> `LobbyShell`, `ReadyPanel`, `RoomStatusBadge`
- `ready_confirmed` -> `ReadyPanel`, `RoomStatusBadge`
- `team_assigned` -> `TeamAssignmentBoard`, `PlayerRoster`
- `stage_briefing` -> `StageBriefingPanel`, `StageStartCountdown`, `StageRuleBulletList`
- `stage_playing` -> `StageHUD`, `CasePanel`, `HintRail`, `ChatRail`, `MyScoreCard`
- `investigation_active` -> `InvestigationDrawer`, `QuestionComposer`, `AnswerComposer`
- `solved_spectator` -> `SpectatorBanner`, `SolvedLockSummary`, `ProgressLogFeed`
- `stage_results` -> `StageResultsSummary`, `RankingTable`, `PersonalScoreBreakdown`
- `game_results` -> `GameResultsSummary`, `RankingTable`, `PersonalScoreBreakdown`

## 4. field to component mapping

### Lobby

- `viewMode`
- `me.isReady`
- `players`
- `visibility.players`
- `redacted.otherPlayers`

### Briefing

- `viewMode`
- `stage.publicTitle`
- `stage.publicDescription`
- `stage.remainingSeconds`
- `stage.visibleHints`
- `stage.redacted`

### Gameplay

- `viewMode`
- `me.totalScore`
- `me.stageScore`
- `stage.imageUrl`
- `stage.remainingSeconds`
- `stage.visibleHints`
- `scores`
- `visibility.scores`

### Investigation

- `viewMode`
- `stage.investigation`
- `stage.lastQuestionJudgement`
- `stage.lastAnswerResult`
- `redacted.stageSecrets`
- `visibility.investigation`

### Spectator

- `viewMode`
- `me.solvedLocked`
- `stage.solvedPlayerIds`
- `stage.endReason`
- `redacted.stageSecrets`

### Results

- `viewMode`
- `results`
- `scores`
- `stage`
- `redacted.otherScores`

## 6. judgement payload 안정화 메모

- `QuestionJudgeBadge`는 `stage.lastQuestionJudgement.publicReply`만 쓴다.
- `AnswerJudgeBadge`는 `stage.lastAnswerResult.publicOutcome`만 쓴다.
- `SpectatorBanner`는 `stage.lastAnswerResult.publicSummary` 또는 stage 공개 summary만 쓴다.
- `ResultsSummary`는 공개 summary만 1차 입력으로 쓰고 내부 reason/keyword payload는 받지 않는다.

## 5. Agent 1 API shape 연결 메모

- `RoomSnapshot.viewMode`는 route guard와 화면 전환의 우선순위 기준이다.
- `RoomSnapshot.me`는 `sessionSlice`, `lobbySlice`, `teamSlice`, `scoreSlice`의 source of truth다.
- `RoomSnapshot.visibility`는 `privacySlice`의 source of truth다.
- `RoomSnapshot.redacted`는 `RedactedField`와 `PrivacyMask`의 fallback source다.
- `RoomSnapshot.players`는 roster와 team assignment 뷰의 source of truth다.
- `RoomSnapshot.stage`는 gameplay, investigation, spectator, results의 source of truth다.
- `RoomSnapshot.scores`는 score cards와 ranking table의 source of truth다.
