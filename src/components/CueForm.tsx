import { useEffect, useState } from "react";
import { CUE_TYPES, SITE_DEPTH, SITE_WIDTH, ZONES } from "../constants";
import type { CueDraft } from "../state/reducer";
import type { Cue } from "../types";

interface Props {
  editing: Cue | null;
  locked: boolean;
  onAdd: (draft: CueDraft) => void;
  onUpdate: (id: string, before: Cue, after: CueDraft) => void;
  onCancelEdit: () => void;
}

const EMPTY: CueDraft = {
  segment: "Intro",
  model: "",
  caliber: 50,
  angle: 80,
  igniteAt: 0,
  duration: 5,
  safetyRadius: 20,
  musicPoint: "",
  zone: "A",
  x: 20,
  y: 30,
};

type Errors = Partial<Record<keyof CueDraft, string>>;

function validate(d: CueDraft): Errors {
  const e: Errors = {};
  if (!d.model.trim()) e.model = "请填写型号";
  if (!(d.caliber > 0)) e.caliber = "口径需大于 0";
  if (!(d.angle >= 0 && d.angle <= 180)) e.angle = "角度 0–180°";
  if (!(d.igniteAt >= 0)) e.igniteAt = "点火秒不能为负";
  if (!(d.duration > 0)) e.duration = "持续需大于 0";
  if (!(d.safetyRadius > 0)) e.safetyRadius = "安全半径需大于 0";
  if (!(d.x >= 0 && d.x <= SITE_WIDTH)) e.x = `X 需在 0–${SITE_WIDTH}m`;
  if (!(d.y >= 0 && d.y <= SITE_DEPTH)) e.y = `Y 需在 0–${SITE_DEPTH}m`;
  return e;
}

function CueForm({ editing, locked, onAdd, onUpdate, onCancelEdit }: Props) {
  const [draft, setDraft] = useState<CueDraft>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (editing) {
      const { id: _id, createdAt: _c, ...rest } = editing;
      setDraft(rest);
      setErrors({});
    }
  }, [editing]);

  const set = <K extends keyof CueDraft>(key: K, value: CueDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const submit = () => {
    const e = validate(draft);
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    if (editing) {
      onUpdate(editing.id, editing, { ...draft, model: draft.model.trim() });
    } else {
      onAdd({ ...draft, model: draft.model.trim() });
      setDraft({ ...EMPTY, segment: draft.segment, zone: draft.zone });
    }
  };

  const num = (
    label: string,
    key: keyof CueDraft,
    unit: string,
    step = 1
  ) => (
    <label className={errors[key] ? "invalid" : ""}>
      <span>
        {label}
        {unit ? <em>{unit}</em> : null}
      </span>
      <input
        type="number"
        step={step}
        disabled={locked}
        value={draft[key] as number}
        onChange={(ev) => set(key, Number(ev.target.value))}
      />
      {errors[key] ? <small className="err">{errors[key]}</small> : null}
    </label>
  );

  return (
    <section className="panel form-panel">
      <div className="heading">
        <div>
          <p>发射分配</p>
          <h2>{editing ? `调整 #${editing.id.slice(-4)}` : "新增烟花"}</h2>
        </div>
        {editing ? (
          <button onClick={onCancelEdit} disabled={locked}>
            取消调整
          </button>
        ) : null}
      </div>

      {locked ? (
        <p className="lock-note">
          🔒 批次已提交锁定，撤回后才能继续分配 / 调整。
        </p>
      ) : null}

      <div className="field-grid">
        <label>
          <span>节目段落</span>
          <input
            value={draft.segment}
            disabled={locked}
            placeholder="如 Chorus A"
            onChange={(ev) => set("segment", ev.target.value)}
          />
        </label>
        <label className={errors.model ? "invalid" : ""}>
          <span>
            烟花型号<em>必填</em>
          </span>
          <input
            list="model-suggestions"
            value={draft.model}
            disabled={locked}
            placeholder="如 75mm礼花弹"
            onChange={(ev) => set("model", ev.target.value)}
          />
          <datalist id="model-suggestions">
            {CUE_TYPES.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
          {errors.model ? <small className="err">{errors.model}</small> : null}
        </label>

        {num("口径", "caliber", "mm")}
        {num("发射角度", "angle", "°")}
        {num("点火秒", "igniteAt", "s（相对节目起点）", 0.1)}
        {num("持续时间", "duration", "s", 0.5)}
        {num("安全半径", "safetyRadius", "m", 0.5)}

        <label>
          <span>音乐时间点</span>
          <input
            value={draft.musicPoint}
            disabled={locked}
            placeholder="如 01:08.2 鼓点"
            onChange={(ev) => set("musicPoint", ev.target.value)}
          />
        </label>
        <label>
          <span>场地分区</span>
          <select
            value={draft.zone}
            disabled={locked}
            onChange={(ev) => set("zone", ev.target.value)}
          >
            {ZONES.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </label>
        {num("发射点 X", "x", "m", 0.5)}
        {num("发射点 Y", "y", "m", 0.5)}
      </div>

      <button className="primary wide" onClick={submit} disabled={locked}>
        {editing ? "保存调整并回到草稿" : "分配到批次"}
      </button>
    </section>
  );
}

export default CueForm;
