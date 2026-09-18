import type { LogKind, OperationLog } from "../types";
import { formatDateTime } from "../utils/format";

interface Props {
  logs: OperationLog[];
}

const KIND_LABEL: Record<LogKind, string> = {
  create: "分配",
  update: "调整",
  delete: "移除",
  submit: "提交锁定",
  reject: "整批拒绝",
  withdraw: "撤回",
  reset: "重置",
};

function AuditLog({ logs }: Props) {
  const recent = [...logs].reverse();
  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>整场节目审计</p>
          <h2>分配 / 调整 / 提交记录</h2>
        </div>
        <span className="muted">
          {logs.length} 条 · 撤回与刷新均不清除
        </span>
      </div>
      <ol className="audit">
        {recent.map((l) => (
          <li key={l.id} data-kind={l.kind}>
            <span className={`audit-tag kind-${l.kind}`}>
              {KIND_LABEL[l.kind]}
            </span>
            <span className="audit-detail">{l.detail}</span>
            <time>{formatDateTime(l.at)}</time>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default AuditLog;
