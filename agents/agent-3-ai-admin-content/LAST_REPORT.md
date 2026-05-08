[AGENT_REPORT]
AGENT: Agent 3
TASK_ID: A3-015
STATUS: DONE

변경 파일:
- [src/features/admin/adminCaseData.ts](/home/yusin/mysteryGame/app/src/features/admin/adminCaseData.ts:1)
- [src/features/admin/adminData.ts](/home/yusin/mysteryGame/app/src/features/admin/adminData.ts:1)
- [src/features/admin/AdminShell.tsx](/home/yusin/mysteryGame/app/src/features/admin/AdminShell.tsx:1)
- [src/features/admin/README.md](/home/yusin/mysteryGame/app/src/features/admin/README.md:1)
- [data/cases/README.md](/home/yusin/mysteryGame/app/data/cases/README.md:1)
- [agents/agent-3-ai-admin-content/LAST_REPORT.md](/home/yusin/mysteryGame/app/agents/agent-3-ai-admin-content/LAST_REPORT.md:1)

구현 내용:
- [adminCaseData.ts](/home/yusin/mysteryGame/app/src/features/admin/adminCaseData.ts:1)에 case index entry, case file detail, hint, difficulty/status label, difficulty/status count summary를 위한 typed read model을 추가했다.
- [adminData.ts](/home/yusin/mysteryGame/app/src/features/admin/adminData.ts:38)는 `data/cases/index.json`을 먼저 읽고, 각 `file` 경로를 따라 실제 case JSON을 `Promise.all`로 로드한 뒤 `caseCatalog`로 정규화하도록 확장했다.
- [AdminShell.tsx](/home/yusin/mysteryGame/app/src/features/admin/AdminShell.tsx:43)의 `Case Index` 섹션을 richer read-only view로 바꿨다.
  - total/files count
  - difficulty count
  - status count
  - case별 `title`, `publicDescription`, `question`, `difficulty`, `requiredKeywords`, `bonusKeywords`, `hints(order/trigger/strength/publicText)`, `status`
  - `reviewNotes`
- 기존 AI flow / review queue / override 섹션은 유지했다.
- [src/features/admin/README.md](/home/yusin/mysteryGame/app/src/features/admin/README.md:19), [data/cases/README.md](/home/yusin/mysteryGame/app/data/cases/README.md:1)에 admin runtime이 실제 case file detail을 읽는다는 설명을 추가했다.

테스트/검증:
- `npm run dev -- --hostname 127.0.0.1 --port 3104` 실행 후 `GET /admin` smoke test 수행.
- `curl http://127.0.0.1:3104/admin`에서 아래가 실제 렌더링되는 것을 확인했다.
  - `닫힌 서재의 와인잔`
  - `멈춘 엘리베이터의 3분`
  - `연습실의 잠긴 녹음실`
  - `requiredKeywords`
  - `bonusKeywords`
  - `#1 / time_elapsed / weak`
  - difficulty/status count (`Easy`, `Normal`, `Hard`, `Approved`)
- `npx tsc -p /home/yusin/mysteryGame/app/tsconfig.next.json --noEmit`는 범위 밖 기존 오류인 `src/features/chat-ui/ChatRailClientShell.tsx:69` prop mismatch 때문에 실패했다. 이번 작업의 case loader/UI는 `/admin` compile smoke에서 정상 동작했다.

새 case detail 사용 방법:
- case file 목록은 [data/cases/index.json](/home/yusin/mysteryGame/app/data/cases/index.json:1)에서 유지한다.
- admin runtime은 index의 `file` 값을 따라 실제 case JSON을 읽고 [adminCaseData.ts](/home/yusin/mysteryGame/app/src/features/admin/adminCaseData.ts:99)에서 `caseCatalog`로 정규화한다.
- `/admin`의 `Case Index` 섹션에서 운영자는 각 case의 공개 설명, 질문, keyword 세트, hint 구조, status를 read-only로 바로 확인하면 된다.

다음 handoff:
- Agent 1 또는 메인 에이전트가 이후 case API를 붙일 때 `caseCatalog.cases[*]`의 현재 read model을 admin sample 응답 기준으로 참고할 수 있다.
- 운영자용 richer case UI가 필요해지면 `AdminShell`의 case 섹션을 카드/accordion/table로 재배치하면 된다. 데이터 로딩과 정규화는 이미 준비돼 있다.
- root `tsc`를 다시 녹색으로 돌리려면 범위 밖 오류인 `src/features/chat-ui/ChatRailClientShell.tsx:69`를 별도로 정리해야 한다.

에이전트3_명령_마무리
