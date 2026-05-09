import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";

function resolvePrivateChatLabel(snapshot: RoomSnapshot) {
  const privateChat = snapshot.privateChat;
  if (!privateChat || typeof privateChat !== "object") {
    return {
      label: "대기",
      tone: undefined as const,
      body: "아직 1:1 요청이 없습니다. 필요한 순간에만 짧게 확인하면 됩니다.",
    };
  }

  if ("session" in privateChat && privateChat.session && typeof privateChat.session === "object") {
    return {
      label: "연결 중",
      tone: "live" as const,
      body: "1:1 대화가 연결되었습니다. 최소 유지 시간만 지키면 됩니다.",
    };
  }

  if ("request" in privateChat && privateChat.request && typeof privateChat.request === "object") {
    switch (privateChat.request.status) {
      case "pending":
        return { label: "선택 대기", tone: "alert" as const, body: "상대가 선택하면 요청이 이어집니다." };
      case "accepted":
        return { label: "연결 중", tone: "live" as const, body: "요청이 수락되어 1:1 대화가 진행 중입니다." };
      case "expired":
        return { label: "만료", tone: undefined as const, body: "응답 시간이 지나 요청이 사라졌습니다." };
      case "rejected":
        return { label: "거절됨", tone: undefined as const, body: "상대가 이번 요청을 받지 않았습니다." };
      case "cancelled":
        return { label: "취소", tone: undefined as const, body: "요청이 취소되었습니다." };
      default:
        return { label: "대기", tone: undefined as const, body: "1:1 요청 상태를 기다립니다." };
    }
  }

  return {
    label: "대기",
    tone: undefined as const,
    body: "전화형 1:1 요청이 들어오면 여기서 확인합니다.",
  };
}

export function PrivateChatBanner({ snapshot }: { snapshot: RoomSnapshot }) {
  const chat = resolvePrivateChatLabel(snapshot);

  return (
    <section className="panel panel-muted utility-card">
      <div className="composer-header">
        <div>
          <h3 className="panel-title">1:1 전화</h3>
          <p className="panel-copy">신청과 수신 상태만 짧게 확인하고, 지금 답해야 하는 요청이 있는지만 보면 됩니다.</p>
        </div>
        <span className="status-badge" data-tone={chat.tone}>
          {chat.label}
        </span>
      </div>
      <div className="utility-chip-row">
        <span className="status-badge">요청 확인</span>
        <span className="status-badge">수락 또는 거절</span>
      </div>
      <p className="message-note">{chat.body}</p>
    </section>
  );
}
