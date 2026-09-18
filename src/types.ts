export type ZoneId = "A" | "B" | "C";

export interface Zone {
  id: ZoneId;
  name: string;
  rect: { x: number; y: number; w: number; h: number };
  color: string;
}

/** 燃放点位平面图：160m × 90m 场地，三个分区 */
export const ZONES: Zone[] = [
  { id: "A", name: "A区 · 后场主射区", rect: { x: 10, y: 52, w: 60, h: 32 }, color: "#1d4ed8" },
  { id: "B", name: "B区 · 侧翼区", rect: { x: 90, y: 52, w: 60, h: 32 }, color: "#f59e0b" },
  { id: "C", name: "C区 · 近景前区", rect: { x: 50, y: 8, w: 60, h: 32 }, color: "#475569" },
];

export const PLAN_W = 160;
export const PLAN_H = 90;

export const CATEGORIES = ["礼花弹", "罗马烛光", "扇形架", "冷焰火"] as const;

export interface Cue {
  id: string;
  /** 录入顺序号：点火秒相同时按它保持原顺序 */
  seq: number;
  segment: string; // 节目段落
  model: string; // 烟花型号
  category: string; // 类别
  caliber: number; // 口径 mm
  angle: number; // 发射角度 °
  fireAt: number; // 点火时间 s
  duration: number; // 持续时间 s
  safetyRadius: number; // 安全距离 m
  musicAt: number; // 音乐时间点 s
  zone: ZoneId; // 场地分区
  x: number; // 发射点 x (m)
  y: number; // 发射点 y (m)
}

export interface Conflict {
  id: string;
  type: "interval" | "radius";
  cueIds: [string, string];
  message: string;
}

export interface LogEntry {
  id: string;
  at: number; // epoch ms
  action: string;
  detail: string;
}

export type BatchStatus = "draft" | "locked";

export interface BatchState {
  cues: Cue[];
  status: BatchStatus;
  submittedAt: number | null;
  /** 最近一次提交被拒的时间与冲突数（用于标出冲突项的横幅） */
  rejectedAt: number | null;
  rejectedCount: number;
  log: LogEntry[];
  nextSeq: number;
}

const seedCues: Cue[] = [
  { id: "c1", seq: 1, segment: "Intro", model: "30mm扇形架", category: "扇形架", caliber: 30, angle: 45, fireAt: 12.5, duration: 8, safetyRadius: 18, musicAt: 12.5, zone: "C", x: 62, y: 20 },
  { id: "c2", seq: 2, segment: "Intro", model: "25mm罗马烛光", category: "罗马烛光", caliber: 25, angle: 90, fireAt: 14.0, duration: 12, safetyRadius: 14, musicAt: 14.0, zone: "C", x: 98, y: 20 },
  { id: "c3", seq: 3, segment: "Chorus A", model: "75mm礼花弹", category: "礼花弹", caliber: 75, angle: 80, fireAt: 68.2, duration: 3, safetyRadius: 32, musicAt: 68.0, zone: "A", x: 24, y: 62 },
  { id: "c4", seq: 4, segment: "Chorus A", model: "75mm礼花弹", category: "礼花弹", caliber: 75, angle: 100, fireAt: 69.4, duration: 3, safetyRadius: 32, musicAt: 69.5, zone: "B", x: 136, y: 62 },
  { id: "c5", seq: 5, segment: "Chorus B", model: "50mm礼花弹", category: "礼花弹", caliber: 50, angle: 90, fireAt: 96.0, duration: 4, safetyRadius: 24, musicAt: 96.0, zone: "A", x: 56, y: 74 },
  { id: "c6", seq: 6, segment: "Chorus B", model: "50mm礼花弹", category: "礼花弹", caliber: 50, angle: 85, fireAt: 97.2, duration: 4, safetyRadius: 24, musicAt: 97.0, zone: "B", x: 104, y: 74 },
  { id: "c7", seq: 7, segment: "Finale", model: "冷焰火瀑布", category: "冷焰火", caliber: 20, angle: 0, fireAt: 222.0, duration: 15, safetyRadius: 10, musicAt: 222.0, zone: "C", x: 80, y: 32 },
  { id: "c8", seq: 8, segment: "Finale", model: "25mm罗马烛光", category: "罗马烛光", caliber: 25, angle: 90, fireAt: 224.5, duration: 10, safetyRadius: 14, musicAt: 224.5, zone: "C", x: 80, y: 12 },
];

export function seedState(): BatchState {
  return {
    cues: seedCues,
    status: "draft",
    submittedAt: null,
    rejectedAt: null,
    rejectedCount: 0,
    nextSeq: 9,
    log: [
      {
        id: "l-seed",
        at: Date.now(),
        action: "初始化",
        detail: "示例批次已载入：8 枚烟花分配至 A/B/C 区，按点火秒排序后可提交",
      },
    ],
  };
}
