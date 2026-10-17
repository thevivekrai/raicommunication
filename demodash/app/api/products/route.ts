import { z } from "zod";
import { db } from "@/lib/db";
import { handler, parseQuery } from "@/lib/api";
import { publicProduct } from "@/lib/products";

export const dynamic = "force-dynamic";

const query = z.object({
  q: z.string().trim().max(60).optional(),
  brand: z.string().trim().max(40).optional(),
  segment: z.enum(["budget", "mid-range", "premium"]).optional(),
  min_price: z.coerce.number().int().min(0).optional(),
  max_price: z.coerce.number().int().min(0).optional(),
  category: z.string().trim().max(30).default("MOBILE"),
});

const SEGMENTS = { budget: { lt: 15000 }, "mid-range": { gte: 15000, lt: 40000 }, premium: { gte: 40000 } } as const;

export const GET = handler(async (req) => {
  const p = parseQuery(req, query);
  const price: { gte?: number; lt?: number; lte?: number } = {};
  if (p.segment) Object.assign(price, SEGMENTS[p.segment]);
  if (p.min_price != null) price.gte = Math.max(price.gte ?? 0, p.min_price);
  if (p.max_price != null) price.lte = p.max_price;

  const products = await db.mobileProduct.findMany({
    where: {
      isActive: true,
      category: p.category,
      ...(p.brand ? { brand: { equals: p.brand, mode: "insensitive" } } : {}),
      ...(Object.keys(price).length ? { price } : {}),
      ...(p.q
        ? { OR: [{ brand: { contains: p.q, mode: "insensitive" } }, { model: { contains: p.q, mode: "insensitive" } }, { color: { contains: p.q, mode: "insensitive" } }] }
        : {}),
    },
    orderBy: [{ demoAvailable: "desc" }, { createdAt: "desc" }],
  });
  return { products: products.map(publicProduct) };
});
