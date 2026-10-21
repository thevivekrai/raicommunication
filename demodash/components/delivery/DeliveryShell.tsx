"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui";
import { LogoutIcon } from "@/components/Icons";
import { api } from "@/lib/client";
import { useToast } from "@/components/Toast";

const SHARE_STATUSES = ["OUT_FOR_DEMO", "ARRIVED", "DEMO_IN_PROGRESS"];

/**
 * Persistent shell for the rider app. While the rider is on duty AND has a job that is on the way / in progress,
 * it streams the phone's GPS position to the server (at most every 10s) so the customer's tracking page can show it.
 */
export function DeliveryShell({ name, children }: { name: string; children: React.ReactNode }) {
  const router = useRouter();
  const toast = useToast();
  const [onDuty, setOnDuty] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const lastSent = useRef(0);
  const watchId = useRef<number | null>(null);

  const shouldShare = useCallback(async () => {
    try {
      const r = await api<{ active: { status: string }[]; isAvailable: boolean }>("/api/delivery/assignments");
      setOnDuty(r.isAvailable);
      return r.isAvailable && r.active.some((a) => SHARE_STATUSES.includes(a.status));
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const stop = () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      setSharing(false);
    };
    const start = () => {
      if (watchId.current != null || !("geolocation" in navigator)) return;
      watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          setGeoError(null);
          setSharing(true);
          if (Date.now() - lastSent.current < 10000) return;
          lastSent.current = Date.now();
          api("/api/delivery/location", { method: "PATCH", json: { lat: pos.coords.latitude, lng: pos.coords.longitude } }).catch(() => {});
        },
        (err) => setGeoError(err.code === 1 ? "Location permission is off — customers can't see you on the map." : "Can't get GPS location"),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
      );
    };
    const tick = async () => {
      const want = await shouldShare();
      if (cancelled) return;
      want ? start() : stop();
    };
    tick();
    const t = setInterval(tick, 15000);
    return () => { cancelled = true; clearInterval(t); stop(); };
  }, [shouldShare]);

  async function toggleDuty() {
    const next = !onDuty;
    try { await api("/api/delivery/location", { method: "PATCH", json: { isAvailable: next } }); setOnDuty(next); toast.info(next ? "You're on duty" : "You're off duty"); }
    catch (e) { toast.error((e as Error).message); }
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/login?as=delivery");
    router.refresh();
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <button onClick={toggleDuty} role="switch" aria-checked={onDuty} className={`chip px-3 py-1.5 ${onDuty ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>{onDuty ? "● On duty" : "○ Off duty"}</button>
            <button onClick={logout} className="btn-ghost px-2" aria-label="Log out"><LogoutIcon /></button>
          </div>
        </div>
        <p className="mt-1 text-xs text-slate-500">Hi {name.split(" ")[0]}{sharing ? " · 📡 sharing live location" : ""}</p>
        {geoError && <p className="mt-1 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800">{geoError}</p>}
      </header>
      <main className="px-4 pb-24 pt-4">{children}</main>
    </div>
  );
}
