# live-store.ts Split Plan

`src/server/live-store.ts` is 7,891 lines and concentrates room, player, stage,
investigation lock, queue, private chat, AI judgement, score, case catalog,
case generation, snapshot construction, realtime broadcast, and admin log
fallbacks in one file. This document maps the domains, defines target file
paths, and orders the moves by safety.

This plan is **planning only** — three other agents are editing this file in
parallel, so no relocations are executed here. The plan is structured so each
extraction can land as an isolated PR that re-exports from `live-store.ts`
during transition.

## 1. Domain inventory (line ranges anchored to current file)

| # | Domain | Proposed target | Current lines | Notes |
|---|---|---|---|---|
| 1 | DB row types | `src/server/live-store/types.ts` | 91-326 | Pure types, zero runtime risk |
| 2 | Constants & blueprints | `src/server/live-store/constants.ts` | 327-381 | `ROOM_CODE_ALPHABET`, durations, `CASE_REFERENCE_BLUEPRINTS`, `CASE_DIVERSITY_AXES` |
| 3 | Public error classes | `src/server/live-store/errors.ts` | 422-566 | `RoomJoinError`, `RoomSettingsError`, `LeaveRoomError`, `AssignTeamsError`, `StartStageError`, `AdvanceStageError`, `InvestigationLockError`, `PrivateChatError` |
| 4 | Row -> contract mappers | `src/server/live-store/mappers.ts` | 692-901 | `toRoom`, `toPlayer`, `toTeamSlot`, `toGame`, `toStage`, `toStageTeamAssignment`, `toPlayerStageState`, `toInvestigationLock`, `toHintReveal`, `toChatMessage`, `toPrivateChatRequest`, `toPrivateChatSession`, `toScoreEvent`, `toRoomSettings`, plus the `resolveRoom*` / `normalizeRoom*` / `isLegacy*` helpers |
| 5 | Text utilities (keyword/JSON parsing) | `src/server/live-store/text-utils.ts` | 903-987, 939-972 | `normalizeKeywordText`, `includesNormalized`, `mapQuestionJudgementToPublicReply`, `mapQuestionJudgementToStoredJudgement`, `isRecord`, `extractJsonObject`, `asStringArray`, `resolveKeywordSubset` |
| 6 | AI judgement adapter | `src/server/live-store/judgement.ts` | 989-1374 | `buildVisibleHintTexts`, `classifyQuestionJudgementFallback`, `classifyAnswerAttemptFallback`, `resolveQuestionJudgement`, `resolveAnswerJudgement`, `cloneSnapshotWithQuestionJudgement`, `cloneSnapshotWithAnswerResult`, `createJudgementRequestBase`, `createQuestionJudgementRequest`, `createAnswerJudgementRequest`, `createQuestionJudgementResponse`, `createAnswerJudgementResponse`, `createJudgementEnvelope`, `persistJudgementRecord` |
| 7 | Private chat helpers + APIs | `src/server/live-store/private-chat.ts` | 1376-1442, 2216-2302, 7281-7651 | `isPrivateChatSessionActive`, `isPendingPrivateChatRequest`, `resolveLatestPrivateChatRequest`, `resolvePrivateChatCooldownEndsAt`, `assertPrivateChatStageActive`, `assertPrivateChatPlayerActive`, `findActivePrivateChatSessionForPlayer`, `resolvePrivateChatSessionPartner`, `applyPendingPrivateChatResolution`, `requestPrivateChatInStore`, `respondPrivateChatInStore`, `endPrivateChatInStore` |
| 8 | Queue / view mode helpers | `src/server/live-store/queue.ts` | 1443-1513, 2107-2214 | `resolveQueuedInvestigationPlayerStates`, `resolveInvestigationQueuePosition`, `resolveQueueCooldownEndsAt`, `resolveViewMode`, `resolveInvestigationQueueCooldownEndsAt`, `applyInvestigationQueueCooldown`, `admitNextInvestigationQueuePlayer` |
| 9 | Snapshot builder | `src/server/live-store/snapshot.ts` | 1515-1853, 2064-2104 | `buildRoomSnapshot`, `SyncedLobbyState` type, `buildSnapshotFromState`, `resolvePlayerStageState`, `resolvePlayerTeamSlotId` |
| 10 | Lobby state loader | `src/server/live-store/lobby-state.ts` | 1856-2062, 2303-2315 | `findRoomByRef`, `loadLobbyState`, `loadSyncedLobbyState`, `broadcastSync` |
| 11 | Case catalog (read) | `src/server/live-store/case-catalog.ts` | 2317-2632, 3000-3013, 3016-3113, 3566-3705 | `parseCaseHints`, `parseCaseFilePayload`, `isCaseCatalogUnavailableError`, `loadIndexedCaseFiles`, `loadBundledCatalogCases`, `loadLocalCatalogCases`, `ensureCaseCatalogSeeded`, `mapCaseLibraryRowToCaseFile`, `loadCaseLibraryCaseFile`, `loadLocalCaseFile`, `loadCaseSummary`, `loadCaseFile`, `resolvePlayerIdentityKey`, `listCaseLibraryRows`, `listPlayerCaseHistoryRows`, `choosePracticePoolCaseKey`, `chooseSharedUnseenCatalogCaseKey`, `getCaseFileOrThrow`, `getCaseImageDataUrlFromStore` |
| 12 | Case generation (AI) | `src/server/live-store/case-generation.ts` | 2634-2997, 3115-3565 | `isGeneratedPracticeCasePayload`, `loadPracticeGeneratedCaseFile`, `buildPracticeImageFallbackDataUrl`, `toDataUrl`, `buildFallbackPracticeCase`, `generatePracticeCaseFile`, `persistPracticeGeneratedCase`, `hasConfiguredGmsRuntime`, `shuffleArray`, `recordCaseHistoryForPlayers`, `buildCatalogImagePrompt`, `buildStrictCatalogImagePrompt`, `generateCatalogCaseDefinition`, `generateCatalogCaseAsset`, `insertCatalogCase`, `generateAndStoreCaseBatch` |
| 13 | Room CRUD | `src/server/live-store/rooms.ts` | 3707-4090, 4106-4247, 7789-7891 | `createUniqueRoom`, `createRoomInStore`, `assertJoinableRoom`, `joinRoomInStore`, `assertRoomSettingsChangeAllowed`, `updateRoomSettingsInStore`, `getRoomSnapshotFromStore`, `listRoomDirectoryFromStore` |
| 14 | Player / presence | `src/server/live-store/players.ts` | 4249-4787 | `isHostLikeRole`, `isPracticeRoom`, `getReadyRequiredPlayers`, `isLobbyReadyForStart`, `resolveLobbyStatus`, `isPresenceManagedRoomStatus`, `isPlayerPresenceStale`, `cleanupViewerRoomMemberships`, `removePlayerFromRoomRecord`, `resolveStageSolvedPlayerIdsForCurrentPlayers`, `resolveRequiredSolvedPlayerCount`, `reconcileRoomAfterPlayerRemoval`, `cleanupStalePlayersInRoom`, `cleanupStalePlayersInRoomDirectory`, `touchPlayerPresence`, `touchRoomPresenceInStore`, `leaveRoomInStore`, `setReadyInStore` |
| 15 | Stage lifecycle | `src/server/live-store/stage.ts` | 4841-5319, 6366-6688 | `assertAssignableRoomState`, `ensurePendingStage`, `assignTeamsInStore`, `assertStartableStageState`, `startStageInStore`, `assertAdvanceStageState`, `advanceStageInStore`, `minIsoTimestamp`, `resolveStageBriefingEndsAt`, `resolveStageTimerStart`, `resolveStageTimerCutoff`, `syncDerivedStageState` |
| 16 | Investigation lock / queue | `src/server/live-store/investigation.ts` | 5321-5649 | `assertLockableStageState`, `joinInvestigationQueueInStore`, `leaveInvestigationQueueInStore`, `acquireInvestigationLockInStore`, `releaseInvestigationLockInStore` |
| 17 | Question / answer submission | `src/server/live-store/qa-submit.ts` | 5651-6154, 6849-7279 | `submitQuestionInStore`, `assertQuestionSubmissionState`, `assertAnswerSubmissionState`, `createQuestionRecord`, `createAnswerAttemptRecord`, `submitAnswerInStore` |
| 18 | Score event persistence | `src/server/live-store/scores.ts` | 885-901, 6250-6346, 6690-6808 | `buildScoreLedger`, `toScoreEventRow`, `buildQuestionCostScoreEvent`, `buildWrongAnswerCostScoreEvent`, `buildStageEndPenaltyEvents`, `sumTimeTickQuantityForPlayer`, `persistScoreEventsAndSyncTotals`, `persistScoreEventsAndSyncAffectedTotals`, `saveFinishedGameResults` |
| 19 | Chat (room channel) | `src/server/live-store/chat.ts` | 7738-7787 | `listChatMessagesFromStore`, `sendChatMessageToStore` |
| 20 | Game snapshot reads (admin) | `src/server/live-store/game-snapshots.ts` | 7652-7736 | `listGameSnapshotsFromStore`, `getGameRuntimeSnapshotFromStore` |
| 21 | Tiny utils | `src/server/live-store/ids.ts` | 568-595 | `isUuidLike`, `isPracticeGeneratedCaseKey`, `resolvePracticeGeneratedStageId`, `generateRoomCode`, `createEntityId` |

