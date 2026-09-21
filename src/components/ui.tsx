import type { ReactNode } from "react";

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    // generic positive
    ACTIVE: "bg-emerald-100 text-emerald-700",
    ACCEPTED: "bg-emerald-100 text-emerald-700",
    AVAILABLE: "bg-emerald-100 text-emerald-700",
    COMPLETED: "bg-emerald-100 text-emerald-700",
    CLOSED: "bg-slate-200 text-slate-600",
    CONFIRMED: "bg-emerald-100 text-emerald-700",
    READY: "bg-emerald-100 text-emerald-700",
    SHIPPED: "bg-blue-100 text-blue-700",
    // generic neutral / in-progress
    DRAFT: "bg-slate-100 text-slate-600",
    SUBMITTED: "bg-amber-100 text-amber-700",
    UNDER_REVIEW: "bg-amber-100 text-amber-700",
    UNDER_AE_REVIEW: "bg-amber-100 text-amber-700",
    PENDING_CONFIRMATION: "bg-amber-100 text-amber-700",
    PLANNED: "bg-amber-100 text-amber-700",
    SCHEDULED: "bg-amber-100 text-amber-700",
    IN_PRODUCTION: "bg-blue-100 text-blue-700",
    PENDING: "bg-amber-100 text-amber-700",
    PROCESSING: "bg-blue-100 text-blue-700",
    INCOMING: "bg-blue-100 text-blue-700",
    REQUESTED: "bg-amber-100 text-amber-700",
    REVISION_REQUESTED: "bg-amber-100 text-amber-700",
    // negative
    INACTIVE: "bg-slate-200 text-slate-500",
    REJECTED: "bg-red-100 text-red-700",
    INSUFFICIENT: "bg-red-100 text-red-700",
    CANCELLED: "bg-red-100 text-red-700",
  };
  const cls = map[status] ?? "bg-slate-100 text-slate-600";
  return <span className={`badge ${cls}`}>{status.replaceAll("_", " ")}</span>;
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="card flex items-center justify-center px-6 py-12 text-sm text-slate-400">
      {message}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtNum(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
