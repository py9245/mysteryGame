import type { RoomSnapshot } from "@/contracts/api";

export function CaseImageFrame({ snapshot }: { snapshot: RoomSnapshot }) {
  const title = snapshot.stage?.publicTitle ?? "사건 이미지";
  const description = snapshot.stage?.publicDescription ?? "현장 이미지 준비 중";

  return (
    <figure className="image-frame case-image-frame">
      {snapshot.stage?.imageUrl ? (
        <img
          className="case-image"
          src={snapshot.stage.imageUrl}
          alt={title}
        />
      ) : (
        <div className="case-image-fallback">
          <span className="status-badge" data-tone="alert">이미지 준비 중</span>
          <strong>{title}</strong>
          <p>{description}</p>
        </div>
      )}
      <figcaption className="image-caption">사건 분위기를 보여주는 참고 이미지</figcaption>
    </figure>
  );
}
