"use client";
import { useState } from "react";
import { api, useApi } from "@/lib/client";
import { ErrorState, Field } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { TableSkeleton } from "./common";

interface U { id: string; role: string; name: string; email: string | null; phone: string | null; isActive: boolean; deliveryProfile: { vehicle: string | null } | null }

export function TeamAdmin() {
  const toast = useToast();
  const { data, error, loading, reload } = useApi<{ users: U[] }>("/api/admin/users");
  const [role, setRole] = useState<"EMPLOYEE" | "DELIVERY">("DELIVERY");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", vehicle: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/admin/users", { method: "POST", json: { role, name: form.name, email: form.email || null, phone: form.phone, password: form.password, vehicle: form.vehicle || null } });
      toast.success(`${role === "DELIVERY" ? "Delivery partner" : "Employee"} created`);
      setForm({ name: "", email: "", phone: "", password: "", vehicle: "" });
      reload();
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  }

  async function patch(id: string, body: object, ok: string) {
    try { await api(`/api/admin/users/${id}`, { method: "PATCH", json: body }); toast.success(ok); reload(); } catch (err) { toast.error((err as Error).message); }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <section className="card overflow-hidden lg:col-span-2">
        {error ? <ErrorState message={error} onRetry={reload} /> : loading && !data ? <TableSkeleton /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-100"><tr><th className="th">Name</th><th className="th">Role</th><th className="th">Login</th><th className="th" /></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data?.users.map((u) => (
                  <tr key={u.id} className={u.isActive ? "" : "opacity-50"}>
                    <td className="td"><p className="font-semibold">{u.name}</p>{u.deliveryProfile?.vehicle && <p className="text-xs text-slate-500">{u.deliveryProfile.vehicle}</p>}</td>
                    <td className="td"><span className="chip bg-brand-50 capitalize text-brand-800">{u.role.toLowerCase()}</span></td>
                    <td className="td text-xs text-slate-600">{u.email}<br />{u.phone}</td>
                    <td className="td whitespace-nowrap text-right">
                      {u.role !== "ADMIN" && <>
                        <button className="btn-ghost btn-sm" onClick={() => { const pw = prompt(`New password for ${u.name} (min 8 characters)`); if (pw) patch(u.id, { password: pw }, "Password updated"); }}>Reset password</button>
                        <button className="btn-ghost btn-sm" onClick={() => patch(u.id, { isActive: !u.isActive }, u.isActive ? "Deactivated" : "Activated")}>{u.isActive ? "Deactivate" : "Activate"}</button>
                      </>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <form onSubmit={create} className="card h-fit space-y-3 p-5">
        <h2 className="font-bold">Add team member</h2>
        <div className="grid grid-cols-2 gap-2" role="radiogroup">
          {(["DELIVERY", "EMPLOYEE"] as const).map((r) => (
            <button type="button" key={r} role="radio" aria-checked={role === r} onClick={() => setRole(r)} className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold ${role === r ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200"}`}>{r === "DELIVERY" ? "Delivery" : "Employee"}</button>
          ))}
        </div>
        <Field label="Full name"><input className="input" value={form.name} onChange={set("name")} required minLength={2} /></Field>
        <Field label="Phone (10 digits)"><input className="input" inputMode="numeric" value={form.phone} onChange={set("phone")} required /></Field>
        <Field label={role === "EMPLOYEE" ? "Email (login)" : "Email (optional)"}><input className="input" type="email" value={form.email} onChange={set("email")} required={role === "EMPLOYEE"} /></Field>
        {role === "DELIVERY" && <Field label="Vehicle"><input className="input" value={form.vehicle} onChange={set("vehicle")} placeholder="Bike · KA 01 AB 1234" /></Field>}
        <Field label="Password" hint="Min 8 characters. Share it with them privately."><input className="input" type="text" value={form.password} onChange={set("password")} required minLength={8} /></Field>
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
      </form>
    </div>
  );
}
