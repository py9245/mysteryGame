# Mock State

## 1. 목적

이 파일은 API가 완성되기 전 Agent 2가 화면을 그릴 수 있도록 하는 더미 상태 예시다.

## 2. 예시 상태

```json
{
  "room": {
    "id": "room-001",
    "code": "A7K3",
    "status": "waiting"
  },
  "me": {
    "playerId": "player-02",
    "nickname": "Mina",
    "teamSlotId": "team-blue",
    "isReady": true,
    "screenMode": "lobby_waiting",
    "totalScore": 1240,
    "stageScoreDelta": -30,
    "isSolvedLocked": false
  },
  "players": [
    {
      "playerId": "player-01",
      "nickname": "Jun",
      "teamSlotId": "team-red",
      "visibleScore": null,
      "status": "active"
    },
    {
      "playerId": "player-02",
      "nickname": "Mina",
      "teamSlotId": "team-blue",
      "visibleScore": 1240,
      "status": "active"
    },
    {
      "playerId": "player-03",
      "nickname": "Sora",
      "teamSlotId": "team-green",
      "visibleScore": null,
      "status": "active"
    }
  ],
  "stage": {
    "number": 1,
    "status": "stage_playing",
    "remainingSeconds": 412,
    "publicHints": [
      {
        "index": 1,
        "content": "현장은 비가 온 직후였다."
      }
    ],
    "case": {
      "title": "사라진 약혼반지",
      "publicDescription": "결혼식 전날, 신부의 약혼반지가 사라졌다.",
      "imageUrl": "/mock/cases/ring-room.jpg"
    }
  },
  "investigation": {
    "lockedByPlayerId": "player-02",
    "remainingLockSeconds": 14,
    "remainingQuestionCount": 2,
    "remainingAnswerAttemptCount": 1,
    "lastQuestionJudgement": "YES"
  },
  "chat": {
    "team": [
      {
        "id": "msg-01",
        "senderNickname": "Mina",
        "content": "금고 열쇠부터 확인하자."
      }
    ],
    "global": [
      {
        "id": "msg-02",
        "senderNickname": "Jun",
        "content": "우리 팀은 현장 정리 중."
      }
    ]
  },
  "resultPreview": {
    "isAvailable": false,
    "ranking": []
  }
}
```

## 3. 화면별 사용법

- 대기실 화면은 `room`, `me`, `players`만 사용한다.
- 메인 게임 화면은 `stage`, `me`, `chat`을 사용한다.
- 조사실 화면은 `investigation`만 별도 패널로 사용한다.
- 관전 화면은 `me.isSolvedLocked`를 기준으로 입력 UI를 제거한다.
- 결과 화면은 `resultPreview`와 stage summary를 조합한다.

## 4. 비공개 차단 예시

- `players[].visibleScore`는 게임 종료 전 `null`이 기본이다.
- 질문 로그와 정답 로그는 mock state에 넣더라도 팀/개인에게 공개될 형태만 써야 한다.
- 다른 플레이어의 원문 답변은 이 파일에 샘플로 넣지 않는다.
