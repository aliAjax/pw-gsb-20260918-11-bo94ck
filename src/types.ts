export type CueType = "礼花弹" | "罗马烛光" | "扇形架" | "冷焰火";

/** 一枚待发射的烟花（一条编排记录） */
export interface Cue {
  id: string;
  createdAt: number;
  /** 节目段落 */
  segment: string;
  /** 烟花型号 */
  model: string;
  /** 口径 mm */
  caliber: number;
  /** 发射角度（度） */
  angle: number;
  /** 点火秒（相对于节目起点） */
  igniteAt: number;
  /** 持续时间（秒） */
  duration: number;
  /** 安全半径 m */
  safetyRadius: number;
  /** 音乐时间点（文本，如 01:08 鼓点） */
  musicPoint: string;
  /** 场地分区 id（对应 ZONES） */
  zone: string;
  /** 发射点场地坐标 m */
  x: number;
  y: number;
}

export type ConflictKind = "interval" | "safety";

export interface Conflict {
  id: string;
  kind: ConflictKind;
  cueIds: [string, string];
  /** interval: 同分区相邻两枚的实际间隔秒 */
  gap?: number;
  /** safety: 两发射点实际间距 m */
  distance?: number;
  /** safety: 要求的最小间距 m（两枚安全半径的较大值） */
  requiredRadius?: number;
  zone?: string;
  message: string;
}

export type BatchStatus = "draft" | "locked" | "rejected";

export type LogKind =
  | "create"
  | "update"
  | "delete"
  | "submit"
  | "reject"
  | "withdraw"
  | "reset";

export interface OperationLog {
  id: string;
  at: number;
  kind: LogKind;
  cueId?: string;
  detail: string;
}

export interface AppState {
  cues: Cue[];
  status: BatchStatus;
  submittedAt: number | null;
  /** 最近一次提交被拒绝时的冲突快照 */
  lastRejection: { at: number; conflicts: Conflict[] } | null;
  logs: OperationLog[];
}
