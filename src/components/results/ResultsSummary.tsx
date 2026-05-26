function getOutcomeBadge(outcome: "correct" | "wrong" | "needs_review" | null): {
  label: string;
  tone: "live" | "alert" | undefined;
} {
  if (outcome === "correct") return { label: "정답 인정", tone: "live" };
  if (outcome === "wrong") return { label: "정답 미인정", tone: "alert" };
  if (outcome === "needs_review") return { label: "운영자 확인", tone: "alert" };
  return { label: "공개 대기", tone: undefined };
}

export function ResultsSummary({
  titleKey,
  summaryKey,
  publicSummary,
  publicOutcome,
}: {
  titleKey: string;
  summaryKey: string;
  publicSummary: string | null;
  publicOutcome: "correct" | "wrong" | "needs_review" | null;
}) {
  const badge = getOutcomeBadge(publicOutcome);
  return (
    <section
      className="panel panel-muted track-d-results-summary"
      data-outcome={publicOutcome ?? "none"}
      data-title-key={titleKey}
      data-summary-key={summaryKey}
    >
      <div className="composer-header">
        <div>
          <p className="eyebrow">결과 요약</p>
          <h3 className="panel-title">사건 흐름 요약</h3>
          <p className="panel-copy">공개 가능한 사건 해설을 정리합니다.</p>
        </div>
        <span className="status-badge" data-tone={badge.tone}>
          {badge.label}
        </span>
      </div>
      <p className="track-d-results-summary-body">
        {publicSummary ?? "아직 공개 가능한 요약이 없습니다."}
      </p>
    </section>
  );
}
