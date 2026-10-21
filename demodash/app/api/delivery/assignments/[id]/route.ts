import { handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { assignmentRow, getOwnAssignment } from "@/lib/delivery";

export const dynamic = "force-dynamic";

export const GET = handler<{ id: string }>(async (_req, { params }) => {
  const user = await requireRole("DELIVERY");
  return { assignment: assignmentRow(await getOwnAssignment(params.id, user.id)) };
});
