import Link from "next/link";
import type { PublicProduct } from "@/lib/products";
import { inr, priceSegment } from "@/lib/format";
import { ProductImage } from "@/components/ui";

export function ProductCard({ p }: { p: PublicProduct }) {
  return (
    <div className="card flex flex-col overflow-hidden">
      <Link href={`/product/${p.id}`} className="block">
        <div className="relative aspect-square bg-brand-50">
          <ProductImage src={p.images[0]} alt={p.name} className="h-full w-full" />
          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700">{priceSegment(p.price)}</span>
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <Link href={`/product/${p.id}`} className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-tight text-slate-900">{p.name}</Link>
        <p className="text-xs text-slate-500">{p.ramStorage} · {p.color}</p>
        <div className="mt-auto flex items-end justify-between pt-2">
          <span className="text-base font-extrabold">{inr(p.price)}</span>
        </div>
        {p.demoAvailable ? (
          <Link href={`/book/${p.id}`} className="btn-primary mt-1 w-full py-2.5">Book Free Demo</Link>
        ) : (
          <button disabled className="btn-secondary mt-1 w-full py-2.5">Demo unavailable</button>
        )}
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton aspect-square rounded-none" />
      <div className="space-y-2 p-3">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-1/2" />
        <div className="skeleton h-5 w-1/3" />
        <div className="skeleton h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}
