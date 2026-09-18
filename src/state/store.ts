import { useEffect, useMemo, useReducer } from "react";
import { STORAGE_KEY } from "../constants";
import type { AppState } from "../types";
import { detectConflicts } from "../utils/batch";
import { reducer, seedState } from "./reducer";

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (Array.isArray(parsed.cues) && parsed.status) return parsed;
    }
  } catch {
    /* 数据损坏时回退到示例 */
  }
  return seedState();
}

export function useBatchStore() {
  const [state, dispatch] = useReducer(
    (s: AppState, a: Parameters<typeof reducer>[1]) => reducer(s, a),
    undefined,
    loadState
  );

  // 刷新页面后继续：每次状态变化都持久化（锁定态、冲突快照、日志一并保存）
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const liveConflicts = useMemo(
    () => (state.status === "locked" ? [] : detectConflicts(state.cues)),
    [state.cues, state.status]
  );

  return { state, dispatch, liveConflicts };
}
