import type { RoomSnapshot } from "@/contracts/api";

export function PrivateChatRequestPanel({ snapshot }: { snapshot: RoomSnapshot }) {
  return <section>Private chat requests for {snapshot.me.nickname}</section>;
}
