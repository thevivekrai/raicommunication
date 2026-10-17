import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { ApiError } from "./api";
import { SESSION_COOKIE, verifySession, type Role, type SessionUser } from "./session";

/** Current session user (re-checked against the DB so deactivated users lose access immediately). */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.id },
    select: { id: true, role: true, name: true, isActive: true },
  });
  if (!user || !user.isActive) return null;
  return { id: user.id, role: user.role, name: user.name };
}

/** For route handlers: throws ApiError(401/403) if the caller lacks one of the roles. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "Please log in");
  if (!roles.includes(user.role)) throw new ApiError(403, "You do not have permission to do that");
  return user;
}

/** For server components / layouts: redirects instead of throwing. */
export async function requirePageRole(roles: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!roles.includes(user.role)) redirect(user.role === "DELIVERY" ? "/delivery" : "/login");
  return user;
}

export function homeForRole(role: Role) {
  return role === "DELIVERY" ? "/delivery" : "/admin";
}
