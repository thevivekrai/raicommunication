import { db } from "@/lib/db";
import { ApiError, handler, parseQuery } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { bookingInclude, staffBookingRow } from "@/lib/booking";
import { bookingFilterSchema, bookingWhere } from "@/lib/filters";

export const dynamic = "force-dynamic";

export const GET = handler<{ id: string }>(async (req, { params }) => {
  await requireRole("ADMIN", "EMPLOYEE");
  const product = await db.mobileProduct.findUnique({ where: { id: params.id } });
  if (!product) throw new ApiError(404, "Product not found");
  const f = parseQuery(req, bookingFilterSchema);
  const where = { ...bookingWhere({ ...f, product_id: undefined }), productId: product.id };
  const [total, rows] = await Promise.all([
    db.demoBooking.count({ where }),
    db.demoBooking.findMany({
      where,
      include: bookingInclude,
      orderBy: { createdAt: "desc" },
      skip: (f.page - 1) * f.page_size,
      take: f.page_size,
    }),
  ]);
  return {
    product: { id: product.id, name: `${product.brand} ${product.model}`, color: product.color, ramStorage: product.ramStorage, price: product.price },
    total,
    page: f.page,
    pageSize: f.page_size,
    bookings: rows.map(staffBookingRow),
  };
});
