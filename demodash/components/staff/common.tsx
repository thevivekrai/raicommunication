"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { dateTime, inr, preferredLabel } from "@/lib/format";
import { OutcomeBadge, StatusBadge } from "@/components/ui";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-extrabold">{title}</h1>{subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}</div>
      {actions}
    </div>
  );
}

export function StatCard({ label, value, hint, tone = "default" }: { label: string; value: ReactNode; hint?: string; tone?: "default" | "good" | "warn" }) {
  const color = tone === "good" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : "text-slate-900";
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${color}`}>{value}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export interface BookingRow {
  id: string; code: string; createdAt: string; status: string; outcome: string | null; saleAmount: number | null; outcomeNotes: string | null; notes: string | null;
  preferredTime: string | null; address: string; lat: number | null; lng: number | null;
  customer: { name: string; phone: string; email: string | null };
  product: { id: string; brand: string; model: string; color: string; ramStorage: string; price: number; image: string | null };
  deliveryPerson: { id: string; name: string; phone: string } | null;
}

/** Responsive table: real table on md+, stacked cards on phones. */
export function BookingsTable({ rows, showProduct = true, showAddress = false }: { rows: BookingRow[]; showProduct?: boolean; showAddress?: boolean }) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full">
          <thead className="border-b border-slate-100"><tr>
            <th className="th">Booking</th><th className="th">Customer</th>{showProduct && <th className="th">Product</th>}{showAddress && <th className="th">Address</th>}
            <th className="th">Preferred</th><th className="th">Status</th><th className="th">Delivery</th><th className="th">Outcome</th><th className="th text-right">Sale</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50">
                <td className="td"><Link href={`/admin/bookings/${b.id}`} className="font-mono text-xs font-bold text-brand-700 hover:underline">{b.code}</Link><div className="text-xs text-slate-500">{dateTime(b.createdAt)}</div></td>
                <td className="td"><div className="font-semibold">{b.customer.name}</div><a href={`tel:${b.customer.phone}`} className="text-xs text-slate-500">{b.customer.phone}</a></td>
                {showProduct && <td className="td">{b.product.brand} {b.product.model}<div className="text-xs text-slate-500">{b.product.ramStorage} · {b.product.color}</div></td>}
                {showAddress && <td className="td max-w-[16rem]"><span className="line-clamp-2">{b.address}</span></td>}
                <td className="td whitespace-nowrap">{preferredLabel(b.preferredTime)}</td>
                <td className="td"><StatusBadge status={b.status} /></td>
                <td className="td">{b.deliveryPerson?.name ?? <span className="text-slate-400">Unassigned</span>}</td>
                <td className="td"><OutcomeBadge outcome={b.outcome} />{b.outcomeNotes && <div className="mt-0.5 max-w-[12rem] truncate text-xs text-slate-500" title={b.outcomeNotes}>{b.outcomeNotes}</div>}</td>
                <td className="td text-right font-semibold">{b.outcome === "PURCHASED_OFFLINE" ? inr(b.saleAmount) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-slate-100 md:hidden">
        {rows.map((b) => (
          <li key={b.id}>
            <Link href={`/admin/bookings/${b.id}`} className="block space-y-1 p-4">
              <div className="flex items-center justify-between gap-2"><span className="font-mono text-xs font-bold text-brand-700">{b.code}</span><StatusBadge status={b.status} /></div>
              <p className="font-semibold">{b.customer.name} <span className="font-normal text-slate-500">· {b.customer.phone}</span></p>
              {showProduct && <p className="text-sm text-slate-700">{b.product.brand} {b.product.model}</p>}
              <p className="text-xs text-slate-500">{preferredLabel(b.preferredTime)} · {b.deliveryPerson?.name ?? "Unassigned"}</p>
              {b.outcome && <div className="flex items-center gap-2"><OutcomeBadge outcome={b.outcome} />{b.outcome === "PURCHASED_OFFLINE" && <span className="text-sm font-semibold">{inr(b.saleAmount)}</span>}</div>}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => <div key={i} className="skeleton h-10 w-full" />)}
    </div>
  );
}
