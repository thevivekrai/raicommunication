import { db } from "@/lib/db";
import { ApiError, handler, parseBody } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { productSchema } from "@/lib/validation";
import { publicProduct } from "@/lib/products";

export const dynamic = "force-dynamic";

export const GET = handler<{ id: string }>(async (_req, { params }) => {
  await requireRole("ADMIN", "EMPLOYEE");
  const p = await db.mobileProduct.findUnique({ where: { id: params.id } });
  if (!p) throw new ApiError(404, "Product not found");
  return { product: { ...publicProduct(p), isActive: p.isActive } };
});

export const PATCH = handler<{ id: string }>(async (req, { params }) => {
  await requireRole("ADMIN", "EMPLOYEE");
  // Partial update: allow toggling single fields (e.g. demoAvailable) without re-sending everything.
  const input = await parseBody(req, productSchema.partial());
  const exists = await db.mobileProduct.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!exists) throw new ApiError(404, "Product not found");
  const p = await db.mobileProduct.update({ where: { id: params.id }, data: input });
  return { product: publicProduct(p) };
});

/** Admin only. Products that already have bookings are archived (hidden) so history/analytics stay intact. */
export const DELETE = handler<{ id: string }>(async (_req, { params }) => {
  await requireRole("ADMIN");
  const p = await db.mobileProduct.findUnique({ where: { id: params.id }, include: { _count: { select: { bookings: true } } } });
  if (!p) throw new ApiError(404, "Product not found");
  if (p._count.bookings > 0) {
    await db.mobileProduct.update({ where: { id: p.id }, data: { isActive: false, demoAvailable: false } });
    return { archived: true };
  }
  await db.mobileProduct.delete({ where: { id: p.id } });
  return { deleted: true };
});
