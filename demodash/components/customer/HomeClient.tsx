"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useApi } from "@/lib/client";
import type { PublicProduct } from "@/lib/products";
import { priceSegment } from "@/lib/format";
import { EmptyState, ErrorState } from "@/components/ui";
import { BoltIcon, ClockIcon, ShieldIcon } from "@/components/Icons";
import { Header } from "./Header";
import { ProductCard, ProductCardSkeleton } from "./ProductCard";

const SEGMENTS = [
  { key: "Budget", label: "Budget", sub: "Under ₹15k", emoji: "💸" },
  { key: "Mid-range", label: "Mid-range", sub: "₹15k – ₹40k", emoji: "⚡" },
  { key: "Premium", label: "Premium", sub: "₹40k & above", emoji: "👑" },
] as const;

export function HomeClient({ shopName }: { shopName: string }) {
  const { data, error, loading, reload } = useApi<{ products: PublicProduct[] }>("/api/products");
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState<string | null>(null);
  const [brand, setBrand] = useState<string | null>(null);

  const products = useMemo(() => data?.products ?? [], [data]);
  const brands = useMemo(() => Array.from(new Set(products.map((p) => p.brand))).sort(), [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        (!segment || priceSegment(p.price) === segment) &&
        (!brand || p.brand === brand) &&
        (!q || `${p.brand} ${p.model} ${p.color} ${p.ramStorage} ${p.shortDescription ?? ""}`.toLowerCase().includes(q)),
    );
  }, [products, search, segment, brand]);

  return (
    <>
      <Header search={search} onSearch={setSearch} />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-4">
        {/* Hero banner */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-5 text-white shadow-card sm:p-8">
          <div className="max-w-md">
            <span className="chip bg-lime-400 text-brand-900">100% FREE · NO OBLIGATION</span>
            <h1 className="mt-3 text-2xl font-extrabold leading-tight sm:text-4xl">Get a free mobile demo at your doorstep in minutes</h1>
            <p className="mt-2 text-sm text-brand-100 sm:text-base">Pick a phone. We bring it home, you try it. Love it? Buy it right there.</p>
            <a href="#phones" className="btn mt-4 bg-white text-brand-700 hover:bg-brand-50">Browse phones</a>
          </div>
          <div aria-hidden className="pointer-events-none absolute -right-6 -top-6 text-[9rem] opacity-10 sm:right-8 sm:text-[12rem]">📱</div>
        </section>

        <ul className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] font-semibold text-slate-700 sm:text-sm">
          {[{ i: <BoltIcon />, t: "Quick delivery" }, { i: <ClockIcon />, t: "Book ASAP or schedule" }, { i: <ShieldIcon />, t: "Pay only if you buy" }].map((x) => (
            <li key={x.t} className="card flex flex-col items-center gap-1 px-2 py-3 text-brand-700">{x.i}<span className="text-slate-700">{x.t}</span></li>
          ))}
        </ul>

        {/* Categories */}
        <section className="mt-6" id="phones">
          <h2 className="mb-2 text-lg font-extrabold">Shop by budget</h2>
          <div className="grid grid-cols-3 gap-2">
            {SEGMENTS.map((s) => {
              const active = segment === s.key;
              return (
                <button key={s.key} onClick={() => setSegment(active ? null : s.key)} aria-pressed={active}
                  className={`card flex flex-col items-center gap-0.5 px-2 py-3 transition ${active ? "ring-2 ring-brand-600" : ""}`}>
                  <span className="text-2xl">{s.emoji}</span>
                  <span className="text-sm font-bold">{s.label}</span>
                  <span className="text-[11px] text-slate-500">{s.sub}</span>
                </button>
              );
            })}
          </div>

          <h2 className="mb-2 mt-5 text-lg font-extrabold">Brands</h2>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            <button onClick={() => setBrand(null)} className={`chip shrink-0 px-4 py-2 text-sm ${!brand ? "bg-brand-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}>All</button>
            {brands.map((b) => (
              <button key={b} onClick={() => setBrand(brand === b ? null : b)} className={`chip shrink-0 px-4 py-2 text-sm ${brand === b ? "bg-brand-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}>{b}</button>
            ))}
          </div>
        </section>

        {/* Grid */}
        <section className="mt-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-extrabold">{segment ?? "All"} phones {brand ? `· ${brand}` : ""}</h2>
            {!loading && <span className="text-xs text-slate-500">{filtered.length} available</span>}
          </div>
          {error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : loading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>
          ) : filtered.length === 0 ? (
            <EmptyState title="No phones match" hint="Try a different search or clear the filters." action={<button className="btn-secondary btn-sm" onClick={() => { setSearch(""); setSegment(null); setBrand(null); }}>Clear filters</button>} />
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{filtered.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          )}
        </section>

        <footer className="mt-10 text-center text-xs text-slate-500">
          <p>{shopName} · Free home demos · Payment is made directly to our delivery partner if you decide to buy.</p>
          <p className="mt-1"><Link href="/login" className="underline">Staff login</Link></p>
        </footer>
      </main>
    </>
  );
}
