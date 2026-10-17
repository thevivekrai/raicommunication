"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Field } from "@/components/ui";
import { useToast } from "@/components/Toast";

export function LoginForm({ delivery }: { delivery: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api<{ redirect: string }>(delivery ? "/api/delivery/login" : "/api/auth/login", { method: "POST", json: { identifier, password } });
      router.replace(r.redirect);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-5">
      <div>
        <h1 className="text-xl font-extrabold">{delivery ? "Delivery partner login" : "Staff login"}</h1>
        <p className="text-sm text-slate-600">{delivery ? "Use the phone number and password your manager gave you." : "For the shop owner and employees."}</p>
      </div>
      <Field label={delivery ? "Phone number" : "Email or phone"}>
        <input className="input" autoComplete="username" inputMode={delivery ? "tel" : "email"} value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
      </Field>
      <Field label="Password">
        <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </Field>
      <button className="btn-primary w-full py-3" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      <p className="text-center text-xs text-slate-500">
        {delivery ? <Link href="/login" className="font-semibold text-brand-700">Owner / employee login</Link> : <Link href="/login?as=delivery" className="font-semibold text-brand-700">Delivery partner login</Link>}
        {" · "}<Link href="/" className="font-semibold text-brand-700">Back to shop</Link>
      </p>
    </form>
  );
}
