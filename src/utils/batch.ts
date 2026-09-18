import { MIN_INTERVAL } from "../constants";
import type { Conflict, Cue } from "../types";
import { formatClock } from "./format";

/**
 * 发射顺序：按点火秒升序；点火秒相同保持原顺序（稳定排序，以原始下标兜底）。
 */
export function sortedCues(cues: Cue[]): Cue[] {
  return cues
    .map((cue, index) => ({ cue, index }))
    .sort((a, b) =>
      a.cue.igniteAt !== b.cue.igniteAt
        ? a.cue.igniteAt - b.cue.igniteAt
        : a.index - b.index
    )
    .map((item) => item.cue);
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * 规则一：同一场地分区内，按发射顺序相邻的两枚，点火间隔不足 0.8 秒即冲突。
 */
function detectIntervalConflicts(ordered: Cue[]): Conflict[] {
  const conflicts: Conflict[] = [];
  const byZone = new Map<string, Cue[]>();
  for (const cue of ordered) {
    const list = byZone.get(cue.zone) ?? [];
    list.push(cue);
    byZone.set(cue.zone, list);
  }
  for (const [zone, list] of byZone) {
    for (let i = 1; i < list.length; i += 1) {
      const prev = list[i - 1];
      const cur = list[i];
      const gap = round2(cur.igniteAt - prev.igniteAt);
      if (gap < MIN_INTERVAL) {
        conflicts.push({
          id: `interval:${prev.id}|${cur.id}`,
          kind: "interval",
          cueIds: [prev.id, cur.id],
          gap,
          zone,
          message: `${zone} 区相邻 ${prev.model} 与 ${cur.model} 点火间隔仅 ${gap}s（${formatClock(
            prev.igniteAt
          )} / ${formatClock(
            cur.igniteAt
          )}），不足 ${MIN_INTERVAL}s`,
        });
      }
    }
  }
  return conflicts;
}

function distance(a: Cue, b: Cue): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * 规则二：任一发射点落入另一枚烟花的安全半径内即冲突
 * （两点间距小于两枚安全半径的较大值）。
 */
function detectSafetyConflicts(ordered: Cue[]): Conflict[] {
  const conflicts: Conflict[] = [];
  for (let i = 0; i < ordered.length; i += 1) {
    for (let j = i + 1; j < ordered.length; j += 1) {
      const a = ordered[i];
      const b = ordered[j];
      const required = Math.max(a.safetyRadius, b.safetyRadius);
      const d = round1(distance(a, b));
      if (d < required) {
        conflicts.push({
          id: `safety:${a.id}|${b.id}`,
          kind: "safety",
          cueIds: [a.id, b.id],
          distance: d,
          requiredRadius: required,
          zone: a.zone === b.zone ? a.zone : `${a.zone}↔${b.zone}`,
          message: `${a.model}(${a.zone}区) 与 ${b.model}(${b.zone}区) 发射点相距 ${d}m，${
            a.safetyRadius >= b.safetyRadius
              ? `${a.model} 安全半径 ${a.safetyRadius}m`
              : `${b.model} 安全半径 ${b.safetyRadius}m`
          }，发射点落入安全半径内`,
        });
      }
    }
  }
  return conflicts;
}

/** 校验整个批次：存在任一冲突即整批拒绝 */
export function detectConflicts(cues: Cue[]): Conflict[] {
  const ordered = sortedCues(cues);
  return [
    ...detectIntervalConflicts(ordered),
    ...detectSafetyConflicts(ordered),
  ].sort((a, b) => (a.cueIds[0] < b.cueIds[0] ? -1 : 1));
}

/** 收集冲突涉及的烟花 id，便于界面标出 */
export function conflictCueIds(conflicts: Conflict[]): Set<string> {
  const ids = new Set<string>();
  for (const c of conflicts) {
    ids.add(c.cueIds[0]);
    ids.add(c.cueIds[1]);
  }
  return ids;
}
