"use client";
import Link from "next/link";
import { useApi } from "@/lib/client";
import { dateTime, inr, preferredLabel } from "@/lib/format";
import { EmptyState, ErrorState, OutcomeBadge, ProductImage, Skeleton, StatusBadge } from "@/components/ui";
import type { Assignment } from "./types";

export function Assignments() {
  const { data, error, loading, reload } = useApi<{ active: Assignment[]; recent: Assignment[] }>("/api/delivery/assignments", 10000);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading && !data) return <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-32" />)}</div>;

  return (
    <div className="space-y-6">
      <section>
        <h1 className="mb-2 text-lg font-extrabold">Assigned to you</h1>
        {data!.active.length === 0 ? (
          <div className="card"><EmptyState title="No active demos" hint="New assignments appear here automatically." /></div>
        ) : (
          <ul className="space-y-3">
            {data!.active.map((a) => (
              <li key={a.id}>
                <Link href={`/delivery/${a.id}`} className="card block space-y-2 p-4 active:scale-[.99]">
                  <div className="flex items-start gap-3">
                    <ProductImage src={a.product.image} alt={a.product.model} className="h-14 w-14 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{a.product.brand} {a.product.model}</p>
                      <p className="truncate text-sm text-slate-600">{a.customer.name}</p>
                      <p className="text-xs text-slate-500">{preferredLabel(a.preferredTime)}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="line-clamp-2 text-sm text-slate-700">📍 {a.address}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {data!.recent.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Recent</h2>
          <ul className="card divide-y divide-slate-100">
            {data!.recent.map((a) => (
              <li key={a.id}>
                <Link href={`/delivery/${a.id}`} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold">{a.product.brand} {a.product.model} · {a.customer.name}</p><p className="text-xs text-slate-500">{dateTime(a.createdAt)}</p></div>
                  <div className="flex flex-col items-end gap-1">{a.status === "CANCELLED" ? <StatusBadge status="CANCELLED" /> : <OutcomeBadge outcome={a.outcome} />}{a.outcome === "PURCHASED_OFFLINE" && <span className="text-xs font-semibold">{inr(a.saleAmount)}</span>}</div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
