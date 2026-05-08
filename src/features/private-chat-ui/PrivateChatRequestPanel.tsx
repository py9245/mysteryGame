import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";

export function PrivateChatRequestPanel({ snapshot }: { snapshot: RoomSnapshot }) {
  return <section>Private chat requests for {snapshot.me.nickname}</section>;
}
