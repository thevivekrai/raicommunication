import { db } from "@/lib/db";
import { ApiError, clientIp, handler, parseBody } from "@/lib/api";
import { bookingSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { assertPhoneToken } from "@/lib/otp";
import { generateBookingCode, generateHandoverOtp } from "@/lib/booking";
import { notifyBookingCreated } from "@/lib/notify";

export const dynamic = "force-dynamic";

export const POST = handler(async (req) => {
  // Layered spam protection: per-IP burst limit, then per-phone limit (checked against the DB so it survives restarts).
  rateLimit(`booking:ip:${clientIp(req)}`, 6, 10 * 60 * 1000, "Too many booking attempts. Please wait a few minutes.");
  const input = await parseBody(req, bookingSchema);

  await assertPhoneToken(input.otpToken, input.phone);

  const recent = await db.demoBooking.count({
    where: { customer: { phone: input.phone }, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (recent >= 3) throw new ApiError(429, "You have already made several bookings recently. Please try again later.");

  if (input.preferredTime) {
    const t = new Date(input.preferredTime).getTime();
    if (t < Date.now() - 5 * 60 * 1000) throw new ApiError(400, "Preferred time is in the past");
    if (t > Date.now() + 7 * 24 * 3600 * 1000) throw new ApiError(400, "Please choose a time within the next 7 days");
  }

  const product = await db.mobileProduct.findFirst({ where: { id: input.productId, isActive: true } });
  if (!product) throw new ApiError(404, "That phone is no longer available");
  if (!product.demoAvailable) throw new ApiError(409, "Free demo is not available for this phone right now");

  const customer = await db.customer.upsert({
    where: { phone: input.phone },
    create: { name: input.name, phone: input.phone, email: input.email ?? null },
    update: { name: input.name, ...(input.email ? { email: input.email } : {}) },
  });

  let booking;
  for (let attempt = 0; ; attempt++) {
    try {
      booking = await db.demoBooking.create({
        data: {
          code: generateBookingCode(),
          customerId: customer.id,
          productId: product.id,
          address: input.address,
          lat: input.lat ?? null,
          lng: input.lng ?? null,
          preferredTime: input.preferredTime ? new Date(input.preferredTime) : null,
          notes: input.notes,
          otp: generateHandoverOtp(),
          history: { create: { status: "PENDING", note: "Booking created" } },
        },
      });
      break;
    } catch (e) {
      // Extremely unlikely booking-code collision: retry with a new code.
      if (attempt < 3 && (e as { code?: string }).code === "P2002") continue;
      throw e;
    }
  }

  await notifyBookingCreated({
    code: booking.code,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerEmail: customer.email,
    address: booking.address,
    lat: booking.lat,
    lng: booking.lng,
    preferredTime: booking.preferredTime,
    notes: booking.notes,
    product: `${product.brand} ${product.model}`,
    price: product.price,
  });

  return Response.json({ code: booking.code, status: booking.status }, { status: 201 });
});
