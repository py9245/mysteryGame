import type { RoomSnapshot } from "@/contracts/api";
import { SampleFlowNavigation } from "@/components/navigation/SampleFlowNavigation";
import { InvestigationDrawer } from "@/features/investigation/InvestigationDrawer";
import { InvestigationLimitMeter } from "@/features/investigation/InvestigationLimitMeter";
import { QuestionComposer } from "@/features/investigation/QuestionComposer";
import { AnswerComposer } from "@/features/investigation/AnswerComposer";
import { QuestionJudgeBadge } from "@/components/judgement/QuestionJudgeBadge";
import { AnswerJudgeBadge } from "@/components/judgement/AnswerJudgeBadge";
import { RulebookLauncher } from "@/components/rulebook/RulebookLauncher";

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

function toCount(value: number | { hidden: true } | null | undefined): number {
  return typeof value === "number" ? value : 0;
}

export function InvestigationPanel({
  snapshot,
  isSubmitting = false,
  errorMessage = null,
  statusMessage = null,
  onAcquireLock,
  onReleaseLock,
  onJoinQueue,
  onLeaveQueue,
  canAcquireLock = false,
  canReleaseLock = false,
  canJoinQueue = false,
  canLeaveQueue = false,
  isQueued = false,
  queuePosition = null,
  waitingPlayerCount = 0,
  queueCooldownSeconds = 0,
  onSubmitQuestion,
  onSubmitAnswer,
  questionFeedbackMessage = null,
  questionFeedbackTone = "note",
  answerFeedbackMessage = null,
  answerFeedbackTone = "note",
  isQuestionSubmitting = false,
  isAnswerSubmitting = false,
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
  onJoinQueue?: () => void;
  onLeaveQueue?: () => void;
  canAcquireLock?: boolean;
  canReleaseLock?: boolean;
  canJoinQueue?: boolean;
  canLeaveQueue?: boolean;
  isQueued?: boolean;
  queuePosition?: number | null;
  waitingPlayerCount?: number;
  queueCooldownSeconds?: number;
  onSubmitQuestion?: () => void;
  onSubmitAnswer?: () => void;
  questionFeedbackMessage?: string | null;
  questionFeedbackTone?: "positive" | "negative" | "note";
  answerFeedbackMessage?: string | null;
  answerFeedbackTone?: "positive" | "negative" | "note";
  isQuestionSubmitting?: boolean;
  isAnswerSubmitting?: boolean;
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
    <section className="page-shell" id="investigation">
      <header className="page-header">
        <div className="header-top-row">
          <div>
            <p className="eyebrow">현재 상태</p>
            <h2 className="page-title">조사실</h2>
            <div className="header-flow">
              <p className="header-flow-line">
                <strong>핵심 설명</strong> · 대기열에 들어가면 자동으로 조사실이 열립니다.
              </p>
              <p className="header-flow-line" data-tone="action">
                <strong>다음 행동</strong> · 질문 또는 정답을 짧게 제출하세요.
              </p>
            </div>
          </div>
          <div className="header-actions">
            <RulebookLauncher label="룰북" compact scope="game" />
          </div>
        </div>
      </header>
      <SampleFlowNavigation snapshot={snapshot} currentStageNumber={snapshot.stage?.stageNumber} />
      <div className="hero-grid investigation-hero">
        <section className="hero-card investigation-main">
          <InvestigationDrawer
            snapshot={snapshot}
            isSubmitting={isSubmitting}
            isLockedByMe={isLockedByMe}
            lockOwnerNickname={lockOwnerNickname}
            canAcquireLock={canAcquireLock}
            canReleaseLock={canReleaseLock}
            canJoinQueue={canJoinQueue}
            canLeaveQueue={canLeaveQueue}
            isQueued={isQueued}
            queuePosition={queuePosition}
            waitingPlayerCount={waitingPlayerCount}
            queueCooldownSeconds={queueCooldownSeconds}
            onAcquireLock={onAcquireLock}
            onReleaseLock={onReleaseLock}
            onJoinQueue={onJoinQueue}
            onLeaveQueue={onLeaveQueue}
            statusMessage={statusMessage}
            errorMessage={errorMessage}
          />
          <div className="investigation-composer-grid">
            <QuestionComposer
              snapshot={snapshot}
              draft={questionDraft}
              onDraftChange={onQuestionDraftChange}
              isEditable={isDraftEditable}
              isSubmitting={isQuestionSubmitting}
              canSubmit={Boolean(
                isDraftEditable &&
                  onSubmitQuestion &&
                  questionDraft.trim().length > 0 &&
                  toCount(snapshot.stage?.investigation?.questionCountRemaining) > 0,
              )}
              feedbackMessage={questionFeedbackMessage}
              feedbackTone={questionFeedbackTone}
              onSubmit={onSubmitQuestion}
            />
            <AnswerComposer
              snapshot={snapshot}
              draft={answerDraft}
              onDraftChange={onAnswerDraftChange}
              isEditable={isDraftEditable}
              isSubmitting={isAnswerSubmitting}
              canSubmit={Boolean(
                isDraftEditable &&
                  onSubmitAnswer &&
                  answerDraft.trim().length > 0 &&
                  toCount(snapshot.stage?.investigation?.answerAttemptCountRemaining) > 0,
              )}
              feedbackMessage={answerFeedbackMessage}
              feedbackTone={answerFeedbackTone}
              onSubmit={onSubmitAnswer}
            />
          </div>
        </section>
        <section className="hero-aside investigation-side">
          <InvestigationLimitMeter snapshot={snapshot} />
          <section className="panel panel-muted investigation-summary">
            <h3 className="panel-title">최근 판정</h3>
            <QuestionJudgeBadge resultKey="stage.questionJudge.YES" publicReply={getPublicReply(snapshot)} />
            <AnswerJudgeBadge
              successKey="stage.answerResult.success"
              failureKey="stage.answerResult.failure"
              needsReviewKey="review.answer.needsReview"
              publicOutcome={getPublicOutcome(snapshot)}
            />
          </section>
        </section>
      </div>
    </section>
  );
}
