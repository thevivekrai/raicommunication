"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, useApi } from "@/lib/client";
import { dateTime, directionsLink, inr, osmEmbed, preferredLabel, timeOnly } from "@/lib/format";
import { ErrorState, ProductImage, Skeleton } from "@/components/ui";
import { CheckIcon, PhoneIcon, StarIcon } from "@/components/Icons";
import { useToast } from "@/components/Toast";

interface Tracking {
  code: string;
  status: string;
  createdAt: string;
  preferredTime: string | null;
  address: string;
  destination: { lat: number; lng: number } | null;
  product: { id: string; brand: string; model: string; color: string; ramStorage: string; price: number; image: string | null };
  deliveryPerson: { name: string; phone: string; photo: string | null; vehicle: string | null } | null;
  deliveryLocation: { lat: number; lng: number; updatedAt: string | null } | null;
  etaMinutes: number | null;
  handoverOtp: string | null;
  otpVerified: boolean;
  outcome: string | null;
  rating: number | null;
  timeline: { status: string; at: string }[];
}

// Customer-facing stepper. ARRIVED is folded into "On the way" (shown as "Arrived").
const STEPS = [
  { key: "PENDING", label: "Booked", hint: "We got your request" },
  { key: "ASSIGNED", label: "Assigned", hint: "A delivery partner is assigned" },
  { key: "OUT_FOR_DEMO", label: "On the way", hint: "Heading to your address" },
  { key: "DEMO_IN_PROGRESS", label: "Demo in progress", hint: "Enjoy trying the phone" },
  { key: "COMPLETED", label: "Completed", hint: "Thanks for trying!" },
];

function stepIndex(status: string) {
  if (status === "ARRIVED") return 2;
  return Math.max(0, STEPS.findIndex((s) => s.key === status));
}

