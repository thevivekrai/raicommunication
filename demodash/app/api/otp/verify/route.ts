import { z } from "zod";
import { clientIp, handler, parseBody } from "@/lib/api";
import { phoneSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { verifyPhoneOtp } from "@/lib/otp";

export const dynamic = "force-dynamic";

export const POST = handler(async (req) => {
  rateLimit(`otpv:ip:${clientIp(req)}`, 30, 15 * 60 * 1000);
  const { phone, code } = await parseBody(req, z.object({ phone: phoneSchema, code: z.string().regex(/^\d{4}$/, "Enter the 4-digit code") }));
  const token = await verifyPhoneOtp(phone, code);
  return { token };
});
