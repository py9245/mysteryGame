"use client";

export function StatusBanner({
  label,
  body,
  tone = "note",
  onRetry,
  retryLabel = "다시 시도",
}: {
  label: string;
  body: string;
  tone?: "live" | "alert" | "note";
  onRetry?: () => void;
  retryLabel?: string;
}) {
  const badgeTone = tone === "note" ? undefined : tone;
  const badgeLabel = tone === "live" ? "연결" : tone === "alert" ? "대기" : "안내";

  return (
    <section
      className="panel panel-muted utility-card uiux-fade-up"
      role={tone === "alert" ? "alert" : "status"}
      aria-live={tone === "alert" ? "assertive" : "polite"}
    >
      <div className="composer-header">
        <div>
          <h3 className="panel-title">{label}</h3>
        </div>
        <span className="status-badge" data-tone={badgeTone}>
          {badgeLabel}
        </span>
      </div>
      <p className="message-note">{body}</p>
      {onRetry ? (
        <div className="action-row">
          <button className="button-secondary" type="button" onClick={onRetry}>
            {retryLabel}
          </button>
        </div>
      ) : null}
    </section>
  );
}
