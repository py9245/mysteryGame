"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CurrentViewer } from "@/contracts/account";
import type {
  ApiResponse,
  CreateRoomResponse,
  ListRoomDirectoryResponse,
  RoomDirectoryEntry,
} from "@/contracts/api";
import {
  loginViewer,
  logoutViewer,
  registerViewer,
  saveViewerNickname,
} from "./account-session-client";
import { RoomDirectoryPanel, type DirectoryRoom } from "./RoomDirectoryPanel";
import {
  submitCreateRoom,
  type SubmitCreateRoomResult,
} from "./create-room-bootstrap";
import {
  submitJoinRoom,
  type SubmitJoinRoomResult,
} from "./join-room-bootstrap";
import { RulebookLauncher } from "@/components/rulebook/RulebookLauncher";
import { RoomModePicker } from "@/components/room/RoomModePicker";
import { OnboardingGuide } from "@/components/onboarding/OnboardingGuide";

type RoomLaunchMode = "public" | "secret" | "practice";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function makeGuestNickname() {
  const left = ["작은", "조용한", "차가운", "희미한", "깊은", "은밀한"];
  const right = ["실루엣", "그림자", "파동", "발자국", "속삭임", "단서"];
  const leftIndex = Math.floor(Math.random() * left.length);
  const rightIndex = Math.floor(Math.random() * right.length);
  const suffix = Math.floor(Math.random() * 90 + 10);
  return `${left[leftIndex]} ${right[rightIndex]} ${suffix}`;
}

function getRoomStatusLabel(status: string) {
  switch (status) {
    case "ready":
      return "시작 가능";
    case "assigning":
      return "팀 편성 중";
    case "in_game":
      return "게임 진행 중";
    case "closed":
      return "종료";
    default:
      return "입장 대기";
  }
}

function isAccountViewer(
  viewer: CurrentViewer | null,
): viewer is Extract<CurrentViewer, { kind: "account" }> {
  return viewer?.kind === "account";
}

