"use client";
import Link from "next/link";
import { useState } from "react";
import { api, useApi } from "@/lib/client";
import { directionsLink, inr, preferredLabel } from "@/lib/format";
import { ErrorState, Field, OutcomeBadge, ProductImage, Skeleton, StatusBadge } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { NavIcon, PhoneIcon } from "@/components/Icons";
import type { Assignment } from "./types";

type Mode = "purchased" | "not" | "unavailable" | null;

export function AssignmentDetail({ id }: { id: string }) {
  const toast = useToast();
  const { data, error, loading, reload } = useApi<{ assignment: Assignment }>(`/api/delivery/assignments/${id}`, 8000);
  const [busy, setBusy] = useState(false);
  const [otp, setOtp] = useState("");
  const [mode, setMode] = useState<Mode>(null);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  if (loading && !data) return <div className="space-y-3"><Skeleton className="h-28" /><Skeleton className="h-40" /></div>;
  if (error || !data) return <ErrorState message={error ?? "Not found"} onRetry={reload} />;
  const a = data.assignment;

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try { await fn(); toast.success(ok); await reload(); return true; } catch (e) { toast.error((e as Error).message); return false; } finally { setBusy(false); }
  }
  const setStatus = (status: string, ok: string) => run(() => api(`/api/delivery/assignments/${id}/status`, { method: "PATCH", json: { status } }), ok);

  async function complete() {
    if (!mode) return;
    const outcome = mode === "purchased" ? "PURCHASED_OFFLINE" : mode === "not" ? "NOT_PURCHASED" : "CUSTOMER_UNAVAILABLE";
    if (mode === "purchased" && !(Number(amount) > 0)) return toast.error("Enter the sale amount");
    if (mode === "not" && !notes.trim()) return toast.error("Please add the reason");
    const ok = await run(() => api(`/api/delivery/assignments/${id}/status`, { method: "PATCH", json: { status: "COMPLETED", outcome, saleAmount: mode === "purchased" ? Number(amount) : null, notes: notes.trim() || null } }), "Saved — demo closed");
    if (ok) setMode(null);
  }

  return (
    <div className="space-y-4">
      <Link href="/delivery" className="text-sm font-semibold text-brand-700">← My deliveries</Link>

      <section className="card space-y-3 p-4">
        <div className="flex items-start gap-3">
          <ProductImage src={a.product.image} alt={a.product.model} className="h-16 w-16 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="font-bold">{a.product.brand} {a.product.model}</p>
            <p className="text-xs text-slate-500">{a.product.ramStorage} · {a.product.color} · {inr(a.product.price)}</p>
            <p className="mt-0.5 font-mono text-xs font-semibold text-brand-700">{a.code}</p>
          </div>
          <StatusBadge status={a.status} />
        </div>
        <div className="rounded-xl bg-slate-50 p-3 text-sm">
          <p className="font-semibold">{a.customer.name}</p>
          <p className="mt-1 text-slate-700">📍 {a.address}</p>
          <p className="mt-1 text-xs text-slate-500">Requested: {preferredLabel(a.preferredTime)}</p>
          {a.notes && <p className="mt-1 text-xs text-slate-600">📝 {a.notes}</p>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <a className="btn-primary py-3" target="_blank" rel="noreferrer" href={directionsLink(a.lat, a.lng, a.address)}><NavIcon width={18} height={18} /> Start navigation</a>
          <a className="btn-secondary py-3" href={`tel:${a.customer.phone}`}><PhoneIcon width={18} height={18} /> Call customer</a>
        </div>
      </section>

      {/* Step actions */}
      {a.status === "ASSIGNED" && (
        <button className="btn-primary w-full py-4 text-base" disabled={busy} onClick={() => setStatus("OUT_FOR_DEMO", "On the way — customer notified")}>🛵 I&apos;m on the way</button>
      )}

      {(a.status === "OUT_FOR_DEMO" || a.status === "ARRIVED") && (
        <section className="card space-y-3 p-4">
          {a.status === "OUT_FOR_DEMO" && <button className="btn-secondary w-full py-3" disabled={busy} onClick={() => setStatus("ARRIVED", "Marked as arrived")}>📍 I&apos;ve arrived</button>}
          {!a.otpVerified ? (
            <>
              <Field label="Customer's handover OTP" hint="Ask the customer for the 4-digit code shown on their tracking page.">
                <input className="input text-center font-mono text-2xl font-bold tracking-[.5em]" inputMode="numeric" maxLength={4} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} placeholder="••••" />
              </Field>
              <button className="btn-primary w-full py-3" disabled={busy || otp.length !== 4} onClick={() => run(() => api(`/api/delivery/assignments/${id}/verify-otp`, { method: "POST", json: { otp } }), "OTP verified").then(() => setOtp(""))}>Verify OTP</button>
            </>
          ) : (
            <p className="rounded-xl bg-emerald-50 p-3 text-center text-sm font-semibold text-emerald-700">✓ OTP verified</p>
          )}
          {a.status === "ARRIVED" && a.otpVerified && (
            <button className="btn-primary w-full py-4 text-base" disabled={busy} onClick={() => setStatus("DEMO_IN_PROGRESS", "Demo started")}>▶ Start demo</button>
          )}
          <button className="btn-ghost w-full text-red-600" onClick={() => setMode("unavailable")}>Customer unavailable</button>
        </section>
      )}

      {a.status === "DEMO_IN_PROGRESS" && !mode && (
        <section className="card space-y-2 p-4">
          <p className="font-bold">Demo completed — what happened?</p>
          <button className="btn-primary w-full py-3.5" onClick={() => { setMode("purchased"); setAmount(String(a.product.price)); setNotes(""); }}>✅ Purchased</button>
          <button className="btn-secondary w-full py-3.5" onClick={() => { setMode("not"); setNotes(""); }}>❌ Not purchased</button>
        </section>
      )}

      {mode && (
        <section className="card space-y-3 p-4">
          <p className="font-bold">{mode === "purchased" ? "Record the sale" : mode === "not" ? "Why not purchased?" : "Customer unavailable"}</p>
          {mode === "purchased" && <Field label="Amount collected (₹)"><input className="input text-lg font-bold" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} /></Field>}
          <Field label={mode === "not" ? "Reason" : "Notes (optional)"}><textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={mode === "not" ? "Too expensive, wants another colour…" : mode === "unavailable" ? "Not answering the phone, wrong address…" : "Payment mode, accessories…"} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-secondary py-3" onClick={() => setMode(null)} disabled={busy}>Back</button>
            <button className="btn-primary py-3" onClick={complete} disabled={busy}>{busy ? "Saving…" : "Save & close"}</button>
          </div>
        </section>
      )}

      {(a.status === "COMPLETED" || a.status === "CANCELLED") && (
        <section className="card space-y-2 p-4 text-center">
          <p className="text-3xl">{a.status === "CANCELLED" ? "🚫" : "🎉"}</p>
          <p className="font-bold">{a.status === "CANCELLED" ? "This booking was cancelled" : "Demo closed"}</p>
          {a.outcome && <div className="flex items-center justify-center gap-2"><OutcomeBadge outcome={a.outcome} />{a.outcome === "PURCHASED_OFFLINE" && <span className="font-bold">{inr(a.saleAmount)}</span>}</div>}
          <Link href="/delivery" className="btn-primary mt-2 w-full">Back to my deliveries</Link>
        </section>
      )}
    </div>
  );
}
