import { db } from "@/lib/db";
import { ApiError, handler } from "@/lib/api";
import { publicProduct } from "@/lib/products";

export const dynamic = "force-dynamic";

export const GET = handler<{ id: string }>(async (_req, { params }) => {
  const p = await db.mobileProduct.findFirst({ where: { id: params.id, isActive: true } });
  if (!p) throw new ApiError(404, "Product not found");
  return { product: publicProduct(p) };
});
