# Agent Progress Ledger

## 목적

이 문서는 PM이 `agent-1`, `agent-2`, `agent-3`의 실제 구현 상태를 짧게 추적하는 운영 원장이다.

원칙:

- 이미 끝난 일과 다음 지시를 분리한다.
- `다음 작업 후보`는 바로 TASK 패킷으로 보낼 수 있을 정도로 구체적으로 적는다.
- 오래된 히스토리보다 `현재 기준점`을 우선한다.

---

## 현재 상태 요약

- 현재 단계: `실DB 게임 루프 확장 + 시간축/결과/관리자 검토 + 플레이어 UX 단순화`
- 최신 계약 변경:
  - `비로그인 랜덤 닉네임 / 로그인 계정` 모델 확정
  - `공개방 / 비밀방 / 연습모드` 방 모드 확정
  - `방 목록 / 제목 검색 / 비밀번호 입장` 흐름 확정
  - `메인 / 대기방 / 게임중 룰북 모달` 계약 확정
  - `전화형 1:1 채팅`과 `질문방 대기열` 규칙 최신화
- live 완료 범위:
  - `방 생성/입장/재조회`
  - `ready`
  - `팀 배정`
  - `브리핑 시작`
  - `조사실 입장/퇴장`
  - `질문 제출`
  - `정답 제출`
  - `score_events`
  - `stage result / game result 저장`
  - `account_game_results` 누적 저장
  - `advance_stage`
  - `judgement_records / judgement_review_queue 저장`
  - `time_tick / timer_expired / expired lock cleanup`
- live 미완료 핵심:
  - `admin review queue` live 노출은 feature flag 뒤에 있음
  - `operator override` 실제 쓰기
  - `private chat`
  - `hint reveal / inactivity penalty` 자동화
  - `realtime polishing`
- UX 상태:
  - 검정 계열 심리전 톤 유지
  - 헤더를 `현재 상태 / 핵심 설명 / 다음 행동` 구조로 통일 중
  - 결과/브리핑/조사실/진행 화면 정보량을 줄이는 방향으로 계속 개선 중

현재 in-progress:

- `2026-05-09 계약 재동기화 라운드`
  - 기획안, shared contracts, PM plan, agent plans에 `로그인/방 모드/룰북` 요구 반영 완료
  - `A1-026` 체크포인트 수신: backend 계약/live-store 확장, typecheck 전 단계
  - `A1-027` 완료: typecheck 복구 + migration/settings route 마감
  - `A2-038` 체크포인트 수신: 홈/방 목록/룰북/40-40-20 UI 구조 반영, backend 타입 blocker 존재
  - `A2-039` 발행: rulebook/onboarding/copy slot 소비 + UI 밀도 축소
  - `A3-026` 완료: auth/room/rulebook/status copy pack 정리
  - `A3-027` 완료: rulebook section order + first-play onboarding guide 정리
  - `A3-028` 완료: room list/settings/password edge-state 카피 보강
- `2026-05-09 agent 재가동 라운드`
  - Agent 1 완료: `private_chat_lifecycle` migration + live-store/API 연결 + snapshot 반영까지 완료
  - Agent 2 완료: `게임 시작 후 40/40/20 메인 화면` 한 슬라이스 마감
  - Agent 3 완료: judgement enum/contract 정리 + `private-chat-policy`, `investigation-queue-policy` + copy slot 반영 완료
  - PM 검증: `npm run typecheck`, `npm run build` 통과
  - PM 검증 blocker: 로컬 API E2E는 Supabase에 최신 migration 미적용(`rooms.mode` 누락) 때문에 중단

---

## 2026-05-09 PM Round

- `A1-020` 완료
  - 조사실 질문/정답 live 로직
  - `questions`, `answer_attempts`, `player_stage_states`, `investigation_locks` 저장
  - 세션 제한 반영
  - 정답 2명 누적 시 stage 종료 상태 반영
