import type { PrivateChatRequest, PrivateChatSession } from "@/contracts/game";
import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";

function isRedactedValue(value: unknown): value is { hidden: true } {
  return typeof value === "object" && value !== null && "hidden" in value;
}

function resolveRemainingSeconds(expiresAt: string | null | undefined, nowMs?: number) {
  if (!expiresAt || typeof nowMs !== "number") {
    return null;
  }

  const expiresAtMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresAtMs)) {
    return null;
  }

  return Math.max(0, Math.ceil((expiresAtMs - nowMs) / 1000));
}

function resolvePlayerNickname(snapshot: RoomSnapshot, playerId: string | null | undefined) {
  if (!playerId) {
    return "알 수 없는 플레이어";
  }

  return (
    snapshot.players.find((player) => player.playerId === playerId)?.nickname ??
    (snapshot.me.playerId === playerId ? snapshot.me.nickname : "알 수 없는 플레이어")
  );
}

function resolveTeamLabel(snapshot: RoomSnapshot, teamSlotId: string | null | undefined) {
  if (!teamSlotId) {
    return "팀 미정";
  }

  return snapshot.teamSlots.find((teamSlot) => teamSlot.id === teamSlotId)?.label ?? teamSlotId;
}

function resolveSessionPartner(snapshot: RoomSnapshot, session: PrivateChatSession) {
  const partnerId =
    session.playerAId === snapshot.me.playerId ? session.playerBId : session.playerAId;

  return {
    partnerId,
    partnerNickname: resolvePlayerNickname(snapshot, partnerId),
  };
}

function resolvePrimaryRequest(snapshot: RoomSnapshot) {
  const privateChat = snapshot.privateChat;
  if (!privateChat || isRedactedValue(privateChat)) {
    return null;
  }

  return !isRedactedValue(privateChat.request) ? privateChat.request : null;
}

function resolveIncomingRequests(snapshot: RoomSnapshot) {
  const privateChat = snapshot.privateChat;
  if (!privateChat || isRedactedValue(privateChat)) {
    return [];
  }

  if (Array.isArray(privateChat.incomingRequests) && !isRedactedValue(privateChat.incomingRequests)) {
    return privateChat.incomingRequests;
  }

  return [];
}

function resolveActiveSession(snapshot: RoomSnapshot) {
  const privateChat = snapshot.privateChat;
  if (!privateChat || isRedactedValue(privateChat)) {
    return null;
  }

  return !isRedactedValue(privateChat.session) ? privateChat.session : null;
}

function resolveCooldownEndsAt(snapshot: RoomSnapshot) {
  const privateChat = snapshot.privateChat;
  if (!privateChat || isRedactedValue(privateChat)) {
    return null;
  }

  return typeof privateChat.cooldownEndsAt === "string" ? privateChat.cooldownEndsAt : null;
}

function resolveRequestablePlayers(snapshot: RoomSnapshot) {
  return snapshot.players.filter((player) => {
    if (player.isMe) {
      return false;
    }

    if (player.connectionStatus !== "connected") {
      return false;
    }

    if (snapshot.me.teamSlotId && player.teamSlotId && snapshot.me.teamSlotId === player.teamSlotId) {
      return false;
    }

    if (player.stageStatus === "solved_locked") {
      return false;
    }

    return true;
  });
}