function formatRank(rank: number | null): string {
  return rank === null ? "-" : `${rank}위`;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "기록 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

function getRoomModeSummary(mode: RoomLaunchMode) {
  switch (mode) {
    case "secret":
      return {
        label: "비밀방",
        entryPolicy: "입장 코드와 비밀번호를 모두 확인한 뒤 합류합니다.",
        settingsPolicy: "비밀번호는 4자 이상으로 정리해 두는 편이 안전합니다.",
      };
    case "practice":
      return {
        label: "연습방",
        entryPolicy: "1인, 1스테이지만 열리고 외부 합류는 닫혀 있습니다.",
        settingsPolicy: "혼자 흐름과 판정 감각을 점검하는 용도입니다.",
      };
    default:
      return {
        label: "공개방",
        entryPolicy: "입장 코드만 맞으면 바로 합류할 수 있습니다.",
        settingsPolicy: "인원을 빠르게 모아 대기실로 바로 넘길 때 적합합니다.",
      };
  }
}

function mapRoomEntry(entry: RoomDirectoryEntry): DirectoryRoom {
  return {
    code: entry.roomCode,
    title: entry.title,
    mode: entry.mode,
    currentPlayers: entry.currentPlayers,
    maxPlayers: entry.maxPlayers,
    createdAt: entry.createdAt,
    stageCount: entry.stageCount,
    passwordProtected: entry.passwordProtected,
    joinable: entry.joinable,
  };
}

function resolveRoomDirectory(value: unknown): DirectoryRoom[] | null {
  if (
    isRecord(value) &&
    "data" in value &&
    isRecord(value.data) &&
    Array.isArray(value.data.rooms)
  ) {
    return (value.data.rooms as RoomDirectoryEntry[]).map(mapRoomEntry);
  }

  return null;
}

type HomeEntrySurfaceProps = {
  initialViewer: CurrentViewer | null;
};

export function HomeEntrySurface({ initialViewer }: HomeEntrySurfaceProps) {
  const [viewer, setViewer] = useState<CurrentViewer | null>(initialViewer);
  const [guestPreviewNickname, setGuestPreviewNickname] = useState(initialViewer?.nickname ?? "");
  const [registerNickname, setRegisterNickname] = useState(initialViewer?.nickname ?? "");
  const [joinRoomCode, setJoinRoomCode] = useState("");
  const [joinRoomPassword, setJoinRoomPassword] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerAge, setRegisterAge] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authMode, setAuthMode] = useState<"register" | "login">("register");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [roomLaunchMode, setRoomLaunchMode] = useState<RoomLaunchMode>("public");
  const [roomTitleDraft, setRoomTitleDraft] = useState("새로운 사건");
  const [roomPasswordDraft, setRoomPasswordDraft] = useState("");
  const [hostNoteDraft, setHostNoteDraft] = useState("");
  const [stageCountDraft, setStageCountDraft] = useState(3);
  const [isRoomSettingsOpen, setIsRoomSettingsOpen] = useState(false);
  const [isGuestIdentityBooting, setIsGuestIdentityBooting] = useState(!initialViewer);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [createResult, setCreateResult] = useState<SubmitCreateRoomResult | null>(null);
  const [joinResult, setJoinResult] = useState<SubmitJoinRoomResult | null>(null);
  const [roomDirectory, setRoomDirectory] = useState<DirectoryRoom[]>([]);
  const [isDirectoryLoading, setIsDirectoryLoading] = useState(true);
  const [roomDirectoryError, setRoomDirectoryError] = useState<string | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMessage, setAuthSuccessMessage] = useState<string | null>(null);
  const [launchResultMessage, setLaunchResultMessage] = useState<string | null>(null);

  const accountViewer = isAccountViewer(viewer) ? viewer.account : null;
  const displayNickname = (viewer?.nickname ?? guestPreviewNickname) || "게스트 준비 중";
  const hasPlayableIdentity = Boolean(viewer?.nickname && viewer.nickname.trim().length >= 2);
  const roomModeSummary = useMemo(() => getRoomModeSummary(roomLaunchMode), [roomLaunchMode]);
  const trimmedRoomTitle = roomTitleDraft.trim();
  const trimmedRoomPassword = roomPasswordDraft.trim();
  const trimmedHostNote = hostNoteDraft.trim();
  const isRoomTitleReady = trimmedRoomTitle.length >= 2;
  const isSecretPasswordReady = roomLaunchMode !== "secret" || trimmedRoomPassword.length >= 4;
  const resolvedStageCount = roomLaunchMode === "practice" ? 1 : Math.max(1, Math.min(5, stageCountDraft));
  const resolvedMaxPlayers = roomLaunchMode === "practice" ? 1 : 6;
  const canCreate = hasPlayableIdentity && isRoomTitleReady && isSecretPasswordReady && !isSubmitting;
  const canJoin = hasPlayableIdentity && joinRoomCode.trim().length > 0 && !isJoining;

  const roomSettingsStatusMessage = useMemo(() => {
    if (!isRoomTitleReady) {
      return "방 제목을 2자 이상 정하면 목록에서 더 빨리 찾을 수 있습니다.";
    }

    if (!isSecretPasswordReady) {
      return "비밀방은 4자 이상 비밀번호를 먼저 정리해 주세요.";
    }

    if (trimmedHostNote.length > 0) {
      return `${trimmedRoomTitle} · ${trimmedHostNote}`;
    }

    return `${trimmedRoomTitle} · ${roomModeSummary.entryPolicy}`;
  }, [
    isRoomTitleReady,
    isSecretPasswordReady,
    roomModeSummary.entryPolicy,
    trimmedHostNote,
    trimmedRoomTitle,
  ]);

  useEffect(() => {
    if (initialViewer || !isGuestIdentityBooting) {
      return;
    }

    let mounted = true;

    async function seedGuestNickname() {
      const nextGuestNickname = makeGuestNickname();
      setGuestPreviewNickname(nextGuestNickname);

      const result = await saveViewerNickname({
        nickname: nextGuestNickname,
      });

      if (!mounted) {
        return;
      }

      if (result.ok && result.viewer) {
        setViewer(result.viewer);
        setGuestPreviewNickname(result.viewer.nickname);
      } else {
        setViewer({
          kind: "guest",
          nickname: nextGuestNickname,
          guest: {
            nickname: nextGuestNickname,
            updatedAt: null,
          },
        });
      }

      setIsGuestIdentityBooting(false);
    }

    void seedGuestNickname();

    return () => {
      mounted = false;
    };
  }, [initialViewer, isGuestIdentityBooting]);

  useEffect(() => {
    if (!registerNickname.trim() && viewer?.nickname) {
      setRegisterNickname(viewer.nickname);
    }
  }, [registerNickname, viewer]);

  useEffect(() => {
    let mounted = true;

    async function loadRoomDirectory() {
      setIsDirectoryLoading(true);
      setRoomDirectoryError(null);

      try {
        const response = await fetch("/api/room", {
          method: "GET",
          cache: "no-store",
        });
        let payload: unknown = null;

        try {
          payload = (await response.json()) as ApiResponse<ListRoomDirectoryResponse>;
        } catch {
          payload = null;
        }

        if (!mounted) {
          return;
        }

        const nextRooms = resolveRoomDirectory(payload);

        if (response.ok && nextRooms) {
          setRoomDirectory(nextRooms);
          setRoomDirectoryError(null);
        } else {
          setRoomDirectory([]);
          setRoomDirectoryError("방 목록을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
        }
      } catch {
        if (!mounted) {
          return;
        }

        setRoomDirectory([]);
        setRoomDirectoryError("네트워크 문제로 방 목록을 가져오지 못했습니다.");
      } finally {
        if (mounted) {
          setIsDirectoryLoading(false);
        }
      }
    }

    void loadRoomDirectory();

    return () => {
      mounted = false;
    };
  }, []);

  function openAuthModal(nextMode: "register" | "login") {
    setAuthMode(nextMode);
    setAuthError(null);
    setAuthSuccessMessage(null);
    setIsAuthModalOpen(true);
  }

  async function refreshRoomDirectory() {
    setIsDirectoryLoading(true);
    setRoomDirectoryError(null);

    try {
      const response = await fetch("/api/room", {
        method: "GET",
        cache: "no-store",
      });
      let payload: unknown = null;

      try {
        payload = (await response.json()) as ApiResponse<ListRoomDirectoryResponse>;
      } catch {
        payload = null;
      }

      const nextRooms = resolveRoomDirectory(payload);
      if (response.ok && nextRooms) {
        setRoomDirectory(nextRooms);
      } else {
        setRoomDirectoryError("방 목록을 새로 고치지 못했습니다.");
      }
    } catch {
      setRoomDirectoryError("방 목록을 새로 고치지 못했습니다.");
    } finally {
      setIsDirectoryLoading(false);
    }
  }

  async function handleCreateRoom() {
    if (!hasPlayableIdentity) {
      setIdentityError("게스트 이름이 준비되면 방을 열 수 있습니다.");
      return;
    }

    if (!isRoomTitleReady || !isSecretPasswordReady) {
      setLaunchResultMessage(roomSettingsStatusMessage);
      setIsRoomSettingsOpen(true);
      return;
    }

    setIsSubmitting(true);
    setIdentityError(null);
    setAuthSuccessMessage(null);
    setLaunchResultMessage(null);

    const nextResult = await submitCreateRoom({
      hostNickname: displayNickname,
      roomMode: roomLaunchMode,
      roomTitle: trimmedRoomTitle,
      roomPassword: roomLaunchMode === "secret" ? trimmedRoomPassword : null,
      stageCount: resolvedStageCount,
      maxPlayers: resolvedMaxPlayers,
    });

    setCreateResult(nextResult);
    setJoinResult(null);

    if (nextResult.ok) {
      setLaunchResultMessage(
        `${roomModeSummary.label} · ${trimmedRoomTitle} · ${trimmedHostNote || roomModeSummary.entryPolicy}`,
      );
      await refreshRoomDirectory();
    }

    setIsSubmitting(false);
  }

  async function handleJoinSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canJoin) {
      return;
    }

    setIsJoining(true);
    const nextResult = await submitJoinRoom({
      roomCode: joinRoomCode,
      nickname: displayNickname,
      roomPassword: joinRoomPassword.trim() || null,
    });
    setJoinResult(nextResult);
    setCreateResult(null);
    setIsJoining(false);
  }

  async function handleDirectoryJoin(roomCode: string, roomPassword?: string) {
    if (!hasPlayableIdentity) {
      throw new Error("게스트 이름이 준비되면 방에 합류할 수 있습니다.");
    }

    const nextResult = await submitJoinRoom({
      roomCode,
      nickname: displayNickname,
      roomPassword: roomPassword ?? null,
    });

    setJoinResult(nextResult);
    setCreateResult(null);

    if (!nextResult.ok) {
      throw new Error(nextResult.errorMessage ?? "방 입장에 실패했습니다.");
    }
  }

  async function handleRegisterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (registerNickname.trim().length < 2) {
      setAuthError("회원가입용 닉네임을 2자 이상 입력해 주세요.");
      return;
    }

    if (registerPassword !== registerPasswordConfirm) {
      setAuthError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setIsSubmittingAuth(true);
    setAuthError(null);
    setAuthSuccessMessage(null);

    const result = await registerViewer({
      email: registerEmail,
      password: registerPassword,
      nickname: registerNickname.trim(),
      age: registerAge.trim().length > 0 ? Number.parseInt(registerAge.trim(), 10) : undefined,
    });

    if (result.ok && result.viewer) {
      setViewer(result.viewer);
      setRegisterPassword("");
      setRegisterPasswordConfirm("");
      setRegisterAge("");
      setAuthSuccessMessage("회원가입이 완료되었습니다. 이제 전적이 같은 계정에 누적됩니다.");
      setIsAuthModalOpen(false);
      await refreshRoomDirectory();
    } else {
      setAuthError(result.errorMessage ?? "회원가입에 실패했습니다.");
    }

    setIsSubmittingAuth(false);
  }

  async function handleLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmittingAuth(true);
    setAuthError(null);
    setAuthSuccessMessage(null);

    const result = await loginViewer({
      email: loginEmail,
      password: loginPassword,
    });

    if (result.ok && result.viewer) {
      setViewer(result.viewer);
      setLoginPassword("");
      setAuthSuccessMessage("로그인되었습니다. 이제 기록과 닉네임이 계정 기준으로 이어집니다.");
      setIsAuthModalOpen(false);
      await refreshRoomDirectory();
    } else {
      setAuthError(result.errorMessage ?? "로그인에 실패했습니다.");
    }

    setIsSubmittingAuth(false);
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    setAuthError(null);
    setAuthSuccessMessage(null);

    const result = await logoutViewer();

    if (result.ok) {
      setViewer(result.viewer);
      setAuthSuccessMessage("로그아웃되었습니다. 현재 브라우저에서는 게스트 이름으로 계속 들어갈 수 있습니다.");
    } else {
      setAuthError(result.errorMessage ?? "로그아웃에 실패했습니다.");
    }

    setIsLoggingOut(false);
  }

  return (
    <main className="page-shell home-page-shell">
      <section className="page-header">
        <div className="header-top-row">
          <div>
            <p className="eyebrow">심리 추리전</p>
            <h1 className="page-title">Mystery Time</h1>
            <p className="page-kicker">
              초대받았다면 코드로 바로 들어오고, 방이 없다면 공개방에 합류하거나 새 방을 여세요.
            </p>
          </div>
          <div className="header-actions">
            {accountViewer ? (
              <>
                <a className="button-secondary button-compact" href="#my-records">
                  내 전적
                </a>
                <button
                  className="button-secondary button-compact"
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? "정리 중..." : "로그아웃"}
                </button>
              </>
            ) : (
              <>
                <button
                  className="button-secondary button-compact"
                  type="button"
                  onClick={() => openAuthModal("login")}
                >
                  로그인
                </button>
                <button
                  className="button-primary button-compact"
                  type="button"
                  onClick={() => openAuthModal("register")}
                >
                  회원가입
                </button>
              </>
            )}
            <RulebookLauncher label="룰북" compact scope="main" />
          </div>
        </div>
      </section>

      {identityError ? <p className="message-negative">{identityError}</p> : null}
      {authSuccessMessage ? <p className="message-positive">{authSuccessMessage}</p> : null}

      <section className="home-hero-layout">
        <article className="panel panel-accent home-hero-main">
          <div className="composer-header">
            <div>
              <h2 className="panel-title">먼저 해야 할 일은 세 가지뿐입니다</h2>
              <p className="panel-copy">
                입장 코드로 바로 들어가거나, 열려 있는 공개방을 고르거나, 새 방을 만드는 흐름만 먼저 보이게 정리했습니다.
              </p>
            </div>
            <span className="status-badge" data-tone={accountViewer ? "live" : isGuestIdentityBooting ? "alert" : "live"}>
              {accountViewer ? "계정 로그인" : isGuestIdentityBooting ? "준비 중" : "게스트 입장"}
            </span>
          </div>

          <div className="metric-grid home-identity-summary">
            <article className="metric-card metric-card-emphasis">
              <span className="metric-label">현재 이름</span>
              <strong className="metric-value">{displayNickname}</strong>
              <span className="metric-detail">
                {accountViewer
                  ? "로그인한 계정 닉네임으로 모든 방에 같은 이름이 적용됩니다."
                  : "게스트는 랜덤 닉네임으로 바로 플레이하며 직접 수정하지 않습니다."}
              </span>
            </article>
            <article className="metric-card">
              <span className="metric-label">빠른 입장</span>
              <strong className="metric-value">코드 / 공개방 / 방 만들기</strong>
              <span className="metric-detail">첫 화면은 세 가지 행동만 남기고 나머지 설명은 아래로 접었습니다.</span>
            </article>
            <article className="metric-card">
              <span className="metric-label">{accountViewer ? "내 전적" : "계정 옵션"}</span>
              <strong className="metric-value">
                {accountViewer ? `${accountViewer.stats.wins}승 ${accountViewer.stats.losses}패` : "로그인 선택"}
              </strong>
              <span className="metric-detail">
                {accountViewer
                  ? `평균 ${formatRank(accountViewer.stats.averageRank)} · 승률 ${formatPercentage(accountViewer.stats.winRate)}`
                  : "로그인하면 승패, 순위, 최근 기록이 같은 계정에 누적됩니다."}
              </span>
            </article>
          </div>

          <div className="home-hero-actions">
            <a className="button-primary" href="#quick-join">
              코드로 입장
            </a>
            <a className="button-secondary" href="#open-rooms">
              공개방 찾기
            </a>
            <a className="button-secondary" href="#create-room">
              방 만들기
            </a>
          </div>
        </article>

        <aside className="home-side-stack">
          <article className="panel home-action-card" id="quick-join">
            <div className="composer-header">
              <div>
                <h2 className="panel-title">입장 코드로 바로 들어가기</h2>
                <p className="panel-copy">코드가 있다면 여기서 바로 대기실로 합류하세요.</p>
              </div>
              <span className="status-badge" data-tone={hasPlayableIdentity ? "live" : "alert"}>
                {hasPlayableIdentity ? "입장 가능" : "이름 준비 중"}
              </span>
            </div>

            <p className="message-note">
              현재 이름 <strong>{displayNickname}</strong>
              {isGuestIdentityBooting ? " · 곧 적용됩니다." : ""}
            </p>

            <form onSubmit={handleJoinSubmit} className="field-group">
              <div className="home-quick-join-grid">
                <label className="field">
                  <span>입장 코드</span>
                  <input
                    className="text-input"
                    type="text"
                    value={joinRoomCode}
                    onChange={(event) => setJoinRoomCode(event.target.value.toUpperCase())}
                    placeholder="예: A7K3"
                    maxLength={6}
                  />
                </label>
                <label className="field">
                  <span>비밀번호</span>
                  <input
                    className="text-input"
                    type="password"
                    value={joinRoomPassword}
                    onChange={(event) => setJoinRoomPassword(event.target.value)}
                    placeholder="비밀방일 때만 입력"
                  />
                </label>
              </div>
              <button className="button-primary" type="submit" disabled={!canJoin}>
                {isJoining ? "입장 중..." : "코드로 입장"}
              </button>
            </form>

            {!accountViewer ? (
              <div className="home-auth-shortcut">
                <p className="panel-copy">전적을 남기고 싶다면 로그인하거나 새 계정을 만들 수 있습니다.</p>
                <div className="action-row">
                  <button className="button-secondary" type="button" onClick={() => openAuthModal("login")}>
                    로그인
                  </button>
                  <button className="button-primary" type="button" onClick={() => openAuthModal("register")}>
                    회원가입
                  </button>
                </div>
              </div>
            ) : null}
          </article>

          <article className="panel panel-muted home-action-card" id="create-room">
            <div className="composer-header">
              <div>
                <h2 className="panel-title">새 방 만들기</h2>
                <p className="panel-copy">방 종류를 고른 뒤 제목과 입장 규칙만 확인하고 바로 열 수 있습니다.</p>
              </div>
              <span className="status-badge" data-tone="live">
                {roomModeSummary.label}
              </span>
            </div>

            <RoomModePicker value={roomLaunchMode} onChange={setRoomLaunchMode} />

            <div className="metric-grid">
              <article className="metric-card">
                <span className="metric-label">방 제목</span>
                <strong className="metric-value">{trimmedRoomTitle || "새로운 사건"}</strong>
                <span className="metric-detail">{roomSettingsStatusMessage}</span>
              </article>
              <article className="metric-card">
                <span className="metric-label">기본 구성</span>
                <strong className="metric-value">
                  {resolvedStageCount}스테이지 · {resolvedMaxPlayers}명
                </strong>
                <span className="metric-detail">{roomModeSummary.settingsPolicy}</span>
              </article>
            </div>

            <div className="action-row">
              <button className="button-secondary" type="button" onClick={() => setIsRoomSettingsOpen(true)}>
                방장 설정
              </button>
              <button className="button-primary" type="button" onClick={handleCreateRoom} disabled={!canCreate}>
                {isSubmitting ? "방을 여는 중..." : `${roomModeSummary.label} 열기`}
              </button>
            </div>
          </article>
        </aside>
      </section>

      {createResult && createResult.ok && createResult.response ? (
        <section className="panel panel-accent">
          <h2 className="panel-title">방이 열렸습니다</h2>
          <p className="panel-copy">
            {launchResultMessage
              ? `${launchResultMessage} · 입장 코드를 공유하고 대기실로 이동하세요.`
              : "입장 코드를 공유하고 대기실로 이동하세요."}
          </p>
          <div className="metric-grid">
            <div className="metric-card">
              <span className="metric-label">입장 코드</span>
              <strong className="metric-value">{createResult.response.snapshot.room.code}</strong>
            </div>
            <div className="metric-card">
              <span className="metric-label">생성자</span>
              <strong className="metric-value">{createResult.response.snapshot.me.nickname}</strong>
            </div>
            <div className="metric-card">
              <span className="metric-label">방 종류</span>
              <strong className="metric-value">{roomModeSummary.label}</strong>
            </div>
            <div className="metric-card">
              <span className="metric-label">현재 상태</span>
              <strong className="metric-value">{getRoomStatusLabel(createResult.response.snapshot.room.status)}</strong>
            </div>
          </div>
          <div className="action-row">
            <Link
              className="button-primary"
              href={`/lobby?roomCode=${encodeURIComponent(createResult.response.snapshot.room.code)}`}
            >
              대기실 입장
            </Link>
          </div>
        </section>
      ) : createResult ? (
        <section className="panel">
          <h2 className="panel-title">방을 열지 못했습니다</h2>
          <p className="message-negative">{createResult.errorMessage ?? "방 생성 요청에 실패했습니다."}</p>
        </section>
      ) : null}

      {joinResult && joinResult.ok && joinResult.response ? (
        <section className="panel panel-accent">
          <h2 className="panel-title">방에 입장했습니다</h2>
          <p className="panel-copy">준비를 마치면 방장이 팀 배정과 스테이지 시작을 이어갈 수 있습니다.</p>
          <div className="metric-grid">
            <div className="metric-card">
              <span className="metric-label">입장 코드</span>
              <strong className="metric-value">{joinResult.response.snapshot.room.code}</strong>
            </div>
            <div className="metric-card">
              <span className="metric-label">내 닉네임</span>
              <strong className="metric-value">{joinResult.response.snapshot.me.nickname}</strong>
            </div>
            <div className="metric-card">
              <span className="metric-label">현재 상태</span>
              <strong className="metric-value">{getRoomStatusLabel(joinResult.response.snapshot.room.status)}</strong>
            </div>
            <div className="metric-card">
              <span className="metric-label">현재 인원</span>
              <strong className="metric-value">{joinResult.response.snapshot.players.length}명</strong>
            </div>
          </div>
          <div className="action-row">
            <Link className="button-primary" href={`/lobby?roomCode=${encodeURIComponent(joinResult.response.snapshot.room.code)}`}>
              대기실 입장
            </Link>
          </div>
        </section>
      ) : joinResult ? (
        <section className="panel">
          <h2 className="panel-title">방에 입장하지 못했습니다</h2>
          <p className="message-negative">{joinResult.errorMessage ?? "방 참가 요청에 실패했습니다."}</p>
        </section>
      ) : null}

      <section className="panel home-directory-panel" id="open-rooms">
        <div className="room-section-header">
          <div>
            <h2 className="panel-title">열려 있는 방</h2>
            <p className="panel-copy">공개방에 바로 합류하거나, 비밀방이라면 비밀번호를 확인하고 들어가세요.</p>
          </div>
          <span className="status-badge" data-tone="live">
            {roomDirectory.length}개
          </span>
        </div>
        {roomDirectoryError ? <p className="message-negative">{roomDirectoryError}</p> : null}
        <RoomDirectoryPanel
          rooms={roomDirectory}
          onJoinRoom={handleDirectoryJoin}
          isLoading={isDirectoryLoading}
        />
      </section>

      {accountViewer ? (
        <section className="panel panel-muted" id="my-records">
          <div className="composer-header">
            <div>
              <h2 className="panel-title">내 전적</h2>
              <p className="panel-copy">
                {accountViewer.email} · 최근 로그인 {formatDateTime(accountViewer.lastLoginAt)}
              </p>
            </div>
            <span className="status-badge" data-tone="live">
              계정 기록
            </span>
          </div>

          <div className="metric-grid">
            <article className="metric-card metric-card-emphasis">
              <span className="metric-label">승패</span>
              <strong className="metric-value">
                {accountViewer.stats.wins}승 {accountViewer.stats.losses}패
              </strong>
              <span className="metric-detail">승률 {formatPercentage(accountViewer.stats.winRate)}</span>
            </article>
            <article className="metric-card">
              <span className="metric-label">평균 순위</span>
              <strong className="metric-value">{formatRank(accountViewer.stats.averageRank)}</strong>
              <span className="metric-detail">최고 {formatRank(accountViewer.stats.bestRank)}</span>
            </article>
            <article className="metric-card">
              <span className="metric-label">참여 판수</span>
              <strong className="metric-value">{accountViewer.stats.gamesPlayed}</strong>
              <span className="metric-detail">정답 {accountViewer.stats.solvedCount}회</span>
            </article>
          </div>

          {accountViewer.recentResults.length > 0 ? (
            <ul className="surface-list history-list">
              {accountViewer.recentResults.slice(0, 3).map((result) => (
                <li key={result.id} className="history-item">
                  <div className="history-top">
                    <strong>{result.roomCode ?? "기록"}</strong>
                    <span className="status-badge" data-tone={result.isWinner ? "live" : "alert"}>
                      {result.isWinner ? "승리" : "패배"}
                    </span>
                  </div>
                  <div className="meta-row">
                    <span>순위 {formatRank(result.finalRank)}</span>
                    <span>총점 {result.totalScore ?? "-"}</span>
                    <span>{formatDateTime(result.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="message-note">아직 누적된 경기 기록이 없습니다.</p>
          )}
        </section>
      ) : null}

      <details className="panel panel-muted home-support-details">
        <summary>처음이라면 규칙과 흐름 보기</summary>
        <div className="home-support-body">
          <div className="metric-grid">
            <article className="metric-card">
              <span className="metric-label">점수</span>
              <strong className="metric-value">개인 누적 점수</strong>
              <span className="metric-detail">낮을수록 유리하고, 질문과 오답에는 비용이 붙습니다.</span>
            </article>
            <article className="metric-card">
              <span className="metric-label">조사실</span>
              <strong className="metric-value">단독 점유</strong>
              <span className="metric-detail">질문방은 대기열 순서대로 자동 입장됩니다.</span>
            </article>
            <article className="metric-card">
              <span className="metric-label">1:1 채팅</span>
              <strong className="metric-value">전화형 요청</strong>
              <span className="metric-detail">수락, 거절, 쿨다운이 있고 동시에 여러 요청이 오면 하나만 선택합니다.</span>
            </article>
          </div>
          <OnboardingGuide scope="main" variant="inline" />
        </div>
      </details>

      {!accountViewer && isAuthModalOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsAuthModalOpen(false)}>
          <section
            className="modal-shell"
            role="dialog"
            aria-modal="true"
            aria-label="로그인 또는 회원가입"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="composer-header">
              <div>
                <h3 className="panel-title">로그인 / 회원가입</h3>
                <p className="panel-copy">게스트로 바로 플레이할 수 있고, 로그인하면 전적이 같은 계정에 저장됩니다.</p>
              </div>
              <button className="button-secondary" type="button" onClick={() => setIsAuthModalOpen(false)}>
                닫기
              </button>
            </div>

            <div className="tab-row">
              <button
                className={authMode === "register" ? "tab-button is-active" : "tab-button"}
                type="button"
                onClick={() => setAuthMode("register")}
              >
                회원가입
              </button>
              <button
                className={authMode === "login" ? "tab-button is-active" : "tab-button"}
                type="button"
                onClick={() => setAuthMode("login")}
              >
                로그인
              </button>
            </div>

            {authMode === "register" ? (
              <form onSubmit={handleRegisterSubmit} className="field-group home-auth-form">
                <label className="field">
                  <span>이메일</span>
                  <input
                    className="text-input"
                    type="email"
                    value={registerEmail}
                    onChange={(event) => setRegisterEmail(event.target.value)}
                    placeholder="name@example.com"
                  />
                </label>
                <label className="field">
                  <span>닉네임</span>
                  <input
                    className="text-input"
                    type="text"
                    value={registerNickname}
                    onChange={(event) => setRegisterNickname(event.target.value)}
                    placeholder="계정 닉네임"
                    maxLength={20}
                  />
                </label>
                <div className="home-quick-join-grid">
                  <label className="field">
                    <span>비밀번호</span>
                    <input
                      className="text-input"
                      type="password"
                      value={registerPassword}
                      onChange={(event) => setRegisterPassword(event.target.value)}
                      placeholder="8자 이상"
                    />
                  </label>
                  <label className="field">
                    <span>비밀번호 확인</span>
                    <input
                      className="text-input"
                      type="password"
                      value={registerPasswordConfirm}
                      onChange={(event) => setRegisterPasswordConfirm(event.target.value)}
                      placeholder="한 번 더 입력"
                    />
                  </label>
                </div>
                <label className="field">
                  <span>나이</span>
                  <input
                    className="text-input"
                    type="number"
                    value={registerAge}
                    onChange={(event) => setRegisterAge(event.target.value)}
                    placeholder="선택 입력"
                    min={1}
                    max={120}
                  />
                </label>
                <button className="button-primary" type="submit" disabled={isSubmittingAuth}>
                  {isSubmittingAuth ? "계정 생성 중..." : "회원가입"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleLoginSubmit} className="field-group home-auth-form">
                <label className="field">
                  <span>이메일</span>
                  <input
                    className="text-input"
                    type="email"
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.target.value)}
                    placeholder="name@example.com"
                  />
                </label>
                <label className="field">
                  <span>비밀번호</span>
                  <input
                    className="text-input"
                    type="password"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    placeholder="비밀번호"
                  />
                </label>
                <button className="button-primary" type="submit" disabled={isSubmittingAuth}>
                  {isSubmittingAuth ? "로그인 중..." : "로그인"}
                </button>
              </form>
            )}

            {authError ? <p className="message-negative">{authError}</p> : null}
          </section>
        </div>
      ) : null}

      {isRoomSettingsOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsRoomSettingsOpen(false)}>
          <section
            className="modal-shell"
            role="dialog"
            aria-modal="true"
            aria-label="방장 설정"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="composer-header">
              <div>
                <h3 className="panel-title">방장 설정</h3>
                <p className="panel-copy">첫 화면에서는 최소 정보만 보여주고, 세부 설정은 여기서 정리합니다.</p>
              </div>
              <button className="button-secondary" type="button" onClick={() => setIsRoomSettingsOpen(false)}>
                닫기
              </button>
            </div>
            <div className="modal-grid">
              <label className="field">
                <span>방 제목</span>
                <input
                  className="text-input"
                  type="text"
                  value={roomTitleDraft}
                  onChange={(event) => setRoomTitleDraft(event.target.value)}
                  placeholder="새로운 사건"
                />
              </label>
              <div className="field">
                <span className="field-legend">방 종류</span>
                <RoomModePicker value={roomLaunchMode} onChange={setRoomLaunchMode} />
              </div>
              {roomLaunchMode === "secret" ? (
                <label className="field">
                  <span>비밀번호</span>
                  <input
                    className="text-input"
                    type="password"
                    value={roomPasswordDraft}
                    onChange={(event) => setRoomPasswordDraft(event.target.value)}
                    placeholder="참가자에게 공유할 비밀번호"
                  />
                  <span className="metric-detail">4자 이상으로 정리해 두면 입장 오류를 줄일 수 있습니다.</span>
                </label>
              ) : null}
              {roomLaunchMode !== "practice" ? (
                <label className="field">
                  <span>스테이지 수</span>
                  <input
                    className="text-input"
                    type="number"
                    min={1}
                    max={5}
                    value={stageCountDraft}
                    onChange={(event) => setStageCountDraft(Number.parseInt(event.target.value || "1", 10))}
                  />
                </label>
              ) : null}
              <label className="field">
                <span>방장 메모</span>
                <textarea
                  className="text-area"
                  rows={4}
                  value={hostNoteDraft}
                  onChange={(event) => setHostNoteDraft(event.target.value)}
                  placeholder="이 방의 분위기나 플레이 메모를 적어 두세요."
                />
              </label>
              <div className="metric-grid">
                <article className="metric-card">
                  <span className="metric-label">현재 설정</span>
                  <strong className="metric-value">{roomModeSummary.label}</strong>
                  <span className="metric-detail">{roomModeSummary.settingsPolicy}</span>
                </article>
                <article className="metric-card">
                  <span className="metric-label">구성</span>
                  <strong className="metric-value">
                    {resolvedStageCount}스테이지 · {resolvedMaxPlayers}명
                  </strong>
                  <span className="metric-detail">{trimmedRoomTitle || "새로운 사건"}</span>
                </article>
              </div>
            </div>
            <div className="action-row">
              <button className="button-primary" type="button" onClick={() => setIsRoomSettingsOpen(false)}>
                설정 저장
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <div className="mobile-home-cta-spacer" />
      <div className="mobile-home-cta-bar">
        <a className="button-secondary" href="#quick-join">
          코드 입장
        </a>
        <a className="button-primary" href="#create-room">
          방 만들기
        </a>
      </div>
    </main>
  );
}
