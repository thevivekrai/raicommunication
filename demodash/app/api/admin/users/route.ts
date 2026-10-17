import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { ApiError, handler, parseBody } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { userCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  await requireRole("ADMIN");
  const users = await db.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, role: true, name: true, email: true, phone: true, isActive: true, createdAt: true, deliveryProfile: { select: { vehicle: true, photo: true } } },
  });
  return { users };
});

/** Admin creates employee and delivery accounts (no public sign-up). */
export const POST = handler(async (req) => {
  await requireRole("ADMIN");
  const input = await parseBody(req, userCreateSchema);
  if (input.role === "EMPLOYEE" && !input.email) throw new ApiError(400, "Email is required for employees");
  const taken = await db.user.findFirst({
    where: { OR: [{ phone: input.phone }, ...(input.email ? [{ email: input.email.toLowerCase() }] : [])] },
    select: { id: true },
  });
  if (taken) throw new ApiError(409, "A user with that phone or email already exists");

  const user = await db.user.create({
    data: {
      role: input.role,
      name: input.name,
      email: input.email?.toLowerCase() ?? null,
      phone: input.phone,
      passwordHash: await bcrypt.hash(input.password, 10),
      ...(input.role === "DELIVERY"
        ? { deliveryProfile: { create: { name: input.name, phone: input.phone, vehicle: input.vehicle, photo: input.photo } } }
        : {}),
    },
    select: { id: true, role: true, name: true },
  });
  return Response.json({ user }, { status: 201 });
});
