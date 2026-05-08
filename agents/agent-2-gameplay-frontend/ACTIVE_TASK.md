[TASK]
AGENT: Agent 2
TASK_ID: A2-023
OWNER_SCOPE:
- src/app/(player)/*
- src/components/*
- src/features/*

당신은 혼자 작업하는 것이 아니다. 다른 에이전트가 동시에 같은 저장소를 만지고 있으니, 다른 사람의 변경을 되돌리지 말고 자신의 소유 범위 안에서만 additive하게 작업하라.

목표:
현재 player routes는 기능 연결은 되어 있지만 시각적으로 아직 서비스 수준이 아니다. 이번 라운드에서는 [UI_DIRECTION.md](/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend/UI_DIRECTION.md)를 기준으로 홈 / 로비 / gameplay / results의 공통 시각 언어를 끌어올려라.

요구사항:
1. 기능 흐름을 깨지 말고 additive하게 스타일링/레이아웃을 강화하라.
2. `시간`, `내 점수`, `조사실 상태`, `현재 스테이지`가 가장 먼저 읽히게 하라.
3. 홈, 로비, gameplay, results 사이의 공통 shell/panel/stat 패턴을 만든다.
4. flat한 기본 화면이 아니라 사건 파일/추리 보드 느낌이 나는 배경과 카드 계층을 만든다.
5. 모바일에서 화면이 깨지지 않는 수준까지 확인하라.
6. build/typecheck를 확인하라.

응답 형식:
- 변경 파일
- 구현 내용
- 테스트/검증
- 리스크
- 다음 handoff
- 마지막 줄은 반드시 `에이전트2_명령_마무리`
