import { handler } from "@/lib/api";
import { loginWithPassword } from "@/lib/login";

export const dynamic = "force-dynamic";

// Delivery partners sign in with the phone number (or email) + password an admin created for them.
export const POST = handler(async (req) => loginWithPassword(req, ["DELIVERY"]));
