import { db } from "./db";
import { ApiError } from "./api";
import { bookingInclude } from "./booking";
import type { Prisma } from "@prisma/client";

type Full = Prisma.DemoBookingGetPayload<{ include: typeof bookingInclude }>;

/** Shape for the delivery app. Never includes the handover OTP — the customer reads it out. */
export function assignmentRow(b: Full) {
  return {
    id: b.id,
    code: b.code,
    status: b.status,
    createdAt: b.createdAt,
    preferredTime: b.preferredTime,
    address: b.address,
    lat: b.lat,
    lng: b.lng,
    notes: b.notes,
    otpVerified: !!b.otpVerifiedAt,
    outcome: b.outcome,
    saleAmount: b.saleAmount,
    customer: { name: b.customer.name, phone: b.customer.phone },
    product: { brand: b.product.brand, model: b.product.model, color: b.product.color, ramStorage: b.product.ramStorage, price: b.product.price, image: b.product.images[0] ?? null },
  };
}

/** Loads a booking only if it's assigned to this delivery user — otherwise 404 (don't reveal other bookings). */
export async function getOwnAssignment(bookingId: string, userId: string) {
  const booking = await db.demoBooking.findFirst({
    where: { id: bookingId, assignedDeliveryPerson: { userId } },
    include: bookingInclude,
  });
  if (!booking) throw new ApiError(404, "Assignment not found");
  return booking;
}
