import { getSessionUser } from "@/lib/auth";
import { handler } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = handler(async () => ({ user: await getSessionUser() }));
