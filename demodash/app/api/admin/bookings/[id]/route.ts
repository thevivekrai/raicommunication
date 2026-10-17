import { db } from "@/lib/db";
import { ApiError, handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { bookingInclude, staffBookingRow } from "@/lib/booking";

export const dynamic = "force-dynamic";

export const GET = handler<{ id: string }>(async (_req, { params }) => {
  const user = await requireRole("ADMIN", "EMPLOYEE");
  const booking = await db.demoBooking.findUnique({ where: { id: params.id }, include: bookingInclude });
  if (!booking) throw new ApiError(404, "Booking not found");
  const history = await db.bookingStatusHistory.findMany({
    where: { bookingId: booking.id },
    orderBy: { timestamp: "asc" },
    include: { actor: { select: { name: true, role: true } } },
  });
  return {
    booking: {
      ...staffBookingRow(booking),
      otpVerifiedAt: booking.otpVerifiedAt,
      // The handover OTP is only visible to admins (e.g. to help a customer who lost it).
      otp: user.role === "ADMIN" ? booking.otp : null,
      history: history.map((h) => ({ status: h.status, at: h.timestamp, note: h.note, actor: h.actor ? `${h.actor.name} (${h.actor.role.toLowerCase()})` : "Customer" })),
    },
    canManage: user.role === "ADMIN",
  };
});
