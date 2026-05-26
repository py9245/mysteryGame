import type { RoomSnapshot } from "@/contracts/api";
import { PrivateChatBanner } from "@/components/chat-ui/PrivateChatBanner";

export function PrivateChatPanel({ snapshot }: { snapshot: RoomSnapshot }) {
  return (
    <section className="track-c-phone-feature" aria-label="1:1 대화 패널">
      <PrivateChatBanner snapshot={snapshot} />
    </section>
  );
}
