import { MIN_INTERVAL, ZONES } from "../constants";
import type { Conflict, Cue } from "../types";
import { formatClock } from "../utils/format";

interface Props {
  cues: Cue[]; // 已按发射顺序
  conflicts: Conflict[];
}

function Timeline({ cues, conflicts }: Props) {
  const maxEnd = cues.reduce(
    (m, c) => Math.max(m, c.igniteAt + c.duration),
    30
  );
  const endSec = Math.max(30, Math.ceil(maxEnd / 10) * 10);
  const ticks = Array.from({ length: endSec / 10 + 1 }, (_, i) => i * 10);

  const intervalConflicts = conflicts.filter((c) => c.kind === "interval");
  const badIds = new Set<string>();
  intervalConflicts.forEach((c) => c.cueIds.forEach((id) => badIds.add(id)));

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>时间轴编排</p>
          <h2>分区时间轴</h2>
        </div>
        <span className="muted">
          同分区相邻两枚间隔须 ≥ {MIN_INTERVAL}s（红色为冲突）
        </span>
      </div>

      {cues.length === 0 ? (
        <p className="empty">暂无时间数据。</p>
      ) : (
        <div className="timeline">
          <div className="tl-scale">
            {ticks.map((t) => (
              <span
                key={t}
                style={{ left: `${(t / endSec) * 100}%` }}
                className="tl-tick"
              >
                {formatClock(t)}
              </span>
            ))}
          </div>

          {ZONES.map((zone) => {
            const lane = cues.filter((c) => c.zone === zone.id);
            return (
              <div className="tl-lane" key={zone.id}>
                <div className="tl-lane-name" style={{ color: zone.color }}>
                  {zone.id}区
                  <small>{lane.length} 枚</small>
                </div>
                <div className="tl-track">
                  {ticks.map((t) => (
                    <i
                      key={t}
                      className="tl-gridline"
                      style={{ left: `${(t / endSec) * 100}%` }}
                    />
                  ))}
                  {lane.map((cue) => (
                    <div
                      key={cue.id}
                      className={
                        badIds.has(cue.id) ? "tl-bar bad" : "tl-bar"
                      }
                      style={{
                        left: `${(cue.igniteAt / endSec) * 100}%`,
                        width: `${Math.max(
                          (cue.duration / endSec) * 100,
                          1.2
                        )}%`,
                        borderColor: zone.color,
                      }}
                      title={`${cue.model}｜点火 ${formatClock(
                        cue.igniteAt
                      )}｜持续 ${cue.duration}s`}
                    >
                      <span>{cue.model}</span>
                      <em>{formatClock(cue.igniteAt)}</em>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {intervalConflicts.length === 0 ? (
            <p className="tl-ok">✓ 各分区相邻点火间隔均满足 {MIN_INTERVAL}s 规则</p>
          ) : (
            <ul className="tl-conflicts">
              {intervalConflicts.map((c) => (
                <li key={c.id}>
                  {c.zone} 区：{formatClock(
                    cues.find((q) => q.id === c.cueIds[0])?.igniteAt ?? 0
                  )}{" "}
                  与下一枚仅隔 <b>{c.gap}s</b>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

export default Timeline;
