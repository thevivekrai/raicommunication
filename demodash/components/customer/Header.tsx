"use client";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/ui";
import { ChevronIcon, PinIcon, SearchIcon, XIcon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { detectLocation, useSavedLocation } from "./location";

export function Header({ search, onSearch }: { search?: string; onSearch?: (v: string) => void }) {
  const { loc, save } = useSavedLocation();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const short = loc?.address ? loc.address.split(",").slice(0, 2).join(",") : "Set your location";

  async function useCurrent() {
    setBusy(true);
    try {
      const l = await detectLocation();
      if (!l.address) toast.info("Got your location — please add your address text in the booking form.");
      save({ ...l, address: l.address || draft });
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pt-3">
        <Logo />
        <Link href="/track" className="btn-ghost btn-sm">Track demo</Link>
      </div>
      <div className="mx-auto max-w-6xl px-4 pt-1">
        <button onClick={() => { setDraft(loc?.address ?? ""); setOpen(true); }} className="flex max-w-full items-center gap-1.5 py-1 text-left text-sm" aria-label="Change location">
          <PinIcon className="shrink-0 text-brand-600" width={18} height={18} />
          <span className="truncate font-semibold text-slate-800">{short}</span>
          <ChevronIcon width={16} height={16} className="shrink-0 text-slate-500" />
        </button>
      </div>
      {onSearch && (
        <div className="mx-auto max-w-6xl px-4 pb-3 pt-1">
          <div className="relative">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search ?? ""}
              onChange={(e) => onSearch(e.target.value)}
              placeholder='Search "Samsung", "5G", "iPhone"…'
              className="input rounded-2xl bg-slate-50 pl-11"
              aria-label="Search phones"
            />
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md animate-slide-up rounded-t-3xl bg-white p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Choose delivery location">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Where should we bring the phone?</h2>
              <button onClick={() => setOpen(false)} className="btn-ghost btn-sm" aria-label="Close"><XIcon width={18} height={18} /></button>
            </div>
            <button onClick={useCurrent} disabled={busy} className="btn-secondary mb-3 w-full text-brand-700">
              <PinIcon width={18} height={18} /> {busy ? "Detecting…" : "Use my current location"}
            </button>
            <label className="label" htmlFor="addr">Or type your address</label>
            <textarea id="addr" rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} className="input" placeholder="House no., street, area, city, pincode" />
            <button
              className="btn-primary mt-3 w-full"
              disabled={draft.trim().length < 6}
              onClick={() => { save({ address: draft.trim(), lat: loc?.lat ?? null, lng: loc?.lng ?? null }); setOpen(false); }}
            >
              Save address
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
