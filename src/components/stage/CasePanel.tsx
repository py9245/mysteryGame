import type { RoomSnapshot } from "@/features/mock/mock-room-snapshot";

export function CasePanel({ snapshot }: { snapshot: RoomSnapshot }) {
  const stage = snapshot.stage;
  return (
    <section className="panel">
      <h3 className="panel-title">사건 파일</h3>
      <p className="metric-label">사건명</p>
      <p>{stage?.publicTitle ?? "브리핑 대기"}</p>
      <p className="metric-label">공개 설명</p>
      <p className="panel-copy">{stage?.publicDescription ?? "아직 사건 설명이 열리지 않았습니다."}</p>
    </section>
  );
}
