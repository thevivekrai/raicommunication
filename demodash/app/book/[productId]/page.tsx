import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { publicProduct } from "@/lib/products";
import { config } from "@/lib/config";
import { BookingForm } from "@/components/customer/BookingForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Book a free demo" };

export default async function BookPage({ params }: { params: { productId: string } }) {
  const row = await db.mobileProduct.findFirst({ where: { id: params.productId, isActive: true } });
  if (!row) notFound();
  return <BookingForm product={publicProduct(row)} requireOtp={config.requirePhoneOtp} />;
}
