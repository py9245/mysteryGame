import type { RoomSnapshot } from "@/contracts/api";

const MAX_QUESTIONS_PER_LOCK = 3;
const MAX_ANSWER_ATTEMPTS_PER_LOCK = 1;

function toNumber(value: number | { hidden: true } | undefined) {
  return typeof value === "number" ? value : 0;
}

function PipRow({
  remaining,
  total,
  tone,
}: {
  remaining: number;
  total: number;
  tone: "question" | "answer";
}) {
  return (
    <div className={`track-d-pip-row track-d-pip-row-${tone}`} aria-hidden="true">
      {Array.from({ length: total }).map((_, index) => {
        const isLeft = index < remaining;
        return (
          <span
            key={index}
            className={`track-d-pip${isLeft ? " is-left" : " is-used"}`}
          />
        );
      })}
    </div>
  );
}

export function InvestigationLimitMeter({ snapshot }: { snapshot: RoomSnapshot }) {
  const investigation = snapshot.stage?.investigation;
  const remainingQuestions = toNumber(investigation?.questionCountRemaining);
  const remainingAnswers = toNumber(investigation?.answerAttemptCountRemaining);
  const isFinalQuestion = remainingQuestions === 1;
  const isFinalAnswer = remainingAnswers === 1;
  const isQuestionExhausted = remainingQuestions === 0;
  const isAnswerExhausted = remainingAnswers === 0;

  return (
    <section className="metric-grid investigation-meter-grid track-d-limit-meter">
      <article
        className={`metric-card metric-card-emphasis track-d-limit-card track-d-limit-card-question${
          isFinalQuestion ? " track-d-limit-card-final" : ""
        }${isQuestionExhausted ? " track-d-limit-card-empty" : ""}`}
        aria-label={`이번 입장 질문 ${remainingQuestions}회 남음`}
      >
        <span className="metric-label">이번 입장 질문 기회</span>
        <strong className="metric-value num-tabular">
          {remainingQuestions}
          <span className="track-d-limit-divider">/{MAX_QUESTIONS_PER_LOCK}</span>
        </strong>
        <PipRow remaining={remainingQuestions} total={MAX_QUESTIONS_PER_LOCK} tone="question" />
        <span className="metric-detail">
          {isQuestionExhausted
            ? "질문을 모두 사용했습니다. 다시 입장해야 새 기회가 열립니다."
            : isFinalQuestion
              ? "마지막 질문입니다. 신중히 골라 던지세요."
              : "질문방에 다시 입장하면 새 기회로 시작합니다."}
        </span>
      </article>
      <article
        className={`metric-card metric-card-emphasis track-d-limit-card track-d-limit-card-answer${
          isFinalAnswer ? " track-d-limit-card-final" : ""
        }${isAnswerExhausted ? " track-d-limit-card-empty" : ""}`}
        aria-label={`이번 입장 정답 ${remainingAnswers}회 남음`}
      >
        <span className="metric-label">이번 입장 정답 기회</span>
        <strong className="metric-value num-tabular">
          {remainingAnswers}
          <span className="track-d-limit-divider">/{MAX_ANSWER_ATTEMPTS_PER_LOCK}</span>
        </strong>
        <PipRow remaining={remainingAnswers} total={MAX_ANSWER_ATTEMPTS_PER_LOCK} tone="answer" />
        <span className="metric-detail">
          {isAnswerExhausted
            ? "정답 시도를 모두 사용했습니다."
            : isFinalAnswer
              ? "마지막 정답 시도입니다. 한 문장으로 정리해 보내세요."
              : "무리한 시도는 점수 손실로 이어집니다."}
        </span>
      </article>
    </section>
  );
}
