import { z } from "zod";
import { ApiError, handler, parseBody } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { assertDeliveryTransition, changeStatus, outcomeData } from "@/lib/booking";
import { getOwnAssignment } from "@/lib/delivery";
import { outcomeInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const schema = z.union([
  z.object({ status: z.enum(["OUT_FOR_DEMO", "ARRIVED", "DEMO_IN_PROGRESS"]) }),
  // Completing a booking always carries the final outcome.
  z.object({ status: z.literal("COMPLETED"), outcome: z.enum(["PURCHASED_OFFLINE", "NOT_PURCHASED", "CUSTOMER_UNAVAILABLE"]), saleAmount: z.coerce.number().optional().nullable(), notes: z.string().optional().nullable() }),
]);

export const PATCH = handler<{ id: string }>(async (req, { params }) => {
  const user = await requireRole("DELIVERY");
  const input = await parseBody(req, schema);
  const booking = await getOwnAssignment(params.id, user.id);

  if (input.status !== "COMPLETED") {
    assertDeliveryTransition(booking.status, input.status);
    if (input.status === "DEMO_IN_PROGRESS" && !booking.otpVerifiedAt) {
      throw new ApiError(409, "Enter the customer's OTP before starting the demo");
    }
    const updated = await changeStatus({ bookingId: booking.id, status: input.status, actorUserId: user.id });
    return { assignment: { id: updated.id, status: updated.status } };
  }

  const outcome = outcomeInputSchema.parse({ outcome: input.outcome, saleAmount: input.saleAmount, notes: input.notes });
  if (outcome.outcome === "CUSTOMER_UNAVAILABLE") {
    // Customer never showed up: allowed once on the way or arrived.
    if (booking.status !== "OUT_FOR_DEMO" && booking.status !== "ARRIVED") {
      throw new ApiError(409, "You can only mark 'customer unavailable' while on the way or after arriving");
    }
  } else {
    assertDeliveryTransition(booking.status, "COMPLETED");
  }
  const updated = await changeStatus({
    bookingId: booking.id,
    status: "COMPLETED",
    actorUserId: user.id,
    note: `Outcome: ${outcome.outcome}`,
    data: outcomeData(outcome),
  });
  return { assignment: { id: updated.id, status: updated.status, outcome: updated.outcome } };
});
