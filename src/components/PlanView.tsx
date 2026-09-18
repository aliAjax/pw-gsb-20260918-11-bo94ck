import { SITE_DEPTH, SITE_WIDTH, ZONES } from "../constants";
import type { Conflict, Cue } from "../types";

interface Props {
  cues: Cue[];
  conflicts: Conflict[];
  locked: boolean;
}

const M = 5.12; // 米 → SVG 单位
const PAD_L = 28;
const PAD_T = 16;
const VB_W = PAD_L * 2 + SITE_WIDTH * M; // 568
const VB_H = PAD_T * 2 + SITE_DEPTH * M; // 339.2

function PlanView({ cues, conflicts, locked }: Props) {
  const flagged = new Set<string>();
  const safetyConflicts = conflicts.filter((c) => c.kind === "safety");
  safetyConflicts.forEach((c) => c.cueIds.forEach((id) => flagged.add(id)));

  const byId = new Map(cues.map((c) => [c.id, c]));

  const gridX = Array.from({ length: SITE_WIDTH / 10 + 1 }, (_, i) => i * 10);
  const gridY = Array.from({ length: SITE_DEPTH / 10 + 1 }, (_, i) => i * 10);

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>燃放点位平面图</p>
          <h2>发射点 · 安全半径 · 分区</h2>
        </div>
        <span className="muted">
          红圈 = 发射点落入安全半径内{locked ? "（批次已锁定）" : ""}
        </span>
      </div>

      <svg
        className="plan"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        role="img"
        aria-label="场地平面示意图"
      >
        {/* 场地边框 */}
        <rect
          x={PAD_L}
          y={PAD_T}
          width={SITE_WIDTH * M}
          height={SITE_DEPTH * M}
          className="site-frame"
        />

        {/* 分区底色（y 翻转组内） */}
        <g transform={`translate(${PAD_L},${PAD_T + SITE_DEPTH * M}) scale(${M},${-M})`}>
          {ZONES.map((z) => {
            const w = z.xRange[1] - z.xRange[0];
            return (
              <g key={z.id}>
                <rect
                  x={z.xRange[0]}
                  y={0}
                  width={w}
                  height={SITE_DEPTH}
                  fill={z.color}
                  opacity={0.06}
                />
                <line
                  x1={z.xRange[0]}
                  y1={0}
                  x2={z.xRange[0]}
                  y2={SITE_DEPTH}
                  stroke={z.color}
                  strokeWidth={0.35}
                  strokeDasharray="1.2 1.2"
                  opacity={0.7}
                />
                <text
                  x={0}
                  y={0}
                  className="zone-label"
                  fill={z.color}
                  transform={`translate(${z.xRange[0] + w / 2},2.6) scale(1,-1)`}
                  textAnchor="middle"
                >
                  {z.id} 区
                </text>
              </g>
            );
          })}

          {/* 网格线 */}
          {gridY
            .filter((y) => y > 0)
            .map((y) => (
              <line
                key={`gy${y}`}
                x1={0}
                y1={y}
                x2={SITE_WIDTH}
                y2={y}
                stroke="#c6d2e2"
                strokeWidth={0.12}
              />
            ))}
          {gridX
            .filter((x) => x > 0 && !ZONES.some((z) => z.xRange[0] === x))
            .map((x) => (
              <line
                key={`gx${x}`}
                x1={x}
                y1={0}
                x2={x}
                y2={SITE_DEPTH}
                stroke="#dbe4f0"
                strokeWidth={0.12}
              />
            ))}

          {/* 安全半径圆 + 发射点 */}
          {cues.map((cue) => {
            const bad = flagged.has(cue.id);
            return (
              <g key={cue.id}>
                <circle
                  cx={cue.x}
                  cy={cue.y}
                  r={cue.safetyRadius}
                  className={bad ? "safety-circle bad" : "safety-circle"}
                />
                <circle
                  cx={cue.x}
                  cy={cue.y}
                  r={0.9}
                  className={bad ? "cue-dot bad" : "cue-dot"}
                />
                <text
                  x={0}
                  y={0}
                  className="cue-label"
                  textAnchor="middle"
                  transform={`translate(${cue.x},${cue.y - 1.8}) scale(1,-1)`}
                >
                  {cue.model}
                </text>
              </g>
            );
          })}

          {/* 冲突连线 */}
          {safetyConflicts.map((c) => {
            const a = byId.get(c.cueIds[0]);
            const b = byId.get(c.cueIds[1]);
            if (!a || !b) return null;
            return (
              <line
                key={c.id}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className="conflict-line"
              />
            );
          })}
        </g>

        {/* 刻度文字（不翻转，直接在 SVG 坐标系画） */}
        {gridX.map((x) => (
          <text
            key={`tx${x}`}
            x={PAD_L + x * M}
            y={PAD_T + SITE_DEPTH * M + 12}
            className="axis-label"
            textAnchor="middle"
          >
            {x}
          </text>
        ))}
        {gridY.filter((y) => y > 0).map((y) => (
          <text
            key={`ty${y}`}
            x={PAD_L - 6}
            y={PAD_T + (SITE_DEPTH - y) * M + 3}
            className="axis-label"
            textAnchor="end"
          >
            {y}
          </text>
        ))}
        <text
          x={PAD_L + SITE_WIDTH * M + 4}
          y={PAD_T + SITE_DEPTH * M + 4}
          className="axis-label"
        >
          x(m)
        </text>
        <text x={8} y={PAD_T + 4} className="axis-label">
          y(m)
        </text>
      </svg>
    </section>
  );
}

export default PlanView;
