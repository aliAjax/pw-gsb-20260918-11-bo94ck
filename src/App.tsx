import { useMemo, useState } from "react";
import "./styles.css";
import AuditLog from "./components/AuditLog";
import ConflictPanel from "./components/ConflictPanel";
import CueForm from "./components/CueForm";
import CueTable from "./components/CueTable";
import ModelInventory from "./components/ModelInventory";
import PlanView from "./components/PlanView";
import Timeline from "./components/Timeline";
import { MIN_INTERVAL, ZONES } from "./constants";
import type { CueDraft } from "./state/reducer";
import { useBatchStore } from "./state/store";
import type { Cue } from "./types";
import { sortedCues } from "./utils/batch";

const STATUS_TEXT = {
  draft: "草稿编排中",
  locked: "已提交锁定",
  rejected: "提交被拒绝",
} as const;

function App() {
  const { state, dispatch, liveConflicts } = useBatchStore();
  const [editing, setEditing] = useState<Cue | null>(null);

  const locked = state.status === "locked";
  const ordered = useMemo(() => sortedCues(state.cues), [state.cues]);

  const shownConflicts =
    state.status === "locked"
      ? []
      : state.status === "rejected" && state.lastRejection
      ? state.lastRejection.conflicts
      : liveConflicts;

  const flaggedIds = useMemo(() => {
    const s = new Set<string>();
    shownConflicts.forEach((c) => c.cueIds.forEach((id) => s.add(id)));
    return s;
  }, [shownConflicts]);

  const handleAdd = (draft: CueDraft) => dispatch({ type: "add", cue: draft });
  const handleUpdate = (id: string, before: Cue, after: CueDraft) => {
    dispatch({ type: "update", id, before, after });
    setEditing(null);
  };
  const handleDelete = (cue: Cue) => {
    if (window.confirm(`确认移除「${cue.model}」？该操作会记入调整记录。`)) {
      dispatch({ type: "delete", cue });
      if (editing?.id === cue.id) setEditing(null);
    }
  };
  const handleReset = () => {
    if (window.confirm("重置为示例编排？当前批次与记录将被覆盖（仅本机数据）。")) {
      dispatch({ type: "reset" });
      setEditing(null);
    }
  };

  return (
    <main className="app">
      <header className="hero">
        <div className="hero-top">
          <p>hxyfront-62008 · 烟花燃放脚本编排台</p>
          <span className={`status-badge badge-${state.status}`}>
            ● {STATUS_TEXT[state.status]}
          </span>
        </div>
        <h1>发射批次编排</h1>
        <span className="hero-desc">
          每枚烟花按点火秒排序（同秒保持原顺序）；同分区相邻点火间隔不足{" "}
          {MIN_INTERVAL}s 或发射点落入安全半径，整批拒绝并标出冲突项。
          提交后锁定编辑，撤回保留全部分配 / 调整记录，刷新页面后继续。
        </span>
        <div className="rule-chips">
          <span>规则 1 · 点火秒稳定排序</span>
          <span>规则 2 · 同分区相邻 ≥ {MIN_INTERVAL}s</span>
          <span>规则 3 · 发射点间距 ≥ 较大安全半径</span>
          <button className="reset-btn" onClick={handleReset}>
            重置示例数据
          </button>
        </div>
      </header>

      <section className="metrics">
        <article>
          <small>批次烟花</small>
          <strong>{state.cues.length}</strong>
        </article>
        <article>
          <small>使用分区</small>
          <strong>
            {new Set(state.cues.map((c) => c.zone)).size}/{ZONES.length}
          </strong>
        </article>
        <article
          className={shownConflicts.length > 0 ? "metric-alert" : ""}
        >
          <small>冲突项</small>
          <strong>{shownConflicts.length}</strong>
        </article>
        <article>
          <small>操作记录</small>
          <strong>{state.logs.length}</strong>
        </article>
      </section>

      <ConflictPanel
        status={state.status}
        conflicts={shownConflicts}
        rejectionAt={state.lastRejection?.at ?? null}
        submittedAt={state.submittedAt}
        cueCount={state.cues.length}
        onSubmit={() => dispatch({ type: "submit" })}
        onWithdraw={() => dispatch({ type: "withdraw" })}
      />

      <div className="grid-main">
        <CueForm
          editing={editing}
          locked={locked}
          onAdd={handleAdd}
          onUpdate={handleUpdate}
          onCancelEdit={() => setEditing(null)}
        />
        <Timeline cues={ordered} conflicts={shownConflicts} />
      </div>

      <PlanView
        cues={ordered}
        conflicts={shownConflicts}
        locked={locked}
      />

      <CueTable
        cues={ordered}
        conflicts={shownConflicts}
        locked={locked}
        editingId={editing?.id ?? null}
        onEdit={setEditing}
        onDelete={handleDelete}
      />

      <div className="grid-side">
        <ModelInventory cues={state.cues} />
        <AuditLog logs={state.logs} />
      </div>

      <footer className="foot">
        批次数据保存在本机浏览器（localStorage）：{flaggedIds.size}
        {"  "}枚烟花当前被冲突标记。刷新 / 重开页面后锁定状态与全部记录继续保留。
      </footer>
    </main>
  );
}

export default App;
