import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePageRole } from "@/lib/auth";
import { PageHeader } from "@/components/staff/common";
import { BookingsList } from "@/components/staff/BookingsList";
import { inr } from "@/lib/format";

export const metadata = { title: "Product bookings" };

export default async function ProductBookings({ params }: { params: { id: string } }) {
  await requirePageRole(["ADMIN", "EMPLOYEE"]);
  const p = await db.mobileProduct.findUnique({ where: { id: params.id } });
  if (!p) notFound();
  return (
    <>
      <Link href="/admin/analytics" className="text-sm font-semibold text-brand-700">← Demo analytics</Link>
      <div className="mt-1">
        <PageHeader title={`${p.brand} ${p.model}`} subtitle={`${p.ramStorage} · ${p.color} · ${inr(p.price)} — every customer who booked this phone`} />
      </div>
      <BookingsList endpoint={`/api/admin/analytics/products/${p.id}/bookings`} showProduct={false} />
    </>
  );
}
