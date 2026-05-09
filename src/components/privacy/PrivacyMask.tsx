import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";
import { RedactedField } from "@/components/privacy/RedactedField";
import { RedactedPlayerRow } from "@/components/privacy/RedactedPlayerRow";

export function PrivacyMask({ snapshot }: { snapshot: RoomSnapshot }) {
  return (
    <section className="panel panel-muted">
      <div className="composer-header">
        <div>
          <h3 className="panel-title">비공개 정보</h3>
          <p className="panel-copy">지금 시점에 감춰야 하는 내용을 모아둔 영역입니다.</p>
        </div>
        <span className="status-badge">보호 중</span>
      </div>
      <RedactedField snapshot={snapshot} />
      <RedactedPlayerRow snapshot={snapshot} />
    </section>
  );
}
