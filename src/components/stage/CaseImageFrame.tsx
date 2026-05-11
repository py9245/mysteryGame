import type { RoomSnapshot } from "@/contracts/api";

export function CaseImageFrame({ snapshot }: { snapshot: RoomSnapshot }) {
  const title = snapshot.stage?.publicTitle ?? "사건 이미지";

  return (
    <figure className="image-frame">
      {snapshot.stage?.imageUrl ? (
        <img
          className="case-image"
          src={snapshot.stage.imageUrl}
          alt={title}
        />
      ) : (
        <span>사건 이미지가 아직 공개되지 않았습니다.</span>
      )}
    </figure>
  );
}
