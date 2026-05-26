import type { CSSProperties } from "react";
import type { RoomSnapshot } from "@/contracts/api";

function toSortableNumber(value: RoomSnapshot["scores"][number]["total"]) {
  return typeof value === "number" ? value : Number.NEGATIVE_INFINITY;
}

function formatScoreValue(value: RoomSnapshot["scores"][number]["total"]) {
  return typeof value === "number" ? String(value) : "비공개";
}

export function RankingTable({ snapshot }: { snapshot: RoomSnapshot }) {
  const rankedScores = [...snapshot.scores]
    .sort((left, right) => toSortableNumber(right.total) - toSortableNumber(left.total))
    .map((score, index) => {
      const player = snapshot.players.find((entry) => entry.playerId === score.playerId);

      return {
        rank: index + 1,
        nickname: player?.nickname ?? "플레이어",
        stageTotal: formatScoreValue(score.stageTotal),
        total: formatScoreValue(score.total),
        isMe: score.isMe,
      };
    });

  return (
    <section className="panel track-d-ranking">
      <div className="composer-header">
        <div>
          <p className="eyebrow">전체 순위</p>
          <h3 className="panel-title">개인 순위</h3>
          <p className="panel-copy">최종 누적 점수만 보고 비교합니다.</p>
        </div>
      </div>
      <div className="track-d-ranking-table-wrap">
        <table className="results-table track-d-ranking-table">
          <thead>
            <tr>
              <th scope="col">순위</th>
              <th scope="col">플레이어</th>
              <th scope="col">이번 점수</th>
              <th scope="col">누적 점수</th>
            </tr>
          </thead>
          <tbody>
            {rankedScores.map((entry, index) => {
              const rankClass =
                entry.rank === 1
                  ? "track-d-ranking-rank-1"
                  : entry.rank === 2
                    ? "track-d-ranking-rank-2"
                    : entry.rank === 3
                      ? "track-d-ranking-rank-3"
                      : "";
              const rowDelay = `${Math.min(index, 8) * 60}ms`;
              const medalRank = entry.rank <= 3 ? entry.rank : 0;
              return (
                <tr
                  key={`${entry.rank}-${entry.nickname}`}
                  className={`${rankClass}${entry.isMe ? " track-d-ranking-mine" : ""} uiux-results-ranking-row`}
                  data-rank={entry.rank}
                  data-mine={entry.isMe ? "true" : "false"}
                  aria-current={entry.isMe ? "true" : undefined}
                  style={{ "--uiux-row-delay": rowDelay } as CSSProperties}
                >
                  <td>
                    {medalRank > 0 ? (
                      <span
                        className="uiux-results-rank-medal num-tabular"
                        data-rank={medalRank}
                        aria-label={`${entry.rank}위`}
                      >
                        {entry.rank}
                      </span>
                    ) : (
                      <span className="track-d-ranking-rank num-tabular">{entry.rank}</span>
                    )}
                  </td>
                  <td>
                    <span className="track-d-ranking-name">
                      {entry.nickname}
                      {entry.isMe ? <span className="track-d-ranking-mine-badge">나</span> : null}
                    </span>
                  </td>
                  <td className="num-tabular">{entry.stageTotal}</td>
                  <td>
                    <strong className="track-d-ranking-total num-tabular">{entry.total}</strong>
                  </td>
                </tr>
              );
            })}
            {rankedScores.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <p className="message-note">아직 집계할 점수가 없습니다.</p>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
