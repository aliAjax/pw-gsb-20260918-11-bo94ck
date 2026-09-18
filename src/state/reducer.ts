import { SEED_CUES } from "../constants";
import type {
  AppState,
  Cue,
  LogKind,
  OperationLog,
} from "../types";
import { detectConflicts } from "../utils/batch";
import { uid } from "../utils/format";

export type CueDraft = Omit<Cue, "id" | "createdAt">;

export type Action =
  | { type: "add"; cue: CueDraft }
  | { type: "update"; id: string; before: Cue; after: CueDraft }
  | { type: "delete"; cue: Cue }
  | { type: "submit" }
  | { type: "withdraw" }
  | { type: "reset" };

export const log = (
  kind: LogKind,
  detail: string,
  cueId?: string
): OperationLog => ({
  id: uid("log"),
  at: Date.now(),
  kind,
  cueId,
  detail,
});

export function seedState(): AppState {
  const now = Date.now();
  const cues: Cue[] = SEED_CUES.map((c) => ({
    ...c,
    id: uid("cue"),
    createdAt: now,
  }));
  return {
    cues,
    status: "draft",
    submittedAt: null,
    lastRejection: null,
    logs: [
      log("reset", "载入示例编排：8 枚烟花，初始为草稿批次"),
      log(
        "create",
        "批量导入 30mm扇形架、冷焰火、75mm礼花弹等 8 枚初始烟花"
      ),
    ],
  };
}

const FIELD_LABELS: Record<keyof CueDraft, string> = {
  segment: "段落",
  model: "型号",
  caliber: "口径",
  angle: "发射角度",
  igniteAt: "点火秒",
  duration: "持续",
  safetyRadius: "安全半径",
  musicPoint: "音乐点",
  zone: "分区",
  x: "X坐标",
  y: "Y坐标",
};

function describeChanges(before: Cue, after: CueDraft): string[] {
  const out: string[] = [];
  (Object.keys(FIELD_LABELS) as (keyof CueDraft)[]).forEach((key) => {
    if (before[key] !== after[key]) {
      out.push(`${FIELD_LABELS[key]} ${before[key]} → ${after[key]}`);
    }
  });
  return out;
}

/** 批次状态机：草稿 →（提交）→ 锁定 / 整批拒绝；锁定 →（撤回）→ 草稿 */
export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "add": {
      if (state.status === "locked") return state;
      const cue: Cue = {
        ...action.cue,
        id: uid("cue"),
        createdAt: Date.now(),
      };
      return {
        ...state,
        cues: [...state.cues, cue],
        status: "draft",
        lastRejection: null,
        logs: [
          ...state.logs,
          log(
            "create",
            `分配 ${cue.model} 至 ${cue.zone} 区 (${cue.x}, ${cue.y})m，点火 ${cue.igniteAt}s`,
            cue.id
          ),
        ],
      };
    }
    case "update": {
      if (state.status === "locked") return state;
      const { before } = action;
      const after: Cue = {
        ...action.after,
        id: before.id,
        createdAt: before.createdAt,
      };
      const changes = describeChanges(before, after);
      return {
        ...state,
        cues: state.cues.map((c) => (c.id === before.id ? after : c)),
        status: "draft",
        lastRejection: null,
        logs: [
          ...state.logs,
          log(
            "update",
            `调整 ${after.model}：${changes.join("；") || "无变更"}`,
            after.id
          ),
        ],
      };
    }
    case "delete": {
      if (state.status === "locked") return state;
      const cue = action.cue;
      return {
        ...state,
        cues: state.cues.filter((c) => c.id !== cue.id),
        status: "draft",
        lastRejection: null,
        logs: [
          ...state.logs,
          log(
            "delete",
            `移除 ${cue.model}（原 ${cue.zone} 区 ${cue.igniteAt}s）`,
            cue.id
          ),
        ],
      };
    }
    case "submit": {
      if (state.status === "locked") return state;
      const conflicts = detectConflicts(state.cues);
      if (state.cues.length === 0) {
        return {
          ...state,
          status: "rejected",
          lastRejection: { at: Date.now(), conflicts: [] },
          logs: [
            ...state.logs,
            log("reject", "整批拒绝：批次为空，没有可发射的烟花"),
          ],
        };
      }
      if (conflicts.length > 0) {
        return {
          ...state,
          status: "rejected",
          lastRejection: { at: Date.now(), conflicts },
          logs: [
            ...state.logs,
            log(
              "reject",
              `整批拒绝：检出 ${conflicts.length} 项冲突（间隔 ${
                conflicts.filter((c) => c.kind === "interval").length
              } / 安全半径 ${
                conflicts.filter((c) => c.kind === "safety").length
              }）`
            ),
          ],
        };
      }
      return {
        ...state,
        status: "locked",
        submittedAt: Date.now(),
        lastRejection: null,
        logs: [
          ...state.logs,
          log(
            "submit",
            `提交并锁定发射批次：共 ${state.cues.length} 枚，按点火秒排序，无冲突`
          ),
        ],
      };
    }
    case "withdraw": {
      if (state.status !== "locked") return state;
      return {
        ...state,
        status: "draft",
        submittedAt: null,
        logs: [
          ...state.logs,
          log(
            "withdraw",
            `撤回已提交批次：保留全部 ${state.cues.length} 枚烟花的分配与调整记录，恢复可编辑`
          ),
        ],
      };
    }
    case "reset":
      return seedState();
    default:
      return state;
  }
}
