import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";

export function PrivateChatPanel({ snapshot }: { snapshot: RoomSnapshot }) {
  return <section>Private chat placeholder for {snapshot.me.nickname}</section>;
}
