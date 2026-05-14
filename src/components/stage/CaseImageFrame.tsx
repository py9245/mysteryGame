"use client";

import type { CSSProperties, SyntheticEvent } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { RoomSnapshot } from "@/contracts/api";

export function CaseImageFrame({ snapshot }: { snapshot: RoomSnapshot }) {
  const title = snapshot.stage?.publicTitle ?? "사건 이미지";
  const description = snapshot.stage?.publicDescription ?? "현장 이미지 준비 중";
  const imageUrl = snapshot.stage?.imageUrl ?? null;
  const [isZoomed, setIsZoomed] = useState(false);
  const [imageLoadState, setImageLoadState] = useState<"loading" | "loaded" | "failed">("loading");
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    setImageLoadState(imageUrl ? "loading" : "failed");
    setImageAspectRatio(null);
  }, [imageUrl]);

  useEffect(() => {
    if (!isZoomed) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsZoomed(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isZoomed]);

  const frameStyle =
    imageAspectRatio && Number.isFinite(imageAspectRatio)
      ? ({ "--case-image-aspect": String(imageAspectRatio) } as CSSProperties)
      : undefined;
  const frameClassName = [
    "image-frame",
    "case-image-frame",
    imageUrl ? "has-case-image" : "",
    imageLoadState === "failed" ? "case-image-frame-failed" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const shouldRenderImage = Boolean(imageUrl && imageLoadState !== "failed");

  function handleImageLoad(event: SyntheticEvent<HTMLImageElement>) {
    const image = event.currentTarget;
    if (image.naturalWidth > 0 && image.naturalHeight > 0) {
      setImageAspectRatio(image.naturalWidth / image.naturalHeight);
    }
    setImageLoadState("loaded");
  }

  return (
    <>
      <figure className={frameClassName} style={frameStyle}>
        {shouldRenderImage ? (
          <button
            type="button"
            className="case-image-zoom-button"
            aria-label="현장 이미지 크게 보기"
            onClick={() => setIsZoomed(true)}
          >
            <img
              className="case-image"
              src={imageUrl}
              alt={title}
              onLoad={handleImageLoad}
              onError={() => setImageLoadState("failed")}
            />
            <span className="case-image-zoom-hint" aria-hidden="true">크게 보기</span>
          </button>
        ) : (
          <div className="case-image-fallback">
            <span className="status-badge" data-tone="alert">이미지 준비 중</span>
            <strong>{title}</strong>
            <p>{description}</p>
          </div>
        )}
        <figcaption className="image-caption">사건 분위기를 보여주는 참고 이미지</figcaption>
      </figure>

      {isZoomed && imageUrl && typeof document !== "undefined"
        ? createPortal(
            <div
              className="modal-backdrop case-image-modal-backdrop"
              role="presentation"
              onClick={() => setIsZoomed(false)}
            >
              <section
                className="case-image-modal"
                role="dialog"
                aria-modal="true"
                aria-label={`${title} 확대 이미지`}
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="case-image-modal-close"
                  aria-label="이미지 닫기"
                  onClick={() => setIsZoomed(false)}
                >
                  ✕
                </button>
                <img className="case-image-modal-image" src={imageUrl} alt={title} />
                <figcaption className="case-image-modal-caption">
                  <strong>{title}</strong>
                  <span>{description}</span>
                </figcaption>
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
