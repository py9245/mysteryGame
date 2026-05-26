import type { GameplayRuntimeOverview } from "./game-runtime-view-model";

export function GameRuntimePanel({ overview }: { overview: GameplayRuntimeOverview }) {
  return (
    <section className="panel panel-accent track-c-runtime-panel" aria-label="런타임 상황판">
      <div className="composer-header track-c-runtime-panel__head">
        <div>
          <h3 className="panel-title">상황판</h3>
          <p className="panel-copy">{overview.contextLabel}</p>
        </div>
        <span className="status-badge">{overview.sourceLabel}</span>
      </div>
      <ul className="surface-list track-c-runtime-panel__list">
        {overview.signals.map((signal) => (
          <li className="assignment-card track-c-runtime-panel__item" key={signal.label}>
            <strong>{signal.label}</strong>
            <span className="track-c-runtime-panel__value">{signal.value}</span>
            <div className="roster-meta">{signal.detail}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