## 2. Dependency graph (target modules)

Arrows mean "imports from".

```
errors          <-  rooms, players, stage, investigation, qa-submit, private-chat
constants       <-  rooms, players, stage, investigation, qa-submit, private-chat,
                    case-catalog, case-generation
types           <-  every store module
ids             <-  rooms, scores, case-generation, lobby-state
text-utils      <-  judgement, qa-submit
mappers         <-  snapshot, lobby-state, rooms, players, stage, investigation,
                    qa-submit, private-chat, chat, game-snapshots
scores          <-  snapshot, players, stage, investigation, qa-submit
queue           <-  snapshot, investigation, stage, qa-submit
snapshot        <-  rooms, players, stage, investigation, qa-submit, private-chat
                    (uses scores, queue, mappers, judgement)
judgement       <-  qa-submit
lobby-state     <-  rooms, players, stage, investigation, qa-submit, private-chat,
                    game-snapshots  (uses mappers, scores, queue)
case-catalog    <-  rooms, stage, qa-submit
case-generation <-  case-catalog, stage  (depends on case-catalog)
private-chat    <-  no outgoing edges to siblings except lobby-state, snapshot
investigation   <-  lobby-state, snapshot, queue, scores
stage           <-  lobby-state, snapshot, queue, scores, case-catalog
qa-submit       <-  lobby-state, snapshot, judgement, scores, queue, case-catalog,
                    investigation (`admitNextInvestigationQueuePlayer`)
players         <-  lobby-state, snapshot, scores, stage (saveFinishedGameResults)
rooms           <-  lobby-state, snapshot, case-catalog, players
chat            <-  mappers only
game-snapshots  <-  lobby-state, mappers, scores
```

