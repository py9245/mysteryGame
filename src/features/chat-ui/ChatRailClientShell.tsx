"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage } from "@/contracts/game";
import { getSupabaseBrowserClient, hasSupabaseBrowserEnv } from "@/lib/supabase-browser";
import { emitToast } from "@/components/feedback/toast-bus";
import { useKeyboardShortcut } from "@/lib/keyboard-shortcuts";
import { ChatComposer } from "./ChatComposer";
import { ChatMessageList } from "./ChatMessageList";
import { buildChatMessageViewModels, resolveChatTeamLabel } from "./chat-message-view-model";
import type { LoadedChatMessages } from "./chat-messages-loader";
import type { SubmittedChatPreview } from "./send-chat-message";
import type { ChatSnapshot } from "./chat-ui-types";

type SupportChannel = "team" | "private";

const CHAT_POLL_INTERVAL_MS = 2_000;
const CHAT_POLL_CONNECTED_INTERVAL_MS = 5_000;

function mergeMessagesWithSubmittedPreview(
  messages: ChatMessage[],
  submittedPreview: SubmittedChatPreview | null,
): ChatMessage[] {
  if (!submittedPreview) {
    return messages;
  }

  return [
    ...messages.filter((message) => message.id !== submittedPreview.message.id),
    submittedPreview.message,
  ];
}

