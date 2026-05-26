"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  RULEBOOK_SECTIONS,
  type RulebookScope,
  type RulebookSectionContent,
} from "./rulebook-content";

function makeAnchorId(scope: RulebookScope, index: number, title: string) {
  const slug = title.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase();
  return `track-b-rulebook-${scope}-${index}-${slug}`;
}

function extractTip(section: RulebookSectionContent): {
  bullets: string[];
  tip: string | null;
} {
  const TIP_PREFIXES = ["팁:", "주의:", "참고:", "TIP:", "NOTE:"];
  const tipIndex = section.bullets.findIndex((b) =>
    TIP_PREFIXES.some((prefix) => b.startsWith(prefix)),
  );
  if (tipIndex === -1) {
    return { bullets: section.bullets, tip: null };
  }
  return {
    bullets: section.bullets.filter((_, index) => index !== tipIndex),
    tip: section.bullets[tipIndex],
  };
}

export function RulebookSections({ scope }: { scope: RulebookScope }) {
  const sections = RULEBOOK_SECTIONS[scope];
  const sectionsKey = `${scope}:${sections.length}`;
  const itemRefs = useRef<Array<HTMLElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Reset active index when scope changes.
  useEffect(() => {
    setActiveIndex(0);
    itemRefs.current = itemRefs.current.slice(0, sections.length);
  }, [sectionsKey, sections.length]);

  const titles = useMemo(() => sections.map((s) => s.title), [sections]);

  const handleJump = useCallback(
    (index: number) => {
      setActiveIndex(index);
      const node = itemRefs.current[index];
      if (node) {
        node.scrollIntoView({ behavior: "smooth", block: "start" });
        node.setAttribute("data-track-b-flash", "true");
        window.setTimeout(() => {
          node.removeAttribute("data-track-b-flash");
        }, 1400);
      }
    },
    [],
  );

  return (
    <div className="track-b-rulebook-sections">
      <nav className="track-b-rulebook-toc" aria-label="섹션 바로가기">
        {titles.map((title, index) => (
          <button
            key={title}
            type="button"
            className="track-b-rulebook-toc-pill"
            data-active={index === activeIndex || undefined}
            onClick={() => handleJump(index)}
          >
            <span className="track-b-rulebook-toc-index">{String(index + 1).padStart(2, "0")}</span>
            <span className="track-b-rulebook-toc-label">{title}</span>
          </button>
        ))}
      </nav>
      <div className="track-b-rulebook-section-stack">
        {sections.map((section, index) => {
          const anchorId = makeAnchorId(scope, index, section.title);
          const { bullets, tip } = extractTip(section);
          return (
            <article
              key={section.title}
              id={anchorId}
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              className="track-b-rulebook-section-card"
              data-track-b-index={index}
            >
              <header className="track-b-rulebook-section-header">
                <span className="track-b-rulebook-section-index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h4 className="track-b-rulebook-section-title">{section.title}</h4>
              </header>
              <p className="track-b-rulebook-section-body">{section.body}</p>
              {bullets.length > 0 && (
                <ul className="track-b-rulebook-section-list">
                  {bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
              {tip && (
                <aside className="track-b-rulebook-section-tip" role="note">
                  {tip}
                </aside>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
