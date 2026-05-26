import type { RoomSnapshot } from "@/contracts/api";
import { StageHUD } from "@/components/stage/StageHUD";
import { CasePanel } from "@/components/stage/CasePanel";
import { CaseImageFrame } from "@/components/stage/CaseImageFrame";
import { PrivacyMask } from "@/components/privacy/PrivacyMask";

export function StageShell({ snapshot }: { snapshot: RoomSnapshot }) {
  return (
    <section className="page-shell track-c-stage-shell" aria-label="스테이지 미리보기">
      <StageHUD snapshot={snapshot} />
      <section className="panel panel-muted track-c-stage-shell__case" aria-label="사건 파일 미리보기">
        <CasePanel snapshot={snapshot} />
        <CaseImageFrame snapshot={snapshot} />
      </section>
      <PrivacyMask snapshot={snapshot} />
    </section>
  );
}
