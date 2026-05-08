# Backend Integration Checklist

이 문서는 Agent 1 산출물을 공유 app 루트로 반입할 때의 순서와 합류 지점을 정리한 체크리스트다.

## 1. 반입 원칙

- `계약 -> 저장 구조 -> command handler -> realtime -> snapshot -> UI 합류` 순서를 지킨다.
- Agent 1은 backend-owned 범위만 책임지고, app 루트 반입은 통합 단계에서만 한다.
- Agent 2/3와 충돌하는 경우에는 구현보다 계약 정렬을 먼저 한다.

## 2. migration 반입 순서

1. 공통 기반 테이블을 먼저 반입한다.
1. `rooms`, `players`, `team_slots`, `games`, `stages`를 먼저 둔다.
1. `stage_team_assignments`, `player_stage_states`, `questions`, `answer_attempts`, `score_events`, `chat_messages`, `investigation_locks`를 이어서 둔다.
1. `private_chat_requests`, `private_chat_sessions`, `hint_reveals`, `admin_logs`를 반입한다.
1. `judgement_records`, `judgement_review_queue`, `judgement_overrides`는 판정 흐름이 합류되는 시점에 추가한다.
1. `updated_at` 트리거와 인덱스는 해당 테이블이 존재한 뒤에 추가한다.
1. Supabase RLS와 함수는 app 루트에서 auth 구조가 확정된 뒤에 붙인다.

## 3. contracts 반입 순서

1. `src/contracts/game.ts`를 먼저 반입한다.
1. `src/contracts/view.ts`를 반입해 Agent 2용 UI view model을 고정한다.
1. `src/contracts/judgement.ts`를 반입해 Agent 3의 AI 응답과 Agent 1의 저장 구조를 고정한다.
1. `src/contracts/api.ts`를 반입해 command response에 `snapshot`과 judgement command를 붙인다.
1. `src/contracts/events.ts`를 반입해 realtime event 이름을 고정한다.
1. `src/contracts/index.ts`는 마지막에 합쳐서 단일 import 지점을 유지한다.

## 4. API / command handler 우선순위

1. `create_room` / `join_room` / `get_room_state`
1. `set_ready`
1. `assign_teams`
1. `start_stage`
1. `acquire_lock` / `release_lock`
1. `submit_question`
1. `submit_answer`
1. `judge_question`
1. `judge_answer`
1. `operator_override`
1. `request_private_chat` / `respond_private_chat`
1. `close_room`

우선순위 기준은 다음과 같다.

- 먼저 방과 스테이지가 생성되어야 snapshot이 의미를 가진다.
- 그 다음 조사실 락과 점수 이벤트가 붙어야 gameplay loop가 성립한다.
- judgement와 operator override는 마지막에 붙여도 되지만 저장 테이블은 미리 준비되어 있어야 한다.

## 5. realtime / snapshot / judgement 연결 포인트

1. command handler는 먼저 persistence row를 만든다.
1. 그 다음 `buildRoomSnapshot`으로 UI view model을 재생성한다.
1. 마지막에 realtime event를 발행한다.
1. judgement 관련 command는 `judgement_records`를 먼저 쓰고, 필요하면 `judgement_review_queue`를 추가한다.
1. operator override는 `judgement_overrides` append 후 review row 상태 갱신 순서로 처리한다.
1. snapshot은 raw storage를 직접 노출하지 않고 `viewMode`, `me`, `visibility`, `redacted`를 중심으로 내려준다.

## 6. Agent 2 합류 지점

- `RoomSnapshot.viewMode`
- `RoomSnapshot.me`
- `RoomSnapshot.visibility`
- `RoomSnapshot.redacted`
- `RoomSnapshot.players`
- `RoomSnapshot.stage`
- `RoomSnapshot.scores`
- `RoomSnapshot.activeLock`
- `RoomSnapshot.results`

Agent 2는 위 필드만으로 UI를 그릴 수 있어야 한다.

## 7. Agent 3 합류 지점

- `QuestionJudgementRequest` / `QuestionJudgementResponse`
- `AnswerJudgementRequest` / `AnswerJudgementResponse`
- `JudgementStorageEnvelope`
- `ManualReviewRecord`
- `JudgementRecordBase`
- `JudgementReviewQueueItem`
- `JudgementOverrideRecord`

Agent 3는 public payload와 internal payload를 구분해서 반환해야 한다.

## 8. blocker 목록

- Agent 2가 화면을 붙이기 전에 `RoomSnapshot` shape가 흔들리면 안 된다.
- Agent 3가 판정 본문을 바꾸기 전에 `judgement.ts`와 `ai-judgement-flow.md`를 먼저 맞춰야 한다.
- 실제 app 루트에 반입하기 전에는 `snapshot`이 command response마다 포함되는지 반드시 확인해야 한다.
- operator override는 리뷰 큐 상태와 UI 공개 상태를 동시에 갱신해야 하므로 단순 update 한 번으로 끝내면 안 된다.

## 9. 최종 합류 기준

- migration이 app 루트에서 적용 가능해야 한다.
- contracts가 app 루트에서 단일 import 경로로 노출돼야 한다.
- command handler가 snapshot, realtime, judgement 저장을 한 흐름으로 엮을 수 있어야 한다.
- Agent 2와 Agent 3가 backend internal field를 보지 않고도 작업할 수 있어야 한다.
