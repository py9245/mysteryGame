"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { RoomSnapshot } from "@/contracts/api";
import { RoomPresenceClient } from "@/components/room/RoomPresenceClient";
import { RulebookLauncher } from "@/components/rulebook/RulebookLauncher";
import { appendRoomContextToHref } from "@/features/room-context/room-context";
import { useRoomRealtimeSnapshot } from "@/features/room-snapshot/use-room-realtime-snapshot";
import { StageRuleBulletList } from "./StageRuleBulletList";
import { StageStartCountdown } from "./StageStartCountdown";

export function StageBriefingPanel({ snapshot: initialSnapshot }: { snapshot: RoomSnapshot }) {
  const router = useRouter();
  const [snapshot] = useRoomRealtimeSnapshot(initialSnapshot, {
    fallbackIntervalMs: 8_000,
  });

  useEffect(() => {
    const stageNumber = snapshot.stage?.stageNumber ?? snapshot.game?.currentStageNumber ?? 1;

    if (
      snapshot.viewMode === "stage_playing" ||
      snapshot.viewMode === "investigation_active" ||
      snapshot.viewMode === "solved_spectator"
    ) {
      router.replace(appendRoomContextToHref(`/stage/${stageNumber}/gameplay`, snapshot));
      return;
    }

    if (snapshot.viewMode === "stage_results" || snapshot.viewMode === "game_results") {
      router.replace(appendRoomContextToHref(`/stage/${stageNumber}/results`, snapshot));
    }
  }, [router, snapshot]);

  return (
    <section className="page-shell">
      <RoomPresenceClient
        roomId={snapshot.room.id}
        playerId={snapshot.me.playerId}
        stageNumber={snapshot.stage?.stageNumber}
      />
      <header className="page-header">
        <div className="header-top-row">
          <div>
            <p className="eyebrow">현재 상태</p>
            <h2 className="page-title">브리핑</h2>
            <div className="header-flow">
              <p className="header-flow-line">
                <strong>핵심 설명</strong> · {snapshot.stage?.publicTitle ?? "사건 브리핑 대기"}를 읽고 1분 동안 자유롭게 의논하는 구간입니다.
              </p>
              <p className="header-flow-line" data-tone="action">
                <strong>다음 행동</strong> · 채팅으로 사건을 정리한 뒤 질문방이 열리면 본격 추리를 시작합니다.
              </p>
            </div>
          </div>
          <div className="header-actions">
            <RulebookLauncher label="룰북" compact scope="game" />
          </div>
        </div>
      </header>
      <div className="hero-grid">
        <section className="panel panel-accent hero-card briefing-main">
          <div className="briefing-hero-cta">
            <h3 className="panel-title">사건 공개 설명</h3>
            <p className="panel-copy">{snapshot.stage?.publicDescription ?? "아직 공개된 사건 설명이 없습니다."}</p>
          </div>
          <div className="composer-header">
            <span className="status-badge" data-tone="live">
              브리핑 중
            </span>
          </div>
          <div className="briefing-countdown-card">
            <StageStartCountdown snapshot={snapshot} />
          </div>
        </section>
      </div>
      <section className="panel panel-muted briefing-hints">
        <h3 className="panel-title">현재 공개된 힌트</h3>
        <StageRuleBulletList snapshot={snapshot} />
      </section>
    </section>
  );
}
