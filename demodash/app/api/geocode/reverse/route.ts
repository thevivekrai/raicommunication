import { z } from "zod";
import { ApiError, clientIp, handler, parseQuery } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const query = z.object({ lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180) });

/** Turns coordinates into a human-readable address (Google if a key is set, else OpenStreetMap Nominatim). */
export const GET = handler(async (req) => {
  rateLimit(`geo:${clientIp(req)}`, 30, 60 * 1000);
  const { lat, lng } = parseQuery(req, query);
  const key = process.env.GOOGLE_MAPS_API_KEY;
  try {
    if (key) {
      const r = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`);
      const j = (await r.json()) as { results?: { formatted_address: string }[] };
      if (j.results?.[0]) return { address: j.results[0].formatted_address };
    } else {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
        headers: { "User-Agent": "DemoDash/0.1 (demo booking app)" },
      });
      const j = (await r.json()) as { display_name?: string };
      if (j.display_name) return { address: j.display_name };
    }
  } catch (e) {
    console.error("[geocode] failed", e);
  }
  throw new ApiError(502, "Couldn't look up the address for your location. Please type it in.");
});
