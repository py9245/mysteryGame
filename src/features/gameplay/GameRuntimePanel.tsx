import type { GameplayRuntimeOverview } from "./game-runtime-view-model";

export function GameRuntimePanel({ overview }: { overview: GameplayRuntimeOverview }) {
  return (
    <section className="panel panel-accent">
      <h3 className="panel-title">상황판</h3>
      <p className="panel-copy">{overview.contextLabel}</p>
      <p className="meta-row">{overview.sourceLabel}</p>
      <ul className="surface-list">
        {overview.signals.map((signal) => (
          <li className="assignment-card" key={signal.label}>
            <strong>{signal.label}</strong>: {signal.value}
            <div className="roster-meta">{signal.detail}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