function normalizeRealtimeChatMessage(value: Record<string, unknown>): ChatMessage | null {
  if (
    typeof value.id !== "string" ||
    typeof value.room_id !== "string" ||
    typeof value.player_id !== "string" ||
    typeof value.channel !== "string" ||
    typeof value.content !== "string" ||
    typeof value.created_at !== "string"
  ) {
    return null;
  }

  return {
    id: value.id,
    roomId: value.room_id,
    stageId: typeof value.stage_id === "string" ? value.stage_id : null,
    playerId: value.player_id,
    teamSlotId: typeof value.team_slot_id === "string" ? value.team_slot_id : null,
    channel: value.channel as ChatMessage["channel"],
    content: value.content,
    createdAt: value.created_at,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeFetchedChatMessages(value: unknown): ChatMessage[] | null {
  const messages =
    isRecord(value) && "data" in value && isRecord(value.data) && "messages" in value.data
      ? value.data.messages
      : isRecord(value) && "messages" in value
        ? value.messages
        : value;

  if (
    Array.isArray(messages) &&
    messages.every(
      (message) =>
        isRecord(message) &&
        typeof message.id === "string" &&
        typeof message.roomId === "string" &&
        typeof message.playerId === "string" &&
        typeof message.channel === "string" &&
        typeof message.content === "string" &&
        typeof message.createdAt === "string",
    )
  ) {
    return messages as ChatMessage[];
  }

  return null;
}

function mergeIncomingMessage(messages: ChatMessage[], incoming: ChatMessage): ChatMessage[] {
  const nextMessages = [...messages.filter((message) => message.id !== incoming.id), incoming];
  nextMessages.sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
  return nextMessages;
}

function mergeFetchedMessages(messages: ChatMessage[], incomingMessages: ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();

  for (const message of messages) {
    byId.set(message.id, message);
  }
  for (const message of incomingMessages) {
    byId.set(message.id, message);
  }

  return Array.from(byId.values()).sort(
    (left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt),
  );
}

function isRedactedValue(value: unknown): value is { hidden: true } {
  return typeof value === "object" && value !== null && "hidden" in value;
}

function resolvePrivateChatParticipantIds(snapshot: ChatSnapshot): string[] {
  const privateChat = snapshot.privateChat;
  if (!privateChat || isRedactedValue(privateChat)) {
    return [];
  }

  if (Array.isArray(privateChat.participants) && !isRedactedValue(privateChat.participants)) {
    return privateChat.participants.filter((value): value is string => typeof value === "string");
  }

  return [];
}

function hasActivePrivateChatSession(snapshot: ChatSnapshot): boolean {
  const privateChat = snapshot.privateChat;
  if (!privateChat || isRedactedValue(privateChat)) {
    return false;
  }

  return Boolean(privateChat.session && !isRedactedValue(privateChat.session));
}

function resolveIncomingRequestIds(snapshot: ChatSnapshot): string[] {
  const privateChat = snapshot.privateChat;
  if (!privateChat || isRedactedValue(privateChat)) {
    return [];
  }

  const incoming = privateChat.incomingRequests;
  if (!Array.isArray(incoming) || isRedactedValue(incoming)) {
    return [];
  }

  return incoming
    .map((entry) => (typeof entry?.id === "string" ? entry.id : null))
    .filter((value): value is string => value !== null);
}

export function ChatRailClientShell({
  snapshot,
  initialMessages,
  source,
  endpoint,
  variant = "default",
}: {
  snapshot: ChatSnapshot;
  initialMessages: ChatMessage[];
  source: LoadedChatMessages["source"];
  endpoint: string;
  variant?: "default" | "lobby";
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [submittedPreview, setSubmittedPreview] = useState<SubmittedChatPreview | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [hasChatFetchSucceeded, setHasChatFetchSucceeded] = useState(source === "api");
  const [activeSupportChannel, setActiveSupportChannel] = useState<SupportChannel>("team");
  const [unreadTeam, setUnreadTeam] = useState(false);
  const [unreadPrivate, setUnreadPrivate] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const lastSeenTeamIdRef = useRef<string | null>(null);
  const lastSeenPrivateIdRef = useRef<string | null>(null);
  const knownIncomingRequestIdsRef = useRef<Set<string>>(new Set());
  const isLobby = variant === "lobby";

  const visibleMessages = useMemo(() => {
    const merged = mergeMessagesWithSubmittedPreview(messages, submittedPreview);

    if (variant === "lobby") {
      return merged.filter((message) => message.stageId === null);
    }

    return merged;
  }, [messages, submittedPreview, variant]);
  const globalMessages = buildChatMessageViewModels(
    visibleMessages.filter((message) => message.channel === "global"),
    snapshot,
    { submittedPreview },
  );
  const teamMessagesRaw = useMemo(
    () =>
      visibleMessages.filter(
        (message) => message.channel === "team" && message.teamSlotId === snapshot.me.teamSlotId,
      ),
    [visibleMessages, snapshot.me.teamSlotId],
  );
  const teamMessages = buildChatMessageViewModels(teamMessagesRaw, snapshot, { submittedPreview });
  const privateParticipantIds = resolvePrivateChatParticipantIds(snapshot);
  const privateMessagesRaw = useMemo(
    () =>
      visibleMessages.filter(
        (message) =>
          message.channel === "private" &&
          privateParticipantIds.includes(message.playerId),
      ),
    [visibleMessages, privateParticipantIds],
  );
  const privateMessages = buildChatMessageViewModels(privateMessagesRaw, snapshot, {
    submittedPreview,
  });
  const myTeamLabel = resolveChatTeamLabel(snapshot.me.teamSlotId, snapshot.teamSlots);
  const canUsePrivateChat = hasActivePrivateChatSession(snapshot);
  const syncLabel =
    source === "api" || hasChatFetchSucceeded
      ? isRealtimeConnected
        ? "실시간 연결"
        : "자동 동기화"
      : "불러오지 못함";
  const activeSupportMessages = activeSupportChannel === "team" ? teamMessages : privateMessages;
  const activeSupportTitle =
    activeSupportChannel === "team" ? `${myTeamLabel ?? "미배정"} 팀 채팅` : "1:1 대화";
  const activeSupportEmptyMessage =
    activeSupportChannel === "team"
      ? "아직 팀 채팅이 없습니다."
      : canUsePrivateChat
        ? "아직 1:1 대화가 없습니다."
        : "아직 연결된 1:1 대화가 없습니다.";
  const activeSupportEmptyHint =
    activeSupportChannel === "team"
      ? "Enter로 빠르게 한 줄을 공유해 보세요."
      : canUsePrivateChat
        ? "Shift+Enter로 줄을 바꿀 수 있습니다."
        : undefined;

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    if (source === "api") {
      setHasChatFetchSucceeded(true);
    }
  }, [source]);

  useEffect(() => {
    if (!hasSupabaseBrowserEnv()) {
      setIsRealtimeConnected(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setIsRealtimeConnected(false);
      return;
    }

    const channel = supabase
      .channel(`chat-room-${snapshot.room.id}-${snapshot.stage?.stageId ?? "lobby"}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${snapshot.room.id}`,
        },
        (payload) => {
          const nextMessage = normalizeRealtimeChatMessage(
            (payload.new ?? {}) as Record<string, unknown>,
          );

          if (!nextMessage) {
            return;
          }

          setMessages((currentMessages) => mergeIncomingMessage(currentMessages, nextMessage));
        },
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === "SUBSCRIBED");
      });

    return () => {
      setIsRealtimeConnected(false);
      void supabase.removeChannel(channel);
    };
  }, [snapshot.room.id, snapshot.stage?.stageId]);

  const pollChatMessages = useCallback(async () => {
    if (!endpoint) {
      return;
    }

    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return;
    }

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as unknown;
      const nextMessages = normalizeFetchedChatMessages(payload);
      if (!nextMessages) {
        return;
      }

      setMessages((currentMessages) => mergeFetchedMessages(currentMessages, nextMessages));
      setHasChatFetchSucceeded(true);
    } catch {
      // Realtime remains the primary path; polling is only a catch-up lane.
    }
  }, [endpoint]);

  useEffect(() => {
    let isMounted = true;
    let isFetching = false;
    const intervalMs = isRealtimeConnected ? CHAT_POLL_CONNECTED_INTERVAL_MS : CHAT_POLL_INTERVAL_MS;

    async function runPoll() {
      if (!isMounted || isFetching) {
        return;
      }

      isFetching = true;
      try {
        await pollChatMessages();
      } finally {
        isFetching = false;
      }
    }

    const initialPollId = window.setTimeout(runPoll, isRealtimeConnected ? intervalMs : 500);
    const intervalId = window.setInterval(runPoll, intervalMs);
    const handleFocus = () => {
      void runPoll();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void runPoll();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      window.clearTimeout(initialPollId);
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isRealtimeConnected, pollChatMessages]);

  // Track unread badges on the tabs. We compare the latest message id with the
  // last-seen id (per channel) and only flag as unread when the user is on a
  // different tab and the message is not their own.
  useEffect(() => {
    if (isLobby) return;

    const latest = teamMessagesRaw[teamMessagesRaw.length - 1];
    if (!latest) return;
    if (lastSeenTeamIdRef.current === null) {
      lastSeenTeamIdRef.current = latest.id;
      return;
    }
    if (latest.id === lastSeenTeamIdRef.current) return;

    const isMine = latest.playerId === snapshot.me.playerId;
    if (activeSupportChannel === "team" || isMine) {
      lastSeenTeamIdRef.current = latest.id;
      return;
    }

    lastSeenTeamIdRef.current = latest.id;
    setUnreadTeam(true);
  }, [teamMessagesRaw, activeSupportChannel, snapshot.me.playerId, isLobby]);

  useEffect(() => {
    if (isLobby) return;

    const latest = privateMessagesRaw[privateMessagesRaw.length - 1];
    if (!latest) return;
    if (lastSeenPrivateIdRef.current === null) {
      lastSeenPrivateIdRef.current = latest.id;
      return;
    }
    if (latest.id === lastSeenPrivateIdRef.current) return;

    const isMine = latest.playerId === snapshot.me.playerId;
    if (activeSupportChannel === "private" || isMine) {
      lastSeenPrivateIdRef.current = latest.id;
      return;
    }

    lastSeenPrivateIdRef.current = latest.id;
    setUnreadPrivate(true);
  }, [privateMessagesRaw, activeSupportChannel, snapshot.me.playerId, isLobby]);

  // Clear unread when the user activates a tab.
  useEffect(() => {
    if (activeSupportChannel === "team") {
      setUnreadTeam(false);
      const latest = teamMessagesRaw[teamMessagesRaw.length - 1];
      if (latest) lastSeenTeamIdRef.current = latest.id;
    } else {
      setUnreadPrivate(false);
      const latest = privateMessagesRaw[privateMessagesRaw.length - 1];
      if (latest) lastSeenPrivateIdRef.current = latest.id;
    }
  }, [activeSupportChannel, teamMessagesRaw, privateMessagesRaw]);

  // Toast on new 1:1 incoming requests (diff against the seen set).
  useEffect(() => {
    const currentIds = resolveIncomingRequestIds(snapshot);
    const seen = knownIncomingRequestIdsRef.current;
    if (seen.size === 0) {
      // Initialize without firing toast for the first sync.
      knownIncomingRequestIdsRef.current = new Set(currentIds);
      return;
    }

    const newOnes = currentIds.filter((id) => !seen.has(id));
    if (newOnes.length > 0) {
      emitToast({
        tone: "info",
        title: "1:1 요청",
        detail:
          newOnes.length > 1
            ? `${newOnes.length}건의 새 요청이 도착했습니다.`
            : "새 1:1 대화 요청이 도착했습니다.",
      });
    }

    knownIncomingRequestIdsRef.current = new Set(currentIds);
  }, [snapshot]);

  const focusComposer = useCallback(() => {
    const node = composerRef.current;
    if (!node) return;
    node.focus({ preventScroll: false });
    // Move cursor to the end on focus.
    const len = node.value.length;
    try {
      node.setSelectionRange(len, len);
    } catch {
      // ignore — some browsers will not allow this on disabled fields
    }
  }, []);

  // `/` focuses the primary composer when not typing.
  useKeyboardShortcut(
    "/",
    () => {
      focusComposer();
    },
    { allowInInput: false },
  );

  // 1/2/3 switch tabs in non-lobby contexts when not typing.
  useKeyboardShortcut(
    ["1", "2", "3"],
    (event) => {
      if (isLobby) return false;
      if (event.key === "1") {
        focusComposer();
        return;
      }
      if (event.key === "2") {
        setActiveSupportChannel("team");
        return;
      }
      if (event.key === "3") {
        setActiveSupportChannel("private");
        return;
      }
    },
    { allowInInput: false, enabled: !isLobby },
  );

  return (
    <aside className={`chat-rail chat-shell chat-rail-layout mt-chat-rail${isLobby ? " lobby-chat-layout lobby-chat-layout-single" : ""}`}>
      <section className="chat-main-panel chat-primary-panel">
        <div className="composer-header">
          <div>
            <h3 className="panel-title">{isLobby ? "대기 채팅" : "전체 채팅"}</h3>
          </div>
          <span
            className="status-badge"
            data-tone={
              (source === "api" || hasChatFetchSucceeded) && isRealtimeConnected
                ? "live"
                : source === "api" || hasChatFetchSucceeded
                  ? undefined
                  : "alert"
            }
          >
            {syncLabel}
          </span>
        </div>
        <ChatMessageList
          emptyMessage="아직 공개 채팅이 없습니다."
          emptyHint="Enter로 빠르게 한 줄을 공유해 보세요."
          messages={globalMessages}
        />
        <ChatComposer
          snapshot={snapshot}
          onSubmittedPreview={setSubmittedPreview}
          compact
          forcedChannel="global"
          title="전체 채팅 보내기"
          description=""
          submitLabel="전송"
          textareaRef={composerRef}
        />
      </section>

      {!isLobby ? (
        <section className="chat-section chat-support-panel gameplay-chat-support-tabs">
          <div className="chat-support-header">
            <div className="tab-row chat-channel-tabs" aria-label="보조 채팅 채널" role="tablist">
              <button
                className={activeSupportChannel === "team" ? "tab-button is-active" : "tab-button"}
                type="button"
                role="tab"
                aria-selected={activeSupportChannel === "team"}
                onClick={() => setActiveSupportChannel("team")}
              >
                팀
                {unreadTeam && activeSupportChannel !== "team" ? (
                  <span className="uiux-chat-unread-dot" aria-label="새 메시지" />
                ) : null}
              </button>
              <button
                className={activeSupportChannel === "private" ? "tab-button is-active" : "tab-button"}
                type="button"
                role="tab"
                aria-selected={activeSupportChannel === "private"}
                onClick={() => setActiveSupportChannel("private")}
              >
                1:1
                {unreadPrivate && activeSupportChannel !== "private" ? (
                  <span className="uiux-chat-unread-dot" aria-label="새 메시지" />
                ) : null}
              </button>
            </div>
            <span className="status-badge">
              {activeSupportChannel === "team" ? myTeamLabel ?? "미배정" : canUsePrivateChat ? "연결됨" : "미연결"}
            </span>
          </div>
          <h4>{activeSupportTitle}</h4>
          <ChatMessageList
            emptyMessage={activeSupportEmptyMessage}
            emptyHint={activeSupportEmptyHint}
            messages={activeSupportMessages}
          />
          <ChatComposer
            snapshot={snapshot}
            onSubmittedPreview={setSubmittedPreview}
            compact
            forcedChannel={activeSupportChannel}
            title={activeSupportChannel === "team" ? "팀 채팅" : "1:1 대화"}
            description=""
            submitLabel="전송"
            disabled={activeSupportChannel === "team" ? !snapshot.me.teamSlotId : !canUsePrivateChat}
            disabledMessage={
              activeSupportChannel === "team"
                ? "팀이 배정되면 팀 채팅 입력이 열립니다."
                : "1:1 대화가 연결되면 이 입력창이 열립니다."
            }
          />
        </section>
      ) : null}
    </aside>
  );
}
