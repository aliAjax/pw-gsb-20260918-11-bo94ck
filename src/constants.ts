import type { Cue, CueType } from "./types";

export interface ZoneMeta {
  id: string;
  name: string;
  /** 分区在平面图上的 x 范围（m） */
  xRange: [number, number];
  color: string;
}

/** 场地分区（顺序即从左到右） */
export const ZONES: ZoneMeta[] = [
  { id: "A", name: "A 区 · 主燃放区", xRange: [0, 40], color: "#1d4ed8" },
  { id: "B", name: "B 区 · 水上平台", xRange: [40, 80], color: "#0e7490" },
  { id: "C", name: "C 区 · 近景舞台", xRange: [80, 120], color: "#7c3aed" },
];

export const CUE_TYPES: CueType[] = ["礼花弹", "罗马烛光", "扇形架", "冷焰火"];

/** 场地平面图尺寸（m） */
export const SITE_WIDTH = 120;
export const SITE_DEPTH = 80;

/** 同一场地分区相邻两枚烟花的最小点火间隔（秒） */
export const MIN_INTERVAL = 0.8;

export const STORAGE_KEY = "fireworks-batch-v1";

/** 初始编排（全部互不冲突，可直接提交） */
export const SEED_CUES: Omit<Cue, "id" | "createdAt">[] = [
  {
    segment: "Intro",
    model: "30mm扇形架",
    caliber: 30,
    angle: 75,
    igniteAt: 12.5,
    duration: 4,
    safetyRadius: 12,
    musicPoint: "00:12.5 前奏",
    zone: "A",
    x: 10,
    y: 14,
  },
  {
    segment: "Intro",
    model: "冷焰火",
    caliber: 20,
    angle: 90,
    igniteAt: 15.0,
    duration: 6,
    safetyRadius: 6,
    musicPoint: "00:15 起势",
    zone: "C",
    x: 110,
    y: 66,
  },
  {
    segment: "Chorus A",
    model: "75mm礼花弹",
    caliber: 75,
    angle: 82,
    igniteAt: 68.2,
    duration: 5,
    safetyRadius: 30,
    musicPoint: "01:08.2 鼓点",
    zone: "B",
    x: 52,
    y: 18,
  },
  {
    segment: "Chorus A",
    model: "45mm罗马烛光",
    caliber: 45,
    angle: 70,
    igniteAt: 69.4,
    duration: 8,
    safetyRadius: 20,
    musicPoint: "01:09.4 合唱",
    zone: "A",
    x: 26,
    y: 56,
  },
  {
    segment: "Chorus B",
    model: "50mm扇形架",
    caliber: 50,
    angle: 88,
    igniteAt: 128.0,
    duration: 5,
    safetyRadius: 18,
    musicPoint: "02:08 副歌",
    zone: "A",
    x: 6,
    y: 50,
  },
  {
    segment: "Chorus B",
    model: "75mm礼花弹",
    caliber: 75,
    angle: 80,
    igniteAt: 129.2,
    duration: 5,
    safetyRadius: 28,
    musicPoint: "02:09.2",
    zone: "B",
    x: 68,
    y: 62,
  },
  {
    segment: "Finale",
    model: "100mm礼花弹",
    caliber: 100,
    angle: 85,
    igniteAt: 222.0,
    duration: 6,
    safetyRadius: 30,
    musicPoint: "03:42 高潮",
    zone: "B",
    x: 78,
    y: 2,
  },
  {
    segment: "Finale",
    model: "冷焰火",
    caliber: 20,
    angle: 90,
    igniteAt: 223.0,
    duration: 10,
    safetyRadius: 6,
    musicPoint: "03:43 收束",
    zone: "C",
    x: 98,
    y: 26,
  },
];
