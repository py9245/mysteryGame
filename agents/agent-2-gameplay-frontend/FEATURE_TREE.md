# Feature Tree

## 1. 기능 모듈 분리 기준

- `lobby`: 입장, 준비, 대기실
- `briefing`: 스테이지 시작 전 안내
- `gameplay`: 사건 노출, 타이머, 개인 점수, 채팅
- `investigation`: 조사실 입장, 질문, 정답 시도
- `spectator`: 정답 성공 후 관전
- `results`: 스테이지 결과, 게임 최종 결과
- `chat-ui`: 팀 채팅, 전체 채팅, 1:1 채팅 UI
- `privacy`: 비공개 정보 차단, redaction
- `score-ui`: 개인 점수 카드, delta 표시, 결과 요약

## 2. 예상 모듈 트리

```text
src/features/
  lobby/
    LobbyShell.tsx
    ReadyPanel.tsx
    RoomStatusBadge.tsx
  briefing/
    StageBriefingPanel.tsx
    StageStartCountdown.tsx
    StageRuleBulletList.tsx
  gameplay/
    StageHUD.tsx
    CasePanel.tsx
    CaseImageFrame.tsx
    HintRail.tsx
    InvestigationEntryButton.tsx
    MyScoreCard.tsx
  investigation/
    InvestigationDrawer.tsx
    InvestigationLimitMeter.tsx
    QuestionComposer.tsx
    AnswerComposer.tsx
    QuestionJudgeBadge.tsx
    AnswerJudgeBadge.tsx
  spectator/
    SpectatorBanner.tsx
    SolvedLockSummary.tsx
    ProgressLogFeed.tsx
  results/
    StageResultsSummary.tsx
    GameResultsSummary.tsx
    RankingTable.tsx
    PersonalScoreBreakdown.tsx
  chat-ui/
    ChatRail.tsx
    TeamChatPanel.tsx
    GlobalChatPanel.tsx
    ChatComposer.tsx
  privacy/
    PrivacyMask.tsx
    RedactedPlayerRow.tsx
  score-ui/
    ScoreCard.tsx
    ScoreDeltaBadge.tsx
```

## 3. 기능 책임

- `lobby`: 입장과 준비 상태를 빠르게 이해시키는 책임
- `briefing`: 현재 스테이지의 시작 조건과 주의사항을 보여주는 책임
- `gameplay`: 메인 사건 화면과 본인 점수 노출 책임
- `investigation`: 조사실 진입과 제한된 입력 책임
- `spectator`: 정답 성공 후 입력 UI 제거와 관전 전환 책임
- `results`: 스테이지/게임 종료 요약 책임
- `chat-ui`: 팀/전체/1:1 채팅 표시 책임
- `privacy`: 다른 플레이어 정보 숨김 책임
- `score-ui`: 개인 점수와 점수 변화 시각화 책임

## 4. Agent 1 연동 포인트

- `RoomStatusBadge`
- `ReadyPanel`
- `StageHUD`
- `InvestigationDrawer`
- `ScoreCard`
- `RankingTable`

위 컴포넌트는 Agent 1이 제공하는 `view model`과 직접 연결된다.

## 5. Agent 3 연동 포인트

- `StageBriefingPanel`
- `HintRail`
- `QuestionComposer`
- `AnswerComposer`
- `StageResultsSummary`
- `GameResultsSummary`

위 컴포넌트는 Agent 3가 제공하는 copy와 hint payload를 사용한다.
