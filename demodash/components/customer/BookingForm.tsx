"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicProduct } from "@/lib/products";
import { inr } from "@/lib/format";
import { api, readStorage, writeStorage } from "@/lib/client";
import { Field, ProductImage } from "@/components/ui";
import { ArrowLeftIcon, CheckIcon, PinIcon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { detectLocation, useSavedLocation } from "./location";

const STEPS = ["Your details", "Address", "Time"];
const SLOT_HOURS = [10, 12, 14, 16, 18]; // 2-hour windows starting at these hours (shop-local)

interface Profile { name: string; phone: string; email: string }

/** Builds the next days' time slots in the browser's timezone (assumed to be the shop's region). */
function buildDays() {
  const out: { label: string; date: Date }[] = [];
  const now = new Date();
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    out.push({ date: d, label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) });
  }
  return out;
}

const fmtHour = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? "am" : "pm"}`;

export function BookingForm({ product, requireOtp }: { product: PublicProduct; requireOtp: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const { loc } = useSavedLocation();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpToken, setOtpToken] = useState<string | null>(null);
  const [otpBusy, setOtpBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  // Step 2
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  // Step 3
  const [asap, setAsap] = useState(true);
  const days = useMemo(buildDays, []);
  const [dayIdx, setDayIdx] = useState(0);
  const [slot, setSlot] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  const phoneOk = /^[6-9]\d{9}$/.test(phone);

  useEffect(() => {
    const saved = readStorage<Profile | null>("dd.profile", null);
    if (saved) { setName(saved.name); setPhone(saved.phone); setEmail(saved.email ?? ""); }
  }, []);
  useEffect(() => {
    if (loc && !address) { setAddress(loc.address); if (loc.lat != null && loc.lng != null) setCoords({ lat: loc.lat, lng: loc.lng }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);
  // Changing the phone number invalidates a previous verification.
  useEffect(() => { setOtpToken(null); setOtpSent(false); setOtp(""); }, [phone]);

  async function sendOtp() {
    setOtpBusy(true);
    try {
      const r = await api<{ devCode?: string }>("/api/otp/send", { method: "POST", json: { phone } });
      setOtpSent(true);
      setCooldown(30);
      toast.success(r.devCode ? `Dev mode — your code is ${r.devCode}` : "Code sent by SMS");
    } catch (e) { toast.error((e as Error).message); }
    finally { setOtpBusy(false); }
  }

  async function verifyOtp() {
    setOtpBusy(true);
    try {
      const r = await api<{ token: string }>("/api/otp/verify", { method: "POST", json: { phone, code: otp } });
      setOtpToken(r.token);
      toast.success("Phone number verified");
    } catch (e) { toast.error((e as Error).message); }
    finally { setOtpBusy(false); }
  }

  async function useMyLocation() {
    setLocating(true);
    try {
      const l = await detectLocation();
      if (l.lat != null && l.lng != null) setCoords({ lat: l.lat, lng: l.lng });
      if (l.address) setAddress(l.address); else toast.info("Location captured. Please add your house / flat details.");
    } catch (e) { toast.error((e as Error).message); }
    finally { setLocating(false); }
  }

  function validate(s: number) {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (name.trim().length < 2) e.name = "Enter your full name";
      if (!phoneOk) e.phone = "Enter a valid 10-digit mobile number";
      if (email && !/^\S+@\S+\.\S+$/.test(email)) e.email = "Enter a valid email or leave it blank";
      if (requireOtp && !otpToken && phoneOk) e.otp = "Please verify your phone number";
    }
    if (s === 1 && address.trim().length < 10) e.address = "Please enter your complete address (house no., street, area, city)";
    if (s === 2 && !asap && slot == null) e.slot = "Pick a time slot";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() { if (validate(step)) setStep(step + 1); }

  async function submit() {
    if (!validate(2)) return;
    let preferredTime: string | null = null;
    if (!asap && slot != null) {
      const d = new Date(days[dayIdx].date); d.setHours(slot, 0, 0, 0);
      preferredTime = d.toISOString();
    }
    setSubmitting(true);
    try {
      const r = await api<{ code: string }>("/api/bookings", {
        method: "POST",
        json: { productId: product.id, name: name.trim(), phone, email: email.trim() || null, address: address.trim(), lat: coords?.lat ?? null, lng: coords?.lng ?? null, preferredTime, notes: notes.trim() || null, otpToken },
      });
      writeStorage("dd.profile", { name: name.trim(), phone, email: email.trim() });
      const mine = readStorage<string[]>("dd.bookings", []);
      writeStorage("dd.bookings", [r.code, ...mine.filter((c) => c !== r.code)].slice(0, 10));
      router.push(`/confirmation/${r.code}`);
    } catch (e) {
      toast.error((e as Error).message);
      setSubmitting(false);
    }
  }

  const slotDisabled = (h: number) => {
    if (dayIdx !== 0) return false;
    return new Date().getHours() >= h; // can't book a window that has already started
  };

  return (
    <div className="mx-auto min-h-screen max-w-xl pb-28">
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => (step === 0 ? router.back() : setStep(step - 1))} className="btn-ghost -ml-2 px-2" aria-label="Back"><ArrowLeftIcon /></button>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">Book a free demo</p><p className="text-xs text-slate-500">Step {step + 1} of 3 · {STEPS[step]}</p></div>
        </div>
        <div className="mt-3 flex gap-1.5" aria-hidden>{STEPS.map((_, i) => <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand-600" : "bg-slate-200"}`} />)}</div>
      </header>

      <main className="space-y-4 px-4 pt-4">
        <div className="card flex items-center gap-3 p-3">
          <ProductImage src={product.images[0]} alt={product.name} className="h-16 w-16 shrink-0 rounded-xl" />
          <div className="min-w-0"><p className="truncate font-bold">{product.name}</p><p className="text-xs text-slate-500">{product.ramStorage} · {product.color}</p><p className="text-sm font-extrabold">{inr(product.price)}</p></div>
        </div>

        {step === 0 && (
          <section className="card space-y-4 p-4">
            <Field label="Full name" error={errors.name}><input className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Anita Sharma" /></Field>
            <Field label="Mobile number" error={errors.phone} hint="We'll call this number when the delivery partner is close.">
              <div className="flex gap-2">
                <span className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-600">+91</span>
                <input className="input" inputMode="numeric" autoComplete="tel-national" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="10-digit number" />
              </div>
            </Field>

            {requireOtp && phoneOk && (
              <div className="rounded-xl bg-brand-50 p-3">
                {otpToken ? (
                  <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckIcon width={18} height={18} /> Phone number verified</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-brand-900">Verify your number with a 4-digit code.</p>
                    {!otpSent ? (
                      <button className="btn-primary btn-sm" onClick={sendOtp} disabled={otpBusy}>{otpBusy ? "Sending…" : "Send code"}</button>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <input className="input w-32 text-center text-lg font-bold tracking-[.4em]" inputMode="numeric" maxLength={4} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} placeholder="••••" aria-label="Verification code" />
                        <button className="btn-primary btn-sm" onClick={verifyOtp} disabled={otpBusy || otp.length !== 4}>Verify</button>
                        <button className="btn-ghost btn-sm" onClick={sendOtp} disabled={otpBusy || cooldown > 0}>{cooldown > 0 ? `Resend in ${cooldown}s` : "Resend"}</button>
                      </div>
                    )}
                  </div>
                )}
                {errors.otp && <p className="mt-1 text-xs text-red-600">{errors.otp}</p>}
              </div>
            )}

            <Field label="Email (optional)" error={errors.email} hint="For a booking confirmation."><input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></Field>
          </section>
        )}

        {step === 1 && (
          <section className="card space-y-4 p-4">
            <button onClick={useMyLocation} disabled={locating} className="btn-secondary w-full text-brand-700"><PinIcon width={18} height={18} />{locating ? "Detecting location…" : "Use my current location"}</button>
            {coords && <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><CheckIcon width={14} height={14} /> Location pinned — helps our rider find you faster</p>}
            <Field label="Delivery address" error={errors.address} hint="Include flat / house number and a landmark.">
              <textarea className="input" rows={4} autoComplete="street-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Flat 4B, Sunrise Apartments, 12th Main, Indiranagar, Bengaluru 560038" />
            </Field>
          </section>
        )}

        {step === 2 && (
          <section className="card space-y-4 p-4">
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Demo time">
              <button role="radio" aria-checked={asap} onClick={() => setAsap(true)} className={`rounded-xl border-2 p-3 text-left ${asap ? "border-brand-600 bg-brand-50" : "border-slate-200"}`}>
                <p className="font-bold">⚡ ASAP</p><p className="text-xs text-slate-500">As soon as a rider is free</p>
              </button>
              <button role="radio" aria-checked={!asap} onClick={() => setAsap(false)} className={`rounded-xl border-2 p-3 text-left ${!asap ? "border-brand-600 bg-brand-50" : "border-slate-200"}`}>
                <p className="font-bold">🗓️ Schedule</p><p className="text-xs text-slate-500">Pick a slot</p>
              </button>
            </div>
            {!asap && (
              <div className="space-y-3">
                <div className="no-scrollbar flex gap-2 overflow-x-auto">
                  {days.map((d, i) => (
                    <button key={d.label} onClick={() => { setDayIdx(i); setSlot(null); }} className={`chip shrink-0 px-4 py-2 text-sm ${dayIdx === i ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700"}`}>{d.label}</button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {SLOT_HOURS.map((h) => (
                    <button key={h} disabled={slotDisabled(h)} onClick={() => setSlot(h)} className={`rounded-xl border px-2 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${slot === h ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200"}`}>
                      {fmtHour(h)}–{fmtHour(h + 2)}
                    </button>
                  ))}
                </div>
                {errors.slot && <p className="text-xs text-red-600">{errors.slot}</p>}
              </div>
            )}
            <Field label="Notes for the rider (optional)"><textarea className="input" rows={2} maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Gate code, call before arriving, etc." /></Field>

            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
              <p className="font-bold">Summary</p>
              <p>{name} · +91 {phone}</p>
              <p className="line-clamp-2">{address}</p>
              <p className="mt-1 text-xs text-slate-500">Free demo. Pay only if you decide to buy — directly to our delivery partner.</p>
            </div>
          </section>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white p-3">
        <div className="mx-auto max-w-xl">
          {step < 2 ? (
            <button className="btn-primary w-full py-3.5 text-base" onClick={next}>Continue</button>
          ) : (
            <button className="btn-primary w-full py-3.5 text-base" onClick={submit} disabled={submitting}>{submitting ? "Booking…" : "Confirm free demo"}</button>
          )}
          {step === 0 && <p className="mt-1.5 text-center text-xs text-slate-500">Already booked? <Link href="/track" className="font-semibold text-brand-700">Track your demo</Link></p>}
        </div>
      </div>
    </div>
  );
}
