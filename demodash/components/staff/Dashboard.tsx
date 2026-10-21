"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useApi } from "@/lib/client";
import { inr, preferredLabel, dateTime } from "@/lib/format";
import { EmptyState, ErrorState, Skeleton, StatusBadge } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { PageHeader, StatCard, type BookingRow } from "./common";
import type { ProductAnalyticsRow } from "@/lib/analytics";

interface Summary {
  today: { bookings: number; purchases: number; revenue: number };
  allTime: { total_demos: number; completed_demos: number; purchases: number; conversion_rate: number };
  pending_demos: number;
  awaiting_assignment: number;
  top_products: ProductAnalyticsRow[];
}

export function Dashboard({ role, name }: { role: string; name: string }) {
  const toast = useToast();
  const summary = useApi<Summary>("/api/admin/analytics/summary", 15000);
  const open = useApi<{ bookings: BookingRow[]; total: number }>("/api/admin/bookings?open=1&page_size=12", 8000);

  // "Real-time" alert: poll every 8s and toast when a booking we haven't seen appears.
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    const rows = open.data?.bookings;
    if (!rows) return;
    if (seen.current) {
      const fresh = rows.filter((b) => !seen.current!.has(b.id) && b.status === "PENDING");
      if (fresh.length) {
        toast.info(`🔔 New demo booking: ${fresh[0].product.brand} ${fresh[0].product.model} for ${fresh[0].customer.name}`);
        try { new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=").play().catch(() => {}); } catch { /* ignore */ }
      }
    }
    seen.current = new Set(rows.map((b) => b.id));
  }, [open.data, toast]);

  const s = summary.data;
  const isAdmin = role === "ADMIN";

  return (
    <>
      <PageHeader title={`Hi, ${name.split(" ")[0]} 👋`} subtitle={isAdmin ? "Here's what's happening with demos today." : "Catalog and demo analytics at a glance."} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {!s ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />) : (
          <>
            <StatCard label="Bookings today" value={s.today.bookings} />
            <StatCard label="Purchases today" value={s.today.purchases} tone="good" hint={s.today.revenue ? inr(s.today.revenue) : undefined} />
            <StatCard label="Pending demos" value={s.pending_demos} tone={s.awaiting_assignment ? "warn" : "default"} hint={s.awaiting_assignment ? `${s.awaiting_assignment} need assignment` : "Not completed yet"} />
            <StatCard label="Conversion rate" value={`${s.allTime.conversion_rate}%`} hint={`${s.allTime.purchases} of ${s.allTime.completed_demos} demos`} />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <h2 className="font-bold">Open demo requests <span className="ml-1 text-xs font-normal text-slate-500">live · refreshes every 8s</span></h2>
            <Link href="/admin/bookings" className="text-sm font-semibold text-brand-700">View all</Link>
          </div>
          {open.error ? <ErrorState message={open.error} onRetry={open.reload} /> : !open.data ? (
            <div className="space-y-3 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : open.data.bookings.length === 0 ? (
            <EmptyState title="No open requests" hint="New demo bookings will show up here instantly." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {open.data.bookings.map((b) => (
                <li key={b.id}>
                  <Link href={`/admin/bookings/${b.id}`} className="flex items-center gap-3 p-4 hover:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{b.product.brand} {b.product.model} <span className="font-normal text-slate-500">· {b.customer.name}</span></p>
                      <p className="truncate text-xs text-slate-500">{b.code} · {preferredLabel(b.preferredTime)} · {dateTime(b.createdAt)}</p>
                      <p className="truncate text-xs text-slate-500">{b.address}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={b.status} />
                      <span className="text-xs text-slate-500">{b.deliveryPerson?.name ?? (isAdmin ? "Assign →" : "Unassigned")}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <h2 className="font-bold">Top 5 products</h2>
            <Link href="/admin/analytics" className="text-sm font-semibold text-brand-700">Analytics</Link>
          </div>
          {!s ? <div className="space-y-3 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div> : s.top_products.length === 0 ? (
            <EmptyState title="No bookings yet" />
          ) : (
            <ol className="divide-y divide-slate-100">
              {s.top_products.map((p, i) => (
                <li key={p.product_id}>
                  <Link href={`/admin/analytics/${p.product_id}`} className="flex items-center gap-3 p-4 hover:bg-slate-50">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">{i + 1}</span>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{p.product_name}</p><p className="text-xs text-slate-500">{p.purchases} purchased · {p.conversion_rate}% conv.</p></div>
                    <span className="text-sm font-bold">{p.total_demo_bookings}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}
