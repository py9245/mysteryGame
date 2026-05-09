"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CurrentViewer } from "@/contracts/account";
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
import { IdentityPanel } from "@/components/identity/IdentityPanel";
import { RoomModePicker } from "@/components/room/RoomModePicker";
import { OnboardingGuide } from "@/components/onboarding/OnboardingGuide";

type RoomLaunchMode = "public" | "secret" | "practice";

const ROOM_DIRECTORY: DirectoryRoom[] = [
  {
    code: "A7K3",
    title: "비 내린 연회장",
    mode: "public",
    status: "ready",
    currentPlayers: 5,
    maxPlayers: 6,
    createdAt: "2026-05-09T01:12:00.000Z",
    stageCount: 3,
  },
  {
    code: "M9Q1",
    title: "잠긴 서재",
    mode: "secret",
    status: "waiting",
    currentPlayers: 3,
    maxPlayers: 6,
    createdAt: "2026-05-09T01:08:00.000Z",
    password: "1420",
    stageCount: 3,
  },
  {
    code: "T4R8",
    title: "연습 조사실",
    mode: "practice",
    status: "in_game",
    currentPlayers: 1,
    maxPlayers: 1,
    createdAt: "2026-05-09T01:02:00.000Z",
    stageCount: 1,
  },
  {
    code: "K2L7",
    title: "새벽 저택",
    mode: "public",
    status: "assigning",
    currentPlayers: 6,
    maxPlayers: 6,
    createdAt: "2026-05-09T00:55:00.000Z",
    stageCount: 3,
  },
];

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
        entryPolicy: "1인, 1스테이지로만 열리고 외부 입장은 닫혀 있습니다.",
        settingsPolicy: "혼자 흐름을 점검하는 용도로만 열립니다.",
      };
    default:
      return {
        label: "공개방",
        entryPolicy: "입장 코드만 공유하면 누구나 바로 합류할 수 있습니다.",
        settingsPolicy: "가장 빠르게 인원을 모을 때 적합합니다.",
      };
  }
}

type HomeEntrySurfaceProps = {
  initialViewer: CurrentViewer | null;
};

