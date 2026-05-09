# Agent 2 Current Status

## 이미 완료된 기반

- 홈, 룸 디렉터리, 룰북 기본 구조
- 공개방 / 비밀방 / 연습모드 UI 기반
- 40/40/20 메인 화면 골격
- 브리핑 / 조사실 / 결과 패널 기본 구조
- 로컬 `typecheck`, `build` 통과 기준 복구

## 지금부터의 우선순위

### 1. 메인 / 인증 / 방 찾기 마감

- 게스트/로그인 분리
- 랜덤 닉네임 고정 표현
- 회원가입 / 로그인 / 전적 정리
- empty / search empty / password modal 정리
- 방장 설정 모달 정리

### 2. 룰북 / 온보딩 모달 마감

- `RulebookModal`, `RulebookSections`, `OnboardingGuide`
- 메인 / 대기방 / 게임중 진입점 통일
- Agent 3 카피 슬롯 소비

### 3. gameplay 레이아웃 정리

- 40/40/20 메인 화면 슬라이스 1차 완료
- 사건 / 채팅 / utility rail 위계 조정 완료
- 정보량 축소, 내부 용어 제거 1차 완료
- 다음은 private chat / queue 실제 상태 연결과 상세 패널 정리

### 4. private chat / queue UI 실연결

- request / choose / accept / reject / busy / expire / cooldown
- queue position / auto admit / blocked reason

### 5. 결과 / 전적 / 모바일 마감

- results CTA
- profile / recent history
- 모바일 대응
