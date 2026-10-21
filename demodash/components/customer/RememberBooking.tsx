"use client";
import { useEffect } from "react";
import { readStorage, writeStorage } from "@/lib/client";

/** Remembers booking codes on this device so "Track demo" can offer them. */
export function RememberBooking({ code }: { code: string }) {
  useEffect(() => {
    const mine = readStorage<string[]>("dd.bookings", []);
    writeStorage("dd.bookings", [code, ...mine.filter((c) => c !== code)].slice(0, 10));
  }, [code]);
  return null;
}
