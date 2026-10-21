import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, handler, parseBody } from "@/lib/api";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  isActive: z.boolean().optional(),
  password: z.string().min(8).max(100).optional(),
});

export const PATCH = handler<{ id: string }>(async (req, { params }) => {
  const admin = await requireRole("ADMIN");
  const input = await parseBody(req, schema);
  const user = await db.user.findUnique({ where: { id: params.id } });
  if (!user) throw new ApiError(404, "User not found");
  if (user.id === admin.id && input.isActive === false) throw new ApiError(400, "You can't deactivate your own account");
  await db.user.update({
    where: { id: user.id },
    data: {
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.password ? { passwordHash: await bcrypt.hash(input.password, 10) } : {}),
    },
  });
  return { ok: true };
});
