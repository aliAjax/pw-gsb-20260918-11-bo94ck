import { useMemo } from "react";
import type { Cue } from "../types";

interface Props {
  cues: Cue[];
}

/** 型号清单：按型号聚合数量、口径与安全半径 */
function ModelInventory({ cues }: Props) {
  const groups = useMemo(() => {
    const map = new Map<
      string,
      { model: string; count: number; caliber: number; radius: number }
    >();
    cues.forEach((c) => {
      const g = map.get(c.model);
      if (g) {
        g.count += 1;
        g.radius = Math.max(g.radius, c.safetyRadius);
      } else {
        map.set(c.model, {
          model: c.model,
          count: 1,
          caliber: c.caliber,
          radius: c.safetyRadius,
        });
      }
    });
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [cues]);

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>型号清单</p>
          <h2>库存聚合</h2>
        </div>
        <span className="muted">{groups.length} 种型号</span>
      </div>
      {groups.length === 0 ? (
        <p className="empty">暂无型号。</p>
      ) : (
        <ul className="inventory">
          {groups.map((g) => (
            <li key={g.model}>
              <span className="inv-name">{g.model || "（未命名）"}</span>
              <span className="inv-meta">{g.caliber}mm · 安全 {g.radius}m</span>
              <b className="inv-count">×{g.count}</b>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default ModelInventory;
