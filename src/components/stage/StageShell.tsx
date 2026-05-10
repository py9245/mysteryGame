import type { RoomSnapshot } from "@/contracts/api";
import { StageHUD } from "@/components/stage/StageHUD";
import { PrivacyMask } from "@/components/privacy/PrivacyMask";

export function StageShell({ snapshot }: { snapshot: RoomSnapshot }) {
  return (
    <section>
      <h2>Stage</h2>
      <StageHUD snapshot={snapshot} />
      <PrivacyMask snapshot={snapshot} />
    </section>
  );
}
