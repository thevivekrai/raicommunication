import { randomBytes, randomInt } from "crypto";
import type { BookingOutcome, BookingStatus, Prisma } from "@prisma/client";
import { db } from "./db";
import { ApiError } from "./api";
import { etaMinutes } from "./format";

// Unambiguous alphabet (no 0/O/1/I) — 8 chars ≈ 1e12 combinations, so codes can't be enumerated.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generateBookingCode(): string {
  const bytes = randomBytes(8);
  let s = "";
  for (let i = 0; i < 8; i++) s += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return `DD-${s}`;
}

export const generateHandoverOtp = () => String(randomInt(0, 10000)).padStart(4, "0");

export const OPEN_STATUSES: BookingStatus[] = ["PENDING", "ASSIGNED", "OUT_FOR_DEMO", "ARRIVED", "DEMO_IN_PROGRESS"];
export const ACTIVE_DELIVERY_STATUSES: BookingStatus[] = ["ASSIGNED", "OUT_FOR_DEMO", "ARRIVED", "DEMO_IN_PROGRESS"];

/** Steps a delivery person may take (admins can set any status). */
const DELIVERY_TRANSITIONS: Partial<Record<BookingStatus, BookingStatus[]>> = {
  ASSIGNED: ["OUT_FOR_DEMO"],
  OUT_FOR_DEMO: ["ARRIVED"],
  ARRIVED: ["DEMO_IN_PROGRESS"], // requires OTP verification
  DEMO_IN_PROGRESS: ["COMPLETED"], // requires outcome
};

export function assertDeliveryTransition(from: BookingStatus, to: BookingStatus) {
  if (!DELIVERY_TRANSITIONS[from]?.includes(to)) {
    throw new ApiError(409, `Cannot move a booking from ${from} to ${to}`);
  }
}

interface ChangeInput {
  bookingId: string;
  status: BookingStatus;
  actorUserId: string;
  note?: string | null;
  data?: Prisma.DemoBookingUpdateInput;
}

/** Updates status + writes history atomically. */
export async function changeStatus({ bookingId, status, actorUserId, note, data }: ChangeInput) {
  return db.$transaction(async (tx) => {
    const updated = await tx.demoBooking.update({
      where: { id: bookingId },
      data: {
        ...data,
        status,
        completedAt: status === "COMPLETED" || status === "CANCELLED" ? new Date() : null,
      },
    });
    await tx.bookingStatusHistory.create({ data: { bookingId, status, actorUserId, note: note ?? null } });
    return updated;
  });
}

export function outcomeData(input: { outcome: BookingOutcome; saleAmount?: number | null; notes?: string | null }) {
  return {
    outcome: input.outcome,
    saleAmount: input.outcome === "PURCHASED_OFFLINE" ? input.saleAmount ?? null : null,
    outcomeNotes: input.notes ?? null,
  };
}

// ---------- Serializers ----------

export const bookingInclude = {
  customer: true,
  product: true,
  assignedDeliveryPerson: true,
} satisfies Prisma.DemoBookingInclude;

type FullBooking = Prisma.DemoBookingGetPayload<{ include: typeof bookingInclude }>;

/** Row shape for staff tables. Staff may see the customer's phone. */
export function staffBookingRow(b: FullBooking) {
  return {
    id: b.id,
    code: b.code,
    createdAt: b.createdAt,
    status: b.status,
    outcome: b.outcome,
    saleAmount: b.saleAmount,
    outcomeNotes: b.outcomeNotes,
    notes: b.notes,
    preferredTime: b.preferredTime,
    address: b.address,
    lat: b.lat,
    lng: b.lng,
    customer: { name: b.customer.name, phone: b.customer.phone, email: b.customer.email },
    product: { id: b.product.id, brand: b.product.brand, model: b.product.model, color: b.product.color, ramStorage: b.product.ramStorage, price: b.product.price, image: b.product.images[0] ?? null },
    deliveryPerson: b.assignedDeliveryPerson
      ? { id: b.assignedDeliveryPerson.id, name: b.assignedDeliveryPerson.name, phone: b.assignedDeliveryPerson.phone }
      : null,
    rating: b.rating,
    ratingComment: b.ratingComment,
  };
}

/** Public tracking payload. Deliberately omits the customer's phone/email and any sale data. */
export function publicBooking(b: FullBooking, history: { status: string; timestamp: Date }[]) {
  const dp = b.assignedDeliveryPerson;
  const live = b.status === "OUT_FOR_DEMO" || b.status === "ARRIVED" || b.status === "DEMO_IN_PROGRESS";
  const dpLoc = live && dp?.currentLat != null && dp.currentLng != null ? { lat: dp.currentLat, lng: dp.currentLng, updatedAt: dp.locationUpdatedAt } : null;
  const dest = b.lat != null && b.lng != null ? { lat: b.lat, lng: b.lng } : null;

  return {
    code: b.code,
    status: b.status,
    createdAt: b.createdAt,
    preferredTime: b.preferredTime,
    address: b.address,
    destination: dest,
    product: { id: b.product.id, brand: b.product.brand, model: b.product.model, color: b.product.color, ramStorage: b.product.ramStorage, price: b.product.price, image: b.product.images[0] ?? null },
    deliveryPerson: dp ? { name: dp.name, phone: dp.phone, photo: dp.photo, vehicle: dp.vehicle } : null,
    deliveryLocation: dpLoc,
    etaMinutes: b.status === "OUT_FOR_DEMO" && dpLoc && dest ? etaMinutes(dpLoc, dest) : null,
    // Handover OTP is only useful (and only shown) while the delivery person is en route / arrived and not yet verified.
    handoverOtp: !b.otpVerifiedAt && (b.status === "ASSIGNED" || b.status === "OUT_FOR_DEMO" || b.status === "ARRIVED") ? b.otp : null,
    otpVerified: !!b.otpVerifiedAt,
    outcome: b.outcome,
    rating: b.rating,
    timeline: history.map((h) => ({ status: h.status, at: h.timestamp })),
  };
}