export function TrackView({ code }: { code: string }) {
  const { data, error, loading, reload } = useApi<{ booking: Tracking }>(`/api/bookings/${encodeURIComponent(code)}`, 5000);
  const b = data?.booking;

  // Throttle map reloads: the iframe flashes whenever its src changes.
  const [mapSrc, setMapSrc] = useState<string | null>(null);
  const lastMap = useRef(0);
  useEffect(() => {
    if (!b) return;
    const pts: { lat: number; lng: number }[] = [];
    if (b.destination) pts.push(b.destination);
    if (b.deliveryLocation) pts.push(b.deliveryLocation);
    if (!pts.length) return setMapSrc(null);
    if (Date.now() - lastMap.current < 15000 && mapSrc) return;
    lastMap.current = Date.now();
    setMapSrc(osmEmbed(pts, b.deliveryLocation ?? b.destination ?? pts[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b?.deliveryLocation?.lat, b?.deliveryLocation?.lng, b?.destination?.lat, b?.destination?.lng]);

  if (loading) return <div className="space-y-3"><Skeleton className="h-28 w-full" /><Skeleton className="h-64 w-full" /><Skeleton className="h-40 w-full" /></div>;
  if (error || !b) return <ErrorState message={error ?? "Booking not found"} onRetry={reload} />;

  const cancelled = b.status === "CANCELLED";
  const idx = stepIndex(b.status);
  const finished = b.status === "COMPLETED";
  const timeFor = (key: string) => b.timeline.find((t) => t.status === key)?.at;
  const live = b.status === "OUT_FOR_DEMO" || b.status === "ARRIVED" || b.status === "DEMO_IN_PROGRESS";

  return (
    <div className="space-y-4">
      <section className="card flex items-center gap-3 p-3">
        <ProductImage src={b.product.image} alt={b.product.model} className="h-16 w-16 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{b.product.brand} {b.product.model}</p>
          <p className="text-xs text-slate-500">{b.product.ramStorage} · {b.product.color} · {inr(b.product.price)}</p>
          <p className="mt-0.5 font-mono text-xs font-semibold text-brand-700">{b.code}</p>
        </div>
      </section>

      {cancelled ? (
        <section className="card p-5 text-center"><p className="text-3xl">😕</p><p className="mt-2 font-bold">This demo was cancelled</p><p className="text-sm text-slate-600">You can book another one anytime.</p><Link href="/" className="btn-primary mt-3">Browse phones</Link></section>
      ) : (
        <>
          {/* ETA / headline */}
          <section className="card overflow-hidden">
            <div className="bg-gradient-to-r from-brand-600 to-brand-800 p-4 text-white">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-100">{finished ? "Done" : "Status"}</p>
              <p className="text-xl font-extrabold">
                {b.status === "PENDING" && "Waiting for a delivery partner"}
                {b.status === "ASSIGNED" && "Delivery partner assigned"}
                {b.status === "OUT_FOR_DEMO" && (b.etaMinutes ? `Arriving in ~${b.etaMinutes} min` : "On the way to you")}
                {b.status === "ARRIVED" && "Your delivery partner has arrived"}
                {b.status === "DEMO_IN_PROGRESS" && "Demo in progress"}
                {finished && "Demo completed"}
              </p>
              <p className="text-sm text-brand-100">{b.status === "PENDING" ? `Requested for ${preferredLabel(b.preferredTime)}` : b.address}</p>
            </div>

            {/* Stepper */}
            <ol className="p-4">
              {STEPS.map((s, i) => {
                const done = i < idx || finished;
                const current = i === idx && !finished;
                const at = timeFor(s.key) ?? (s.key === "OUT_FOR_DEMO" ? timeFor("ARRIVED") : undefined);
                return (
                  <li key={s.key} className="relative flex gap-3 pb-5 last:pb-0">
                    {i < STEPS.length - 1 && <span className={`absolute left-[13px] top-7 h-[calc(100%-1.25rem)] w-0.5 ${i < idx || finished ? "bg-brand-500" : "bg-slate-200"}`} aria-hidden />}
                    <span className={`relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${done ? "bg-brand-600 text-white" : current ? "bg-white text-brand-700 ring-4 ring-brand-200" : "bg-slate-200 text-slate-500"}`}>
                      {done ? <CheckIcon width={14} height={14} strokeWidth={3} /> : i + 1}
                    </span>
                    <div className="-mt-0.5 flex-1">
                      <p className={`text-sm font-bold ${done || current ? "text-slate-900" : "text-slate-400"}`}>
                        {s.key === "OUT_FOR_DEMO" && b.status === "ARRIVED" ? "Arrived" : s.label}
                      </p>
                      <p className="text-xs text-slate-500">{s.hint}{at ? ` · ${timeOnly(at)}` : ""}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Handover OTP */}
          {b.handoverOtp && (
            <section className="card border-2 border-lime-400 p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your handover OTP</p>
              <p className="mt-1 font-mono text-4xl font-extrabold tracking-[.35em] text-brand-800">{b.handoverOtp}</p>
              <p className="mt-1 text-xs text-slate-600">Share this only with your delivery partner when they arrive. It confirms the right person is at your door.</p>
            </section>
          )}

          {/* Delivery partner */}
          {b.deliveryPerson && !finished && (
            <section className="card flex items-center gap-3 p-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-100 text-xl font-bold text-brand-700">
                {b.deliveryPerson.photo ? <img src={b.deliveryPerson.photo} alt="" className="h-full w-full object-cover" /> : b.deliveryPerson.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your delivery partner</p>
                <p className="truncate font-bold">{b.deliveryPerson.name}</p>
                {b.deliveryPerson.vehicle && <p className="truncate text-xs text-slate-500">{b.deliveryPerson.vehicle}</p>}
              </div>
              <a href={`tel:${b.deliveryPerson.phone}`} className="btn-primary" aria-label={`Call ${b.deliveryPerson.name}`}><PhoneIcon width={18} height={18} /> Call</a>
            </section>
          )}

          {/* Map */}
          {(mapSrc || b.destination) && !finished && (
            <section className="card overflow-hidden">
              {mapSrc ? (
                <iframe title="Live map" src={mapSrc} className="h-64 w-full border-0" loading="lazy" />
              ) : null}
              <div className="flex items-center justify-between gap-2 p-3 text-xs text-slate-600">
                <span>
                  {live && b.deliveryLocation
                    ? `Live location · updated ${timeOnly(b.deliveryLocation.updatedAt)}`
                    : live ? "Waiting for the rider's location…" : "Your delivery location"}
                </span>
                {b.destination && <a className="font-semibold text-brand-700" target="_blank" rel="noreferrer" href={directionsLink(b.destination.lat, b.destination.lng, b.address)}>Open in Maps</a>}
              </div>
            </section>
          )}
        </>
      )}

      {finished && <RatingCard code={b.code} initial={b.rating} onDone={reload} />}

      <p className="text-center text-xs text-slate-500">Booked {dateTime(b.createdAt)} · This page refreshes automatically.</p>
    </div>
  );
}

function RatingCard({ code, initial, onDone }: { code: string; initial: number | null; onDone: () => void }) {
  const toast = useToast();
  const [rating, setRating] = useState(initial ?? 0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  if (initial) {
    return <section className="card p-5 text-center"><p className="font-bold">Thanks for your feedback!</p><div className="mt-1 flex justify-center text-amber-400">{Array.from({ length: 5 }).map((_, i) => <StarIcon key={i} filled={i < initial} width={22} height={22} />)}</div></section>;
  }
  return (
    <section className="card space-y-3 p-5 text-center">
      <p className="font-bold">How was your demo experience?</p>
      <div className="flex justify-center gap-1 text-amber-400">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`} className="p-1"><StarIcon filled={n <= rating} width={34} height={34} /></button>
        ))}
      </div>
      {rating > 0 && (
        <>
          <textarea className="input" rows={2} maxLength={300} placeholder="Anything else? (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
          <button className="btn-primary w-full" disabled={busy} onClick={async () => {
            setBusy(true);
            try { await api(`/api/bookings/${code}/rating`, { method: "POST", json: { rating, comment: comment.trim() || null } }); toast.success("Thanks for rating!"); onDone(); }
            catch (e) { toast.error((e as Error).message); setBusy(false); }
          }}>Submit rating</button>
        </>
      )}
    </section>
  );
}
