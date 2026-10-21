"use client";
import Link from "next/link";
import { api, useApi } from "@/lib/client";
import { inr } from "@/lib/format";
import { EmptyState, ErrorState, ProductImage } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { TableSkeleton } from "./common";
import type { PublicProduct } from "@/lib/products";

type Row = PublicProduct & { isActive: boolean };

export function ProductsAdmin({ isAdmin }: { isAdmin: boolean }) {
  const toast = useToast();
  const { data, error, loading, reload } = useApi<{ products: Row[] }>("/api/admin/products");

  async function toggleDemo(p: Row) {
    try { await api(`/api/admin/products/${p.id}`, { method: "PATCH", json: { demoAvailable: !p.demoAvailable } }); toast.success(`Demo ${p.demoAvailable ? "disabled" : "enabled"} for ${p.name}`); reload(); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function remove(p: Row) {
    if (!confirm(`Remove ${p.name}? If it already has bookings it will be archived instead of deleted.`)) return;
    try {
      const r = await api<{ archived?: boolean }>(`/api/admin/products/${p.id}`, { method: "DELETE" });
      toast.success(r.archived ? "Archived (has booking history)" : "Product deleted"); reload();
    } catch (e) { toast.error((e as Error).message); }
  }

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading && !data) return <div className="card"><TableSkeleton /></div>;
  if (!data?.products.length) return <div className="card"><EmptyState title="No products yet" action={<Link href="/admin/products/new" className="btn-primary">Add your first phone</Link>} /></div>;

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-100"><tr><th className="th">Product</th><th className="th">Variant</th><th className="th">Price</th><th className="th">Demo</th><th className="th" /></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {data.products.map((p) => (
              <tr key={p.id} className={p.isActive ? "" : "opacity-50"}>
                <td className="td"><div className="flex items-center gap-3"><ProductImage src={p.images[0]} alt={p.name} className="h-12 w-12 shrink-0 rounded-lg" /><div><p className="font-semibold">{p.name}</p>{!p.isActive && <span className="chip bg-slate-200 text-slate-600">Archived</span>}</div></div></td>
                <td className="td whitespace-nowrap">{p.ramStorage}<div className="text-xs text-slate-500">{p.color}</div></td>
                <td className="td whitespace-nowrap font-semibold">{inr(p.price)}</td>
                <td className="td">
                  <button role="switch" aria-checked={p.demoAvailable} disabled={!p.isActive} onClick={() => toggleDemo(p)} aria-label={`Demo available for ${p.name}`}
                    className={`relative h-6 w-11 rounded-full transition ${p.demoAvailable ? "bg-emerald-500" : "bg-slate-300"}`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${p.demoAvailable ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                </td>
                <td className="td whitespace-nowrap text-right">
                  <Link href={`/admin/products/${p.id}`} className="btn-secondary btn-sm">Edit</Link>
                  {isAdmin && p.isActive && <button onClick={() => remove(p)} className="btn-ghost btn-sm ml-1 text-red-600">Delete</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