- `A1-021` 완료
  - `question_cost`, `wrong_answer_cost`, `unsolved_penalty` score event live 반영
  - snapshot 점수/랭킹을 `score_events` truth source 기준으로 계산
- `A1-022` 완료
  - 최종 스테이지 종료 시 `games.status = finished`, `rooms.status = closed`, `stages.status = revealed`
  - `account_game_results` upsert
- `A1-024` 완료
  - `advance_stage` live 구현
  - stage_result 이후 다음 stage 준비 상태로 복귀
- `A1-025` 완료
  - `judgement_records`, `judgement_review_queue` 저장 연결
- `local-backend` 완료
  - `time_tick` 점수 동기화
  - `timer_expired` stage 종료 / game 종료
  - 만료된 조사실 lock 정리
  - `bonus_keyword_reward` 점수 반영
  - admin review loader를 feature flag 기반 fallback-safe 구조로 조정
- `A2-030` 완료
  - 로비 / 브리핑 / 게임플레이 / 조사실 UX 정리
  - 질문/정답 submit UX와 실제 API 연결
- `A2-031` 완료
  - `지금 해야 할 일` CTA를 전면으로 올림
  - 로비/브리핑/게임플레이/조사실/관전의 시선 분산 요소 축소
- `A2-032` 완료
  - 홈 전적 영역과 결과/관전 화면 서비스형 정리
- `A2-034` 완료
  - stage result 이후 `다음 스테이지 준비` CTA 연결
- `A2-037` 완료
  - 공통 헤더를 `현재 상태 / 핵심 설명 / 다음 행동` 구조로 통일
  - 결과/브리핑/조사실/진행 화면 카드 수와 CTA 우선순위 정리
- `A3-018` 완료
  - 사건 3종의 공개 설명, 질문, 힌트, 운영 메모 강화
  - 브리핑/힌트/판정/결과 카피 팩 강화
- `A3-019` 완료
  - 로그인/회원가입/닉네임/대기실/조사실/관전/결과/프로필용 짧은 서비스 카피 팩 추가
  - `copy-key-map`에 관련 슬롯 매핑 추가
- `A3-020` 완료
  - 결과/프로필/운영자 review 상태용 카피 스키마 정리
- `A3-021` ~ `A3-025` 완료
  - stage 종료 이유, 대기 상태, 결과 CTA, admin review/override 카피 정리
  - 설명형 문장을 줄이고 상태/행동 중심으로 압축

---

## Agent 1

역할:

- Platform / Backend

최근 완료:

- `A1-020`
  - live `submit_question`, `submit_answer`
  - deterministic 임시 판정
  - 락 소유, 세션 제한, 팀 슬롯 검증
  - `solved_locked`, `two_players_solved` 상태 반영
- `A1-021`
  - 질문/오답/미해결 페널티를 `score_events`에 기록
  - `players.total_score`와 snapshot 점수를 `score_events` replay와 동기화
- `A1-024`
  - `advance_stage` live 구현
- `A1-025`
  - `judgement_records`, `judgement_review_queue` 저장 연결
- `A1-027`
  - `room/[roomId] PATCH` 추가
  - `sample-room-snapshot` settings 보강
  - `join` 비밀번호 오류 응답 구분
  - `20260509_000003_room_modes_account_age.sql` 추가
  - `npm run typecheck`, `npm run build` 통과
- `A1-029` 체크포인트
  - `20260509_000004_private_chat_lifecycle.sql` 추가
  - `private_chat_requests`, `private_chat_sessions` lifecycle 필드 확장
  - contracts에 `end_private_chat`, `busy/expired/ended`, `incomingRequests`, `cooldownEndsAt` 추가
