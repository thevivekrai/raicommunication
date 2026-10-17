"use client";
import { useCallback, useEffect, useState } from "react";
import { api, readStorage, writeStorage } from "@/lib/client";

export interface SavedLocation {
  address: string;
  lat: number | null;
  lng: number | null;
}

const KEY = "dd.location";
const EVENT = "dd:location";

export function useSavedLocation() {
  const [loc, setLoc] = useState<SavedLocation | null>(null);
  useEffect(() => {
    setLoc(readStorage<SavedLocation | null>(KEY, null));
    const onChange = () => setLoc(readStorage<SavedLocation | null>(KEY, null));
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);
  const save = useCallback((l: SavedLocation) => {
    writeStorage(KEY, l);
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return { loc, save };
}

/** Browser geolocation -> reverse-geocoded address. Rejects with a user-friendly Error. */
export async function detectLocation(): Promise<SavedLocation> {
  if (!("geolocation" in navigator)) throw new Error("Your browser doesn't support location. Please type your address.");
  const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }),
  ).catch((e: GeolocationPositionError) => {
    throw new Error(e.code === 1 ? "Location permission was denied. You can type your address instead." : "Couldn't get your location. Please type your address.");
  });
  const { latitude: lat, longitude: lng } = pos.coords;
  try {
    const { address } = await api<{ address: string }>(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
    return { address, lat, lng };
  } catch {
    // We still have coordinates — keep them and let the customer type the address text.
    return { address: "", lat, lng };
  }
}
