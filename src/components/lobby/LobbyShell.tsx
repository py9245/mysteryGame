import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";
import { PrivacyMask } from "@/components/privacy/PrivacyMask";
import { RoomStatusBadge } from "@/components/lobby/RoomStatusBadge";
import { ReadyPanel } from "@/components/lobby/ReadyPanel";

export function LobbyShell({
  snapshot,
  isSubmitting = false,
  errorMessage = null,
  statusMessage = null,
  onToggleReady,
}: {
  snapshot: RoomSnapshot;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  statusMessage?: string | null;
  onToggleReady?: () => void;
}) {
  return (
    <section className="page-shell">
      <header className="page-header">
        <p className="eyebrow">심리전 대기실</p>
        <h2 className="page-title">대기실</h2>
        <p className="page-kicker">
          플레이어 확인, 준비 상태, 시야 제한을 점검하는 출발 전 브리핑 구역입니다.
        </p>
      </header>
      <div className="panel-grid">
        <section className="panel panel-accent span-7">
          <RoomStatusBadge viewMode={snapshot.viewMode} />
          <ReadyPanel
            me={snapshot.me}
            viewMode={snapshot.viewMode}
            isSubmitting={isSubmitting}
            errorMessage={errorMessage}
            statusMessage={statusMessage}
            onToggleReady={onToggleReady}
          />
        </section>
        <section className="span-5">
          <PrivacyMask snapshot={snapshot} />
        </section>
      </div>
    </section>
  );
}
