"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export class FetchError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, init?: Omit<RequestInit, "body"> & { json?: unknown; body?: BodyInit }): Promise<T> {
  const { json, headers, ...rest } = init ?? {};
  const res = await fetch(path, {
    ...rest,
    headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new FetchError(res.status, (data as { error?: string }).error || "Something went wrong");
  return data as T;
}

/** Fetches `url` immediately and (optionally) every `intervalMs`; pauses while the tab is hidden. */
export function useApi<T>(url: string | null, intervalMs = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const urlRef = useRef(url);
  urlRef.current = url;

  const load = useCallback(async (silent = false) => {
    const u = urlRef.current;
    if (!u) return;
    if (!silent) setLoading(true);
    try {
      const d = await api<T>(u);
      if (u === urlRef.current) {
        setData(d);
        setError(null);
      }
    } catch (e) {
      if (u === urlRef.current) setError((e as Error).message);
    } finally {
      if (u === urlRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setData(null);
    load();
    if (!intervalMs) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") load(true);
    }, intervalMs);
    return () => clearInterval(t);
  }, [url, intervalMs, load]);

  return { data, error, loading, reload: () => load(true) };
}

export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Tiny localStorage-backed state that never throws (private mode, SSR). */
export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function qs(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : "";
}