export function HomeEntrySurface({ initialViewer }: HomeEntrySurfaceProps) {
  const [viewer, setViewer] = useState<CurrentViewer | null>(initialViewer);
  const [nicknameDraft, setNicknameDraft] = useState(initialViewer?.nickname ?? "");
  const [joinRoomCode, setJoinRoomCode] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerAge, setRegisterAge] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authMode, setAuthMode] = useState<"register" | "login">("register");
  const [roomLaunchMode, setRoomLaunchMode] = useState<RoomLaunchMode>("public");
  const [roomTitleDraft, setRoomTitleDraft] = useState("새로운 사건");
  const [roomPasswordDraft, setRoomPasswordDraft] = useState("");
  const [hostNoteDraft, setHostNoteDraft] = useState("");
  const [isRoomSettingsOpen, setIsRoomSettingsOpen] = useState(false);
  const [isGuestIdentityBooting, setIsGuestIdentityBooting] = useState(!initialViewer);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [createResult, setCreateResult] = useState<SubmitCreateRoomResult | null>(null);
  const [joinResult, setJoinResult] = useState<SubmitJoinRoomResult | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMessage, setAuthSuccessMessage] = useState<string | null>(null);
  const [launchResultMessage, setLaunchResultMessage] = useState<string | null>(null);
  const activeNickname = viewer?.nickname ?? "";
  const hasPlayableIdentity = activeNickname.trim().length >= 2;
  const roomModeSummary = useMemo(() => getRoomModeSummary(roomLaunchMode), [roomLaunchMode]);
  const trimmedRoomTitle = roomTitleDraft.trim();
  const trimmedRoomPassword = roomPasswordDraft.trim();
  const trimmedHostNote = hostNoteDraft.trim();
  const isRoomTitleReady = trimmedRoomTitle.length >= 2;
  const isSecretPasswordReady = roomLaunchMode !== "secret" || trimmedRoomPassword.length >= 4;
  const canCreate = hasPlayableIdentity && isRoomTitleReady && isSecretPasswordReady && !isSubmitting;
  const canJoin = hasPlayableIdentity && joinRoomCode.trim().length > 0 && !isJoining;
  const canSaveNickname =
    nicknameDraft.trim().length >= 2 &&
    nicknameDraft.trim().length <= 20 &&
    nicknameDraft.trim() !== activeNickname.trim() &&
    !isSavingNickname &&
    isAccountViewer(viewer);

  const roomSettingsStatusMessage = useMemo(() => {
    if (!isRoomTitleReady) {
      return "방 제목을 2자 이상 정하면 대기실에서 구분하기 쉬워집니다.";
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
      const result = await saveViewerNickname({
        nickname: makeGuestNickname(),
      });

      if (!mounted) {
        return;
      }

      if (result.ok && result.viewer) {
        setViewer(result.viewer);
        setNicknameDraft(result.viewer.nickname);
      } else {
        const fallbackNickname = makeGuestNickname();
        setViewer({
          kind: "guest",
          nickname: fallbackNickname,
          guest: {
            nickname: fallbackNickname,
            updatedAt: null,
          },
        });
        setNicknameDraft(fallbackNickname);
      }

      setIsGuestIdentityBooting(false);
    }

    void seedGuestNickname();

    return () => {
      mounted = false;
    };
  }, [initialViewer, isGuestIdentityBooting, viewer]);

  async function handleCreateRoom() {
    if (!hasPlayableIdentity) {
      setIdentityError("닉네임 준비가 끝나야 방을 열 수 있습니다.");
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
    const nextResult = await submitCreateRoom({ hostNickname: activeNickname });
    setCreateResult(nextResult);
    setJoinResult(null);
    if (nextResult.ok) {
      setLaunchResultMessage(
        `${roomModeSummary.label} · ${trimmedRoomTitle} · ${trimmedHostNote || roomModeSummary.entryPolicy}`,
      );
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
      nickname: activeNickname,
    });
    setJoinResult(nextResult);
    setCreateResult(null);
    setIsJoining(false);
  }

  async function handleDirectoryJoin(roomCode: string) {
    if (!hasPlayableIdentity) {
      throw new Error("먼저 닉네임을 준비해 주세요.");
    }

    const nextResult = await submitJoinRoom({
      roomCode,
      nickname: activeNickname,
    });

    setJoinResult(nextResult);
    setCreateResult(null);

    if (!nextResult.ok) {
      throw new Error(nextResult.errorMessage ?? "방 입장에 실패했습니다.");
    }
  }

  async function handleNicknameSave() {
    if (!canSaveNickname) {
      return;
    }

    setIsSavingNickname(true);
    setIdentityError(null);
    setAuthSuccessMessage(null);

    const result = await saveViewerNickname({
      nickname: nicknameDraft.trim(),
    });

    if (result.ok && result.viewer) {
      setViewer(result.viewer);
      setNicknameDraft(result.viewer.nickname);
    } else {
      setIdentityError(result.errorMessage ?? "닉네임 저장에 실패했습니다.");
    }

    setIsSavingNickname(false);
  }

  async function handleRegisterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (nicknameDraft.trim().length < 2) {
      setAuthError("계정을 만들기 전에 닉네임을 먼저 정해주세요.");
      return;
    }

    setIsSubmittingAuth(true);
    setAuthError(null);
    setAuthSuccessMessage(null);

    const result = await registerViewer({
      email: registerEmail,
      password: registerPassword,
      nickname: nicknameDraft.trim(),
      age: registerAge.trim().length > 0 ? Number.parseInt(registerAge.trim(), 10) : undefined,
    });

    if (result.ok && result.viewer) {
      setViewer(result.viewer);
      setNicknameDraft(result.viewer.nickname);
      setRegisterAge("");
      setRegisterPassword("");
      setAuthSuccessMessage("계정이 생성되었습니다. 이제 전적이 누적됩니다.");
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
      setNicknameDraft(result.viewer.nickname);
      setLoginPassword("");
      setAuthSuccessMessage("로그인되었습니다. 계정 전적과 닉네임이 적용됩니다.");
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
      setNicknameDraft(result.viewer?.nickname ?? "");
      setAuthSuccessMessage("로그아웃되었습니다. 현재 닉네임은 게스트 상태로 유지됩니다.");
    } else {
      setAuthError(result.errorMessage ?? "로그아웃에 실패했습니다.");
    }

    setIsLoggingOut(false);
  }

  const accountViewer = isAccountViewer(viewer) ? viewer.account : null;
  const isGuestViewer = viewer?.kind === "guest";

  return (
    <main className="page-shell">
      <section className="page-header">
        <div className="header-top-row">
          <div>
            <p className="eyebrow">심리 추리전</p>
            <h1 className="page-title">Mystery Time</h1>
            <p className="page-kicker">
              같은 방에서 협력하고 흔들지만, 승부는 끝내 개인 점수와 개인 전적으로 남습니다.
            </p>
          </div>
          <div className="header-actions">
            <RulebookLauncher label="룰북" compact scope="main" />
          </div>
        </div>
      </section>

      {identityError ? <p className="message-negative">{identityError}</p> : null}
      {authSuccessMessage ? <p className="message-positive">{authSuccessMessage}</p> : null}

      <section className="hero-grid">
        <IdentityPanel
          viewer={viewer}
          nickname={activeNickname}
          isGuestBooting={isGuestIdentityBooting}
          onNicknameChange={isAccountViewer(viewer) ? setNicknameDraft : undefined}
          onSaveNickname={handleNicknameSave}
          onLogout={accountViewer ? handleLogout : undefined}
          isSavingNickname={isSavingNickname}
          isLoggingOut={isLoggingOut}
        />

        <article className="panel panel-muted room-launch-panel">
          <div className="composer-header">
            <div>
              <h2 className="panel-title">방 만들기</h2>
              <p className="panel-copy">방 종류를 고른 뒤 제목과 입장 규칙을 정리하고 바로 열 수 있습니다.</p>
            </div>
            <span className="status-badge" data-tone="live">
              {roomModeSummary.label}
            </span>
          </div>
          <RoomModePicker value={roomLaunchMode} onChange={setRoomLaunchMode} />
          <div className="metric-grid">
            <article className="metric-card">
              <span className="metric-label">현재 닉네임</span>
              <strong className="metric-value">{activeNickname || "대기 중"}</strong>
              <span className="metric-detail">{isGuestViewer ? "게스트 닉네임으로 바로 입장합니다." : "저장된 계정 닉네임으로 입장합니다."}</span>
            </article>
            <article className="metric-card">
              <span className="metric-label">입장 규칙</span>
              <strong className="metric-value">{roomModeSummary.label}</strong>
              <span className="metric-detail">{roomModeSummary.entryPolicy}</span>
            </article>
          </div>
          <div className="message-note">
            <strong>{trimmedRoomTitle || "새로운 사건"}</strong> · {roomSettingsStatusMessage}
          </div>
          <div className="action-row">
            <button className="button-secondary" type="button" onClick={() => setIsRoomSettingsOpen(true)}>
              방장 설정
            </button>
            <button className="button-primary" type="button" onClick={handleCreateRoom} disabled={!canCreate}>
              {isSubmitting ? "방을 여는 중..." : `${roomModeSummary.label} 열기`}
            </button>
          </div>
          <form onSubmit={handleJoinSubmit} className="field-group">
            <div className="field">
              <label htmlFor="join-room-code">입장 코드</label>
              <input
                id="join-room-code"
                className="text-input"
                type="text"
                value={joinRoomCode}
                onChange={(event) => setJoinRoomCode(event.target.value.toUpperCase())}
                placeholder="예: A7K3"
                maxLength={6}
              />
            </div>
            <button className="button-primary" type="submit" disabled={!canJoin}>
              {isJoining ? "입장 중..." : "코드로 입장"}
            </button>
          </form>
          {!hasPlayableIdentity ? <p className="message-note">닉네임이 준비되면 방 생성과 입장이 열립니다.</p> : null}
          {launchResultMessage ? <p className="message-note">{launchResultMessage}</p> : null}
        </article>
      </section>

      <section className="panel-grid">
        <article className="panel" style={{ gridColumn: "span 7" }}>
          <div className="composer-header">
            <div>
              <h2 className="panel-title">방 목록</h2>
              <p className="panel-copy">제목 검색, 최신순, 적은 인원 순으로 바로 찾습니다.</p>
            </div>
          </div>
          <RoomDirectoryPanel rooms={ROOM_DIRECTORY} onJoinRoom={handleDirectoryJoin} />
        </article>

        <article className="panel panel-muted" style={{ gridColumn: "span 5" }}>
          <h2 className="panel-title">빠른 안내</h2>
          <div className="metric-grid">
            <div className="metric-card">
              <span className="metric-label">대기실</span>
              <strong className="metric-value">방 찾기</strong>
              <span className="metric-detail">바로 입장하거나 비밀번호를 넣습니다.</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">진행</span>
              <strong className="metric-value">조사실 점유</strong>
              <span className="metric-detail">대기열에 들어가면 자동 입장됩니다.</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">전적</span>
              <strong className="metric-value">개인 기록</strong>
              <span className="metric-detail">로그인 후 승패와 순위를 누적합니다.</span>
            </div>
          </div>
        </article>
      </section>

      <OnboardingGuide scope="main" />

      {!accountViewer ? (
        <section className="hero-grid" id="account-auth">
          <article className="panel">
            <div className="kpi-row" style={{ justifyContent: "space-between" }}>
              <h2 className="panel-title">로그인 / 회원가입</h2>
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
            </div>
            <p className="panel-copy">
              계정으로 들어오면 승패, 평균 순위, 최근 경기 기록을 같은 프로필에 쌓을 수 있습니다.
            </p>
            <p className="message-note">
              현재 게스트 이름 <strong>{activeNickname || "준비 중"}</strong> 은 계정 생성 시 기본 닉네임으로 이어집니다.
            </p>

            {authMode === "register" ? (
              <form onSubmit={handleRegisterSubmit} className="field-group">
                <div className="message-note">
                  계정 닉네임은 현재 저장된 <strong>{nicknameDraft.trim() || "미설정"}</strong>을 사용합니다.
                </div>
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
                  {isSubmittingAuth ? "계정 생성 중..." : "계정 만들기"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleLoginSubmit} className="field-group">
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
          </article>

          <article className="panel panel-muted">
            <h2 className="panel-title">왜 계정이 필요한가</h2>
            <div className="metric-grid">
              <div className="metric-card">
                <span className="metric-label">전적 누적</span>
                <strong className="metric-value">승패 / 순위</strong>
                <span className="metric-detail">게임 종료 후 개인 기록을 쌓습니다.</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">정체성 유지</span>
                <strong className="metric-value">닉네임 동기화</strong>
                <span className="metric-detail">어느 방에서든 같은 프로필이 이어집니다.</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">복귀</span>
                <strong className="metric-value">세션 기반</strong>
                <span className="metric-detail">브라우저를 다시 열어도 로그인 상태가 유지됩니다.</span>
              </div>
            </div>
          </article>
        </section>
      ) : (
        <section className="results-grid">
          <article className="panel panel-accent" style={{ gridColumn: "span 12" }} id="my-records">
            <div className="composer-header">
              <div>
                <h2 className="panel-title">내 기록</h2>
                <p className="panel-copy">
                  {accountViewer.email} · {formatDateTime(accountViewer.lastLoginAt)}
                </p>
              </div>
              <span className="status-badge" data-tone="live">
                계정 로그인
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
              <article className="metric-card metric-card-emphasis">
                <span className="metric-label">최고 순위</span>
                <strong className="metric-value">{formatRank(accountViewer.stats.bestRank)}</strong>
                <span className="metric-detail">평균 {formatRank(accountViewer.stats.averageRank)}</span>
              </article>
              <article className="metric-card metric-card-emphasis">
                <span className="metric-label">누적 풀이</span>
                <strong className="metric-value">{accountViewer.stats.solvedCount}</strong>
                <span className="metric-detail">방 생성 {accountViewer.stats.hostedRooms}회</span>
              </article>
              <article className="metric-card metric-card-emphasis">
                <span className="metric-label">참여 판수</span>
                <strong className="metric-value">{accountViewer.stats.gamesPlayed}</strong>
                <span className="metric-detail">최근 기록이 여기 쌓입니다.</span>
              </article>
            </div>
          </article>

          <article className="panel panel-muted" style={{ gridColumn: "span 12" }}>
            <div className="composer-header">
              <div>
                <h2 className="panel-title">최근 기록</h2>
                <p className="panel-copy">최근 경기 결과를 최신 순으로 확인합니다.</p>
              </div>
            </div>
            {accountViewer.recentResults.length === 0 ? (
              <p className="message-note">아직 누적된 경기 결과가 없습니다.</p>
            ) : (
              <ul className="surface-list history-list">
                {accountViewer.recentResults.map((result) => (
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
                      <span>정답 {result.solvedCount}회</span>
                      <span>{formatDateTime(result.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>
      )}

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
              <div className="metric-card">
              <span className="metric-label">현재 인원</span>
              <strong className="metric-value">{createResult.response.snapshot.players.length}</strong>
            </div>
          </div>
          <div className="action-row" style={{ marginTop: 18 }}>
            <Link
              className="button-primary"
              href={`/lobby?roomCode=${encodeURIComponent(createResult.response.snapshot.room.code)}`}
            >
              대기실 입장
            </Link>
          </div>
        </section>
      ) : createResult ? (
        <section className="panel" style={{ borderColor: "rgba(139, 45, 45, 0.28)" }}>
          <h2 className="panel-title">방을 열지 못했습니다</h2>
          <p className="message-negative">{createResult.errorMessage ?? "방 생성 요청에 실패했습니다."}</p>
        </section>
      ) : null}

      {joinResult && joinResult.ok && joinResult.response ? (
        <section className="panel panel-accent">
          <h2 className="panel-title">방에 입장했습니다</h2>
          <p className="panel-copy">
            대기실에 합류했습니다. 준비를 마치면 방장이 팀 편성과 스테이지 시작을 이어갈 수 있습니다.
          </p>
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
              <strong className="metric-value">{joinResult.response.snapshot.players.length}</strong>
            </div>
          </div>
          <div className="action-row" style={{ marginTop: 18 }}>
            <Link className="button-primary" href={`/lobby?roomCode=${encodeURIComponent(joinResult.response.snapshot.room.code)}`}>
              대기실 입장
            </Link>
          </div>
        </section>
      ) : joinResult ? (
        <section className="panel" style={{ borderColor: "rgba(139, 45, 45, 0.28)" }}>
          <h2 className="panel-title">방에 입장하지 못했습니다</h2>
          <p className="message-negative">{joinResult.errorMessage ?? "방 참가 요청에 실패했습니다."}</p>
        </section>
      ) : null}

      <section className="panel panel-accent">
        <h2 className="panel-title">게임 구조</h2>
        <div className="metric-grid">
          <div className="metric-card">
            <span className="metric-label">점수</span>
            <strong className="metric-value">개인 누적 점수</strong>
            <span className="metric-detail">낮을수록 유리</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">조사</span>
            <strong className="metric-value">조사실 단독 점유</strong>
            <span className="metric-detail">질문과 정답 시도에 비용 발생</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">판정</span>
            <strong className="metric-value">AI + 운영자</strong>
            <span className="metric-detail">오판 시 수동 override 가능</span>
          </div>
        </div>
      </section>

      <section className="panel panel-muted">
        <h2 className="panel-title">메인 흐름</h2>
        <div className="action-row">
          <Link className="button-secondary" href="/lobby">
            대기실 보기
          </Link>
          <Link className="button-secondary" href={accountViewer ? "#my-records" : "#account-auth"}>
            {accountViewer ? "전적 보기" : "로그인 / 가입"}
          </Link>
        </div>
      </section>

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
                <p className="panel-copy">방 제목과 운영 메모를 먼저 정리해 두면 방 설명이 더 선명해집니다.</p>
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
                <span className="field-legend">방 형태</span>
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
              <label className="field">
                <span>방장 메모</span>
                <textarea
                  className="text-area"
                  rows={4}
                  value={hostNoteDraft}
                  onChange={(event) => setHostNoteDraft(event.target.value)}
                  placeholder="오늘은 어떤 분위기로 진행할지 적어 두세요."
                />
              </label>
              <div className="metric-grid">
                <article className="metric-card">
                  <span className="metric-label">현재 설정</span>
                  <strong className="metric-value">{roomModeSummary.label}</strong>
                  <span className="metric-detail">{roomModeSummary.settingsPolicy}</span>
                </article>
                <article className="metric-card">
                  <span className="metric-label">입장 규칙</span>
                  <strong className="metric-value">{trimmedRoomTitle || "새로운 사건"}</strong>
                  <span className="metric-detail">{roomModeSummary.entryPolicy}</span>
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
    </main>
  );
}
