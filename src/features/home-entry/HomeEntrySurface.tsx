"use client";

import Link from "next/link";
import { useState } from "react";
import {
  submitCreateRoom,
  type SubmitCreateRoomResult,
} from "./create-room-bootstrap";
import {
  submitJoinRoom,
  type SubmitJoinRoomResult,
} from "./join-room-bootstrap";

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

export function HomeEntrySurface() {
  const [hostNickname, setHostNickname] = useState("");
  const [joinRoomCode, setJoinRoomCode] = useState("");
  const [joinNickname, setJoinNickname] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [createResult, setCreateResult] = useState<SubmitCreateRoomResult | null>(null);
  const [joinResult, setJoinResult] = useState<SubmitJoinRoomResult | null>(null);
  const canCreate = hostNickname.trim().length > 0 && !isSubmitting;
  const canJoin =
    joinRoomCode.trim().length > 0 &&
    joinNickname.trim().length > 0 &&
    !isJoining;

  async function handleCreateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canCreate) {
      return;
    }

    setIsSubmitting(true);
    const nextResult = await submitCreateRoom({ hostNickname });
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
      nickname: joinNickname,
    });
    setJoinResult(nextResult);
    setIsJoining(false);
  }

  return (
    <main className="page-shell">
      <section className="page-header">
        <p className="eyebrow">심리 추리전</p>
        <h1 className="page-title">Mystery Time</h1>
        <p className="page-kicker">
          같은 방 안에서 협력하고 흔들지만, 정답과 점수는 끝내 개인에게 남는다. 제한된 정보,
          조사실 단독 점유, 질문 비용, 오판을 둘러싼 심리전까지 모두 감당해야 하는 실시간 추리
          게임이다.
        </p>
      </section>

      <section className="hero-grid">
        <article className="panel">
          <h2 className="panel-title">방 만들기</h2>
          <p className="panel-copy">
            방장이 닉네임을 정하면 바로 대기실이 열립니다. 코드가 생성되면 플레이어들을 불러
            심리전을 시작할 수 있습니다.
          </p>
          <form onSubmit={handleCreateSubmit} className="field-group">
            <label style={{ display: "grid", gap: 8 }}>
              <span>방장 닉네임</span>
              <input
                className="text-input"
                type="text"
                value={hostNickname}
                onChange={(event) => setHostNickname(event.target.value)}
                placeholder="예: Mina"
              />
            </label>
            <button className="button-primary" type="submit" disabled={!canCreate}>
              {isSubmitting ? "방을 여는 중..." : "방 열기"}
            </button>
          </form>
        </article>

        <article className="panel panel-accent">
          <h2 className="panel-title">코드로 입장</h2>
          <p className="panel-copy">
            이미 열린 방이 있다면 입장 코드와 닉네임만으로 대기실에 바로 합류할 수 있습니다.
          </p>
          <form onSubmit={handleJoinSubmit} className="field-group">
            <label style={{ display: "grid", gap: 8 }}>
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
            <label style={{ display: "grid", gap: 8 }}>
              <span>참가 닉네임</span>
              <input
                className="text-input"
                type="text"
                value={joinNickname}
                onChange={(event) => setJoinNickname(event.target.value)}
                placeholder="예: Sora"
              />
            </label>
            <button className="button-primary" type="submit" disabled={!canJoin}>
              {isJoining ? "입장 중..." : "방 참가"}
            </button>
          </form>
        </article>
      </section>

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

      {createResult === null && joinResult === null ? (
        <section className="panel">
          <h2 className="panel-title">입장 준비</h2>
          <p className="panel-copy">
            방장이 방을 열거나, 참가자가 입장 코드로 바로 합류할 수 있습니다.
          </p>
        </section>
      ) : null}

      {createResult && createResult.ok && createResult.response ? (
        <section className="panel panel-accent">
          <h2 className="panel-title">방이 열렸습니다</h2>
          <p className="panel-copy">
            플레이어들에게 아래 입장 코드를 공유하세요. 준비가 끝나면 대기실에서 팀 배치와 스테이지
            시작을 이어갈 수 있습니다.
          </p>
          <div className="metric-grid">
            <div className="metric-card">
              <span className="metric-label">입장 코드</span>
              <strong className="metric-value">{createResult.response.snapshot.room.code}</strong>
            </div>
            <div className="metric-card">
              <span className="metric-label">방장</span>
              <strong className="metric-value">{createResult.response.snapshot.me.nickname}</strong>
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
              href={`/lobby?roomId=${encodeURIComponent(createResult.response.roomId)}&roomCode=${encodeURIComponent(
                createResult.response.snapshot.room.code,
              )}&playerId=${encodeURIComponent(createResult.response.playerId)}`}
            >
              대기실 입장
            </Link>
            <Link
              className="button-secondary"
              href={`/room/${encodeURIComponent(createResult.response.snapshot.room.code)}?roomId=${encodeURIComponent(
                createResult.response.roomId,
              )}&playerId=${encodeURIComponent(createResult.response.playerId)}`}
            >
              방 현황 보기
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
              <span className="metric-label">참가자</span>
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
            <Link
              className="button-primary"
              href={`/lobby?roomId=${encodeURIComponent(joinResult.response.roomId)}&roomCode=${encodeURIComponent(
                joinResult.response.snapshot.room.code,
              )}&playerId=${encodeURIComponent(joinResult.response.playerId)}`}
            >
              대기실 입장
            </Link>
            <Link
              className="button-secondary"
              href={`/room/${encodeURIComponent(joinResult.response.snapshot.room.code)}?roomId=${encodeURIComponent(
                joinResult.response.roomId,
              )}&playerId=${encodeURIComponent(joinResult.response.playerId)}`}
            >
              방 현황 보기
            </Link>
          </div>
        </section>
      ) : joinResult ? (
        <section className="panel" style={{ borderColor: "rgba(139, 45, 45, 0.28)" }}>
          <h2 className="panel-title">방에 입장하지 못했습니다</h2>
          <p className="message-negative">{joinResult.errorMessage ?? "방 참가 요청에 실패했습니다."}</p>
        </section>
      ) : null}

      <section className="panel-grid">
        <article className="panel" style={{ gridColumn: "span 7" }}>
          <h2 className="panel-title">빠른 입장</h2>
          <p className="panel-copy">
            바로 화면 톤을 확인하고 싶다면 아래 경로로 들어갈 수 있습니다.
          </p>
          <div className="action-row">
            <Link className="button-secondary" href="/lobby">기본 대기실 보기</Link>
            <Link className="button-secondary" href="/room/demo-room">기본 방 현황 보기</Link>
          </div>
        </article>
        <article className="panel panel-muted" style={{ gridColumn: "span 5" }}>
          <h2 className="panel-title">플레이 감각</h2>
          <ul>
            <li>낮은 점수를 지키며 끝까지 버티기</li>
            <li>팀과 공유할 정보와 숨길 정보를 구분하기</li>
            <li>조사실 점유 타이밍으로 상대를 흔들기</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
