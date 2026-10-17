import { db } from "@/lib/db";
import { handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ACTIVE_DELIVERY_STATUSES, bookingInclude } from "@/lib/booking";
import { assignmentRow } from "@/lib/delivery";

export const dynamic = "force-dynamic";

/** Only the logged-in delivery person's own assignments. */
export const GET = handler(async () => {
  const user = await requireRole("DELIVERY");
  const mine = { assignedDeliveryPerson: { userId: user.id } };
  const [active, recent, profile] = await Promise.all([
    db.demoBooking.findMany({ where: { ...mine, status: { in: ACTIVE_DELIVERY_STATUSES } }, include: bookingInclude, orderBy: { createdAt: "asc" } }),
    db.demoBooking.findMany({ where: { ...mine, status: { in: ["COMPLETED", "CANCELLED"] } }, include: bookingInclude, orderBy: { updatedAt: "desc" }, take: 15 }),
    db.deliveryPersonProfile.findUnique({ where: { userId: user.id }, select: { isAvailable: true } }),
  ]);
  return { active: active.map(assignmentRow), recent: recent.map(assignmentRow), isAvailable: profile?.isAvailable ?? true };
});
