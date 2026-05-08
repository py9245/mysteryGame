# State Slices

## 1. 목적

이 문서는 Agent 2 프론트엔드가 어떤 상태를 화면 단위로 나눠서 들고 있어야 하는지 정리한다.

`RoomSnapshot`을 그대로 들고 가기보다, 화면별로 필요한 조각만 slice로 쪼갠다.

## 2. 예상 state slices

### `sessionSlice`

- `playerId`
- `nickname`
- `roomCode`
- `connectionStatus`
- `screenMode`

### `lobbySlice`

- `roomStatus`
- `isReady`
- `playerList`
- `readyCount`

### `teamSlice`

- `currentStageNumber`
- `myTeamSlotId`
- `visibleTeammates`
- `assignmentSummary`

### `stageSlice`

- `caseTitle`
- `publicDescription`
- `imageUrl`
- `remainingSeconds`
- `publicHints`

### `investigationSlice`

- `lockedByPlayerId`
- `remainingLockSeconds`
- `remainingQuestionCount`
- `remainingAnswerAttemptCount`
- `lastQuestionJudgement`
- `lastAnswerResult`

### `scoreSlice`

- `myTotalScore`
- `myStageDelta`
- `myRank`
- `finalRanking`

### `chatSlice`

- `teamMessages`
- `globalMessages`
- `privateChatRequests`
- `privateChatSessions`

### `privacySlice`

- `isRedacted`
- `hiddenPlayerIds`
- `hiddenMessageIds`
- `publicVisibilityMode`

## 3. 상태 합성 규칙

- `sessionSlice`는 나머지 모든 slice의 기준 키를 제공한다.
- `lobbySlice`는 대기실과 준비완료 UI에만 직접 연결한다.
- `stageSlice`는 메인 게임, 조사실, 관전, 결과 화면에서 재사용한다.
- `privacySlice`는 화면 렌더 이전에 항상 먼저 적용한다.
- `scoreSlice`는 스테이지 중에는 `me`만, 게임 종료 후에는 전체 순위를 합성한다.
- 모든 slice는 `RoomSnapshot`에서 파생되며 raw backend state를 직접 읽지 않는다.

## 4. Agent 1 연동 포인트

- `sessionSlice`: `RoomSnapshot.viewMode`, `me`, `room`
- `lobbySlice`: `RoomSnapshot.me.isReady`, `players`, `visibility.players`, `redacted.otherPlayers`
- `teamSlice`: `RoomSnapshot.players`, `teamSlots`, `currentAssignments`
- `stageSlice`: `RoomSnapshot.stage`, `visibleHints`, `viewMode`
- `investigationSlice`: `RoomSnapshot.stage.investigation`, `stage.lastQuestionJudgement`, `stage.lastAnswerResult`
- `scoreSlice`: `RoomSnapshot.me.totalScore`, `RoomSnapshot.me.stageScore`, `scores`
- `chatSlice`: `RoomSnapshot.privateChat`, `stage`, `game`
- `privacySlice`: `RoomSnapshot.visibility`, `RoomSnapshot.redacted`

## 5. Agent 3 연동 포인트

- `stageSlice.publicHints`
- `investigationSlice.lastQuestionJudgement`
- `investigationSlice.lastAnswerResult`
- `results` 관련 copy payload
