import { LobbyClientShell } from "@/components/lobby/LobbyClientShell";
import { UnavailableStatePanel } from "@/components/status/UnavailableStatePanel";
import { loadChatMessages } from "@/features/chat-ui/chat-messages-loader";
import { resolveRoomContextFromSearchParams, type RoomRouteSearchParams } from "@/features/room-context/room-context";
import { loadRoomSnapshot } from "@/features/room-snapshot/room-snapshot-loader";
import { listChatMessagesFromStore, getRoomSnapshotFromStore } from "@/server/live-store";
import { isSupabaseEnabled } from "@/server/supabase-admin";

export default async function LobbyPage({
  searchParams,
}: {
  searchParams?: Promise<RoomRouteSearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { roomId, roomCode, playerId } = resolveRoomContextFromSearchParams(resolvedSearchParams);
  const roomRef = roomId ?? roomCode;
  const snapshot =
    isSupabaseEnabled() && roomRef
      ? await getRoomSnapshotFromStore(roomRef, playerId, { lightweight: true })
      : await loadRoomSnapshot({
          roomId,
          roomCode: roomId ? undefined : roomCode,
          playerId,
        });

  if (!snapshot) {
    return (
      <UnavailableStatePanel
        title="대기실 상태를 불러오지 못했습니다"
        description="방 코드와 플레이어 정보, Supabase 연결 상태를 확인한 뒤 다시 시도해 주세요."
      />
    );
  }

  const chatMessages =
    isSupabaseEnabled()
      ? {
          messages: (await listChatMessagesFromStore(
            snapshot.room.id,
            snapshot.stage?.stageId ?? null,
          )).messages,
          source: "api" as const,
          endpoint: `/api/chat/${encodeURIComponent(snapshot.room.id)}`,
        }
      : await loadChatMessages({
          roomId: snapshot.room.id,
          playerId: snapshot.me.playerId,
          stageId: snapshot.stage?.stageId ?? null,
        });

  return (
    <LobbyClientShell
      initialSnapshot={snapshot}
      initialChatMessages={chatMessages.messages}
      initialChatSource={chatMessages.source}
      chatEndpoint={chatMessages.endpoint}
    />
  );
}
