import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { publicProduct } from "@/lib/products";
import { inr } from "@/lib/format";
import { Header } from "@/components/customer/Header";
import { ProductImage } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: { id: string } }) {
  const row = await db.mobileProduct.findFirst({ where: { id: params.id, isActive: true } });
  if (!row) notFound();
  const p = publicProduct(row);
  const specs = Object.entries(p.specs);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 pb-32 pt-4">
        <Link href="/" className="text-sm font-semibold text-brand-700">← All phones</Link>
        <div className="mt-3 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <div className="card overflow-hidden"><ProductImage src={p.images[0]} alt={p.name} className="aspect-square w-full" /></div>
            {p.images.length > 1 && (
              <div className="no-scrollbar flex gap-2 overflow-x-auto">
                {p.images.slice(1).map((src) => <ProductImage key={src} src={src} alt={p.name} className="h-20 w-20 shrink-0 rounded-xl" />)}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">{p.name}</h1>
            <p className="mt-1 text-sm text-slate-500">{p.ramStorage} · {p.color}</p>
            <p className="mt-3 text-3xl font-extrabold">{inr(p.price)}</p>
            {p.shortDescription && <p className="mt-3 text-slate-700">{p.shortDescription}</p>}

            <div className="card mt-4 bg-brand-50 p-4 text-sm text-brand-900 shadow-none">
              <p className="font-bold">How the free demo works</p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-5">
                <li>Book — takes under a minute</li>
                <li>Our delivery partner brings the phone to you</li>
                <li>Try it. Buy it on the spot, or just hand it back — no pressure</li>
              </ol>
            </div>

            {specs.length > 0 && (
              <dl className="card mt-4 divide-y divide-slate-100 text-sm">
                {specs.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 px-4 py-2.5"><dt className="text-slate-500">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>
                ))}
              </dl>
            )}
          </div>
        </div>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white p-3">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{p.name}</p><p className="text-sm text-slate-600">{inr(p.price)}</p></div>
          {p.demoAvailable ? <Link href={`/book/${p.id}`} className="btn-primary px-6 py-3">Book Free Demo</Link> : <button disabled className="btn-secondary px-6 py-3">Demo unavailable</button>}
        </div>
      </div>
    </>
  );
}
