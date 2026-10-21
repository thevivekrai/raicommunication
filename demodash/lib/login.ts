import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "./db";
import { ApiError, clientIp, parseBody } from "./api";
import { rateLimit } from "./rate-limit";
import { normalizePhone } from "./validation";
import { SESSION_COOKIE, sessionCookieOptions, signSession, type Role } from "./session";
import { homeForRole } from "./auth";

const schema = z.object({ identifier: z.string().trim().min(3).max(120), password: z.string().min(1).max(200) });

// Pre-computed hash so unknown users cost the same time as wrong passwords.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

export async function loginWithPassword(req: Request, allowed: Role[]) {
  const ip = clientIp(req);
  const { identifier, password } = await parseBody(req, schema);
  const id = identifier.toLowerCase();
  rateLimit(`login:ip:${ip}`, 20, 15 * 60 * 1000, "Too many login attempts. Try again in a few minutes.");
  rateLimit(`login:id:${id}`, 8, 15 * 60 * 1000, "Too many login attempts. Try again in a few minutes.");

  const phone = normalizePhone(identifier);
  const user = await db.user.findFirst({
    where: { OR: [{ email: id }, ...(phone ? [{ phone }] : [])] },
  });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok || !user.isActive) throw new ApiError(401, "Incorrect email/phone or password");
  if (!allowed.includes(user.role)) throw new ApiError(403, "This account cannot sign in here");

  const token = await signSession({ id: user.id, role: user.role, name: user.name });
  const res = NextResponse.json({ user: { id: user.id, name: user.name, role: user.role }, redirect: homeForRole(user.role) });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