There is no real cycle in the target layout. The single sticky point is that
`players.reconcileRoomAfterPlayerRemoval` needs `scores.saveFinishedGameResults`
and `scores.buildStageEndPenaltyEvents`, and `stage.syncDerivedStageState` also
needs `scores.saveFinishedGameResults` plus the queue helpers. Both are
one-way calls.

## 3. Extraction order (safe -> risky)

1. **types.ts, constants.ts, errors.ts, ids.ts, text-utils.ts** - pure files,
   no runtime references. Move and re-export from live-store.ts.
2. **mappers.ts** - pure functions over DB rows. No DB calls. Re-export.
3. **scores.ts (pure helpers only first)** - `buildScoreLedger`,
   `toScoreEventRow`, `build*ScoreEvent`, `sumTimeTickQuantityForPlayer` move
   first. Persistence (`persistScoreEventsAndSyncTotals`,
   `persistScoreEventsAndSyncAffectedTotals`, `saveFinishedGameResults`)
   ships in a second PR once `lobby-state.ts` exists.
4. **queue.ts** - depends only on mappers/types and one supabase call.
5. **case-catalog.ts (read paths)** - load/case lookup. Keep
   `seededCaseCatalogPromise` module-private.
6. **case-generation.ts** - AI generation, depends on case-catalog.
7. **lobby-state.ts** - `findRoomByRef`, `loadLobbyState`, `loadSyncedLobbyState`,
   `broadcastSync`. This is the load-bearing primitive; once it moves
   everything downstream can move.
8. **snapshot.ts** - depends on lobby-state, scores, queue, mappers.
9. **judgement.ts** - depends only on case-file shape and judgement contracts.
10. **chat.ts, game-snapshots.ts** - trivial readers.
11. **private-chat.ts** - depends on lobby-state, snapshot. Localized; can ship
    independently after step 8.
12. **investigation.ts** - lock/queue API surface. Internal cross-call to
    `admitNextInvestigationQueuePlayer` (now in queue.ts).
13. **stage.ts** - stage transitions + `syncDerivedStageState`. Largest risk
    because it touches games, stages, locks, queue cooldowns, and score events
    in one function.
14. **players.ts** - presence cleanup, leave/ready, reconcile-after-leave.
15. **qa-submit.ts** - last because both `submitQuestion` and `submitAnswer`
    fan out through every other domain.
16. **rooms.ts** - move once everything else is stable.

After step 16, `src/server/live-store.ts` becomes a thin barrel re-exporting
the public API the existing API routes still import (`createRoomInStore`,
`joinRoomInStore`, `RoomJoinError`, ...) so route files stay untouched.

## 4. Transitional rules

- Each PR keeps `live-store.ts` re-exporting every public symbol so API
  routes do not need to change.
- Internal helpers that move to a sibling file are re-imported into
  `live-store.ts` only when another remaining-in-place function uses them.
  Once that consumer also moves, the import is dropped.
- No PR may both move a symbol and change its signature in the same diff.
- Test coverage gate: run `npm run typecheck` + integration smoke before
  every PR.

## 5. Open questions / risks

- `seededCaseCatalogPromise` is module-private state; placing it inside
  `case-catalog.ts` works as long as nothing else relies on it being a single
  shared instance. It is currently only used inside `ensureCaseCatalogSeeded`.
- `broadcastSync` lives close to `loadLobbyState`. If a future PR splits
  realtime emission into `src/server/realtime/`, plan ahead so `broadcastSync`
  imports from there rather than re-implementing the channel name.
- `qa-submit.submitAnswerInStore` is by far the heaviest function; it should
  also be the first target for "extract internal helpers without changing the
  exported function" refactors (e.g. `applyStageEndCascade`,
  `applyAnswerLockSideEffects`).
