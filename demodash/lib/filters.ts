import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { dateRange } from "./time";
import { dateOnly, outcomeEnum, statusEnum } from "./validation";

export const bookingFilterSchema = z.object({
  status: statusEnum.optional(),
  outcome: outcomeEnum.optional(),
  product_id: z.string().optional(),
  delivery_person_id: z.string().optional(),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
  q: z.string().trim().max(80).optional(),
  open: z.enum(["1"]).optional(), // only not-yet-finished bookings
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(25),
});

export function bookingWhere(f: z.infer<typeof bookingFilterSchema>): Prisma.DemoBookingWhereInput {
  const range = dateRange(f.from, f.to);
  return {
    ...(f.status ? { status: f.status } : {}),
    ...(f.open ? { status: { notIn: ["COMPLETED", "CANCELLED"] } } : {}),
    ...(f.outcome ? { outcome: f.outcome } : {}),
    ...(f.product_id ? { productId: f.product_id } : {}),
    ...(f.delivery_person_id ? { assignedDeliveryPersonId: f.delivery_person_id } : {}),
    ...(range.gte || range.lt ? { createdAt: range } : {}),
    ...(f.q
      ? {
          OR: [
            { code: { contains: f.q, mode: "insensitive" } },
            { customer: { name: { contains: f.q, mode: "insensitive" } } },
            { customer: { phone: { contains: f.q } } },
            { product: { model: { contains: f.q, mode: "insensitive" } } },
            { product: { brand: { contains: f.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}

