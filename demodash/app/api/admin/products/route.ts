import { db } from "@/lib/db";
import { handler, parseBody } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { productSchema } from "@/lib/validation";
import { publicProduct } from "@/lib/products";

export const dynamic = "force-dynamic";

/** Staff catalog list (includes archived products). */
export const GET = handler(async () => {
  await requireRole("ADMIN", "EMPLOYEE");
  const products = await db.mobileProduct.findMany({ orderBy: [{ isActive: "desc" }, { createdAt: "desc" }] });
  return { products: products.map((p) => ({ ...publicProduct(p), isActive: p.isActive, createdAt: p.createdAt })) };
});

export const POST = handler(async (req) => {
  const user = await requireRole("ADMIN", "EMPLOYEE");
  const input = await parseBody(req, productSchema);
  const product = await db.mobileProduct.create({ data: { ...input, createdByUserId: user.id } });
  return Response.json({ product: publicProduct(product) }, { status: 201 });
});
