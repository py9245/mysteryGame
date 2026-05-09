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

function resolveRoomAction(room: DirectoryRoom) {
  if (room.mode === "practice") {
    return {
      label: "연습 전용",
      disabled: true,
      tone: "blocked" as const,
      description: "연습방은 방을 연 본인만 사용할 수 있습니다.",
    };
  }

  if (!room.joinable && room.currentPlayers >= room.maxPlayers) {
    return {
      label: "인원 마감",
      disabled: true,
      tone: "blocked" as const,
      description: "정원이 가득 차서 지금은 합류할 수 없습니다.",
    };
  }

  if (!room.joinable) {
    return {
      label: "입장 불가",
      disabled: true,
      tone: "blocked" as const,
      description: "현재 상태에서는 새 플레이어를 받을 수 없습니다.",
    };
  }

  if (room.passwordProtected) {
    return {
      label: "비밀번호 입력",
      disabled: false,
      tone: "secret" as const,
      description: "입장 코드와 비밀번호가 모두 맞아야 들어갈 수 있습니다.",
    };
  }

  return {
    label: "입장하기",
    disabled: false,
    tone: "join" as const,
    description: "빈 자리가 있다면 바로 대기실에 합류할 수 있습니다.",
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
      room.title.toLowerCase().includes(query) || room.code.toLowerCase().includes(query),
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
      <div className="room-directory-toolbar">
        <input
          className="text-input"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="방 제목 또는 입장 코드 검색"
        />
        <div className="tab-row">
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
            적은 인원 순
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="modal-card room-empty-state">
          <strong>열려 있는 방을 불러오는 중입니다.</strong>
          <p>공개방과 비밀방 상태를 새로 가져오고 있습니다.</p>
        </div>
      ) : rooms.length === 0 ? (
        <div className="modal-card room-empty-state">
          <strong>지금은 열려 있는 방이 없습니다.</strong>
          <p>입장 코드가 없다면 새 방을 만들거나 조금 뒤에 다시 확인해 주세요.</p>
        </div>
      ) : visibleRooms.length === 0 ? (
        <div className="modal-card room-empty-state">
          <strong>검색 결과가 없습니다.</strong>
          <p>검색어를 비우거나 정렬을 바꿔서 다시 찾아보세요.</p>
          {hasSearchQuery ? (
            <div className="action-row">
              <button className="button-secondary" type="button" onClick={() => setSearch("")}>
                검색 지우기
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <ul className="room-directory-list">
          {visibleRooms.map((room) => {
            const action = resolveRoomAction(room);

            return (
              <li
                key={room.code}
                className="room-directory-card"
                data-state={action.disabled ? "disabled" : "active"}
              >
                <div className="room-directory-card-top">
                  <div>
                    <h3 className="panel-title">{room.title}</h3>
                    <p className="panel-copy">
                      {modeLabel(room.mode)} · 스테이지 {room.stageCount}개
                    </p>
                  </div>
                  <code className="room-code-chip">{room.code}</code>
                </div>

                <div className="room-occupancy-block">
                  <div className="meta-row room-occupancy-meta">
                    <span>참가자</span>
                    <span>
                      {room.currentPlayers}/{room.maxPlayers}명
                    </span>
                  </div>
                  <div className="room-occupancy-meter">
                    <div
                      className="room-occupancy-fill"
                      style={{ width: `${occupancyWidth(room)}%` }}
                    />
                  </div>
                </div>

                <p className="panel-copy">{action.description}</p>

                <button
                  className="button-primary room-join-button"
                  type="button"
                  onClick={() => handleJoin(room)}
                  disabled={busyRoomCode === room.code || action.disabled}
                >
                  {busyRoomCode === room.code ? "입장 확인 중..." : action.label}
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
            aria-label="비밀번호 입력"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="composer-header">
              <div>
                <h3 className="panel-title">비밀방 입장</h3>
                <p className="panel-copy">{selectedRoom.title}에 들어가기 전에 비밀번호를 확인합니다.</p>
              </div>
              <button className="button-secondary" type="button" onClick={() => setSelectedRoom(null)}>
                닫기
              </button>
            </div>
            <div className="metric-grid">
              <article className="metric-card">
                <span className="metric-label">입장 코드</span>
                <strong className="metric-value">{selectedRoom.code}</strong>
              </article>
              <article className="metric-card">
                <span className="metric-label">현재 인원</span>
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
              <p className="message-note">비밀번호가 맞으면 바로 대기실로 이동합니다.</p>
              <button className="button-primary" type="button" onClick={confirmSecretRoomJoin}>
                {busyRoomCode === selectedRoom.code ? "확인 중..." : "입장 확인"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
