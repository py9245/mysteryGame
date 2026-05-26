"use client";

import { useEffect, useRef, useState } from "react";
import type { RoomSnapshot } from "@/contracts/api";

export function HintRail({ snapshot }: { snapshot: RoomSnapshot }) {
  const hints = snapshot.stage?.visibleHints ?? [];
  const previousHintIdsRef = useRef<Set<string>>(new Set(hints.map((h) => h.id)));
  const [freshHintIds, setFreshHintIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set(hints.map((h) => h.id));
    const newlyArrived: string[] = [];
    currentIds.forEach((id) => {
      if (!previousHintIdsRef.current.has(id)) {
        newlyArrived.push(id);
      }
    });

    if (newlyArrived.length > 0) {
      setFreshHintIds((prev) => {
        const next = new Set(prev);
        newlyArrived.forEach((id) => next.add(id));
        return next;
      });
      const timeoutId = window.setTimeout(() => {
        setFreshHintIds((prev) => {
          const next = new Set(prev);
          newlyArrived.forEach((id) => next.delete(id));
          return next;
        });
      }, 1200);
      previousHintIdsRef.current = currentIds;
      return () => window.clearTimeout(timeoutId);
    }

    previousHintIdsRef.current = currentIds;
  }, [hints]);

  return (
    <aside className="panel panel-muted track-c-hint-rail" aria-label="공개 힌트" aria-live="polite">
      <div className="composer-header track-c-hint-rail__head">
        <div>
          <h3 className="panel-title">공개 힌트</h3>
          <p className="panel-copy">브리핑과 진행 중 공개되는 힌트만 모았습니다.</p>
        </div>
        <span className="status-badge num-tabular" data-tone={hints.length ? "live" : undefined}>
          {hints.length}개
        </span>
      </div>
      {hints.length ? (
        <ul className="hint-list track-c-hint-rail__list">
          {hints.map((hint, index) => (
            <li
              className={`hint-card track-c-hint-rail__card${
                freshHintIds.has(hint.id) ? " uiux-gameplay-hint-card-fresh uiux-fade-up" : ""
              }`}
              key={hint.id}
              style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}
            >
              <span className="uiux-gameplay-hint-marker num-tabular" aria-hidden="true">
                #{index + 1}
              </span>
              <strong>{hint.player}</strong>
              {hint.admin ? <p className="roster-meta track-c-hint-rail__card-admin">{hint.admin}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="message-note">아직 공개된 힌트가 없습니다.</p>
      )}
    </aside>
  );
}
