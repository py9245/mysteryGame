export function StatusBanner({
  label,
  body,
  tone = "note",
}: {
  label: string;
  body: string;
  tone?: "live" | "alert" | "note";
}) {
  return (
    <section className="panel panel-muted utility-card">
      <div className="composer-header">
        <div>
          <h3 className="panel-title">{label}</h3>
        </div>
        <span className="status-badge" data-tone={tone === "note" ? undefined : tone}>
          {tone === "live" ? "연결" : tone === "alert" ? "대기" : "안내"}
        </span>
      </div>
      <p className="message-note">{body}</p>
    </section>
  );
}
