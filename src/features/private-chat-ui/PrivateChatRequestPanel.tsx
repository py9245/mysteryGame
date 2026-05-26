import type { RoomSnapshot } from "@/contracts/api";

function isRedactedValue(value: unknown): value is { hidden: true } {
  return typeof value === "object" && value !== null && "hidden" in value;
}

export function PrivateChatRequestPanel({ snapshot }: { snapshot: RoomSnapshot }) {
  const privateChat = snapshot.privateChat;
  const incomingRequests =
    privateChat && !isRedactedValue(privateChat) && !isRedactedValue(privateChat.incomingRequests)
      ? privateChat.incomingRequests
      : [];

  const hasRequests = incomingRequests.length > 0;
  return (
    <section
      className={`panel panel-muted track-c-phone-requests${hasRequests ? " uiux-chat-card-expiring" : ""}`}
      aria-label="1:1 대화 요청 목록"
      data-empty={hasRequests ? "false" : "true"}
      aria-live="polite"
    >
      <div className="composer-header">
        <div>
          <h3 className="panel-title">1:1 요청 목록</h3>
          <p className="panel-copy">수신한 1:1 대화 요청만 모아둔 영역입니다.</p>
        </div>
        <span
          className="status-badge num-tabular"
          data-tone={hasRequests ? "alert" : undefined}
        >
          {incomingRequests.length}건
        </span>
      </div>
      {hasRequests ? (
        <p className="message-note">자세한 처리는 1:1 대화 카드에서 수락 또는 거절하세요.</p>
      ) : (
        <p className="message-note">아직 수신된 요청이 없습니다.</p>
      )}
    </section>
  );
}
