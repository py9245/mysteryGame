# API Expectations

## 1. 목적

이 문서는 Agent 2가 화면을 붙이기 위해 기대하는 최소 API / realtime 입력 형태를 적는다.

이 문서는 구현 계약의 최종본이 아니라 `프론트엔드가 필요로 하는 입출력 모양`을 설명한다.

## 2. 기대 응답 공통 규칙

- 모든 화면 응답은 `screen` 또는 `viewMode`를 포함해야 한다.
- 공개 정보와 비공개 정보는 같은 응답에서 섞지 말고, `visibility` 또는 `redacted` 구조로 분리한다.
- 개인 점수는 `me` 블록에 우선 포함한다.
- 다른 플레이어의 점수는 게임 종료 전에는 기본값으로 포함하지 않는다.

## 3. 화면별 기대 입력

### 3.1 대기실

- room code
- room status
- player list
- ready state
- connection state

### 3.2 팀 배정

- current stage number
- my team slot
- visible teammates
- stage team assignment summary

### 3.3 메인 게임

- case title
- public description
- image url
- remaining time
- my score
- visible hints
- team chat snapshot
- global chat snapshot

### 3.4 조사실

- investigation lock owner
- remaining lock time
- remaining question count
- remaining answer attempt count
- last question judgement
- last answer result

### 3.5 관전 화면

- solved lock flag
- public progress log
- stage timer
- team status
- my own score delta log

### 3.6 결과 화면

- final ranking
- per-stage personal summary
- answer success order
- public answer summary

## 4. Agent 1에게 기대하는 것

- `room.updated`
- `room.ready_changed`
- `teams.assigned`
- `stage.started`
- `stage.timer_updated`
- `investigation.locked`
- `investigation.released`
- `question.submitted`
- `question.judged`
- `answer.submitted`
- `answer.judged`
- `player.solved`
- `score.updated`
- `stage.ended`
- `game.finished`

## 5. Agent 3에게 기대하는 것

- 질문 판정 표시값
- 정답 판정 표시값
- 공개 가능한 힌트 필드
- 결과화면용 공개 정답 설명 범위
- 운영자 개입 시 UI가 보여줘야 하는 상태값

## 6. 프론트엔드 구현 순서

1. mock state를 먼저 렌더링한다.
2. 공개 / 비공개 마스크를 적용한다.
3. 이벤트를 API로 바꾼다.
4. 실시간 갱신을 얹는다.
5. 관전 화면과 결과 화면을 분리한다.
