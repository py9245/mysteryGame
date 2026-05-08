# Supabase Setup

현재 앱 상태:

- 지금 프론트와 API는 sample/mock 응답으로도 동작한다.
- 즉 `지금 바로 화면 배포`는 Supabase 없이도 가능하다.
- 하지만 실제 방 생성, 플레이어 저장, 점수, 채팅, 조사실 락, AI 판정 로그를 영구 저장하려면 Supabase를 붙여야 한다.

## 지금 해야 할 것

1. Supabase에서 새 프로젝트 생성
2. `Project URL`, `publishable key`(또는 legacy `anon key`), `service_role key` 확보
3. DB 스키마에 마이그레이션 적용
4. 로컬 `.env`와 Cloudflare Variables/Secrets에 키 등록
5. 그 다음 코드에서 sample route를 Supabase-backed route로 교체

## 필요한 환경 변수

이 프로젝트는 아래 3개를 기준으로 잡고 있다.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

호환:

- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 우선 사용한다.
- 예전 대시보드 표기인 `NEXT_PUBLIC_SUPABASE_ANON_KEY`도 여전히 인식한다.

정의 위치:

- [src/lib/supabase/env.ts](/home/yusin/mysteryGame/app/src/lib/supabase/env.ts)

## 로컬 설정

1. [`.env.example`](/home/yusin/mysteryGame/app/.env.example)를 보고 `.env`에 아래 값 추가

```env
GMS_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

주의:

- `SUPABASE_SERVICE_ROLE_KEY`는 절대 클라이언트 코드에 노출되면 안 된다.
- `NEXT_PUBLIC_`로 시작하는 값만 브라우저에서 접근 가능하다.

## Cloudflare 설정

Cloudflare Workers 배포 시 아래 값을 넣으면 된다.

Build Variables and Secrets:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GMS_KEY`

Runtime Variables and Secrets:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GMS_KEY`

권장:

- `NEXT_PUBLIC_...` 값은 Variable로 넣어도 된다.
- `SUPABASE_SERVICE_ROLE_KEY`, `GMS_KEY`는 Secret으로 넣는 게 맞다.

## DB 스키마 적용

현재 기본 스키마는 이 파일 하나로 잡혀 있다.

- [supabase/migrations/20260507_000001_initial_schema.sql](/home/yusin/mysteryGame/app/supabase/migrations/20260507_000001_initial_schema.sql)

가장 쉬운 방법:

1. Supabase Dashboard
2. `SQL Editor`
3. 위 SQL 파일 전체 붙여넣기
4. 실행

생성되는 핵심 테이블:

- `rooms`
- `players`
- `team_slots`
- `games`
- `stages`
- `stage_team_assignments`
- `player_stage_states`
- `questions`
- `answer_attempts`
- `score_events`
- `chat_messages`
- `investigation_locks`
- `private_chat_requests`
- `private_chat_sessions`
- `hint_reveals`
- `admin_logs`
- `judgement_records`
- `judgement_review_queue`
- `judgement_overrides`

## Realtime

실제 게임에선 아래 테이블은 Realtime 대상으로 보는 게 맞다.

- `rooms`
- `players`
- `games`
- `stages`
- `player_stage_states`
- `chat_messages`
- `investigation_locks`
- `score_events`
- `hint_reveals`

다만 현재 코드베이스는 아직 sample API 단계라, Realtime을 켜더라도 즉시 소비하지는 않는다.

## Auth

지금 기획 기준에서는 `게스트 닉네임 + 방 코드` 모델로 먼저 가는 게 안전하다.

즉 당장 Supabase Auth를 먼저 붙일 필요는 없다.
우선순위는:

1. DB 스키마
2. API에서 Supabase 읽기/쓰기
3. 그 다음 인증 전략

## 지금 바로 결론

지금 네가 해야 하는 최소 작업은 이것만 하면 된다.

1. Supabase 프로젝트 생성
2. URL / publishable key / service role key 복사
3. `.env`에 넣기
4. Cloudflare에도 같은 값 넣기
5. `20260507_000001_initial_schema.sql` 실행

그 다음 내가 할 일:

- sample `room/game/chat` API를 Supabase 기반으로 하나씩 교체
- 조사실 락, 점수 이벤트, 채팅 저장을 실제 DB로 연결
