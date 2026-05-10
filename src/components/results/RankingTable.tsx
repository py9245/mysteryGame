import type { RoomSnapshot } from "@/contracts/api";

function toSortableNumber(value: RoomSnapshot["scores"][number]["total"]) {
  return typeof value === "number" ? value : Number.POSITIVE_INFINITY;
}

function formatScoreValue(value: RoomSnapshot["scores"][number]["total"]) {
  return typeof value === "number" ? String(value) : "비공개";
}

export function RankingTable({ snapshot }: { snapshot: RoomSnapshot }) {
  const rankedScores = [...snapshot.scores]
    .sort((left, right) => toSortableNumber(left.total) - toSortableNumber(right.total))
    .map((score, index) => {
      const player = snapshot.players.find((entry) => entry.playerId === score.playerId);

      return {
        rank: index + 1,
        nickname: player?.nickname ?? score.playerId,
        stageTotal: formatScoreValue(score.stageTotal),
        total: formatScoreValue(score.total),
        isMe: score.isMe,
      };
    });

  return (
    <section className="panel">
      <div className="composer-header">
        <div>
          <h3 className="panel-title">개인 순위</h3>
          <p className="panel-copy">최종 누적 점수만 보고 비교합니다.</p>
        </div>
      </div>
      <table className="results-table">
        <thead>
          <tr>
            <th>순위</th>
            <th>플레이어</th>
            <th>이번 점수</th>
            <th>누적 점수</th>
          </tr>
        </thead>
        <tbody>
          {rankedScores.map((entry) => (
            <tr key={entry.nickname}>
              <td>{entry.rank}</td>
              <td>{entry.isMe ? `${entry.nickname} (나)` : entry.nickname}</td>
              <td>{entry.stageTotal}</td>
              <td>{entry.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
