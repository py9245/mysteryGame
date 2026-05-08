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
  return (
    <section data-outcome={publicOutcome ?? "none"}>
      <h3>{titleKey}</h3>
      <p>{summaryKey}</p>
      <p>{publicSummary ?? "No public summary"}</p>
    </section>
  );
}