- `A1-030` 완료
  - `request_private_chat`, `respond_private_chat`, `end_private_chat` live-store 구현
  - `15초 응답 만료`, `30초 최소 유지`, `10초 재신청 쿨다운`, `같은 팀/자기 자신 차단`, `busy 즉시 처리` 서버 강제
  - 수신자가 하나를 수락하면 관련 pending 요청을 `busy/cancelled`로 정리
  - room snapshot에 `incomingRequests`, `activeSession`, `cooldownEndsAt` 반영
  - `/api/game` validation/dispatch 연결
- `local`
  - `time_tick` 점수 동기화
  - `timer_expired` stage 종료 / game 종료
  - 만료된 조사실 lock 정리
  - `bonus_keyword_reward` 점수 반영
  - admin review loader를 feature flag 기반 fallback-safe 구조로 조정

현재 작업:

- 없음

다음 작업 후보:

- `A1-next`
  - `hint reveal / inactivity penalty` 자동화
- `A1-next`
  - `operator override` 실제 write API
- `A1-next`
  - 조사실/정답 제출 경합 구간 transaction 보강
- `A1-next`
  - stage 종료 시 active private chat 자동 종료
- `A1-next`
  - private chat realtime publish 이벤트 실제 emit 연결

최근 handoff:

- Agent 2는 `questionCountRemaining`, `answerAttemptCountRemaining`, `lastQuestionJudgement`, `lastAnswerResult`만 믿고 UI를 단순화하면 됨
- Agent 3는 `requiredKeywords`, `bonusKeywords` 계약을 유지하면 이후 AI adapter 교체가 쉬움

blocker:

- Codex 응답이 간헐적으로 멈춤. 긴 백엔드 작업은 PM 로컬 수행 가능성 높음.

---

## Agent 2

역할:

- Gameplay / Frontend

최근 완료:

- `A2-030`
  - 로비 흐름을 `준비 -> 팀 배정 -> 브리핑` 중심으로 축소
  - 브리핑 정보량 축소
  - 게임플레이를 `사건 요약 + 조사실 + 힌트 + 채팅` 중심으로 재배치
  - 조사실 질문/정답 submit UX를 live API와 연결
- `A2-031`
  - `지금 해야 할 일` CTA를 전면으로 올림
  - 로비/브리핑/게임플레이/조사실/관전의 시선 분산 요소 축소
- `A2-034`
  - stage result 이후 `다음 스테이지 준비` CTA 연결
- `A2-037`
  - 공통 헤더를 `현재 상태 / 핵심 설명 / 다음 행동` 구조로 통일
  - 결과/브리핑/조사실/진행 화면 카드 수와 CTA 우선순위 정리

현재 작업:

- `A2-039`
  - rulebook / onboarding / identity / room mode copy slot 연결
  - 메인 / 대기방 / 게임중 룰북 진입점 통일
  - 40/40/20 레이아웃 밀도 추가 축소
  - 에이전트 최종 보고는 불안정하지만, 로컬 `typecheck/build` 재검증은 통과
- `A2-040`
  - `게임 시작 후 메인 화면 40/40/20 레이아웃` 한 슬라이스 마감
  - 왼쪽 사건 이미지/요약, 가운데 채팅, 오른쪽 점수/질문방/1:1/행동 카드 위계 확정

다음 작업 후보:

- `A2-next`
  - `privateChat.*`, `investigationQueue.*` copy slot을 실제 UI 패널과 모달에 연결
- `A2-next`
  - timer/hint/operator 상태를 플레이어가 오해 없이 읽는 UI 정리
- `A2-next`
  - investigation / private chat 상세 패널을 우측 rail 위계에 맞춰 상태 우선형으로 정리
- `A2-next`
  - 홈 / 로그인 / 프로필 / 전적 화면 밀도 추가 축소

최근 handoff:

- 프론트는 raw DB 상태 대신 `RoomSnapshot`을 source of truth로 유지
- 공개 판정은 `publicReply`, `publicOutcome`, `publicSummary`만 사용

blocker:

- 없음

주의:

