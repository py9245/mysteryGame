import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";
import { RedactedField } from "@/components/privacy/RedactedField";
import { RedactedPlayerRow } from "@/components/privacy/RedactedPlayerRow";

export function PrivacyMask({ snapshot }: { snapshot: RoomSnapshot }) {
  return (
    <section className="panel panel-muted">
      <h3 className="panel-title">비공개 정보</h3>
      <p className="panel-copy">지금 시점에 드러나면 안 되는 정보와 시야 제한을 확인합니다.</p>
      <RedactedField snapshot={snapshot} />
      <RedactedPlayerRow snapshot={snapshot} />
    </section>
  );
}
