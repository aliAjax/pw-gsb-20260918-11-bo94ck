import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";
import {
  BatchState,
  CATEGORIES,
  Cue,
  LogEntry,
  PLAN_H,
  PLAN_W,
  ZoneId,
  ZONES,
  seedState,
} from "./types";
import {
  MIN_INTERVAL,
  conflictedCueIds,
  cueLabel,
  detectConflicts,
  fmtClock,
  fmtTime,
  minPointDistance,
  sortCues,
  zoneGapBefore,
} from "./lib";

const STORAGE_KEY = "hxyfront-62008:batch:v1";

const project = {
  id: "hxyfront-62008",
  sourceNo: 10,
  port: 62008,
  title: "烟花燃放脚本编排 · 发射批次台",
};

interface FormState {
  segment: string;
  model: string;
  category: string;
  caliber: string;
  angle: string;
  fireAt: string;
  duration: string;
  safetyRadius: string;
  musicAt: string;
  zone: ZoneId;
  x: string;
  y: string;
}

const emptyForm: FormState = {
  segment: "",
  model: "",
  category: CATEGORIES[0],
  caliber: "50",
  angle: "90",
  fireAt: "",
  duration: "3",
  safetyRadius: "24",
  musicAt: "",
  zone: "A",
  x: "",
  y: "",
};

const FIELD_LABELS: { key: keyof Cue; label: string; unit?: string }[] = [
  { key: "segment", label: "段落" },
  { key: "model", label: "型号" },
  { key: "category", label: "类别" },
  { key: "caliber", label: "口径", unit: "mm" },
  { key: "angle", label: "角度", unit: "°" },
  { key: "fireAt", label: "点火", unit: "s" },
  { key: "duration", label: "持续", unit: "s" },
  { key: "safetyRadius", label: "安全半径", unit: "m" },
  { key: "musicAt", label: "音乐点", unit: "s" },
  { key: "zone", label: "分区" },
];

let logSeq = 0;
function makeLog(action: string, detail: string): LogEntry {
  return { id: `l${Date.now()}-${logSeq++}`, at: Date.now(), action, detail };
}

function loadState(): BatchState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw) as BatchState;
    if (!Array.isArray(parsed.cues) || !Array.isArray(parsed.log)) return seedState();
    return { ...seedState(), ...parsed };
  } catch {
    return seedState();
  }
}

function num(value: string, fallback: number): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function diffCue(a: Cue, b: Cue): string {
  const parts: string[] = [];
  for (const f of FIELD_LABELS) {
    const va = a[f.key];
    const vb = b[f.key];
    if (va !== vb) parts.push(`${f.label} ${va}${f.unit ?? ""}→${vb}${f.unit ?? ""}`);
  }
  if (a.x !== b.x || a.y !== b.y) parts.push(`点位 (${a.x},${a.y})→(${b.x},${b.y})`);
  return parts.join("；");
}

function zoneColor(zoneId: ZoneId): string {
  return ZONES.find((z) => z.id === zoneId)?.color ?? "#64748b";
}

