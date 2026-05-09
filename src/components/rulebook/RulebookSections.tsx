import {
  RULEBOOK_SECTIONS,
  type RulebookScope,
} from "./rulebook-content";

export function RulebookSections({ scope }: { scope: RulebookScope }) {
  return (
    <div className="modal-grid rulebook-section-grid">
      {RULEBOOK_SECTIONS[scope].map((section) => (
        <article key={section.title} className="modal-card">
          <strong>{section.title}</strong>
          <p>{section.body}</p>
          <ul className="rulebook-section-list">
            {section.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}
