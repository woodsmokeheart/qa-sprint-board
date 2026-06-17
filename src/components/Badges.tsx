import type { JiraStatus, Priority } from "@/data/sprint";
import { priorityMeta, statusMeta } from "@/lib/format";

export function StatusBadge({ status }: { status: JiraStatus }) {
  const m = statusMeta[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${m.chip}`}
      title="Статус из Jira (в проде — live)"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const m = priorityMeta[priority];
  if (!m) return null;
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${m.chip}`}
    >
      {m.label}
    </span>
  );
}

export function ProjectTag({ project }: { project: string }) {
  return (
    <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-400 ring-1 ring-inset ring-white/10">
      {project}
    </span>
  );
}
