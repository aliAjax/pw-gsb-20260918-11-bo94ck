import { Cue, Conflict, ZONES } from "./types";

/** 同一场地分区相邻两枚的最小点火间隔（秒） */
export const MIN_INTERVAL = 0.8;
const EPS = 1e-9;

/** 按点火秒升序；点火秒相同保持录入顺序（seq 小的在前） */
export function sortCues(cues: Cue[]): Cue[] {
  return [...cues].sort((a, b) => a.fireAt - b.fireAt || a.seq - b.seq);
}

export function cueLabel(cue: Cue): string {
  return `#${cue.seq} ${cue.model}`;
}

/**
 * 冲突检测：
 * 1. 同一分区、按点火秒排序后相邻两枚间隔不足 0.8 秒；
 * 2. 任一发射点落在另一枚的安全半径之内（跨分区同样检查）。
 */
export function detectConflicts(cues: Cue[]): Conflict[] {
  const sorted = sortCues(cues);
  const conflicts: Conflict[] = [];

  for (const zone of ZONES) {
    const inZone = sorted.filter((c) => c.zone === zone.id);
    for (let i = 1; i < inZone.length; i++) {
      const prev = inZone[i - 1];
      const curr = inZone[i];
      const gap = curr.fireAt - prev.fireAt;
      if (gap < MIN_INTERVAL - EPS) {
        conflicts.push({
          id: `iv-${prev.id}-${curr.id}`,
          type: "interval",
          cueIds: [prev.id, curr.id],
          message: `${zone.id}区相邻间隔不足：${cueLabel(prev)} 与 ${cueLabel(curr)} 相隔 ${gap.toFixed(2)}s < ${MIN_INTERVAL}s`,
        });
      }
    }
  }

  for (let i = 0; i < cues.length; i++) {
    for (let j = i + 1; j < cues.length; j++) {
      const a = cues[i];
      const b = cues[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const hits: string[] = [];
      if (d < a.safetyRadius - EPS) hits.push(`${cueLabel(b)} 落入 ${cueLabel(a)} 的 ${a.safetyRadius}m 安全半径`);
      if (d < b.safetyRadius - EPS) hits.push(`${cueLabel(a)} 落入 ${cueLabel(b)} 的 ${b.safetyRadius}m 安全半径`);
      if (hits.length > 0) {
        conflicts.push({
          id: `rd-${a.id}-${b.id}`,
          type: "radius",
          cueIds: [a.id, b.id],
          message: `发射点相距 ${d.toFixed(1)}m：${hits.join("；")}`,
        });
      }
    }
  }

  return conflicts;
}

export function conflictedCueIds(conflicts: Conflict[]): Set<string> {
  const ids = new Set<string>();
  for (const c of conflicts) {
    ids.add(c.cueIds[0]);
    ids.add(c.cueIds[1]);
  }
  return ids;
}

/** 同分区上一枚（按点火秒排序后）与当前枚的间隔；无上一枚返回 null */
export function zoneGapBefore(sorted: Cue[], index: number): number | null {
  const cue = sorted[index];
  for (let i = index - 1; i >= 0; i--) {
    if (sorted[i].zone === cue.zone) return cue.fireAt - sorted[i].fireAt;
  }
  return null;
}

/** 秒 → mm:ss.s */
export function fmtTime(s: number): string {
  const sign = s < 0 ? "-" : "";
  const abs = Math.abs(s);
  const m = Math.floor(abs / 60);
  const sec = abs - m * 60;
  return `${sign}${String(m).padStart(2, "0")}:${sec.toFixed(1).padStart(4, "0")}`;
}

export function fmtClock(ms: number): string {
  return new Date(ms).toLocaleTimeString("zh-CN", { hour12: false });
}

/** 所有发射点之间的最小间距（米），不足两个点时返回 null */
export function minPointDistance(cues: Cue[]): number | null {
  let min: number | null = null;
  for (let i = 0; i < cues.length; i++) {
    for (let j = i + 1; j < cues.length; j++) {
      const d = Math.hypot(cues[i].x - cues[j].x, cues[i].y - cues[j].y);
      if (min === null || d < min) min = d;
    }
  }
  return min;
}
