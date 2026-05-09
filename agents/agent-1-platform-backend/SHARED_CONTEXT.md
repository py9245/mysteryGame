# Agent 1 Shared Context

## 제품 해석

1. 게임은 `6명 / 3팀 / 팀당 2명`이다.
2. 점수와 정답 성공의 진실 원본은 `개인`이다.
3. 팀은 협력 단위이며 점수 원본이 아니다.
4. 비로그인 사용자는 `랜덤 닉네임`으로 입장하고 수정할 수 없다.
5. 로그인 사용자는 `email / password / age / nickname` 기반 자체 계정을 사용한다.
6. 방 모드는 `public / secret / practice`다.
7. 연습모드는 `1인`, `1스테이지`, `외부 입장 불가`를 서버가 강제한다.

## 서버가 보장해야 할 것

- `ViewerSession`과 `RoomDirectoryEntry` 응답 형식
- room settings 생성/수정/조회 형식
- 비밀방 비밀번호 검증과 오류 코드
- 질문방 FIFO 대기열
- 20초 조사실 세션
- 5초 재대기열 쿨다운
- 1:1 채팅 요청 / 선택 / 수락 / 거절 / 만료 / 종료 / 쿨다운
- 점수 `score_events` 진실 원본
- `RoomSnapshot` view model 일관성

## 현재 핵심 미완료

- private chat live backend
- investigation queue hardening
- hint reveal / inactivity penalty 자동화
- operator review / override 실동작
- 실배포 backend 검증
