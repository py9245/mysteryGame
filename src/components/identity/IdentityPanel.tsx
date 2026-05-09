import type { CurrentViewer } from "@/contracts/account";

function formatDateTime(value: string | null) {
  if (!value) {
    return "기록 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function IdentityPanel({
  viewer,
  nickname,
  isGuestBooting,
  onNicknameChange,
  onSaveNickname,
  onLogout,
  isSavingNickname = false,
  isLoggingOut = false,
}: {
  viewer: CurrentViewer | null;
  nickname: string;
  isGuestBooting: boolean;
  onNicknameChange?: (value: string) => void;
  onSaveNickname?: () => void;
  onLogout?: () => void;
  isSavingNickname?: boolean;
  isLoggingOut?: boolean;
}) {
  const isAccount = viewer?.kind === "account";
  const isGuest = viewer?.kind === "guest";

  return (
    <section className="panel panel-accent identity-panel">
      <div className="composer-header">
        <div>
          <h2 className="panel-title">내 상태</h2>
          <p className="panel-copy">
            {isGuestBooting
              ? "게스트 닉네임을 준비하고 있습니다."
              : isGuest
                ? "게스트는 자동 닉네임으로 바로 플레이합니다."
                : "계정으로 들어오면 닉네임 수정과 전적 누적이 이어집니다."}
          </p>
        </div>
        <span className="status-badge" data-tone={isAccount ? "live" : "alert"}>
          {isAccount ? "계정" : isGuest ? "게스트" : "준비 중"}
        </span>
      </div>

      {isGuest ? (
        <div className="identity-spotlight">
          <span className="metric-label">게스트 닉네임</span>
          <strong className="metric-value">{nickname}</strong>
          <p className="panel-copy">이번 브라우저에서는 이 이름으로 고정되며, 게스트 상태에서는 직접 수정하지 않습니다.</p>
        </div>
      ) : null}

      {isAccount ? (
        <div className="field-group">
          <label className="field">
            <span>닉네임</span>
            <input
              className="text-input"
              type="text"
              value={nickname}
              onChange={(event) => onNicknameChange?.(event.target.value)}
              placeholder="예: Midnight"
              maxLength={20}
            />
          </label>
          <div className="action-row">
            <button className="button-primary" type="button" onClick={onSaveNickname} disabled={isSavingNickname}>
              {isSavingNickname ? "저장 중..." : "닉네임 저장"}
            </button>
            <button className="button-secondary" type="button" onClick={onLogout} disabled={isLoggingOut}>
              {isLoggingOut ? "정리 중..." : "로그아웃"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="metric-grid">
        <div className="metric-card">
          <span className="metric-label">현재 닉네임</span>
          <strong className="metric-value">{nickname || "대기 중"}</strong>
          <span className="metric-detail">{isGuest ? "방 생성과 입장에 그대로 사용됩니다." : "저장 후 모든 방에서 같은 이름으로 이어집니다."}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">{isAccount ? "계정" : "전적"}</span>
          <strong className="metric-value">{isAccount ? viewer.account.email : "로그인 전"}</strong>
          <span className="metric-detail">
            {isAccount
              ? `최근 로그인 ${formatDateTime(viewer.account.lastLoginAt)}`
              : "승패와 최근 기록은 로그인 후부터 누적됩니다."}
          </span>
        </div>
      </div>
    </section>
  );
}
