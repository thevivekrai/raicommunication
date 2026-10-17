import { z } from "zod";
import { db } from "@/lib/db";
import { handler, parseBody } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  isAvailable: z.boolean().optional(),
});

export const PATCH = handler(async (req) => {
  const user = await requireRole("DELIVERY");
  rateLimit(`loc:${user.id}`, 40, 60 * 1000, "Location updates are too frequent");
  const { lat, lng, isAvailable } = await parseBody(req, schema);
  await db.deliveryPersonProfile.update({
    where: { userId: user.id },
    data: {
      ...(lat != null && lng != null ? { currentLat: lat, currentLng: lng, locationUpdatedAt: new Date() } : {}),
      ...(isAvailable !== undefined ? { isAvailable } : {}),
    },
  });
  return { ok: true };
});
