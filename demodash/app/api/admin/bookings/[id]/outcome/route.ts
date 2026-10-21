import { db } from "@/lib/db";
import { ApiError, handler, parseBody } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { changeStatus, outcomeData } from "@/lib/booking";
import { outcomeInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const PATCH = handler<{ id: string }>(async (req, { params }) => {
  const admin = await requireRole("ADMIN");
  const input = await parseBody(req, outcomeInputSchema);
  const booking = await db.demoBooking.findUnique({ where: { id: params.id } });
  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.status === "CANCELLED") throw new ApiError(409, "This booking was cancelled");

  const label = input.outcome === "PURCHASED_OFFLINE" ? `Purchased (₹${input.saleAmount})` : input.outcome === "NOT_PURCHASED" ? "Not purchased" : "Customer unavailable";
  // Recording an outcome closes the booking.
  const updated = await changeStatus({
    bookingId: booking.id,
    status: "COMPLETED",
    actorUserId: admin.id,
    note: `Outcome: ${label}`,
    data: outcomeData(input),
  });
  return { booking: { id: updated.id, status: updated.status, outcome: updated.outcome } };
});
