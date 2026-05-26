import type { PrivateChatRequest, PrivateChatSession } from "@/contracts/game";
import type { RoomSnapshot } from "@/contracts/api";

type PhoneState =
  | "idle"
  | "incoming"
  | "outgoing_pending"
  | "in_call"
  | "cooldown"
  | "expired"
  | "busy";

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

function resolvePhoneState({
  activeSession,
  hasPendingIncoming,
  outgoingPendingRequest,
  cooldownSeconds,
  primaryRequest,
}: {
  activeSession: PrivateChatSession | null;
  hasPendingIncoming: boolean;
  outgoingPendingRequest: PrivateChatRequest | null;
  cooldownSeconds: number | null;
  primaryRequest: PrivateChatRequest | null;
}): PhoneState {
  if (activeSession) return "in_call";
  if (hasPendingIncoming) return "incoming";
  if (outgoingPendingRequest) return "outgoing_pending";
  if (cooldownSeconds && cooldownSeconds > 0) return "cooldown";
  if (primaryRequest?.status === "busy") return "busy";
  if (primaryRequest?.status === "expired") return "expired";
  return "idle";
}

function describePhoneState(state: PhoneState) {
  switch (state) {
    case "in_call":
      return { label: "통화 중", tone: "live" as const };
    case "incoming":
      return { label: "수신 요청", tone: "alert" as const };
    case "outgoing_pending":
      return { label: "응답 대기", tone: "alert" as const };
    case "cooldown":
      return { label: "재신청 대기", tone: "alert" as const };
    case "busy":
      return { label: "상대 통화 중", tone: undefined };
    case "expired":
      return { label: "만료", tone: undefined };
    default:
      return { label: "대기", tone: undefined };
  }
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

  const phoneState = resolvePhoneState({
    activeSession,
    hasPendingIncoming,
    outgoingPendingRequest,
    cooldownSeconds,
    primaryRequest,
  });
  const phoneStatus = describePhoneState(phoneState);
  const isBusy = phoneState === "in_call" || phoneState === "incoming" || phoneState === "outgoing_pending";
  const canPlaceRequest =
    !isSubmitting &&
    phoneState === "idle" &&
    !(cooldownSeconds && cooldownSeconds > 0);

  return (
    <section
      className="panel panel-muted utility-card private-chat-card track-c-phone-card"
      data-phone-state={phoneState}
      aria-label="1:1 대화 상태"
    >
      <div className="composer-header track-c-phone-card__head">
        <div className="track-c-phone-card__heading">
          <h3 className="panel-title private-chat-title">1:1 대화</h3>
          <p className="panel-copy track-c-phone-card__hint">
            요청 → 수락 → 통화 → 종료 순서로 진행됩니다.
          </p>
        </div>
        <span className="status-badge track-c-phone-card__state-chip" data-tone={phoneStatus.tone}>
          {phoneStatus.label}
        </span>
      </div>

      {activeSession && sessionPartner ? (
        <div className="modal-card utility-stack track-c-phone-card__call" data-call="active">
          <div className="history-top">
            <strong className="track-c-phone-card__call-partner">
              {sessionPartner.partnerNickname}님과 통화 중
            </strong>
            <span className="status-badge" data-tone="live">
              연결 유지
            </span>
          </div>
          <div className="utility-chip-row track-c-phone-card__chip-row">
            <span
              className="status-badge uiux-chat-time-chip num-tabular"
              data-urgent={(releaseAllowedSeconds ?? 0) > 0 && (releaseAllowedSeconds ?? 0) <= 5 ? "true" : "false"}
            >
              최소 유지 {Math.max(0, releaseAllowedSeconds ?? 0)}초
            </span>
            <span className="status-badge" data-tone={canEndSession ? "live" : "alert"}>
              종료 {canEndSession ? "가능" : "대기"}
            </span>
          </div>
          <div className="action-row">
            <button
              className="button-secondary track-c-phone-card__end-button"
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
        <div className="utility-stack track-c-phone-card__incoming-list" data-call="incoming">
          {incomingRequests.map((request) => {
            const remaining = resolveRemainingSeconds(request.expiresAt, nowMs) ?? 0;
            const isExpiring = remaining > 0 && remaining <= 5;
            return (
            <div
              className={`modal-card utility-stack track-c-phone-card__incoming${isExpiring ? " uiux-chat-card-expiring" : ""}`}
              key={request.id}
            >
              <div className="history-top">
                <strong className="track-c-phone-card__caller">
                  {resolvePlayerNickname(snapshot, request.requesterPlayerId)}님의 요청
                </strong>
                <span
                  className="status-badge uiux-chat-time-chip num-tabular"
                  data-tone="alert"
                  data-urgent={isExpiring ? "true" : "false"}
                >
                  {remaining}초 남음
                </span>
              </div>
              <p className="message-note track-c-phone-card__incoming-hint">
                수락하면 나머지 요청은 자동 정리됩니다.
              </p>
              <div className="action-row track-c-phone-card__incoming-actions">
                <button
                  className="button-primary track-c-phone-card__accept-button"
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => onRespondPrivateChat?.(request.id, true)}
                >
                  수락
                </button>
                <button
                  className="button-secondary track-c-phone-card__reject-button"
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => onRespondPrivateChat?.(request.id, false)}
                >
                  거절
                </button>
              </div>
            </div>
            );
          })}
        </div>
      ) : null}

      {outgoingPendingRequest ? (() => {
        const outgoingRemaining = resolveRemainingSeconds(outgoingPendingRequest.expiresAt, nowMs) ?? 0;
        const outgoingExpiring = outgoingRemaining > 0 && outgoingRemaining <= 5;
        return (
        <div
          className={`modal-card utility-stack track-c-phone-card__outgoing${outgoingExpiring ? " uiux-chat-card-expiring" : ""}`}
          data-call="outgoing"
        >
          <div className="history-top">
            <strong className="track-c-phone-card__caller">
              {resolvePlayerNickname(snapshot, outgoingPendingRequest.targetPlayerId)}님 응답 대기
            </strong>
            <span
              className="status-badge uiux-chat-time-chip num-tabular"
              data-tone="alert"
              data-urgent={outgoingExpiring ? "true" : "false"}
            >
              {outgoingRemaining}초 남음
            </span>
          </div>
          <p className="message-note track-c-phone-card__pulse-hint">상대 응답을 기다리는 중입니다.</p>
        </div>
        );
      })() : null}

      {phoneState === "cooldown" ? (
        <p className="message-note track-c-phone-card__cooldown" role="status">
          다시 신청하려면 {cooldownSeconds}초 더 기다려야 합니다.
        </p>
      ) : null}

      {phoneState === "busy" ? (
        <p className="message-note track-c-phone-card__busy" role="status">
          상대가 다른 사람과 통화 중입니다. 잠시 후 다시 시도하세요.
        </p>
      ) : null}

      {phoneState === "expired" ? (
        <p className="message-note track-c-phone-card__expired" role="status">
          최근 요청이 만료되었습니다.
        </p>
      ) : null}

      <div className="utility-stack track-c-phone-card__contacts">
        <div className="composer-header">
          <div>
            <h4 className="panel-title private-chat-subtitle">신청 가능</h4>
          </div>
          {isBusy ? (
            <span className="status-badge" data-tone="alert">
              현재 신청 불가
            </span>
          ) : null}
        </div>
        {requestablePlayers.length > 0 ? (
          <ul className="utility-list private-chat-request-list track-c-phone-card__contact-list">
            {requestablePlayers.map((player) => (
              <li
                className="utility-list-item private-chat-request-item track-c-phone-card__contact"
                key={player.playerId}
              >
                <div>
                  <strong className="private-chat-player-name">{player.nickname}</strong>
                  <div className="utility-meta private-chat-request-meta">
                    {resolveTeamLabel(snapshot, player.teamSlotId)} · {player.connectionStatus === "connected" ? "접속 중" : "이탈"}
                  </div>
                </div>
                <button
                  className="button-secondary button-compact private-chat-action-button track-c-phone-card__call-button"
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
    </section>
  );
}
