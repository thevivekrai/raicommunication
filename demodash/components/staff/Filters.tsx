"use client";
import { OUTCOME_LABEL, STATUS_LABEL } from "@/lib/format";

export interface BookingFilters { status: string; outcome: string; product_id: string; from: string; to: string; q: string }
export const EMPTY_FILTERS: BookingFilters = { status: "", outcome: "", product_id: "", from: "", to: "", q: "" };

export function FilterBar({
  value, onChange, products, showProduct = true, showSearch = true,
}: { value: BookingFilters; onChange: (v: BookingFilters) => void; products?: { id: string; name: string }[]; showProduct?: boolean; showSearch?: boolean }) {
  const set = (k: keyof BookingFilters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ ...value, [k]: e.target.value });
  const dirty = Object.values(value).some(Boolean);
  return (
    <div className="grid grid-cols-2 gap-2 border-b border-slate-100 p-4 md:grid-cols-3 xl:grid-cols-6">
      {showSearch && <input className="input col-span-2 md:col-span-1" placeholder="Search name, phone, ID…" value={value.q} onChange={set("q")} aria-label="Search" />}
      <select className="input" value={value.status} onChange={set("status")} aria-label="Status">
        <option value="">All statuses</option>
        {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <select className="input" value={value.outcome} onChange={set("outcome")} aria-label="Outcome">
        <option value="">All outcomes</option>
        {Object.entries(OUTCOME_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      {showProduct && (
        <select className="input" value={value.product_id} onChange={set("product_id")} aria-label="Product">
          <option value="">All products</option>
          {products?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
      <input className="input" type="date" value={value.from} onChange={set("from")} aria-label="From date" />
      <input className="input" type="date" value={value.to} onChange={set("to")} aria-label="To date" />
      {dirty && <button className="btn-ghost btn-sm col-span-2 md:col-span-1" onClick={() => onChange(EMPTY_FILTERS)}>Clear filters</button>}
    </div>
  );
}
