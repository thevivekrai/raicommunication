import { timingSafeEqual } from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, handler, parseBody } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { changeStatus } from "@/lib/booking";
import { getOwnAssignment } from "@/lib/delivery";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export const POST = handler<{ id: string }>(async (req, { params }) => {
  const user = await requireRole("DELIVERY");
  const { otp } = await parseBody(req, z.object({ otp: z.string().regex(/^\d{4}$/, "Enter the 4-digit OTP") }));
  const booking = await getOwnAssignment(params.id, user.id);

  if (booking.status !== "OUT_FOR_DEMO" && booking.status !== "ARRIVED") {
    throw new ApiError(409, "OTP can be verified once you are on the way or have arrived");
  }
  if (booking.otpVerifiedAt) return { verified: true };

  rateLimit(`otp-verify:${booking.id}`, 6, 10 * 60 * 1000, "Too many wrong attempts. Ask the customer to check the code and try again in a few minutes.");

  const a = Buffer.from(otp);
  const b = Buffer.from(booking.otp);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new ApiError(400, "That OTP doesn't match");

  await db.demoBooking.update({ where: { id: booking.id }, data: { otpVerifiedAt: new Date() } });
  // Entering the right OTP also confirms arrival.
  if (booking.status === "OUT_FOR_DEMO") {
    await changeStatus({ bookingId: booking.id, status: "ARRIVED", actorUserId: user.id, note: "Arrival confirmed via OTP" });
  }
  return { verified: true };
});
