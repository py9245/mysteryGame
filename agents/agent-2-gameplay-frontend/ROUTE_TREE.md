# Route Tree

이 문서는 Agent 2가 실제 Next.js 앱에 옮길 때 참고할 예상 라우트 구조다.

## 1. 라우트 원칙

- 실제 앱 루트는 건드리지 않고, 이 문서는 구현 방향만 정한다.
- 화면은 `lobby`, `briefing`, `gameplay`, `investigation`, `spectator`, `results`로 나눈다.
- 공개 정보와 비공개 정보는 라우트가 아니라 `view model`에서 분리한다.

## 2. 예상 라우트 트리

```text
src/app/(player)/
  lobby/
    page.tsx
  room/[roomCode]/
    page.tsx
  stage/[stageNumber]/
    page.tsx
    briefing/
      page.tsx
    gameplay/
      page.tsx
    investigation/
      page.tsx
    spectator/
      page.tsx
    results/
      page.tsx
  game/
    results/
      page.tsx
```

## 3. 라우트별 책임

- `lobby/page.tsx`: 닉네임 입력, 방 입장, 준비완료 전 상태
- `room/[roomCode]/page.tsx`: 대기실과 준비 상태, 팀 배정 진입
- `stage/[stageNumber]/briefing/page.tsx`: 스테이지 시작 전 브리핑
- `stage/[stageNumber]/gameplay/page.tsx`: 메인 게임 화면
- `stage/[stageNumber]/investigation/page.tsx`: 조사실 진입과 질문/정답 입력
- `stage/[stageNumber]/spectator/page.tsx`: 정답 성공 후 관전 전용 상태
- `stage/[stageNumber]/results/page.tsx`: 스테이지 결과 요약
- `game/results/page.tsx`: 게임 종료 후 최종 결과

## 4. Agent 1 연동 위치

- `room/[roomCode]/page.tsx`에서 방/준비 상태 조회
- `stage/[stageNumber]/page.tsx`에서 현재 스테이지 상태 조회
- `game/results/page.tsx`에서 최종 개인 순위 조회

## 5. Agent 3 연동 위치

- `stage/[stageNumber]/gameplay/page.tsx`에서 공개 힌트 및 copy 조회
- `stage/[stageNumber]/investigation/page.tsx`에서 질문/정답 판정 copy 조회
- `stage/[stageNumber]/results/page.tsx`와 `game/results/page.tsx`에서 공개 가능한 정답 설명 조회
