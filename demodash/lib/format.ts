// Shared (server + client) formatting helpers.
export const TZ = "Asia/Kolkata";

export function inr(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export function dateTime(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-IN", { timeZone: TZ, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(d));
}

export function timeOnly(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-IN", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(new Date(d));
}

export function preferredLabel(d: string | Date | null | undefined): string {
  return d ? dateTime(d) : "ASAP";
}

export const STATUS_LABEL: Record<string, string> = {
  PENDING: "Booked",
  ASSIGNED: "Assigned",
  OUT_FOR_DEMO: "On the way",
  ARRIVED: "Arrived",
  DEMO_IN_PROGRESS: "Demo in progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const OUTCOME_LABEL: Record<string, string> = {
  PURCHASED_OFFLINE: "Purchased",
  NOT_PURCHASED: "Not purchased",
  CUSTOMER_UNAVAILABLE: "Customer unavailable",
};

export function priceSegment(price: number): "Budget" | "Mid-range" | "Premium" {
  if (price < 15000) return "Budget";
  if (price < 40000) return "Mid-range";
  return "Premium";
}

export function mapsLink(lat?: number | null, lng?: number | null, address?: string): string {
  if (lat != null && lng != null) return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address ?? "")}`;
}

export function directionsLink(lat?: number | null, lng?: number | null, address?: string): string {
  const dest = lat != null && lng != null ? `${lat},${lng}` : encodeURIComponent(address ?? "");
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
}

export function osmEmbed(points: { lat: number; lng: number }[], marker?: { lat: number; lng: number }): string {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const pad = 0.006;
  const bbox = [Math.min(...lngs) - pad, Math.min(...lats) - pad, Math.max(...lngs) + pad, Math.max(...lats) + pad].join(",");
  const m = marker ?? points[0];
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${m.lat},${m.lng}`;
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Rough ETA: straight-line distance at ~18 km/h city speed (with a 1.3 road factor) + 2 min buffer. */
export function etaMinutes(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const km = haversineKm(from, to) * 1.3;
  return Math.max(2, Math.round((km / 18) * 60) + 2);
}
