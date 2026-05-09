export function QuestionJudgeBadge({
  resultKey,
  publicReply,
}: {
  resultKey: string;
  publicReply: string;
}) {
  return (
    <div className="message-note" data-result-key={resultKey}>
      <span className="metric-label">최근 질문 응답</span>
      <p className="panel-copy" style={{ margin: "6px 0 0" }}>
        {publicReply}
      </p>
    </div>
  );
}
