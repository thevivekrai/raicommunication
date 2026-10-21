import { db } from "@/lib/db";
import { ApiError, clientIp, handler } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { bookingInclude, publicBooking } from "@/lib/booking";

export const dynamic = "force-dynamic";

/** Customer tracking. `id` is the unguessable public booking code (e.g. DD-7K3M9PQ2). */
export const GET = handler<{ id: string }>(async (req, { params }) => {
  rateLimit(`track:${clientIp(req)}`, 120, 60 * 1000);
  const code = params.id.toUpperCase();
  const booking = await db.demoBooking.findUnique({ where: { code }, include: bookingInclude });
  if (!booking) throw new ApiError(404, "We couldn't find that booking. Check the ID and try again.");
  const history = await db.bookingStatusHistory.findMany({
    where: { bookingId: booking.id },
    orderBy: { timestamp: "asc" },
    select: { status: true, timestamp: true },
  });
  return { booking: publicBooking(booking, history) };
});
