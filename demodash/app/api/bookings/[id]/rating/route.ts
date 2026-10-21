import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, clientIp, handler, parseBody } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(300).optional().nullable(),
});

export const POST = handler<{ id: string }>(async (req, { params }) => {
  rateLimit(`rate:${clientIp(req)}`, 20, 10 * 60 * 1000);
  const { rating, comment } = await parseBody(req, schema);
  const booking = await db.demoBooking.findUnique({ where: { code: params.id.toUpperCase() } });
  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.status !== "COMPLETED") throw new ApiError(409, "You can rate once the demo is completed");
  if (booking.rating != null) throw new ApiError(409, "Thanks — you have already rated this demo");
  await db.demoBooking.update({ where: { id: booking.id }, data: { rating, ratingComment: comment || null } });
  return { ok: true };
});
