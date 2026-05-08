[TASK]
AGENT: Agent 1
TASK_ID: A1-016
OWNER_SCOPE:
- src/contracts/*
- src/server/*
- src/app/api/game/*

당신은 혼자 작업하는 것이 아니다. 다른 에이전트가 동시에 같은 저장소를 만지고 있으니, 다른 사람의 변경을 되돌리지 말고 자신의 소유 범위 안에서만 additive하게 작업하라.

목표:
현재 `POST /api/game` sample command는 `set_ready`, `assign_teams`, `start_stage`까지 열린 상태다. 다음 라운드에서는 `acquire_lock`과 `release_lock` sample command를 추가해 gameplay -> investigation 흐름을 잇는다.

요구사항:
1. 필요한 request validation을 추가하라.
2. `acquire_lock`, `release_lock` 성공 응답은 기존 typed contract에 맞는 sample payload를 반환하라.
3. 기존 구현 command 흐름은 깨지지 않게 유지하라.
4. 필요하면 `src/server/sample-game-command.ts`, `src/server/sample-room-snapshot.ts`, `src/server/sample-game-snapshot.ts`를 additive하게 보강하라.
5. unsupported command 처리와 implementedTypes 목록도 갱신하라.
6. build/typecheck를 확인하라.

응답 형식:
- 변경 파일
- 구현 내용
- 테스트/검증
- 리스크
- 다음 handoff
- 마지막 줄은 반드시 `에이전트1_명령_마무리`
