import { db } from "@/lib/db";
import { handler, parseQuery } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { bookingInclude, staffBookingRow } from "@/lib/booking";
import { bookingFilterSchema, bookingWhere } from "@/lib/filters";

export const dynamic = "force-dynamic";

export const GET = handler(async (req) => {
  await requireRole("ADMIN", "EMPLOYEE");
  const f = parseQuery(req, bookingFilterSchema);
  const where = bookingWhere(f);
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
  return { total, page: f.page, pageSize: f.page_size, bookings: rows.map(staffBookingRow) };
});
