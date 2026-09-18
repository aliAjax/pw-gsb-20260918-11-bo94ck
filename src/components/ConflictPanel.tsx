import type { BatchStatus, Conflict } from "../types";
import { formatDateTime } from "../utils/format";

interface Props {
  status: BatchStatus;
  conflicts: Conflict[]; // 实时（draft/rejected）或快照（提交结果）
  rejectionAt: number | null;
  submittedAt: number | null;
  cueCount: number;
  onSubmit: () => void;
  onWithdraw: () => void;
}

function ConflictPanel({
  status,
  conflicts,
  rejectionAt,
  submittedAt,
  cueCount,
  onSubmit,
  onWithdraw,
}: Props) {
  const intervalN = conflicts.filter((c) => c.kind === "interval").length;
  const safetyN = conflicts.filter((c) => c.kind === "safety").length;

  return (
    <section className={`panel submit-panel status-${status}`}>
      <div className="submit-main">
        <div className="submit-state">
          {status === "locked" ? (
            <>
              <h2>🔒 批次已锁定 · 待发射</h2>
              <p>
                {cueCount} 枚烟花按点火秒排序封版，提交于{" "}
                {submittedAt ? formatDateTime(submittedAt) : "--"}。
                编辑已禁用；撤回将保留全部分配和调整记录。
              </p>
            </>
          ) : status === "rejected" ? (
            <>
              <h2>⛔ 整批拒绝</h2>
              <p>
                提交时间 {rejectionAt ? formatDateTime(rejectionAt) : "--"}，
                检出 {conflicts.length} 项冲突（点火间隔 {intervalN} 项 /
                安全半径 {safetyN} 项{cueCount === 0 ? "、批次为空" : ""}
                ）。修改冲突项后可重新提交。
              </p>
            </>
          ) : (
            <>
              <h2>
                {conflicts.length > 0
                  ? `⚠ 草稿存在 ${conflicts.length} 项冲突`
                  : "✓ 草稿校验通过"}
              </h2>
              <p>
                规则：同分区相邻点火间隔 ≥ 0.8s；任一发射点不得落入另一枚的安全半径。
                {conflicts.length > 0
                  ? " 当前无法提交，冲突项已在清单 / 时间轴 / 平面图中标出。"
                  : " 可以提交为发射批次，提交后锁定。"}
              </p>
            </>
          )}
        </div>

        <div className="submit-actions">
          {status === "locked" ? (
            <button className="ghost" onClick={onWithdraw}>
              撤回批次（保留记录）
            </button>
          ) : (
            <button
              className="primary"
              onClick={onSubmit}
              disabled={conflicts.length > 0}
              title={conflicts.length > 0 ? "存在冲突，整批无法提交" : "提交并锁定"}
            >
              提交发射批次
            </button>
          )}
        </div>
      </div>

      {conflicts.length > 0 ? (
        <ul className="conflict-list">
          {conflicts.map((c) => (
            <li key={c.id} data-kind={c.kind}>
              <span className="tag">
                {c.kind === "interval" ? "间隔 < 0.8s" : "安全半径内"}
              </span>
              <span className="conflict-msg">{c.message}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export default ConflictPanel;