- build는 `npm run typecheck` + `npm run build` 기준으로 함께 확인해야 함

---

## Agent 3

역할:

- AI / Admin / Content

최근 완료:

- `A3-018`
  - 사건 3종의 공개 설명, 질문, 힌트, 운영 메모 강화
  - 브리핑/힌트/판정/결과 카피 팩 강화
- `A3-019`
  - 로그인/회원가입/닉네임/대기실/조사실/관전/결과/프로필용 짧은 서비스 카피 팩 추가
  - `copy-key-map`에 관련 슬롯 매핑 추가
- `A3-020`
  - 결과/프로필/운영자 review 상태용 카피 스키마 정리
- `A3-021` ~ `A3-025`
  - stage 종료 이유, 대기 상태, 결과 CTA, admin review/override 카피 정리
  - 설명형 문장을 줄이고 상태/행동 중심으로 압축
- `A3-026`
  - `identity`, `roomMode`, `rulebook`, `privateChat`, `investigationQueue`, `status` 카피 추가
  - `RulebookModal`, `IdentityPanel`, `RoomModePicker`, `PrivateChatBanner`, `InvestigationQueueBanner`, `StatusBanner` 슬롯 추가
- `A3-027`
  - `rulebookSections`, `onboarding` 카피 추가
  - 메인 / 대기방 / 게임중 룰북 섹션 순서와 첫 플레이 3개 가이드 정리
- `A3-028`
  - `roomList`, `roomPassword`, `practiceMode`, `roomSettings` 카피 추가
  - `RoomDirectoryPanel`, `RoomPasswordModal`, `PracticeModeCard`, `RoomSettingsModal` 슬롯 추가
- `A3-029`
  - question judgement enum을 `YES / NO / MAYBE / IRRELEVANT`로 재정렬
  - `publicSummary`, retry → manual review fallback, view-model 공개 범위 문서화
  - `PARTIAL` 표기 제거
- `A3-030`
  - `private-chat-policy.md`, `investigation-queue-policy.md` 추가
  - 전화형 1:1 채팅, FIFO 질문방 대기열 규칙과 공개 문구 정리
- `A3-031` 완료
  - `privateChat.*`, `investigationQueue.*`, `reviewQueue.*`, `overrideResult.*` copy slot 반영
  - 운영자 review/override 상태 문구와 visibility/admin flow 문서 정리

현재 작업:

- 없음

다음 작업 후보:

- `A3-next`
  - private chat / queue policy를 `copy-pack.json`과 실제 UI slot 명세까지 확장
- `A3-next`
  - hint reveal / timer pressure / operator intervention 카피 보강
- `A3-next`
  - 사건 3종의 브리핑/힌트 템포 미세 조정

최근 handoff:

- Agent 2는 강화된 사건/힌트 카피를 기준으로 화면 위계만 더 단순화하면 됨
- Agent 1은 case JSON의 키워드 계약을 그대로 유지하면 됨

blocker:

- 없음

---

## 다음 라운드 우선순위

1. `admin review queue` live 노출을 feature flag 바깥으로 검증
2. Supabase에 최신 migration 적용 후 private chat / room mode E2E 검증
3. `operator override` 실제 쓰기 흐름
4. `hint reveal / inactivity penalty` 자동화
5. 메인 플레이어 동선 추가 단순화

---

## 최신 검증 기준

- `npm run typecheck`: 통과
- `npm run build`: 통과
- build 메모:
  - Next 내부 type worker가 조용히 죽는 현상이 있어
  - `next.config.mjs`에서 `ignoreBuildErrors`, `ignoreDuringBuilds`를 임시 적용
  - 대신 외부 `tsc`를 별도로 통과시키는 방식으로 유지 중
- 실배포 기준 `Cloudflare ↔ Supabase` 연결 정상
- 실배포 기준 `방 생성/입장/ready/채팅/팀 배정` 검증 완료
