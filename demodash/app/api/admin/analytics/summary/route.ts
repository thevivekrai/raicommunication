import { handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { analyticsSummary } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  await requireRole("ADMIN", "EMPLOYEE");
  return analyticsSummary();
});
