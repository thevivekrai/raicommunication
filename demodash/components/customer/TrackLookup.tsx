"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { readStorage } from "@/lib/client";

export function TrackLookup() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [mine, setMine] = useState<string[]>([]);
  useEffect(() => setMine(readStorage<string[]>("dd.bookings", [])), []);

  return (
    <div className="card space-y-4 p-5">
      <div>
        <h1 className="text-xl font-extrabold">Track your demo</h1>
        <p className="text-sm text-slate-600">Enter the booking ID you received (e.g. DD-7K3M9PQ2).</p>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); const c = code.trim().toUpperCase(); if (c) router.push(`/track/${encodeURIComponent(c)}`); }} className="flex gap-2">
        <input className="input font-mono uppercase" value={code} onChange={(e) => setCode(e.target.value)} placeholder="DD-XXXXXXXX" autoCapitalize="characters" aria-label="Booking ID" />
        <button className="btn-primary" disabled={!code.trim()}>Track</button>
      </form>
      {mine.length > 0 && (
        <div>
          <p className="label">Your recent bookings</p>
          <div className="flex flex-wrap gap-2">
            {mine.map((c) => <Link key={c} href={`/track/${c}`} className="chip bg-brand-50 px-3 py-1.5 font-mono text-brand-800">{c}</Link>)}
          </div>
        </div>
      )}
    </div>
  );
}
