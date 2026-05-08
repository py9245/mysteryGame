export function QuestionJudgeBadge({
  resultKey,
  publicReply,
}: {
  resultKey: string;
  publicReply: string;
}) {
  return (
    <div className="message-note" data-result-key={resultKey}>
      질문 응답: {publicReply}
    </div>
  );
}
