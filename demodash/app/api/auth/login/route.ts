import { handler } from "@/lib/api";
import { loginWithPassword } from "@/lib/login";

export const dynamic = "force-dynamic";

// Staff login (admin + employee; delivery accounts may also use it).
export const POST = handler(async (req) => loginWithPassword(req, ["ADMIN", "EMPLOYEE", "DELIVERY"]));
