"use client";

import type { CSSProperties, SyntheticEvent } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { RoomSnapshot } from "@/contracts/api";

const DEFAULT_CASE_IMAGE_ASPECT = 1.6;

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

  const effectiveAspect =
    imageAspectRatio && Number.isFinite(imageAspectRatio) ? imageAspectRatio : DEFAULT_CASE_IMAGE_ASPECT;
  const frameStyle = {
    "--case-image-aspect": String(effectiveAspect),
  } as CSSProperties;
  const frameClassName = [
    "image-frame",
    "case-image-frame",
    "track-c-case-image-frame",
    imageUrl ? "has-case-image" : "",
    imageLoadState === "failed" ? "case-image-frame-failed" : "",
    imageLoadState === "loading" ? "track-c-case-image-frame--loading" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const shouldRenderImage = Boolean(imageUrl && imageLoadState !== "failed");
  const showSkeleton = Boolean(imageUrl) && imageLoadState === "loading";

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
        <span className="track-c-case-image-frame__tape" aria-hidden="true" />
        {showSkeleton ? (
          <div
            className="uiux-gameplay-case-image-skeleton"
            aria-hidden="true"
          />
        ) : null}
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
          <div className="case-image-fallback track-c-case-image-frame__fallback uiux-gameplay-case-fallback-shimmer">
            <span className="status-badge" data-tone="alert">
              {imageLoadState === "loading" ? "이미지 불러오는 중" : "이미지 준비 중"}
            </span>
            <strong>{title}</strong>
            <p>{description}</p>
          </div>
        )}
        <figcaption className="image-caption track-c-case-image-frame__caption">
          현장에서 확보한 참고 이미지
        </figcaption>
      </figure>

      {isZoomed && imageUrl && typeof document !== "undefined"
        ? createPortal(
            <div
              className="modal-backdrop case-image-modal-backdrop uiux-gameplay-case-modal-backdrop-enter"
              role="presentation"
              onClick={() => setIsZoomed(false)}
            >
              <section
                className="case-image-modal uiux-gameplay-case-modal-enter"
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
