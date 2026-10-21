import { requirePageRole } from "@/lib/auth";
import { StaffShell } from "@/components/staff/StaffShell";

export const dynamic = "force-dynamic";
export const metadata = { title: { default: "Dashboard", template: "%s · Staff" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole(["ADMIN", "EMPLOYEE"]);
  return <StaffShell user={{ name: user.name, role: user.role }}>{children}</StaffShell>;
}
