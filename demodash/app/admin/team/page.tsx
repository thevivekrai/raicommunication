import { requirePageRole } from "@/lib/auth";
import { PageHeader } from "@/components/staff/common";
import { TeamAdmin } from "@/components/staff/TeamAdmin";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  await requirePageRole(["ADMIN"]);
  return (
    <>
      <PageHeader title="Team" subtitle="Create logins for employees and delivery partners." />
      <TeamAdmin />
    </>
  );
}
