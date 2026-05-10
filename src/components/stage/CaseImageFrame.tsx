import type { RoomSnapshot } from "@/contracts/api";

export function CaseImageFrame({ snapshot }: { snapshot: RoomSnapshot }) {
  return (
    <figure className="image-frame">
      {snapshot.stage?.imageUrl ? (
        <span>{snapshot.stage.imageUrl}</span>
      ) : (
        <span>사건 이미지가 아직 공개되지 않았습니다.</span>
      )}
    </figure>
  );
}
