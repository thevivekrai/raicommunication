import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, handler, parseBody } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { changeStatus } from "@/lib/booking";

export const dynamic = "force-dynamic";

export const PATCH = handler<{ id: string }>(async (req, { params }) => {
  const admin = await requireRole("ADMIN");
  const { deliveryPersonId } = await parseBody(req, z.object({ deliveryPersonId: z.string().min(1) }));

  const booking = await db.demoBooking.findUnique({ where: { id: params.id } });
  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.status === "COMPLETED" || booking.status === "CANCELLED") {
    throw new ApiError(409, "This booking is already closed");
  }
  if (booking.status === "ARRIVED" || booking.status === "DEMO_IN_PROGRESS") {
    throw new ApiError(409, "The demo is already under way — can't reassign now");
  }
  const dp = await db.deliveryPersonProfile.findFirst({ where: { id: deliveryPersonId, user: { isActive: true } } });
  if (!dp) throw new ApiError(404, "Delivery person not found or inactive");

  // Keep OUT_FOR_DEMO only if the same person is re-selected; a reassignment resets to ASSIGNED.
  const keepStatus = booking.status === "OUT_FOR_DEMO" && booking.assignedDeliveryPersonId === dp.id;
  const updated = await changeStatus({
    bookingId: booking.id,
    status: keepStatus ? "OUT_FOR_DEMO" : "ASSIGNED",
    actorUserId: admin.id,
    note: `Assigned to ${dp.name}`,
    data: { assignedDeliveryPerson: { connect: { id: dp.id } } },
  });
  return { booking: { id: updated.id, status: updated.status } };
});
