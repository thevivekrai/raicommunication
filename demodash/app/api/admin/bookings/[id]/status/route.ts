import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, handler, parseBody } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { changeStatus } from "@/lib/booking";
import { statusEnum } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const PATCH = handler<{ id: string }>(async (req, { params }) => {
  const admin = await requireRole("ADMIN");
  const { status, note } = await parseBody(req, z.object({ status: statusEnum, note: z.string().trim().max(300).optional() }));

  const booking = await db.demoBooking.findUnique({ where: { id: params.id } });
  if (!booking) throw new ApiError(404, "Booking not found");
  if (status === booking.status) return { booking: { id: booking.id, status } };

  if (status !== "PENDING" && status !== "CANCELLED" && !booking.assignedDeliveryPersonId) {
    throw new ApiError(409, "Assign a delivery person first");
  }
  if (status === "COMPLETED" && !booking.outcome) {
    throw new ApiError(409, "Record the outcome (purchased / not purchased / unavailable) to complete this booking");
  }
  if (status === "PENDING" && booking.assignedDeliveryPersonId) {
    // Un-assign when pushed back to the queue.
    const updated = await changeStatus({
      bookingId: booking.id, status, actorUserId: admin.id, note: note ?? "Moved back to pending",
      data: { assignedDeliveryPerson: { disconnect: true }, otpVerifiedAt: null },
    });
    return { booking: { id: updated.id, status: updated.status } };
  }
  const updated = await changeStatus({ bookingId: booking.id, status, actorUserId: admin.id, note });
  return { booking: { id: updated.id, status: updated.status } };
});
