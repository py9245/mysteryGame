"use client";

import { useMemo, useState } from "react";

export type DirectoryRoom = {
  code: string;
  title: string;
  mode: "public" | "secret" | "practice";
  currentPlayers: number;
  maxPlayers: number;
  createdAt: string;
  stageCount: number;
  passwordProtected: boolean;
  joinable: boolean;
};

function modeLabel(mode: DirectoryRoom["mode"]) {
  switch (mode) {
    case "secret":
      return "비밀방";
    case "practice":
      return "연습방";
    default:
      return "공개방";
  }
}

function normalizeDirectoryText(value: string | null | undefined): string {
  return typeof value === "string" ? value : "";
}

function resolveRoomAction(room: DirectoryRoom) {
  if (room.mode === "practice") {
    return {
      label: "연습 전용",
      disabled: true,
      tone: "blocked" as const,
      description: "방장 전용",
    };
  }

  if (!room.joinable && room.currentPlayers >= room.maxPlayers) {
    return {
      label: "인원 마감",
      disabled: true,
      tone: "blocked" as const,
      description: "가득 참",
    };
  }

  if (!room.joinable) {
    return {
      label: "입장 불가",
      disabled: true,
      tone: "blocked" as const,
      description: "진행 중",
    };
  }

  if (room.passwordProtected) {
    return {
      label: "비밀번호 입력",
      disabled: false,
      tone: "secret" as const,
      description: "비밀번호 필요",
    };
  }

  return {
    label: "입장하기",
    disabled: false,
    tone: "join" as const,
    description: "즉시 합류",
  };
}

function occupancyWidth(room: DirectoryRoom) {
  if (room.maxPlayers <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((room.currentPlayers / room.maxPlayers) * 100));
}

