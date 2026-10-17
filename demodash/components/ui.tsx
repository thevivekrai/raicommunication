import Link from "next/link";
import { OUTCOME_LABEL, STATUS_LABEL } from "@/lib/format";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  ASSIGNED: "bg-sky-100 text-sky-800",
  OUT_FOR_DEMO: "bg-indigo-100 text-indigo-800",
  ARRIVED: "bg-violet-100 text-violet-800",
  DEMO_IN_PROGRESS: "bg-fuchsia-100 text-fuchsia-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-slate-200 text-slate-700",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`chip ${STATUS_STYLE[status] ?? "bg-slate-100 text-slate-700"}`}>{STATUS_LABEL[status] ?? status}</span>;
}

const OUTCOME_STYLE: Record<string, string> = {
  PURCHASED_OFFLINE: "bg-emerald-100 text-emerald-800",
  NOT_PURCHASED: "bg-rose-100 text-rose-800",
  CUSTOMER_UNAVAILABLE: "bg-slate-200 text-slate-700",
};

export function OutcomeBadge({ outcome }: { outcome?: string | null }) {
  if (!outcome) return <span className="text-slate-400">—</span>;
  return <span className={`chip ${OUTCOME_STYLE[outcome]}`}>{OUTCOME_LABEL[outcome]}</span>;
}

export function ProductImage({ src, alt, className = "" }: { src?: string | null; alt: string; className?: string }) {
  return src ? (
    <img src={src} alt={alt} loading="lazy" className={`object-cover ${className}`} />
  ) : (
    <div className={`flex items-center justify-center bg-brand-50 text-3xl ${className}`} aria-label={alt}>📱</div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <div className="text-4xl">🗂️</div>
      <p className="font-semibold text-slate-800">{title}</p>
      {hint && <p className="max-w-xs text-sm text-slate-500">{hint}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <p className="text-sm text-red-600">{message}</p>
      {onRetry && <button className="btn-secondary btn-sm" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>
      </span>
      <span className={light ? "text-white" : "text-slate-900"}>{process.env.NEXT_PUBLIC_APP_NAME || "DemoDash"}</span>
    </Link>
  );
}

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return (
    <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
      <span>
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <div className="flex gap-2">
        <button className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Prev</button>
        <button className="btn-secondary btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}

export function Field({ label, children, hint, error }: { label: string; children: React.ReactNode; hint?: string; error?: string | null }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}
