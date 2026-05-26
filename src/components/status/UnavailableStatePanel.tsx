"use client";

import Link from "next/link";

export function UnavailableStatePanel({
  title,
  description,
  retryHref,
  homeHref = "/",
}: {
  title: string;
  description: string;
  retryHref?: string;
  homeHref?: string;
}) {
  const handleRetry = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <main className="page-shell">
      <section className="panel panel-muted uiux-realtime-empty-shell">
        <span className="uiux-realtime-empty-icon" aria-hidden="true">!</span>
        <div>
          <h1 className="panel-title">{title}</h1>
          <p className="panel-copy">{description}</p>
        </div>
        <div className="uiux-realtime-empty-actions">
          {retryHref ? (
            <Link className="button-primary" href={retryHref}>
              다시 시도
            </Link>
          ) : (
            <button className="button-primary" type="button" onClick={handleRetry}>
              다시 시도
            </button>
          )}
          <Link className="button-secondary" href={homeHref}>
            메인으로
          </Link>
        </div>
      </section>
    </main>
  );
}
