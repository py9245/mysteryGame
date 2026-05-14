"use client";

import { useState } from "react";
import { buildChatMessageViewModels, resolveChatTeamLabel } from "./chat-message-view-model";
import {
  buildSendChatMessageRequest,
  buildSubmittedChatPreview,
  submitChatMessage,
  type ComposerChannel,
  type SubmittedChatPreview,
} from "./send-chat-message";
import type { ChatSnapshot } from "./chat-ui-types";

export function ChatComposer({
  snapshot,
  onSubmittedPreview,
  compact = false,
  forcedChannel,
  title,
  description,
  placeholder,
  submitLabel,
  disabled = false,
  disabledMessage,
}: {
  snapshot: ChatSnapshot;
  onSubmittedPreview?: (preview: SubmittedChatPreview) => void;
  compact?: boolean;
  forcedChannel?: ComposerChannel;
  title?: string;
  description?: string;
  placeholder?: string;
  submitLabel?: string;
  disabled?: boolean;
  disabledMessage?: string;
}) {
  const hasTeamChannel = snapshot.me.teamSlotId !== null;
  const teamLabel = resolveChatTeamLabel(snapshot.me.teamSlotId, snapshot.teamSlots) ?? "미배정";
  const [channel, setChannel] = useState<ComposerChannel>(
    forcedChannel ?? (hasTeamChannel ? "team" : "global"),
  );
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedPreview, setSubmittedPreview] = useState<SubmittedChatPreview | null>(null);
  const previewViewModel = submittedPreview
    ? buildChatMessageViewModels([submittedPreview.message], snapshot, { submittedPreview })[0] ?? null
    : null;
  const canSubmit =
    content.trim().length > 0 &&
    !isSubmitting &&
    !disabled &&
    (channel !== "team" || hasTeamChannel);

  const heading =
    title ?? (compact ? "보내기" : "메시지 보내기");
  const copy =
    description === ""
      ? ""
      : description ??
        (channel === "team"
          ? `${teamLabel} 팀 대화로 보냅니다.`
          : channel === "private"
            ? "현재 연결된 1:1 대화로 보냅니다."
            : "전체 채팅으로 보냅니다.");
  const resolvedPlaceholder =
    placeholder ??
    (channel === "team"
      ? `${teamLabel} 팀에게 공유할 단서를 입력하세요.`
      : channel === "private"
        ? "1:1 대화 상대에게 보낼 내용을 입력하세요."
        : "전체 플레이어에게 공유할 내용을 입력하세요.");
  const resolvedSubmitLabel = submitLabel ?? "메시지 보내기";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    const request = buildSendChatMessageRequest({
      snapshot,
      channel,
      content,
    });

    setIsSubmitting(true);

    const result = await submitChatMessage({ request });
    const preview = buildSubmittedChatPreview(result);
    setSubmittedPreview(preview);
    onSubmittedPreview?.(preview);

    if (result.ok) {
      setContent("");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
  }

  function handleTextareaKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    event.currentTarget.form?.requestSubmit();
  }

  return (
    <section className={compact ? "chat-section chat-composer-compact" : "chat-section"}>
      <h4>{heading}</h4>
      {copy ? <p className="panel-copy">{copy}</p> : null}
      <form className="composer-form" onSubmit={handleSubmit}>
        {forcedChannel ? null : (
          <div className="field">
            <label htmlFor="composer-channel">채널</label>
            <select
              id="composer-channel"
              className="select-input"
              value={channel}
              onChange={(event) => setChannel(event.target.value as ComposerChannel)}
            >
              <option value="team" disabled={!hasTeamChannel}>
                {hasTeamChannel ? `${teamLabel} 팀` : "팀 채널 없음"}
              </option>
              <option value="global">전체</option>
              <option value="private">1:1</option>
            </select>
          </div>
        )}
        <div className="field">
          <label htmlFor="composer-message">메시지</label>
          <textarea
            id="composer-message"
            className="text-area"
            rows={compact ? 2 : 3}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={handleTextareaKeyDown}
            placeholder={resolvedPlaceholder}
          />
        </div>
        <button className="button-primary" type="submit" disabled={!canSubmit}>
          {isSubmitting ? "전송 중..." : resolvedSubmitLabel}
        </button>
      </form>
      {disabled && disabledMessage ? <p className="message-note">{disabledMessage}</p> : null}
      {submittedPreview === null ? (
        !compact ? <p className="message-note">가장 최근 전송 결과가 여기에 표시됩니다.</p> : null
      ) : compact ? (
        <p className={submittedPreview.status === "success" ? "message-positive" : "message-note"}>
          {submittedPreview.notice}
        </p>
      ) : (
        <section className="panel panel-muted">
          <h5>{submittedPreview.status === "success" ? "전송 결과" : "전송 보류"}</h5>
          <p className="message-note">{submittedPreview.notice}</p>
          <p className="panel-copy">{submittedPreview.detail}</p>
          {previewViewModel ? (
            <div className="assignment-card">
              <strong>{previewViewModel.authorLabel}</strong> <span>{previewViewModel.metaLabel}</span>
              <p>{previewViewModel.content}</p>
            </div>
          ) : null}
        </section>
      )}
    </section>
  );
}
