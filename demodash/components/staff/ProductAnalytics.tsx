"use client";
import Link from "next/link";
import { useState } from "react";
import { qs, useApi } from "@/lib/client";
import { inr } from "@/lib/format";
import { EmptyState, ErrorState, ProductImage } from "@/components/ui";
import { StatCard, TableSkeleton } from "./common";
import type { ProductAnalyticsRow } from "@/lib/analytics";

export function ProductAnalytics() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data, error, loading, reload } = useApi<{ products: ProductAnalyticsRow[] }>(`/api/admin/analytics/products${qs({ from, to })}`, 30000);
  const rows = data?.products ?? [];

  const t = rows.reduce(
    (a, r) => ({ total: a.total + r.total_demo_bookings, completed: a.completed + r.completed_demos, purchases: a.purchases + r.purchases, pending: a.pending + r.pending, revenue: a.revenue + r.revenue }),
    { total: 0, completed: 0, purchases: 0, pending: 0, revenue: 0 },
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Total demos" value={t.total} />
        <StatCard label="Completed" value={t.completed} />
        <StatCard label="Purchases" value={t.purchases} tone="good" />
        <StatCard label="Conversion" value={`${t.completed ? Math.round((t.purchases / t.completed) * 1000) / 10 : 0}%`} />
        <StatCard label="Sales value" value={inr(t.revenue)} />
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-4">
          <div><label className="label" htmlFor="from">From</label><input id="from" type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><label className="label" htmlFor="to">To</label><input id="to" type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          {(from || to) && <button className="btn-ghost btn-sm mb-1" onClick={() => { setFrom(""); setTo(""); }}>Clear</button>}
          <p className="mb-2 ml-auto text-xs text-slate-500">Conversion = purchases ÷ completed demos. Pending = not completed yet.</p>
        </div>

        {error ? <ErrorState message={error} onRetry={reload} /> : loading && !data ? <TableSkeleton rows={8} /> : rows.length === 0 ? <EmptyState title="No products" /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-100"><tr>
                <th className="th">Product</th><th className="th text-right">Demo bookings</th><th className="th text-right">Completed</th><th className="th text-right">Purchases</th>
                <th className="th text-right">Not purchased</th><th className="th text-right">Conversion</th><th className="th text-right">Pending</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.product_id} className="hover:bg-slate-50">
                    <td className="td">
                      <Link href={`/admin/analytics/${r.product_id}`} className="flex items-center gap-3">
                        <ProductImage src={r.image} alt={r.product_name} className="h-10 w-10 shrink-0 rounded-lg" />
                        <span><span className="block font-semibold text-brand-700 hover:underline">{r.product_name}</span><span className="text-xs text-slate-500">{r.ram_storage} · {r.color}{r.is_active ? "" : " · archived"}</span></span>
                      </Link>
                    </td>
                    <td className="td text-right font-bold">{r.total_demo_bookings}</td>
                    <td className="td text-right">{r.completed_demos}</td>
                    <td className="td text-right font-semibold text-emerald-700">{r.purchases}</td>
                    <td className="td text-right">{r.not_purchased}</td>
                    <td className="td text-right"><span className="font-semibold">{r.conversion_rate}%</span></td>
                    <td className="td text-right">{r.pending ? <span className="chip bg-amber-100 text-amber-800">{r.pending}</span> : 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
