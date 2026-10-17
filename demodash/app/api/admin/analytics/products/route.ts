import { z } from "zod";
import { handler, parseQuery } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { productAnalytics } from "@/lib/analytics";
import { dateOnly } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = handler(async (req) => {
  await requireRole("ADMIN", "EMPLOYEE");
  const { from, to } = parseQuery(req, z.object({ from: dateOnly.optional(), to: dateOnly.optional() }));
  return { products: await productAnalytics(from, to) };
});
