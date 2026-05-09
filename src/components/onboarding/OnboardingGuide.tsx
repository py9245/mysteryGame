import {
  RULEBOOK_META,
  RULEBOOK_ONBOARDING,
  type RulebookScope,
} from "@/components/rulebook/rulebook-content";

export function OnboardingGuide({
  scope = "main",
  variant = "panel",
}: {
  scope?: RulebookScope;
  variant?: "panel" | "inline";
}) {
  const meta = RULEBOOK_META[scope];
  const steps = RULEBOOK_ONBOARDING[scope];

  if (variant === "inline") {
    return (
      <section className="modal-grid rulebook-onboarding-grid">
        <div>
          <h4 className="panel-title">{meta.onboardingTitle}</h4>
          <p className="panel-copy">{meta.onboardingDescription}</p>
        </div>
        {steps.map((step) => (
          <article key={`${scope}-${step.step}`} className="modal-card onboarding-card">
            <span className="metric-label">step {step.step}</span>
            <strong>{step.title}</strong>
            <p>{step.body}</p>
          </article>
        ))}
      </section>
    );
  }

  return (
    <section className="panel panel-muted">
      <div className="composer-header">
        <div>
          <h2 className="panel-title">{meta.onboardingTitle}</h2>
          <p className="panel-copy">{meta.onboardingDescription}</p>
        </div>
      </div>
      <div className="modal-grid rulebook-onboarding-grid">
        {steps.map((step) => (
          <article key={`${scope}-${step.step}`} className="modal-card onboarding-card">
            <span className="metric-label">step {step.step}</span>
            <strong>{step.title}</strong>
            <p>{step.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
