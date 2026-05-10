import type { RoomSnapshot } from "@/contracts/api";

export function PrivateChatPanel({ snapshot }: { snapshot: RoomSnapshot }) {
  return <section>Private chat placeholder for {snapshot.me.nickname}</section>;
}
