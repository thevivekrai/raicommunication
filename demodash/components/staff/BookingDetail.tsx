"use client";
import Link from "next/link";
import { useState } from "react";
import { api, useApi } from "@/lib/client";
import { STATUS_LABEL, dateTime, directionsLink, inr, mapsLink, preferredLabel } from "@/lib/format";
import { ErrorState, Field, OutcomeBadge, ProductImage, Skeleton, StatusBadge } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { NavIcon, PhoneIcon } from "@/components/Icons";
import type { BookingRow } from "./common";

interface Detail extends BookingRow {
  otp: string | null;
  otpVerifiedAt: string | null;
  rating: number | null;
  ratingComment: string | null;
  history: { status: string; at: string; note: string | null; actor: string }[];
}
interface DP { id: string; name: string; phone: string; vehicle: string | null; isAvailable: boolean; activeJobs: number }

const ADMIN_STATUSES = ["PENDING", "ASSIGNED", "OUT_FOR_DEMO", "ARRIVED", "DEMO_IN_PROGRESS", "CANCELLED"];

export function BookingDetail({ id, isAdmin }: { id: string; isAdmin: boolean }) {
  const toast = useToast();
  const { data, error, loading, reload } = useApi<{ booking: Detail }>(`/api/admin/bookings/${id}`, 10000);
  const people = useApi<{ deliveryPeople: DP[] }>(isAdmin ? "/api/admin/delivery-people" : null);
  const [busy, setBusy] = useState(false);
  const [dpId, setDpId] = useState("");

  if (loading && !data) return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-64" /><Skeleton className="h-48" /></div>;
  if (error || !data) return <ErrorState message={error ?? "Not found"} onRetry={reload} />;
  const b = data.booking;
  const closed = b.status === "COMPLETED" || b.status === "CANCELLED";

  async function act(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try { await fn(); toast.success(ok); await reload(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/bookings" className="text-sm font-semibold text-brand-700">← All bookings</Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-extrabold">{b.code}</h1><StatusBadge status={b.status} /><OutcomeBadge outcome={b.outcome} />
        </div>
        <p className="text-sm text-slate-500">Booked {dateTime(b.createdAt)}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="card divide-y divide-slate-100">
            <div className="flex items-center gap-3 p-4">
              <ProductImage src={b.product.image} alt={b.product.model} className="h-16 w-16 shrink-0 rounded-xl" />
              <div><p className="font-bold">{b.product.brand} {b.product.model}</p><p className="text-sm text-slate-500">{b.product.ramStorage} · {b.product.color}</p><p className="text-sm font-semibold">{inr(b.product.price)}</p></div>
            </div>
            <dl className="grid gap-4 p-4 sm:grid-cols-2">
              <div><dt className="label">Customer</dt><dd className="font-semibold">{b.customer.name}</dd>{b.customer.email && <dd className="text-sm text-slate-500">{b.customer.email}</dd>}</div>
              <div><dt className="label">Phone</dt><dd><a className="inline-flex items-center gap-1.5 font-semibold text-brand-700" href={`tel:${b.customer.phone}`}><PhoneIcon width={16} height={16} />{b.customer.phone}</a></dd></div>
              <div className="sm:col-span-2"><dt className="label">Address</dt><dd>{b.address}</dd>
                <dd className="mt-2 flex flex-wrap gap-2">
                  <a className="btn-secondary btn-sm" target="_blank" rel="noreferrer" href={mapsLink(b.lat, b.lng, b.address)}>Open map</a>
                  <a className="btn-secondary btn-sm" target="_blank" rel="noreferrer" href={directionsLink(b.lat, b.lng, b.address)}><NavIcon width={14} height={14} /> Directions</a>
                </dd>
              </div>
              <div><dt className="label">Preferred time</dt><dd className="font-semibold">{preferredLabel(b.preferredTime)}</dd></div>
              <div><dt className="label">Delivery person</dt><dd className="font-semibold">{b.deliveryPerson ? `${b.deliveryPerson.name} · ${b.deliveryPerson.phone}` : "Not assigned"}</dd></div>
              {b.notes && <div className="sm:col-span-2"><dt className="label">Customer notes</dt><dd>{b.notes}</dd></div>}
              {b.outcome && (
                <div className="sm:col-span-2 rounded-xl bg-slate-50 p-3">
                  <dt className="label">Outcome</dt>
                  <dd className="flex flex-wrap items-center gap-2"><OutcomeBadge outcome={b.outcome} />{b.outcome === "PURCHASED_OFFLINE" && <span className="font-bold">{inr(b.saleAmount)}</span>}{b.outcomeNotes && <span className="text-sm text-slate-600">— {b.outcomeNotes}</span>}</dd>
                </div>
              )}
              {b.rating && <div className="sm:col-span-2"><dt className="label">Customer rating</dt><dd>{"★".repeat(b.rating)}{"☆".repeat(5 - b.rating)} {b.ratingComment && <span className="text-sm text-slate-600">“{b.ratingComment}”</span>}</dd></div>}
            </dl>
          </section>

          <section className="card p-4">
            <h2 className="mb-3 font-bold">Timeline</h2>
            <ol className="space-y-3">
              {b.history.map((h, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                  <div><p className="font-semibold">{STATUS_LABEL[h.status]}{h.note ? <span className="font-normal text-slate-600"> — {h.note}</span> : null}</p><p className="text-xs text-slate-500">{dateTime(h.at)} · {h.actor}</p></div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Admin controls — hidden for employees (they get read-only access). */}
        <div className="space-y-5">
          {!isAdmin ? (
            <section className="card bg-slate-50 p-4 text-sm text-slate-600 shadow-none">Employees have read-only access to bookings. Ask the admin to assign a delivery person or change the outcome.</section>
          ) : (
            <>
              {b.otp && !closed && <section className="card p-4 text-center"><p className="label">Handover OTP</p><p className="font-mono text-2xl font-extrabold tracking-widest">{b.otp}</p><p className="text-xs text-slate-500">{b.otpVerifiedAt ? "Verified by rider" : "Not verified yet"}</p></section>}

              <section className="card space-y-3 p-4">
                <h2 className="font-bold">Assign delivery person</h2>
                {closed ? <p className="text-sm text-slate-500">This booking is closed.</p> : (
                  <>
                    <select className="input" value={dpId} onChange={(e) => setDpId(e.target.value)} aria-label="Delivery person">
                      <option value="">{b.deliveryPerson ? `Reassign (now: ${b.deliveryPerson.name})` : "Choose a person…"}</option>
                      {people.data?.deliveryPeople.map((p) => <option key={p.id} value={p.id}>{p.name}{p.isAvailable ? "" : " (off duty)"} · {p.activeJobs} active</option>)}
                    </select>
                    <button className="btn-primary w-full" disabled={!dpId || busy} onClick={() => act(() => api(`/api/admin/bookings/${id}/assign`, { method: "PATCH", json: { deliveryPersonId: dpId } }), "Delivery person assigned").then(() => setDpId(""))}>Assign</button>
                  </>
                )}
              </section>

              <section className="card space-y-3 p-4">
                <h2 className="font-bold">Update status</h2>
                <div className="flex flex-wrap gap-2">
                  {ADMIN_STATUSES.map((s) => (
                    <button key={s} disabled={busy || b.status === s || (s === "CANCELLED" && b.status === "CANCELLED")}
                      onClick={() => { if (s === "CANCELLED" && !confirm("Cancel this booking?")) return; act(() => api(`/api/admin/bookings/${id}/status`, { method: "PATCH", json: { status: s } }), `Status: ${STATUS_LABEL[s]}`); }}
                      className={`${b.status === s ? "btn-primary" : s === "CANCELLED" ? "btn-secondary text-red-600" : "btn-secondary"} btn-sm`}>{STATUS_LABEL[s]}</button>
                  ))}
                </div>
              </section>

              {b.status !== "CANCELLED" && <OutcomeForm bookingId={id} current={b} busy={busy} onSave={(payload) => act(() => api(`/api/admin/bookings/${id}/outcome`, { method: "PATCH", json: payload }), "Outcome saved")} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function OutcomeForm({ current, busy, onSave }: { bookingId: string; current: Detail; busy: boolean; onSave: (p: object) => void }) {
  const [outcome, setOutcome] = useState(current.outcome ?? "");
  const [amount, setAmount] = useState(current.saleAmount ? String(current.saleAmount) : String(current.product.price));
  const [notes, setNotes] = useState(current.outcomeNotes ?? "");

  return (
    <section className="card space-y-3 p-4">
      <h2 className="font-bold">{current.outcome ? "Edit outcome" : "Mark outcome"}</h2>
      <select className="input" value={outcome} onChange={(e) => setOutcome(e.target.value)} aria-label="Outcome">
        <option value="">Select outcome…</option>
        <option value="PURCHASED_OFFLINE">Purchased (offline)</option>
        <option value="NOT_PURCHASED">Not purchased</option>
        <option value="CUSTOMER_UNAVAILABLE">Customer unavailable / no-show</option>
      </select>
      {outcome === "PURCHASED_OFFLINE" && <Field label="Sale amount (₹)"><input className="input" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} /></Field>}
      {outcome && <Field label={outcome === "NOT_PURCHASED" ? "Reason" : "Notes"}><textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>}
      <button className="btn-primary w-full" disabled={!outcome || busy} onClick={() => onSave({ outcome, saleAmount: outcome === "PURCHASED_OFFLINE" ? Number(amount) : null, notes: notes.trim() || null })}>Save outcome &amp; complete</button>
      <p className="text-xs text-slate-500">Saving an outcome marks the booking as completed.</p>
    </section>
  );
}
