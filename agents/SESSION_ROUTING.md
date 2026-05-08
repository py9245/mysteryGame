# Agent Session Routing

## 목적

`/home/yusin/mysteryGame/app/agents` 아래의 3개 폴더에 들어갔을 때만 `Codex 로그인 세션`이 분리되도록 만든 설정이다.

그 외 모든 경로에서는 기존 전역 세션 동작을 그대로 유지한다.

---

## 적용 범위

다음 경로에서만 별도 `CODEX_HOME`이 적용된다.

- `/home/yusin/mysteryGame/app/agents/agent-1-platform-backend`
- `/home/yusin/mysteryGame/app/agents/agent-2-gameplay-frontend`
- `/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content`

경로별 매핑:

- `agent-1-platform-backend` -> `/home/yusin/.codex-agent-homes/mysteryGame-agent1`
- `agent-2-gameplay-frontend` -> `/home/yusin/.codex-agent-homes/mysteryGame-agent2`
- `agent-3-ai-admin-content` -> `/home/yusin/.codex-agent-homes/mysteryGame-agent3`

---

## 동작 방식

1. Bash 프롬프트가 표시될 때 현재 작업 디렉터리를 확인한다.
2. `app/agents` 아래 특정 에이전트 폴더에 있으면 그 에이전트 전용 `CODEX_HOME`을 설정한다.
3. 그 상태에서 `codex`를 실행하면 `cli_auth_credentials_store="file"` 옵션도 함께 강제한다.
4. 그 폴더를 벗어나면 원래의 `CODEX_HOME` 값으로 복구하거나, 원래 값이 없었다면 unset 한다.

즉 `세션 분리`는 에이전트 폴더에서만 일어나고, 나머지 디렉터리에서는 기존 전역 `~/.codex` 기준 동작으로 돌아간다.

---

## 중요한 점

- 이 설정은 `bash` 인터랙티브 셸 기준이다.
- 이미 열려 있는 셸에는 즉시 반영되지 않을 수 있으므로 `source ~/.bashrc` 또는 새 터미널이 필요하다.
- 세 에이전트는 각자 한 번씩 `codex login`을 따로 해야 완전히 다른 계정 세션을 쓸 수 있다.
- 에이전트 폴더 안에서는 인증 정보가 `keyring`이 아니라 각 에이전트 전용 `CODEX_HOME/auth.json`에 저장되도록 강제한다.
- 전역 공용 세션은 그대로 유지된다.

---

## 추천 사용 방식

1. 일반 작업은 저장소 아무 위치에서 평소처럼 `codex`를 실행한다.
2. 특정 에이전트 계정으로 작업할 때만 해당 에이전트 폴더로 이동한다.
3. 그 폴더 안에서 `codex`를 실행하면 그 에이전트 전용 세션이 적용된다.

예시:

```bash
cd /home/yusin/mysteryGame/app/agents/agent-1-platform-backend
codex
```

이때만 `agent1` 전용 세션이 사용된다.
