import { ZONES } from "../constants";
import type { Conflict, Cue } from "../types";
import { formatClock } from "../utils/format";

interface Props {
  cues: Cue[]; // 已按发射顺序排好
  conflicts: Conflict[];
  locked: boolean;
  editingId: string | null;
  onEdit: (cue: Cue) => void;
  onDelete: (cue: Cue) => void;
}

const zoneName = (id: string) => ZONES.find((z) => z.id === id)?.name ?? id;

function CueTable({
  cues,
  conflicts,
  locked,
  editingId,
  onEdit,
  onDelete,
}: Props) {
  const cueConflicts = new Map<string, Conflict[]>();
  conflicts.forEach((c) => {
    c.cueIds.forEach((id) => {
      const list = cueConflicts.get(id) ?? [];
      list.push(c);
      cueConflicts.set(id, list);
    });
  });

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>发射顺序</p>
          <h2>批次清单（按点火秒稳定排序）</h2>
        </div>
        <span className="muted">同点火秒保持原顺序</span>
      </div>

      {cues.length === 0 ? (
        <p className="empty">批次为空，请在左侧分配烟花。</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>段落</th>
                <th>型号</th>
                <th>口径</th>
                <th>角度</th>
                <th>点火秒</th>
                <th>持续</th>
                <th>安全半径</th>
                <th>分区 / 坐标</th>
                <th>音乐点</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cues.map((cue, i) => {
                const cs = cueConflicts.get(cue.id) ?? [];
                const tied =
                  i > 0 && cues[i - 1].igniteAt === cue.igniteAt;
                return (
                  <tr
                    key={cue.id}
                    className={
                      cs.length > 0
                        ? "conflict-row"
                        : editingId === cue.id
                        ? "editing-row"
                        : ""
                    }
                  >
                    <td className="order">
                      {String(i + 1).padStart(2, "0")}
                      {tied ? <span className="tie" title="与上一枚点火秒相同，保持原顺序">≡</span> : null}
                    </td>
                    <td>{cue.segment}</td>
                    <td className="model">{cue.model}</td>
                    <td>{cue.caliber}mm</td>
                    <td>{cue.angle}°</td>
                    <td className="time">
                      {formatClock(cue.igniteAt)}
                      <small>{cue.igniteAt}s</small>
                    </td>
                    <td>{cue.duration}s</td>
                    <td>{cue.safetyRadius}m</td>
                    <td>
                      {zoneName(cue.zone)}
                      <small>
                        ({cue.x}, {cue.y})m
                      </small>
                    </td>
                    <td className="muted">{cue.musicPoint || "—"}</td>
                    <td className="actions">
                      <button
                        disabled={locked}
                        onClick={() => onEdit(cue)}
                        title="调整"
                      >
                        调整
                      </button>
                      <button
                        className="danger"
                        disabled={locked}
                        onClick={() => onDelete(cue)}
                        title="移除"
                      >
                        移除
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {conflicts.length > 0 ? (
        <ul className="row-conflicts">
          {conflicts.map((c) => (
            <li key={c.id} data-kind={c.kind}>
              <b>{c.kind === "interval" ? "间隔不足" : "安全半径"}</b>
              {c.message}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export default CueTable;
