"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CurrentViewer } from "@/contracts/account";
import type {
  ApiResponse,
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
import { appendRoomContextToHref } from "@/features/room-context/room-context";

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
  const resolvedMode = entry.mode === "secret" || entry.mode === "practice" || entry.mode === "public"
    ? entry.mode
    : "public";
  const resolvedStageCount =
    typeof entry.stageCount === "number" && Number.isFinite(entry.stageCount)
      ? Math.max(1, Math.floor(entry.stageCount))
      : resolvedMode === "practice"
        ? 1
        : 3;

  return {
    code: entry.roomCode,
    title:
      typeof entry.title === "string" && entry.title.trim().length > 0
        ? entry.title.trim()
        : `${entry.roomCode} 사건방`,
    mode: resolvedMode,
    currentPlayers: entry.currentPlayers,
    maxPlayers: entry.maxPlayers,
    createdAt: entry.createdAt,
    stageCount: resolvedStageCount,
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
  pageTitle?: string;
  pageKicker?: string;
  showAccountHistory?: boolean;
  surfaceMode?: "combined" | "join" | "create";
};

export function HomeEntrySurface({
  initialViewer,
  pageTitle = "방 입장 / 만들기",
  pageKicker = "공개방을 고르거나, 입장 코드를 넣거나, 새 방을 만들어 바로 대기방으로 이동합니다.",
  showAccountHistory = true,
  surfaceMode = "combined",
}: HomeEntrySurfaceProps) {
  const router = useRouter();
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
  const showJoinSurface = surfaceMode === "combined" || surfaceMode === "join";
  const showCreateSurface = surfaceMode === "combined" || surfaceMode === "create";
  const displayNickname = (viewer?.nickname ?? guestPreviewNickname) || "이름 준비 중";
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
  const lobbyStartHref = showJoinSurface ? "#quick-join" : "#create-room";
  const secondarySurfaceHref = showJoinSurface ? "/rooms/create" : "/rooms/join";
  const secondarySurfaceLabel = showJoinSurface ? "방 만들기" : "방 입장";

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
  const heroTitle =
    showJoinSurface && showCreateSurface
      ? "초대 코드가 있으면 바로 들어가고, 없으면 방을 열면 됩니다."
      : showJoinSurface
        ? "입장할 방만 고르면 바로 대기방으로 이동합니다."
        : "방 설정을 끝내면 생성 즉시 방장으로 입장합니다.";
  const heroCopy =
    showJoinSurface && showCreateSurface
      ? "입장과 생성 중 필요한 행동만 먼저 보여줍니다."
      : showJoinSurface
        ? "코드 입력이나 열린 방 목록 중 한 가지 방법만 선택하면 됩니다."
        : "공개방, 비밀방, 연습방 중 하나를 열고 바로 시작 준비로 넘어갑니다.";
  const heroPrimaryLabel = showCreateSurface && !showJoinSurface ? "방 만들기" : "코드로 입장";
  const heroPrimaryHref = showCreateSurface && !showJoinSurface ? "#create-room" : "#quick-join";
  const heroSecondaryLabel =
    showJoinSurface && showCreateSurface
      ? "열린 방 보기"
      : showJoinSurface
        ? "열린 방 보기"
        : "설정 수정";
  const heroSecondaryHref = showCreateSurface && !showJoinSurface ? "#create-room" : "#open-rooms";

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
      setIdentityError("플레이 이름을 준비하는 중입니다. 잠시 뒤 다시 시도해 주세요.");
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

    setJoinResult(null);

    if (nextResult.ok && nextResult.response) {
      setCreateResult(null);
      setJoinResult(null);
      const nextHref = appendRoomContextToHref("/lobby", nextResult.response.snapshot);
      if (typeof window !== "undefined") {
        window.location.assign(nextHref);
      } else {
        router.replace(nextHref);
      }
      return;
    }

    setCreateResult(nextResult);
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

    if (nextResult.ok && nextResult.response) {
      setCreateResult(null);
      setJoinResult(null);
      const nextHref = appendRoomContextToHref("/lobby", nextResult.response.snapshot, nextResult.request.roomCode);
      if (typeof window !== "undefined") {
        window.location.assign(nextHref);
      } else {
        router.replace(nextHref);
      }
      return;
    }

    setJoinResult(nextResult);
    setCreateResult(null);
    setIsJoining(false);
  }

  async function handleDirectoryJoin(roomCode: string, roomPassword?: string) {
    if (!hasPlayableIdentity) {
      throw new Error("플레이 이름을 준비하는 중입니다. 잠시 뒤 다시 시도해 주세요.");
    }

    const nextResult = await submitJoinRoom({
      roomCode,
      nickname: displayNickname,
      roomPassword: roomPassword ?? null,
    });

    if (!nextResult.ok) {
      setJoinResult(nextResult);
      setCreateResult(null);
      throw new Error(nextResult.errorMessage ?? "방 입장에 실패했습니다.");
    }

    if (nextResult.response) {
      setCreateResult(null);
      setJoinResult(null);
      const nextHref = appendRoomContextToHref("/lobby", nextResult.response.snapshot, roomCode);
      if (typeof window !== "undefined") {
        window.location.assign(nextHref);
      } else {
        router.replace(nextHref);
      }
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
      setAuthSuccessMessage("로그아웃되었습니다. 원하면 지금 바로 임시 이름으로 계속 플레이할 수 있습니다.");
    } else {
      setAuthError(result.errorMessage ?? "로그아웃에 실패했습니다.");
    }

    setIsLoggingOut(false);
  }

  return (
    <main className="page-shell home-page-shell mt-product-home">
      <section className="page-header mt-hero-header">
        <div className="header-top-row">
          <div className="mt-hero-copy">
            <p className="eyebrow">Mystery Time</p>
            <h1 className="page-title">{pageTitle}</h1>
            <p className="page-kicker">{pageKicker}</p>
          </div>
          <div className="header-actions">
            <Link className="button-secondary button-compact" href="/">
              메인
            </Link>
            {surfaceMode !== "combined" ? (
              <Link className="button-secondary button-compact" href={secondarySurfaceHref}>
                {secondarySurfaceLabel}
              </Link>
            ) : null}
            {accountViewer ? (
              <button
                className="button-secondary button-compact"
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? "로그아웃 중" : "로그아웃"}
              </button>
            ) : (
              <button className="button-secondary button-compact" type="button" onClick={() => openAuthModal("login")}>
                로그인
              </button>
            )}
            <RulebookLauncher label="룰북" compact scope="main" />
          </div>
        </div>
      </section>

      {identityError ? <p className="message-negative">{identityError}</p> : null}
      {authSuccessMessage ? <p className="message-positive">{authSuccessMessage}</p> : null}
      {launchResultMessage ? <p className="message-note">{launchResultMessage}</p> : null}

      <section className="home-hero-layout mt-home-stage">
        <article className="panel panel-accent home-hero-main mt-command-card">
          <div className="mt-command-topline">
            <span className="status-badge" data-tone={hasPlayableIdentity ? "live" : "alert"}>
              {hasPlayableIdentity ? "입장 가능" : "이름 준비 중"}
            </span>
            <span className="room-code-chip">{displayNickname}</span>
          </div>

          <div className="mt-command-body">
            <h2 className="mt-command-title">{heroTitle}</h2>
            <p className="panel-copy">{heroCopy}</p>
          </div>

          <div className="metric-grid home-identity-summary mt-command-metrics">
            <article className="metric-card metric-card-emphasis">
              <span className="metric-label">플레이어</span>
              <strong className="metric-value">{displayNickname}</strong>
              <span className="metric-detail">{accountViewer ? "계정 전적 저장" : "게스트 즉시 플레이"}</span>
            </article>
            {showJoinSurface ? (
              <article className="metric-card">
                <span className="metric-label">입장 가능한 방</span>
                <strong className="metric-value">{isDirectoryLoading ? "확인 중" : `${roomDirectory.length}개`}</strong>
                <span className="metric-detail">코드 입력 또는 공개방 선택</span>
              </article>
            ) : null}
            {showCreateSurface ? (
              <article className="metric-card">
                <span className="metric-label">방 설정</span>
                <strong className="metric-value">{roomModeSummary.label}</strong>
                <span className="metric-detail">{resolvedStageCount}스테이지 · {resolvedMaxPlayers}명</span>
              </article>
            ) : null}
          </div>

          <div className="home-hero-actions">
            <a className="button-primary" href={heroPrimaryHref}>
              {heroPrimaryLabel}
            </a>
            <a className="button-secondary" href={heroSecondaryHref}>
              {heroSecondaryLabel}
            </a>
          </div>
        </article>

        <aside className="home-side-stack mt-action-stack">
          {showJoinSurface ? (
            <article className="panel home-action-card mt-glass-card" id="quick-join">
              <div className="composer-header">
                <div>
                  <h2 className="panel-title">코드 입장</h2>
                  <p className="panel-copy">초대 코드와 비밀번호만 확인하면 바로 대기방으로 들어갑니다.</p>
                </div>
                <span className="status-badge" data-tone={hasPlayableIdentity ? "live" : "alert"}>
                  {hasPlayableIdentity ? "준비됨" : "대기"}
                </span>
              </div>

              <form onSubmit={handleJoinSubmit} className="field-group mt-join-form">
                <label className="field">
                  <span>입장 코드</span>
                  <input
                    className="text-input text-input-hero"
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
                    placeholder="비밀방만 입력"
                  />
                </label>
                <button className="button-primary" type="submit" disabled={!canJoin}>
                  {isJoining ? "입장 중" : "입장하기"}
                </button>
              </form>
            </article>
          ) : null}

          {showCreateSurface ? (
            <article className="panel panel-muted home-action-card mt-glass-card" id="create-room">
              <div className="composer-header">
                <div>
                  <h2 className="panel-title">방 만들기</h2>
                  <p className="panel-copy">핵심 설정만 정리하고, 생성 성공 즉시 자동으로 대기방에 입장합니다.</p>
                </div>
                <span className="status-badge" data-tone="live">
                  {roomModeSummary.label}
                </span>
              </div>

              <RoomModePicker value={roomLaunchMode} onChange={setRoomLaunchMode} />

              <div className="metric-grid mt-room-create-summary">
                <article className="metric-card">
                  <span className="metric-label">방 제목</span>
                  <strong className="metric-value">{trimmedRoomTitle || "새로운 사건"}</strong>
                  <span className="metric-detail">{roomSettingsStatusMessage}</span>
                </article>
                <article className="metric-card">
                  <span className="metric-label">구성</span>
                  <strong className="metric-value">
                    {resolvedStageCount}스테이지 · {resolvedMaxPlayers}명
                  </strong>
                  <span className="metric-detail">{roomModeSummary.settingsPolicy}</span>
                </article>
              </div>

              <div className="action-row">
                <button className="button-secondary" type="button" onClick={() => setIsRoomSettingsOpen(true)}>
                  설정 수정
                </button>
                <button className="button-primary" type="button" onClick={handleCreateRoom} disabled={!canCreate}>
                  {isSubmitting ? "방 여는 중" : `${roomModeSummary.label} 열기`}
                </button>
              </div>
            </article>
          ) : null}
        </aside>
      </section>

      {createResult && !createResult.ok ? (
        <section className="panel mt-alert-panel">
          <h2 className="panel-title">방 생성 실패</h2>
          <p className="message-negative">{createResult.errorMessage ?? "방 생성 요청에 실패했습니다."}</p>
        </section>
      ) : null}

      {joinResult && !joinResult.ok ? (
        <section className="panel mt-alert-panel">
          <h2 className="panel-title">입장 실패</h2>
          <p className="message-negative">{joinResult.errorMessage ?? "방 참가 요청에 실패했습니다."}</p>
        </section>
      ) : null}

      {showJoinSurface ? (
        <section className="panel home-directory-panel mt-directory-section" id="open-rooms">
          <div className="room-section-header">
            <div>
              <h2 className="panel-title">열린 공개방</h2>
              <p className="panel-copy">지금 바로 들어갈 수 있는 방부터 확인합니다.</p>
            </div>
            <button className="button-secondary button-compact" type="button" onClick={refreshRoomDirectory} disabled={isDirectoryLoading}>
              {isDirectoryLoading ? "새로고침 중" : "새로고침"}
            </button>
          </div>
          {roomDirectoryError ? <p className="message-negative">{roomDirectoryError}</p> : null}
          <RoomDirectoryPanel rooms={roomDirectory} onJoinRoom={handleDirectoryJoin} isLoading={isDirectoryLoading} />
        </section>
      ) : null}

      {accountViewer && showAccountHistory ? (
        <section className="panel panel-muted mt-record-panel" id="my-records">
          <div className="composer-header">
            <div>
              <h2 className="panel-title">내 기록</h2>
              <p className="panel-copy">최근 로그인 {formatDateTime(accountViewer.lastLoginAt)}</p>
            </div>
            <span className="status-badge" data-tone="live">
              저장됨
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
        </section>
      ) : null}

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
                <p className="panel-copy">지금 바로 계정으로 들어오면 전적과 최근 기록이 함께 저장됩니다.</p>
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
                <p className="panel-copy">방 제목, 비밀번호, 스테이지 수를 여기서 한 번에 정리합니다.</p>
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
        {showJoinSurface ? (
          <a className="button-secondary" href="#quick-join">
            코드 입장
          </a>
        ) : (
          <Link className="button-secondary" href={secondarySurfaceHref}>
            {secondarySurfaceLabel}
          </Link>
        )}
        {showCreateSurface ? (
          <a className="button-primary" href="#create-room">
            방 만들기
          </a>
        ) : (
          <a className="button-primary" href={lobbyStartHref}>
            공개방 보기
          </a>
        )}
      </div>
    </main>
  );
}
