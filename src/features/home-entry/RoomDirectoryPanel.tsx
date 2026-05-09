"use client";

import { useMemo, useState } from "react";

export type DirectoryRoom = {
  code: string;
  title: string;
  mode: "public" | "secret" | "practice";
  status: "waiting" | "ready" | "assigning" | "in_game";
  currentPlayers: number;
  maxPlayers: number;
  createdAt: string;
  password?: string;
  stageCount: number;
};

function modeLabel(mode: DirectoryRoom["mode"]) {
  switch (mode) {
    case "secret":
      return "비밀방";
    case "practice":
      return "연습모드";
    default:
      return "공개방";
  }
}

function statusLabel(status: DirectoryRoom["status"]) {
  switch (status) {
    case "ready":
      return "시작 가능";
    case "assigning":
      return "팀 편성 중";
    case "in_game":
      return "진행 중";
    default:
      return "입장 대기";
  }
}

export function RoomDirectoryPanel({
  rooms,
  onJoinRoom,
}: {
  rooms: DirectoryRoom[];
  onJoinRoom: (roomCode: string) => Promise<void>;
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
        const leftRatio = left.currentPlayers / left.maxPlayers;
        const rightRatio = right.currentPlayers / right.maxPlayers;
        return leftRatio - rightRatio || right.createdAt.localeCompare(left.createdAt);
      }

      return right.createdAt.localeCompare(left.createdAt);
    });
  }, [rooms, search, sortMode]);

  async function handleJoin(room: DirectoryRoom) {
    if (busyRoomCode) {
      return;
    }

    if (room.mode === "secret" && room.password) {
      setSelectedRoom(room);
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

    if (selectedRoom.password && passwordDraft.trim() !== selectedRoom.password) {
      setErrorMessage("비밀번호가 맞지 않습니다.");
      return;
    }

    setBusyRoomCode(selectedRoom.code);
    setErrorMessage(null);
    setSelectedRoom(null);
    setPasswordDraft("");

    try {
      await onJoinRoom(selectedRoom.code);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "방 입장에 실패했습니다.");
    } finally {
      setBusyRoomCode(null);
    }
  }

  return (
    <section className="panel panel-accent">
      <div className="composer-header">
        <div>
          <h2 className="panel-title">방 목록</h2>
          <p className="panel-copy">제목 검색, 최신순, 적은 인원 순으로 바로 방을 좁힐 수 있습니다.</p>
        </div>
        <span className="status-badge" data-tone="live">
          {visibleRooms.length}개
        </span>
      </div>
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
      {rooms.length === 0 ? (
        <div className="modal-card room-empty-state">
          <strong>아직 열린 방이 없습니다.</strong>
          <p>첫 방을 열면 이 목록에 바로 나타납니다. 공개방이나 연습방으로 흐름을 먼저 확인해 보세요.</p>
        </div>
      ) : visibleRooms.length === 0 ? (
        <div className="modal-card room-empty-state">
          <strong>검색 결과가 없습니다.</strong>
          <p>검색어를 비우거나 최신순으로 다시 보면 현재 열려 있는 방을 빠르게 찾을 수 있습니다.</p>
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
          {visibleRooms.map((room) => (
            <li key={room.code} className="room-directory-card">
              <div className="composer-header">
                <div>
                  <h3 className="panel-title">{room.title}</h3>
                  <p className="panel-copy">{room.code}</p>
                </div>
                <span className="status-badge" data-tone={room.status === "in_game" ? "alert" : "live"}>
                  {statusLabel(room.status)}
                </span>
              </div>
              <div className="meta-row">
                <span>{modeLabel(room.mode)}</span>
                <span>
                  {room.currentPlayers}/{room.maxPlayers}명
                </span>
                <span>스테이지 {room.stageCount}개</span>
              </div>
              <p className="panel-copy">
                {room.mode === "practice"
                  ? "연습방은 방장 1명만 들어갈 수 있어 외부 합류가 닫혀 있습니다."
                  : room.mode === "secret"
                    ? "비밀방은 비밀번호를 확인한 뒤 입장합니다."
                    : "공개방은 입장 코드만 맞으면 바로 합류합니다."}
              </p>
              <div className="action-row">
                <button
                  className="button-primary"
                  type="button"
                  onClick={() => handleJoin(room)}
                  disabled={busyRoomCode === room.code || room.mode === "practice"}
                >
                  {busyRoomCode === room.code
                    ? "입장 중..."
                    : room.mode === "secret"
                      ? "비밀번호 확인"
                      : room.mode === "practice"
                        ? "입장 불가"
                        : "바로 입장"}
                </button>
              </div>
            </li>
          ))}
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
                <h3 className="panel-title">비밀방 비밀번호</h3>
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
    </section>
  );
}