function App() {
  const [state, setState] = useState<BatchState>(loadState);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("全部");
  const formRef = useRef<HTMLElement>(null);

  // 刷新页面后继续：每次状态变化都落盘
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* 存储不可用时忽略 */
    }
  }, [state]);

  const locked = state.status === "locked";
  const sorted = useMemo(() => sortCues(state.cues), [state.cues]);
  const conflicts = useMemo(() => detectConflicts(state.cues), [state.cues]);
  const conflictIds = useMemo(() => conflictedCueIds(conflicts), [conflicts]);
  const orderOf = useMemo(() => {
    const map = new Map<string, number>();
    sorted.forEach((cue, i) => map.set(cue.id, i + 1));
    return map;
  }, [sorted]);

  const segments = useMemo(() => {
    const map = new Map<string, { name: string; count: number; start: number; end: number }>();
    for (const cue of sorted) {
      const end = cue.fireAt + cue.duration;
      const seg = map.get(cue.segment);
      if (seg) {
        seg.count += 1;
        seg.start = Math.min(seg.start, cue.fireAt);
        seg.end = Math.max(seg.end, end);
      } else {
        map.set(cue.segment, { name: cue.segment, count: 1, start: cue.fireAt, end });
      }
    }
    return [...map.values()];
  }, [sorted]);

  const modelRows = useMemo(() => {
    const map = new Map<string, { model: string; category: string; caliber: number; count: number; maxRadius: number; firstAt: number }>();
    for (const cue of sorted) {
      const row = map.get(cue.model);
      if (row) {
        row.count += 1;
        row.maxRadius = Math.max(row.maxRadius, cue.safetyRadius);
        row.firstAt = Math.min(row.firstAt, cue.fireAt);
      } else {
        map.set(cue.model, {
          model: cue.model,
          category: cue.category,
          caliber: cue.caliber,
          count: 1,
          maxRadius: cue.safetyRadius,
          firstAt: cue.fireAt,
        });
      }
    }
    return [...map.values()];
  }, [sorted]);

  const minDist = useMemo(() => minPointDistance(state.cues), [state.cues]);
  const totalEnd = sorted.length ? Math.max(...sorted.map((c) => c.fireAt + c.duration)) : 0;
  const visibleCues = filter === "全部" ? sorted : sorted.filter((c) => c.category === filter);

  function patchForm(patch: Partial<FormState>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  function editCue(cue: Cue) {
    if (locked) return;
    setEditingId(cue.id);
    setForm({
      segment: cue.segment,
      model: cue.model,
      category: cue.category,
      caliber: String(cue.caliber),
      angle: String(cue.angle),
      fireAt: String(cue.fireAt),
      duration: String(cue.duration),
      safetyRadius: String(cue.safetyRadius),
      musicAt: String(cue.musicAt),
      zone: cue.zone,
      x: String(cue.x),
      y: String(cue.y),
    });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function saveCue(e: FormEvent) {
    e.preventDefault();
    if (locked) return;
    const parsed = {
      segment: form.segment.trim() || "未命名段落",
      model: form.model.trim() || "未命名型号",
      category: form.category,
      caliber: num(form.caliber, 0),
      angle: num(form.angle, 0),
      fireAt: num(form.fireAt, 0),
      duration: num(form.duration, 0),
      safetyRadius: num(form.safetyRadius, 0),
      musicAt: num(form.musicAt, 0),
      zone: form.zone,
      x: Math.round(clamp(num(form.x, 0), 0, PLAN_W) * 10) / 10,
      y: Math.round(clamp(num(form.y, 0), 0, PLAN_H) * 10) / 10,
    };

    if (editingId) {
      const old = state.cues.find((c) => c.id === editingId);
      if (!old) return;
      const next: Cue = { ...old, ...parsed };
      const diffs = diffCue(old, next);
      setState((s) => ({
        ...s,
        cues: s.cues.map((c) => (c.id === editingId ? next : c)),
        log: [makeLog("调整", `${cueLabel(old)}：${diffs || "字段无变化"}`), ...s.log],
      }));
      setEditingId(null);
    } else {
      const cue: Cue = { id: `c${state.nextSeq}`, seq: state.nextSeq, ...parsed };
      setState((s) => ({
        ...s,
        cues: [...s.cues, cue],
        nextSeq: s.nextSeq + 1,
        log: [
          makeLog("新增分配", `${cueLabel(cue)} → ${cue.zone}区 (${cue.x}, ${cue.y})，点火 ${fmtTime(cue.fireAt)}`),
          ...s.log,
        ],
      }));
    }
    setForm(emptyForm);
  }

  function deleteCue(id: string) {
    if (locked) return;
    const cue = state.cues.find((c) => c.id === id);
    if (!cue) return;
    setState((s) => ({
      ...s,
      cues: s.cues.filter((c) => c.id !== id),
      log: [makeLog("删除", `${cueLabel(cue)}（${cue.segment} / ${cue.zone}区）已移出批次`), ...s.log],
    }));
    if (editingId === id) {
      setEditingId(null);
      setForm(emptyForm);
    }
  }

  function submitBatch() {
    if (locked || state.cues.length === 0) return;
    const result = detectConflicts(state.cues);
    const now = Date.now();
    if (result.length > 0) {
      const iv = result.filter((c) => c.type === "interval").length;
      const rd = result.length - iv;
      setState((s) => ({
        ...s,
        rejectedAt: now,
        rejectedCount: result.length,
        log: [
          makeLog("整批拒绝", `提交被拒：${result.length} 处冲突（间隔不足 ${iv} 处、安全半径 ${rd} 处），冲突项已标出`),
          ...s.log,
        ],
      }));
    } else {
      const count = state.cues.length;
      setState((s) => ({
        ...s,
        status: "locked",
        submittedAt: now,
        rejectedAt: null,
        rejectedCount: 0,
        log: [makeLog("提交锁定", `批次已提交：${count} 枚按点火秒排序锁定，未检出冲突`), ...s.log],
      }));
    }
  }

  function withdrawBatch() {
    if (!locked) return;
    setState((s) => ({
      ...s,
      status: "draft",
      log: [
        makeLog("撤回批次", `批次已解锁：保留全部 ${s.cues.length} 枚分配与 ${s.log.length} 条调整记录`),
        ...s.log,
      ],
    }));
  }

  function resetAll() {
    if (!window.confirm("恢复示例数据？当前批次与全部记录将被清空。")) return;
    setState(seedState());
    setEditingId(null);
    setForm(emptyForm);
  }

  function planClick(e: React.MouseEvent<SVGSVGElement>) {
    if (locked) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * PLAN_W;
    const y = ((e.clientY - rect.top) / rect.height) * PLAN_H;
    const zone = ZONES.find(
      (z) => x >= z.rect.x && x <= z.rect.x + z.rect.w && y >= z.rect.y && y <= z.rect.y + z.rect.h
    );
    patchForm({
      x: x.toFixed(1),
      y: y.toFixed(1),
      ...(zone ? { zone: zone.id } : {}),
    });
  }

  const gridLines: React.ReactNode[] = [];
  for (let gx = 0; gx <= PLAN_W; gx += 20) {
    gridLines.push(<line key={`v${gx}`} x1={gx} y1={0} x2={gx} y2={PLAN_H} className="grid-line" />);
  }
  for (let gy = 0; gy <= PLAN_H; gy += 15) {
    gridLines.push(<line key={`h${gy}`} x1={0} y1={gy} x2={PLAN_W} y2={gy} className="grid-line" />);
  }

  return (
    <main className="app">
      <section className="hero">
        <p>
          {project.id} · 源提示词{project.sourceNo} · Port {project.port}
        </p>
        <h1>{project.title}</h1>
        <span>
          记录节目段落、烟花型号、口径、发射角度、点火时间、持续时间、安全距离与音乐时间点，在时间轴与点位平面图上完成分配。
          同一分区相邻两枚间隔不足 {MIN_INTERVAL} 秒，或发射点落入他人安全半径时，整批拒绝并标出冲突项；提交后锁定，撤回保留全部分配与调整记录。
        </span>
      </section>

      <section className="metrics">
        <article>
          <small>节目段落</small>
          <strong>{segments.length}</strong>
        </article>
        <article>
          <small>点火节点</small>
          <strong>{state.cues.length}</strong>
        </article>
        <article className={conflicts.length > 0 ? "metric-bad" : ""}>
          <small>冲突提示</small>
          <strong>{conflicts.length}</strong>
        </article>
        <article>
          <small>最小点位间距</small>
          <strong>{minDist === null ? "—" : `${minDist.toFixed(1)}m`}</strong>
        </article>
      </section>

      <section className="panel batch-bar">
        <div className="batch-info">
          <span className={`badge ${locked ? "is-locked" : state.rejectedAt ? "is-rejected" : "is-draft"}`}>
            {locked ? "已提交 · 锁定中" : state.rejectedAt ? "草稿 · 上次提交被拒" : "草稿 · 可提交"}
          </span>
          <div>
            <h2>发射批次</h2>
            <p>
              {locked
                ? `提交于 ${fmtClock(state.submittedAt ?? 0)}，编排已锁定，撤回后可继续调整。`
                : `共 ${state.cues.length} 枚，按点火秒升序（同秒保持录入顺序），提交前自动做冲突校验。`}
            </p>
          </div>
        </div>
        <div className="batch-actions">
          {locked ? (
            <button className="danger" onClick={withdrawBatch}>
              撤回批次
            </button>
          ) : (
            <button className="primary" onClick={submitBatch} disabled={state.cues.length === 0}>
              提交发射批次
            </button>
          )}
        </div>
      </section>

      {!locked && state.rejectedAt && (
        <div className="alert">
          上次提交于 {fmtClock(state.rejectedAt)} 被整批拒绝（{state.rejectedCount} 处冲突），冲突项已在时间轴与平面图中标红。
          {conflicts.length === 0 ? "当前冲突已消除，可重新提交。" : `当前仍有 ${conflicts.length} 处冲突待处理。`}
        </div>
      )}
      {locked && (
        <div className="alert ok">
          批次已提交并锁定，表单与点位不可修改；撤回批次将保留全部分配与调整记录。
        </div>
      )}

      <section className="workspace">
        <aside className="panel">
          <h2>型号筛选</h2>
          <div className="chips">
            {["全部", ...CATEGORIES].map((item) => (
              <button
                key={item}
                className={filter === item ? "chip-active" : ""}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <h2 className="mt">冲突提示</h2>
          {conflicts.length === 0 ? (
            <p className="ok-text">
              未发现冲突：同区相邻间隔均 ≥ {MIN_INTERVAL}s，发射点均在彼此安全半径之外。
            </p>
          ) : (
            <ul className="conflict-list">
              {conflicts.map((c) => (
                <li key={c.id}>
                  <b>{c.type === "interval" ? "间隔不足" : "安全半径"}</b>
                  <span>{c.message}</span>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="panel form-panel" ref={formRef}>
          <div className="heading">
            <div>
              <p>{editingId ? "调整记录" : "新增记录"}</p>
              <h2>{editingId ? `编辑 ${cueLabel(state.cues.find((c) => c.id === editingId)!)}` : "编排一枚烟花"}</h2>
            </div>
            {locked && <span className="badge is-locked">已锁定</span>}
          </div>
          <form onSubmit={saveCue}>
            <fieldset disabled={locked}>
              <div className="field-grid">
                <label>
                  <span>节目段落</span>
                  <input
                    value={form.segment}
                    onChange={(e) => patchForm({ segment: e.target.value })}
                    placeholder="如 Chorus A"
                    list="segment-list"
                    required
                  />
                  <datalist id="segment-list">
                    {segments.map((s) => (
                      <option key={s.name} value={s.name} />
                    ))}
                  </datalist>
                </label>
                <label>
                  <span>烟花型号</span>
                  <input
                    value={form.model}
                    onChange={(e) => patchForm({ model: e.target.value })}
                    placeholder="如 75mm礼花弹"
                    list="model-list"
                    required
                  />
                  <datalist id="model-list">
                    {modelRows.map((m) => (
                      <option key={m.model} value={m.model} />
                    ))}
                  </datalist>
                </label>
                <label>
                  <span>类别</span>
                  <select value={form.category} onChange={(e) => patchForm({ category: e.target.value })}>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>口径 (mm)</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.caliber}
                    onChange={(e) => patchForm({ caliber: e.target.value })}
                    required
                  />
                </label>
                <label>
                  <span>发射角度 (°)</span>
                  <input
                    type="number"
                    step="1"
                    value={form.angle}
                    onChange={(e) => patchForm({ angle: e.target.value })}
                    required
                  />
                </label>
                <label>
                  <span>点火时间 (s)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.fireAt}
                    onChange={(e) => patchForm({ fireAt: e.target.value })}
                    placeholder="如 68.2"
                    required
                  />
                </label>
                <label>
                  <span>持续时间 (s)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.duration}
                    onChange={(e) => patchForm({ duration: e.target.value })}
                    required
                  />
                </label>
                <label>
                  <span>安全距离 (m)</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.safetyRadius}
                    onChange={(e) => patchForm({ safetyRadius: e.target.value })}
                    required
                  />
                </label>
                <label>
                  <span>音乐时间点 (s)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.musicAt}
                    onChange={(e) => patchForm({ musicAt: e.target.value })}
                    placeholder="如 68.0"
                    required
                  />
                </label>
                <label>
                  <span>场地分区</span>
                  <select value={form.zone} onChange={(e) => patchForm({ zone: e.target.value as ZoneId })}>
                    {ZONES.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>发射点 X (m)</span>
                  <input
                    type="number"
                    min="0"
                    max={PLAN_W}
                    step="0.1"
                    value={form.x}
                    onChange={(e) => patchForm({ x: e.target.value })}
                    placeholder="点击平面图拾取"
                    required
                  />
                </label>
                <label>
                  <span>发射点 Y (m)</span>
                  <input
                    type="number"
                    min="0"
                    max={PLAN_H}
                    step="0.1"
                    value={form.y}
                    onChange={(e) => patchForm({ y: e.target.value })}
                    placeholder="点击平面图拾取"
                    required
                  />
                </label>
              </div>
              <div className="form-actions">
                <button type="submit" className="primary">
                  {editingId ? "保存调整" : "加入批次"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setForm(emptyForm);
                    }}
                  >
                    取消编辑
                  </button>
                )}
              </div>
            </fieldset>
            {locked && <p className="lock-note">批次已锁定，撤回后才能继续编排。</p>}
          </form>
        </section>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>时间轴编排</p>
            <h2>点火序列（按点火秒排序，同秒保持录入顺序）</h2>
          </div>
          <span className="note">
            同区相邻间隔 ≥ {MIN_INTERVAL}s · 共 {visibleCues.length} 枚
          </span>
        </div>
        <div className="timeline">
          {visibleCues.length === 0 && <p className="empty">该筛选下暂无烟花，先在上方表单加入批次。</p>}
          {visibleCues.map((cue) => {
            const globalIndex = sorted.findIndex((c) => c.id === cue.id);
            const gap = zoneGapBefore(sorted, globalIndex);
            const isConflict = conflictIds.has(cue.id);
            return (
              <article key={cue.id} className={`cue-row ${isConflict ? "is-conflict" : ""}`}>
                <b className="order">{String(orderOf.get(cue.id) ?? 0).padStart(2, "0")}</b>
                <div className="cue-time">
                  <strong>{fmtTime(cue.fireAt)}</strong>
                  <small>
                    {cue.fireAt.toFixed(1)}s · 持续{cue.duration}s
                  </small>
                </div>
                <div className="cue-main">
                  <h3>
                    {cue.segment} · {cue.model}
                    <em>编号#{cue.seq}</em>
                  </h3>
                  <p>
                    {cue.category} · 口径{cue.caliber}mm · 角度{cue.angle}° · {cue.zone}区 ({cue.x}, {cue.y}) ·
                    安全半径{cue.safetyRadius}m · 音乐 {fmtTime(cue.musicAt)}
                  </p>
                </div>
                <div className="cue-side">
                  {gap !== null && (
                    <span className={`gap ${gap < MIN_INTERVAL ? "bad" : ""}`}>同区间隔 {gap.toFixed(1)}s</span>
                  )}
                  {isConflict && <span className="tag-conflict">冲突</span>}
                </div>
                <div className="cue-actions">
                  <button onClick={() => editCue(cue)} disabled={locked}>
                    编辑
                  </button>
                  <button onClick={() => deleteCue(cue.id)} disabled={locked}>
                    删除
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="workspace workspace-plan">
        <section className="panel">
          <div className="heading">
            <div>
              <p>燃放点位平面图</p>
              <h2>场地 {PLAN_W}m × {PLAN_H}m（点击拾取发射点）</h2>
            </div>
            <div className="legend">
              {ZONES.map((z) => (
                <span key={z.id}>
                  <i style={{ background: z.color }} />
                  {z.id}区
                </span>
              ))}
              <span>
                <i style={{ background: "#dc2626" }} />
                冲突
              </span>
            </div>
          </div>
          <svg viewBox={`0 0 ${PLAN_W} ${PLAN_H}`} className="plan-svg" onClick={planClick}>
            {gridLines}
            {ZONES.map((z) => (
              <g key={z.id}>
                <rect
                  x={z.rect.x}
                  y={z.rect.y}
                  width={z.rect.w}
                  height={z.rect.h}
                  fill={z.color}
                  fillOpacity={0.07}
                  stroke={z.color}
                  strokeWidth={0.5}
                  strokeDasharray="2.5 2"
                />
                <text x={z.rect.x + 2} y={z.rect.y + 5.5} className="zone-label" fill={z.color}>
                  {z.name}
                </text>
              </g>
            ))}
            {sorted.map((cue) => {
              const isConflict = conflictIds.has(cue.id);
              const color = isConflict ? "#dc2626" : zoneColor(cue.zone);
              return (
                <g
                  key={cue.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    editCue(cue);
                  }}
                  style={{ cursor: locked ? "default" : "pointer" }}
                >
                  <circle
                    cx={cue.x}
                    cy={cue.y}
                    r={Math.max(cue.safetyRadius, 0.1)}
                    fill={color}
                    fillOpacity={isConflict ? 0.2 : 0.1}
                    stroke={color}
                    strokeWidth={isConflict ? 0.9 : 0.5}
                  />
                  <circle cx={cue.x} cy={cue.y} r={1.7} fill={color} stroke="#fff" strokeWidth={0.5} />
                  <text x={cue.x + 2.6} y={cue.y + 1.4} className="cue-label" fill={color}>
                    #{cue.seq}
                  </text>
                </g>
              );
            })}
          </svg>
          <p className="note">圆圈为该枚的安全半径；红色表示卷入冲突的发射点。点击圆点可载入编辑。</p>
        </section>

        <section className="panel">
          <div className="heading">
            <div>
              <p>整场节目预览</p>
              <h2>
                {sorted.length === 0
                  ? "暂无编排"
                  : `${fmtTime(sorted[0].fireAt)} 起 · 全程 ${fmtTime(totalEnd)}`}
              </h2>
            </div>
          </div>
          {sorted.length > 0 && (
            <>
              <div className="strip">
                {sorted.map((cue) => (
                  <span
                    key={cue.id}
                    className={`dot ${conflictIds.has(cue.id) ? "bad" : ""}`}
                    style={{
                      left: `${totalEnd > 0 ? (cue.fireAt / totalEnd) * 100 : 0}%`,
                      background: conflictIds.has(cue.id) ? "#dc2626" : zoneColor(cue.zone),
                    }}
                    title={`#${cue.seq} ${cue.model} @ ${fmtTime(cue.fireAt)}`}
                  />
                ))}
              </div>
              <div className="segments">
                {segments.map((seg) => (
                  <div className="seg" key={seg.name}>
                    <b>{seg.name}</b>
                    <span>
                      {seg.count} 枚 · {fmtTime(seg.start)} – {fmtTime(seg.end)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          <h2 className="mt">型号清单</h2>
          <table className="model-table">
            <thead>
              <tr>
                <th>型号</th>
                <th>类别</th>
                <th>口径</th>
                <th>数量</th>
                <th>最大安全半径</th>
                <th>首次点火</th>
              </tr>
            </thead>
            <tbody>
              {modelRows.map((row) => (
                <tr key={row.model}>
                  <td>{row.model}</td>
                  <td>{row.category}</td>
                  <td>{row.caliber}mm</td>
                  <td>{row.count}</td>
                  <td>{row.maxRadius}m</td>
                  <td>{fmtTime(row.firstAt)}</td>
                </tr>
              ))}
              {modelRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">
                    暂无型号
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>分配与调整记录</p>
            <h2>操作日志（撤回后完整保留，刷新不丢失）</h2>
          </div>
          <button onClick={resetAll}>恢复示例数据</button>
        </div>
        <div className="log-list">
          {state.log.map((entry) => (
            <article key={entry.id}>
              <span className={`log-action a-${entry.action}`}>{entry.action}</span>
              <div>
                <p>{entry.detail}</p>
                <small>{fmtClock(entry.at)}</small>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
