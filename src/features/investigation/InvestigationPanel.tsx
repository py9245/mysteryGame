import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";
import { SampleFlowNavigation } from "@/components/navigation/SampleFlowNavigation";
import { InvestigationDrawer } from "@/features/investigation/InvestigationDrawer";
import { InvestigationLimitMeter } from "@/features/investigation/InvestigationLimitMeter";
import { QuestionComposer } from "@/features/investigation/QuestionComposer";
import { AnswerComposer } from "@/features/investigation/AnswerComposer";
import { QuestionJudgeBadge } from "@/components/judgement/QuestionJudgeBadge";
import { AnswerJudgeBadge } from "@/components/judgement/AnswerJudgeBadge";

function getPublicReply(snapshot: RoomSnapshot) {
  const judgement = snapshot.stage?.lastQuestionJudgement;
  if (judgement && typeof judgement === "object" && "publicReply" in judgement) {
    return judgement.publicReply;
  }

  return "중요하지 않습니다.";
}

function getPublicOutcome(snapshot: RoomSnapshot) {
  const result = snapshot.stage?.lastAnswerResult;
  if (result && typeof result === "object" && "publicOutcome" in result) {
    return result.publicOutcome;
  }

  return "needs_review";
}

export function InvestigationPanel({
  snapshot,
  isSubmitting = false,
  errorMessage = null,
  statusMessage = null,
  onAcquireLock,
  onReleaseLock,
  canAcquireLock = false,
  canReleaseLock = false,
  questionDraft = "",
  onQuestionDraftChange,
  answerDraft = "",
  onAnswerDraftChange,
  isDraftEditable = false,
}: {
  snapshot: RoomSnapshot;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  statusMessage?: string | null;
  onAcquireLock?: () => void;
  onReleaseLock?: () => void;
  canAcquireLock?: boolean;
  canReleaseLock?: boolean;
  questionDraft?: string;
  onQuestionDraftChange?: (value: string) => void;
  answerDraft?: string;
  onAnswerDraftChange?: (value: string) => void;
  isDraftEditable?: boolean;
}) {
  const lockOwner = snapshot.stage?.investigation?.lockedByPlayerId ?? null;
  const lockOwnerNickname =
    snapshot.players.find((player) => player.playerId === lockOwner)?.nickname ??
    (lockOwner === snapshot.me.playerId ? snapshot.me.nickname : null);
  const isLockedByMe = lockOwner === snapshot.me.playerId;

  return (
    <section className="page-shell">
      <header className="page-header">
        <p className="eyebrow">비공개 조사실</p>
        <h2 className="page-title">조사실</h2>
        <p className="page-kicker">입장 상태와 메모 행동만 남긴 정리 화면입니다.</p>
      </header>
      <SampleFlowNavigation snapshot={snapshot} currentStageNumber={snapshot.stage?.stageNumber} />
      <div className="hero-grid">
        <section className="hero-card">
          <InvestigationDrawer
            snapshot={snapshot}
            isSubmitting={isSubmitting}
            isLockedByMe={isLockedByMe}
            lockOwnerNickname={lockOwnerNickname}
            canAcquireLock={canAcquireLock}
            canReleaseLock={canReleaseLock}
            onAcquireLock={onAcquireLock}
            onReleaseLock={onReleaseLock}
            statusMessage={statusMessage}
            errorMessage={errorMessage}
          />
        </section>
        <section className="hero-aside">
          <InvestigationLimitMeter snapshot={snapshot} />
        </section>
      </div>
      <div className="split-layout">
        <section>
          <QuestionComposer
            snapshot={snapshot}
            draft={questionDraft}
            onDraftChange={onQuestionDraftChange}
            isEditable={isDraftEditable}
          />
        </section>
        <section>
          <AnswerComposer
            snapshot={snapshot}
            draft={answerDraft}
            onDraftChange={onAnswerDraftChange}
            isEditable={isDraftEditable}
          />
        </section>
      </div>
      <div className="split-layout">
        <section className="panel panel-muted">
          <h3 className="panel-title">최근 질문 응답</h3>
          <QuestionJudgeBadge resultKey="stage.questionJudge.YES" publicReply={getPublicReply(snapshot)} />
        </section>
        <section className="panel panel-muted">
          <h3 className="panel-title">최근 정답 판정</h3>
          <AnswerJudgeBadge
            successKey="stage.answerResult.success"
            failureKey="stage.answerResult.failure"
            needsReviewKey="review.answer.needsReview"
            publicOutcome={getPublicOutcome(snapshot)}
          />
        </section>
      </div>
    </section>
  );
}
