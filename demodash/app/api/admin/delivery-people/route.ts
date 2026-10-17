import { db } from "@/lib/db";
import { handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ACTIVE_DELIVERY_STATUSES } from "@/lib/booking";

export const dynamic = "force-dynamic";

/** Active delivery people with their current workload — used by the "Assign" dropdown. */
export const GET = handler(async () => {
  await requireRole("ADMIN", "EMPLOYEE");
  const people = await db.deliveryPersonProfile.findMany({
    where: { user: { isActive: true } },
    include: { _count: { select: { bookings: { where: { status: { in: ACTIVE_DELIVERY_STATUSES } } } } } },
    orderBy: { name: "asc" },
  });
  return {
    deliveryPeople: people.map((p) => ({
      id: p.id, name: p.name, phone: p.phone, vehicle: p.vehicle, photo: p.photo,
      isAvailable: p.isAvailable, activeJobs: p._count.bookings, locationUpdatedAt: p.locationUpdatedAt,
    })),
  };
});
