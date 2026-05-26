"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RoomSnapshot } from "@/contracts/api";

type ProgressEntryKind = "question" | "answer" | "lock" | "queue" | "status";

type ProgressEntry = {
  id: string;
  kind: ProgressEntryKind;
  title: string;
  detail: string;
  time: number;
};

const KIND_LABEL: Record<ProgressEntryKind, string> = {
  question: "Q",
  answer: "A",
  lock: "L",
  queue: "W",
  status: "•",
};

function relativeTime(now: number, ts: number): string {
  const diff = Math.max(0, Math.floor((now - ts) / 1000));
  if (diff < 5) return "방금";
  if (diff < 60) return `${diff}초 전`;
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  return `${Math.floor(diff / 3600)}시간 전`;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function deriveEntries(snapshot: RoomSnapshot, baseTime: number): ProgressEntry[] {
  const entries: ProgressEntry[] = [];
  const stage = snapshot.stage;
  if (!stage) {
    return entries;
  }

  // Answer outcome (when enriched object surfaces in the future)
  const lastAnswer = stage.lastAnswerResult as unknown;
  if (isObjectRecord(lastAnswer) && "publicOutcome" in lastAnswer) {
    const outcome = String(lastAnswer.publicOutcome ?? "");
    const summary =
      "publicSummary" in lastAnswer && typeof lastAnswer.publicSummary === "string"
        ? lastAnswer.publicSummary
        : "최근 정답 시도 결과가 공개되었습니다.";
    const label =
      outcome === "correct"
        ? "정답 인정"
        : outcome === "wrong"
          ? "정답 미인정"
          : outcome === "needs_review"
            ? "운영자 확인"
            : "정답 시도 결과";
    entries.push({
      id: `answer-${stage.stageId}-${outcome}`,
      kind: "answer",
      title: label,
      detail: summary,
      time: baseTime,
    });
  } else if (typeof lastAnswer === "string" && lastAnswer.length > 0) {
    const label =
      lastAnswer === "correct"
        ? "정답 인정"
        : lastAnswer === "incorrect"
          ? "정답 미인정"
          : "운영자 확인 대기";
    entries.push({
      id: `answer-${stage.stageId}-${lastAnswer}`,
      kind: "answer",
      title: label,
      detail: "최근 정답 시도 결과가 공개되었습니다.",
      time: baseTime,
    });
  }

  // Question judgement (string union — appears when public)
  const lastQuestion = stage.lastQuestionJudgement as unknown;
  if (typeof lastQuestion === "string" && lastQuestion.length > 0) {
    const tag =
      lastQuestion === "YES"
        ? "네"
        : lastQuestion === "NO"
          ? "아니요"
          : lastQuestion === "MAYBE"
            ? "그럴 수 있습니다"
            : "상관 없습니다";
    entries.push({
      id: `question-${stage.stageId}-${lastQuestion}`,
      kind: "question",
      title: `공개 질문 응답: ${tag}`,
      detail: "AI 수사관의 가장 최근 공개 응답입니다.",
      time: baseTime,
    });
  }

  // Investigation lock holder
  const investigation = stage.investigation;
  if (investigation?.lockedByPlayerId) {
    const holder = snapshot.players.find((p) => p.playerId === investigation.lockedByPlayerId);
    entries.push({
      id: `lock-${investigation.lockedByPlayerId}`,
      kind: "lock",
      title: "조사실 사용 중",
      detail: holder ? `${holder.nickname}님이 조사실에 입장했어요.` : "다른 플레이어가 조사실에 입장했어요.",
      time: baseTime,
    });
  }

  // Investigation queue
  if (investigation && investigation.waitingPlayerCount > 0) {
    entries.push({
      id: `queue-${investigation.waitingPlayerCount}`,
      kind: "queue",
      title: `대기열 ${investigation.waitingPlayerCount}명`,
      detail: "조사실 진입을 기다리는 인원이 있어요.",
      time: baseTime,
    });
  }

  // Solved count summary
  const solvedCount = stage.solvedPlayerIds?.length ?? 0;
  if (solvedCount > 0) {
    entries.push({
      id: `solved-${solvedCount}`,
      kind: "status",
      title: `정답 성공 ${solvedCount}명`,
      detail: "스테이지에서 정답을 맞춘 인원 합계입니다.",
      time: baseTime,
    });
  }

  return entries;
}

export function ProgressLogFeed({ snapshot }: { snapshot: RoomSnapshot }) {
  const stageNumber = snapshot.stage?.stageNumber ?? 0;
  const solvedCount = snapshot.stage?.solvedPlayerIds?.length ?? 0;
  const remainingSeconds = snapshot.stage?.remainingSeconds ?? 0;

  const baseTime = useMemo(() => Date.now(), [snapshot]);
  const entries = useMemo(() => deriveEntries(snapshot, baseTime), [snapshot, baseTime]);
  const previousIdsRef = useRef<Set<string> | null>(null);
  const [freshIds, setFreshIds] = useState<Set<string>>(() => new Set());
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  useEffect(() => {
    const previous = previousIdsRef.current;
    const currentIds = new Set(entries.map((entry) => entry.id));
    previousIdsRef.current = currentIds;
    // Skip glow on initial mount: only mark fresh once we have a baseline.
    if (previous === null) {
      return;
    }
    const newFresh = new Set<string>();
    for (const entry of entries) {
      if (!previous.has(entry.id)) {
        newFresh.add(entry.id);
      }
    }
    if (newFresh.size > 0) {
      setFreshIds(newFresh);
      const handle = window.setTimeout(() => {
        setFreshIds(new Set());
      }, 600);
      return () => window.clearTimeout(handle);
    }
  }, [entries]);

  useEffect(() => {
    const interval = window.setInterval(() => setNowTick(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="panel panel-muted track-d-progress-log">
      <div className="composer-header">
        <div>
          <h3 className="panel-title">공개 진행 로그</h3>
          <p className="panel-copy">스테이지 {stageNumber}의 공개 흐름만 따라갑니다.</p>
        </div>
      </div>
      <div className="metric-grid metric-grid-compact track-d-progress-log-grid">
        <article className="metric-card">
          <span className="metric-label">남은 시간</span>
          <strong className="metric-value num-tabular">{remainingSeconds}s</strong>
          <span className="metric-detail">스테이지 잔여</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">정답 성공자</span>
          <strong className="metric-value num-tabular">{solvedCount}명</strong>
          <span className="metric-detail">공개 카운트</span>
        </article>
      </div>
      {entries.length > 0 ? (
        <ul className="uiux-realtime-progress-list" aria-live="polite" aria-label="공개 진행 이벤트">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="uiux-realtime-progress-item"
              data-kind={entry.kind}
              data-fresh={freshIds.has(entry.id) || undefined}
            >
              <span className="uiux-realtime-progress-icon" aria-hidden="true">
                {KIND_LABEL[entry.kind]}
              </span>
              <span className="uiux-realtime-progress-body">
                <span className="uiux-realtime-progress-title">{entry.title}</span>
                <span className="uiux-realtime-progress-detail">{entry.detail}</span>
              </span>
              <span className="uiux-realtime-progress-time">{relativeTime(nowTick, entry.time)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="uiux-realtime-progress-empty" role="status">
          <strong>아직 공개된 진행 이벤트가 없어요</strong>
          <span>새 단서가 들어오면 이 자리에서 바로 보여드립니다.</span>
        </div>
      )}
      <p className="message-note">
        다음 상태: 결과 공개가 끝날 때까지 관전만 유지합니다. 입력은 다시 열리지 않습니다.
      </p>
    </section>
  );
}