export function PrivateChatBanner({
  snapshot,
  nowMs,
  isSubmitting = false,
  statusMessage = null,
  errorMessage = null,
  onRequestPrivateChat,
  onRespondPrivateChat,
  onEndPrivateChat,
}: {
  snapshot: RoomSnapshot;
  nowMs?: number;
  isSubmitting?: boolean;
  statusMessage?: string | null;
  errorMessage?: string | null;
  onRequestPrivateChat?: (targetPlayerId: string) => void;
  onRespondPrivateChat?: (requestId: string, accept: boolean) => void;
  onEndPrivateChat?: (sessionId: string) => void;
}) {
  const activeSession = resolveActiveSession(snapshot);
  const primaryRequest = resolvePrimaryRequest(snapshot);
  const incomingRequests = resolveIncomingRequests(snapshot);
  const cooldownEndsAt = resolveCooldownEndsAt(snapshot);
  const cooldownSeconds = resolveRemainingSeconds(cooldownEndsAt, nowMs);
  const requestablePlayers = resolveRequestablePlayers(snapshot);
  const sessionPartner = activeSession ? resolveSessionPartner(snapshot, activeSession) : null;
  const releaseAllowedSeconds = activeSession
    ? resolveRemainingSeconds(activeSession.releaseAllowedAt, nowMs)
    : null;
  const canEndSession = activeSession ? (releaseAllowedSeconds ?? 0) <= 0 : false;
  const outgoingPendingRequest =
    primaryRequest?.requesterPlayerId === snapshot.me.playerId && primaryRequest.status === "pending"
      ? primaryRequest
      : null;
  const hasPendingIncoming = incomingRequests.length > 0;
  const statusLabel = activeSession
    ? "연결 중"
    : hasPendingIncoming
      ? "응답 필요"
      : outgoingPendingRequest
        ? "응답 대기"
        : cooldownSeconds && cooldownSeconds > 0
          ? "재신청 대기"
          : "대기";
  const statusTone =
    activeSession || hasPendingIncoming ? ("live" as const) : cooldownSeconds ? ("alert" as const) : undefined;
  const canPlaceRequest =
    !isSubmitting &&
    !activeSession &&
    !outgoingPendingRequest &&
    !hasPendingIncoming &&
    !(cooldownSeconds && cooldownSeconds > 0);

  return (
    <section className="panel panel-muted utility-card">
      <div className="composer-header">
        <div>
          <h3 className="panel-title">1:1 전화</h3>
          <p className="panel-copy">다른 팀 플레이어에게만 요청할 수 있고, 수신자는 15초 안에 한 명을 골라 응답합니다.</p>
        </div>
        <span className="status-badge" data-tone={statusTone}>
          {statusLabel}
        </span>
      </div>

      {activeSession && sessionPartner ? (
        <div className="modal-card utility-stack">
          <div className="history-top">
            <strong>{sessionPartner.partnerNickname}님과 통화 중</strong>
            <span className="status-badge" data-tone="live">
              연결 유지
            </span>
          </div>
          <div className="utility-chip-row">
            <span className="status-badge">최소 유지 {Math.max(0, releaseAllowedSeconds ?? 0)}초</span>
            <span className="status-badge">종료 가능 {canEndSession ? "예" : "아직 안 됨"}</span>
          </div>
          <div className="action-row">
            <button
              className="button-secondary"
              type="button"
              disabled={!canEndSession || isSubmitting}
              onClick={() => onEndPrivateChat?.(activeSession.id)}
            >
              {isSubmitting ? "정리 중..." : canEndSession ? "통화 종료" : "종료 대기"}
            </button>
          </div>
        </div>
      ) : null}

      {hasPendingIncoming ? (
        <div className="utility-stack">
          {incomingRequests.map((request) => (
            <div className="modal-card utility-stack" key={request.id}>
              <div className="history-top">
                <strong>{resolvePlayerNickname(snapshot, request.requesterPlayerId)}님의 요청</strong>
                <span className="status-badge" data-tone="alert">
                  {resolveRemainingSeconds(request.expiresAt, nowMs) ?? 0}초 남음
                </span>
              </div>
              <p className="message-note">
                지금 수락하면 나머지 대기 요청은 자동으로 정리됩니다.
              </p>
              <div className="action-row">
                <button
                  className="button-primary"
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => onRespondPrivateChat?.(request.id, true)}
                >
                  수락
                </button>
                <button
                  className="button-secondary"
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => onRespondPrivateChat?.(request.id, false)}
                >
                  거절
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {outgoingPendingRequest ? (
        <div className="modal-card utility-stack">
          <div className="history-top">
            <strong>{resolvePlayerNickname(snapshot, outgoingPendingRequest.targetPlayerId)}님 응답 대기</strong>
            <span className="status-badge" data-tone="alert">
              {resolveRemainingSeconds(outgoingPendingRequest.expiresAt, nowMs) ?? 0}초 남음
            </span>
          </div>
          <p className="message-note">상대가 고르면 바로 연결되고, 다른 요청이 먼저 연결되면 자동으로 바쁨 처리됩니다.</p>
        </div>
      ) : null}

      {!activeSession && !hasPendingIncoming && !outgoingPendingRequest && cooldownSeconds && cooldownSeconds > 0 ? (
        <p className="message-note">다시 신청하려면 {cooldownSeconds}초 더 기다려야 합니다.</p>
      ) : null}

      <div className="utility-stack">
        <div className="composer-header">
          <div>
            <h4 className="panel-title">신청 가능한 플레이어</h4>
            <p className="panel-copy">같은 팀, 연결 중인 플레이어, 정답 확정 관전자에게는 신청할 수 없습니다.</p>
          </div>
        </div>
        {requestablePlayers.length > 0 ? (
          <ul className="utility-list">
            {requestablePlayers.map((player) => (
              <li className="utility-list-item" key={player.playerId}>
                <div>
                  <strong>{player.nickname}</strong>
                  <div className="utility-meta">
                    {resolveTeamLabel(snapshot, player.teamSlotId)} · {player.connectionStatus === "connected" ? "접속 중" : "이탈"}
                  </div>
                  </div>
                <button
                  className="button-secondary button-compact"
                  type="button"
                  disabled={!canPlaceRequest}
                  onClick={() => onRequestPrivateChat?.(player.playerId)}
                >
                  {isSubmitting ? "전송 중..." : "신청"}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="message-note">지금은 신청할 수 있는 다른 팀 플레이어가 없습니다.</p>
        )}
      </div>

      {statusMessage ? <p className="message-positive">{statusMessage}</p> : null}
      {errorMessage ? <p className="message-negative">{errorMessage}</p> : null}

      {primaryRequest && !outgoingPendingRequest && !hasPendingIncoming && !activeSession ? (
        <p className="message-note">
          최근 상태: {primaryRequest.status === "busy" ? "상대방이 누군가와 이야기 중입니다." : primaryRequest.status}
        </p>
      ) : null}
    </section>
  );
}
