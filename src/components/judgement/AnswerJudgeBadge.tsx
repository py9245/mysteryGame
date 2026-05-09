export function AnswerJudgeBadge({
  successKey,
  failureKey,
  needsReviewKey,
  publicOutcome,
}: {
  successKey: string;
  failureKey: string;
  needsReviewKey: string;
  publicOutcome: "correct" | "wrong" | "needs_review";
}) {
  const label =
    publicOutcome === "correct"
      ? "정답으로 인정되었습니다."
      : publicOutcome === "wrong"
        ? "정답으로 인정되지 않았습니다."
        : "운영자 확인이 필요합니다.";

  return (
    <div
      className={publicOutcome === "correct" ? "message-positive" : publicOutcome === "wrong" ? "message-negative" : "message-note"}
      data-outcome={publicOutcome}
      data-success-key={successKey}
      data-failure-key={failureKey}
      data-needs-review-key={needsReviewKey}
    >
      <span className="metric-label">최근 정답 판정</span>
      <p className="panel-copy" style={{ margin: "6px 0 0" }}>
        {label}
      </p>
    </div>
  );
}
