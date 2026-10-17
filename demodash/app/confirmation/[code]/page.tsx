import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { dateTime, inr } from "@/lib/format";
import { StatusBadge, ProductImage } from "@/components/ui";
import { CopyButton } from "@/components/customer/CopyButton";
import { RememberBooking } from "@/components/customer/RememberBooking";

export const dynamic = "force-dynamic";
export const metadata = { title: "Booking confirmed" };

export default async function Confirmation({ params }: { params: { code: string } }) {
  const b = await db.demoBooking.findUnique({ where: { code: params.code.toUpperCase() }, include: { product: true } });
  if (!b) notFound();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-8">
      <RememberBooking code={b.code} />
      <div className="card p-6 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-3xl">🎉</div>
        <h1 className="mt-4 text-2xl font-extrabold">Demo booked!</h1>
        <p className="mt-1 text-sm text-slate-600">We&apos;ll assign a delivery partner shortly and update you here.</p>

        <div className="mt-5 rounded-2xl bg-brand-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Booking ID</p>
          <p className="mt-1 font-mono text-2xl font-extrabold tracking-wider text-brand-900">{b.code}</p>
          <div className="mt-2 flex justify-center"><CopyButton text={b.code} /></div>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-100 p-3 text-left">
          <ProductImage src={b.product.images[0]} alt={b.product.model} className="h-14 w-14 shrink-0 rounded-xl" />
          <div className="min-w-0">
            <p className="truncate font-bold">{b.product.brand} {b.product.model}</p>
            <p className="text-xs text-slate-500">{inr(b.product.price)} · {b.preferredTime ? dateTime(b.preferredTime) : "ASAP"}</p>
          </div>
          <div className="ml-auto"><StatusBadge status={b.status} /></div>
        </div>

        <Link href={`/track/${b.code}`} className="btn-primary mt-5 w-full py-3.5 text-base">Track my demo</Link>
        <Link href="/" className="btn-ghost mt-2 w-full">Back to phones</Link>
      </div>
      <p className="mt-4 text-center text-xs text-slate-500">Save your booking ID — you&apos;ll need it to track or ask us about this demo.</p>
    </main>
  );
}
