import Link from "next/link";
import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";
import { appendRoomContextToHref } from "@/features/room-context/room-context";

function resolveActionCopy(snapshot: RoomSnapshot) {
  const stageNumber = snapshot.stage?.stageNumber ?? snapshot.game?.currentStageNumber ?? 1;
  const investigationHref = appendRoomContextToHref(`/stage/${stageNumber}/investigation`, snapshot);
  const investigation = snapshot.stage?.investigation;
  const lockOwnerId = investigation?.lockedByPlayerId ?? null;
  const isLockedByMe = lockOwnerId === snapshot.me.playerId;
  const isAvailable = !lockOwnerId;
  const queuePosition = investigation?.queuePosition ?? null;

  if (isLockedByMe) {
    return {
      href: investigationHref,
      label: "질문방으로 복귀",
      status: "내 차례 진행 중",
      description: "지금은 내가 질문이나 정답 시도를 이어갈 차례입니다.",
    };
  }

  if (isAvailable) {
    return {
      href: investigationHref,
      label: "질문방으로 이동",
      status: "바로 행동 가능",
      description: "질문방이 비어 있습니다. 지금 들어가 질문이나 정답 시도를 정리하세요.",
    };
  }

  if (queuePosition) {
    return {
      href: investigationHref,
      label: "대기열 상태 보기",
      status: `대기열 ${queuePosition}번`,
      description: "앞사람이 나오면 자동으로 입장합니다. 지금은 대기열 상태만 확인하면 됩니다.",
    };
  }

  return {
    href: investigationHref,
    label: "대기열 상태 보기",
    status: "차례 대기",
    description: "다른 플레이어가 사용 중입니다. 대기열과 1:1 요청 상태만 먼저 확인하면 됩니다.",
  };
}

export function PlayerActionPanel({ snapshot }: { snapshot: RoomSnapshot }) {
  const action = resolveActionCopy(snapshot);

  return (
    <section className="panel panel-accent utility-card">
      <div className="composer-header">
        <div>
          <h3 className="panel-title">지금 할 일</h3>
          <p className="panel-copy">{action.description}</p>
        </div>
        <span className="status-badge" data-tone={action.status === "바로 행동 가능" ? "live" : undefined}>
          {action.status}
        </span>
      </div>
      <div className="action-row">
        <Link className="button-primary" href={action.href}>
          {action.label}
        </Link>
      </div>
    </section>
  );
}
