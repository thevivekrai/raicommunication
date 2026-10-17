"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/ui";
import { BoxIcon, ChartIcon, HomeIcon, ListIcon, LogoutIcon, MenuIcon, UsersIcon, XIcon } from "@/components/Icons";
import { api } from "@/lib/client";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: HomeIcon, roles: ["ADMIN", "EMPLOYEE"], exact: true },
  { href: "/admin/bookings", label: "All bookings", icon: ListIcon, roles: ["ADMIN", "EMPLOYEE"] },
  { href: "/admin/analytics", label: "Demo analytics", icon: ChartIcon, roles: ["ADMIN", "EMPLOYEE"] },
  { href: "/admin/products", label: "Products", icon: BoxIcon, roles: ["ADMIN", "EMPLOYEE"] },
  { href: "/admin/team", label: "Team", icon: UsersIcon, roles: ["ADMIN"] },
];

export function StaffShell({ user, children }: { user: { name: string; role: string }; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const items = NAV.filter((n) => n.roles.includes(user.role));

  async function logout() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
    router.refresh();
  }

  const links = (
    <nav className="space-y-1">
      {items.map((n) => {
        const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${active ? "bg-brand-600 text-white" : "text-slate-700 hover:bg-slate-100"}`}>
            <n.icon width={18} height={18} /> {n.label}
          </Link>
        );
      })}
    </nav>
  );

  const account = (
    <div className="border-t border-slate-100 pt-3">
      <p className="truncate text-sm font-bold">{user.name}</p>
      <p className="mb-2 text-xs capitalize text-slate-500">{user.role.toLowerCase()}</p>
      <button onClick={logout} className="btn-secondary btn-sm w-full"><LogoutIcon width={16} height={16} /> Log out</button>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col justify-between border-r border-slate-200 bg-white p-4 lg:flex">
        <div className="space-y-6"><Logo />{links}</div>
        {account}
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <Logo />
        <button onClick={() => setOpen(true)} className="btn-ghost px-2" aria-label="Open menu"><MenuIcon /></button>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setOpen(false)}>
          <div className="flex h-full w-72 max-w-[85%] animate-slide-up flex-col justify-between bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-6">
              <div className="flex items-center justify-between"><Logo /><button onClick={() => setOpen(false)} className="btn-ghost px-2" aria-label="Close menu"><XIcon /></button></div>
              {links}
            </div>
            {account}
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1 p-4 sm:p-6">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
