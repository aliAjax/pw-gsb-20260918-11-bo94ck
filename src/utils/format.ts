/** 秒数 → mm:ss.mmm */
export function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "--:--.---";
  const total = Math.round(seconds * 1000);
  const m = Math.floor(total / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const ms = total % 1000;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(
    ms
  ).padStart(3, "0")}`;
}

/** mm:ss / mm:ss.mmm → 秒；无法解析返回 null */
export function parseClock(text: string): number | null {
  const m = /^(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?$/.exec(text.trim());
  if (!m) return null;
  const sec = Number(m[2]);
  if (sec > 59) return null;
  const frac = m[3] ? Number(m[3].padEnd(3, "0")) / 1000 : 0;
  return Number(m[1]) * 60 + sec + frac;
}

export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const p = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(
    d.getMinutes()
  )}:${p(d.getSeconds())}`;
}

let counter = 0;
export function uid(prefix = "id"): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}_${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}
