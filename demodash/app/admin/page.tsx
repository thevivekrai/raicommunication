import { requirePageRole } from "@/lib/auth";
import { Dashboard } from "@/components/staff/Dashboard";

export default async function AdminHome() {
  const user = await requirePageRole(["ADMIN", "EMPLOYEE"]);
  return <Dashboard role={user.role} name={user.name} />;
}
