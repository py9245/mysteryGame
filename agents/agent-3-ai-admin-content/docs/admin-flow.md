# Admin Flow

이 문서는 운영자가 AI 실패를 복구하는 절차를 정의한다.

## 운영자 권한

- 질문 로그 확인
- 정답 제출 로그 확인
- AI 질문 판정 수정
- AI 정답 판정 수정
- 힌트 강제 공개
- 점수 보정 요청
- 스테이지 강제 종료
- `manual_review 대기` 상태 확인
- `reviewQueue.escalated` 항목 승인/반려
- `overrideResult.pending` 상태에서 공개 문구 동기화

## 표준 흐름

1. 운영자는 로그 큐에서 `manual_review` 항목을 본다.
2. 사건과 플레이어 제출문을 함께 확인한다.
3. AI 응답 JSON이 schema를 통과하지 못하면 같은 입력으로 1회 재시도한다.
4. 재시도 후에도 실패하면 raw text snippet과 실패 사유를 남기고 review queue로 보낸다.
5. 필요하면 질문 판정을 수정한다.
6. 필요하면 정답 판정을 수동 승인하거나 거절한다.
7. 수정 결과를 Agent 1이 저장할 수 있는 구조로 내보낸다.
8. Agent 2가 보여줄 공개 문구를 선택한다.
9. 승인 결과는 `승인됨`, `반려됨`, `반영됨`, `재검토 필요` 중 하나로 정리한다.

## 개입 기준

- AI가 확신하지 못할 때
- 질문이 경계 사례일 때
- 정답 판정이 키워드 해석에 실패했을 때
- 버그 또는 데이터 불일치가 발생했을 때
- JSON 파싱 또는 schema 검증이 실패했을 때
- review queue가 `승인 대기` 상태로 오래 머물 때

## 수동 개입 결과

- `question_override`
- `answer_override`
- `hint_force_release`
- `score_adjustment_request`
- `stage_close_request`