export function RoomDirectoryPanel({
  rooms,
  onJoinRoom,
  isLoading = false,
}: {
  rooms: DirectoryRoom[];
  onJoinRoom: (roomCode: string, roomPassword?: string) => Promise<void>;
  isLoading?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<"newest" | "least_players">("newest");
  const [passwordDraft, setPasswordDraft] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<DirectoryRoom | null>(null);
  const [busyRoomCode, setBusyRoomCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasSearchQuery = search.trim().length > 0;

  const visibleRooms = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = rooms.filter((room) =>
      normalizeDirectoryText(room.title).toLowerCase().includes(query) ||
      normalizeDirectoryText(room.code).toLowerCase().includes(query),
    );

    return [...filtered].sort((left, right) => {
      if (sortMode === "least_players") {
        if (left.currentPlayers !== right.currentPlayers) {
          return left.currentPlayers - right.currentPlayers;
        }
      }

      return right.createdAt.localeCompare(left.createdAt);
    });
  }, [rooms, search, sortMode]);

  async function handleJoin(room: DirectoryRoom) {
    const action = resolveRoomAction(room);
    if (busyRoomCode || action.disabled) {
      return;
    }

    if (room.passwordProtected) {
      setSelectedRoom(room);
      setErrorMessage(null);
      return;
    }

    setBusyRoomCode(room.code);
    setErrorMessage(null);

    try {
      await onJoinRoom(room.code);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "방 입장에 실패했습니다.");
    } finally {
      setBusyRoomCode(null);
    }
  }

  async function confirmSecretRoomJoin() {
    if (!selectedRoom) {
      return;
    }

    setBusyRoomCode(selectedRoom.code);
    setErrorMessage(null);

    try {
      await onJoinRoom(selectedRoom.code, passwordDraft.trim());
      setSelectedRoom(null);
      setPasswordDraft("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "방 입장에 실패했습니다.");
    } finally {
      setBusyRoomCode(null);
    }
  }

  return (
    <>
      <div className="room-directory-toolbar mt-directory-toolbar">
        <input
          className="text-input"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="방 제목 또는 코드 찾기"
          aria-label="방 검색"
        />
        <div className="tab-row" aria-label="방 정렬">
          <button
            className={sortMode === "newest" ? "tab-button is-active" : "tab-button"}
            type="button"
            onClick={() => setSortMode("newest")}
          >
            최신순
          </button>
          <button
            className={sortMode === "least_players" ? "tab-button is-active" : "tab-button"}
            type="button"
            onClick={() => setSortMode("least_players")}
          >
            인원 적은순
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="modal-card room-empty-state mt-skeleton-card">
          <strong>방 목록 확인 중</strong>
          <p>열려 있는 방을 불러오고 있습니다.</p>
        </div>
      ) : rooms.length === 0 ? (
        <div className="modal-card room-empty-state">
          <strong>열린 방이 없습니다.</strong>
          <p>새 방을 만들거나 초대 코드를 직접 입력하세요.</p>
        </div>
      ) : visibleRooms.length === 0 ? (
        <div className="modal-card room-empty-state">
          <strong>검색 결과가 없습니다.</strong>
          <p>코드나 제목을 다시 확인하세요.</p>
          {hasSearchQuery ? (
            <div className="action-row">
              <button className="button-secondary" type="button" onClick={() => setSearch("")}>
                검색 지우기
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <ul className="room-directory-list mt-room-grid">
          {visibleRooms.map((room) => {
            const action = resolveRoomAction(room);
            const width = occupancyWidth(room);

            return (
              <li
                key={room.code}
                className="room-directory-card mt-room-card"
                data-state={action.disabled ? "disabled" : "active"}
                data-tone={action.tone}
              >
                <div className="room-directory-card-top">
                  <div className="mt-room-title-block">
                    <div className="chip-row">
                      <span className="status-badge" data-tone={action.disabled ? "alert" : "live"}>
                        {action.description}
                      </span>
                      <span className="status-badge">{modeLabel(room.mode)}</span>
                    </div>
                    <h3 className="panel-title">{room.title}</h3>
                  </div>
                  <code className="room-code-chip">{room.code}</code>
                </div>

                <div className="room-occupancy-block">
                  <div className="meta-row room-occupancy-meta">
                    <span>{room.stageCount}스테이지</span>
                    <span>
                      {room.currentPlayers}/{room.maxPlayers}명
                    </span>
                  </div>
                  <div className="room-occupancy-meter" aria-hidden="true">
                    <div className="room-occupancy-fill" style={{ width: `${width}%` }} />
                  </div>
                </div>

                <button
                  className="button-primary room-join-button"
                  type="button"
                  onClick={() => handleJoin(room)}
                  disabled={busyRoomCode === room.code || action.disabled}
                >
                  {busyRoomCode === room.code ? "확인 중" : action.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {errorMessage ? <p className="message-negative">{errorMessage}</p> : null}

      {selectedRoom ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelectedRoom(null)}>
          <section
            className="modal-shell"
            role="dialog"
            aria-modal="true"
            aria-label="비밀방 비밀번호 입력"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="composer-header">
              <div>
                <h3 className="panel-title">비밀방 입장</h3>
                <p className="panel-copy">{selectedRoom.title}</p>
              </div>
              <button className="button-secondary" type="button" onClick={() => setSelectedRoom(null)}>
                닫기
              </button>
            </div>
            <div className="metric-grid">
              <article className="metric-card metric-card-emphasis">
                <span className="metric-label">코드</span>
                <strong className="metric-value">{selectedRoom.code}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-label">인원</span>
                <strong className="metric-value">
                  {selectedRoom.currentPlayers}/{selectedRoom.maxPlayers}명
                </strong>
              </article>
            </div>
            <div className="field-group">
              <label className="field">
                <span>비밀번호</span>
                <input
                  className="text-input"
                  type="password"
                  value={passwordDraft}
                  onChange={(event) => setPasswordDraft(event.target.value)}
                  placeholder="비밀번호 입력"
                />
              </label>
              <button className="button-primary" type="button" onClick={confirmSecretRoomJoin}>
                {busyRoomCode === selectedRoom.code ? "확인 중" : "입장하기"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
