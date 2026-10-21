import { z } from "zod";
import { clientIp, handler, parseBody } from "@/lib/api";
import { phoneSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { sendPhoneOtp } from "@/lib/otp";

export const dynamic = "force-dynamic";

export const POST = handler(async (req) => {
  const { phone } = await parseBody(req, z.object({ phone: phoneSchema }));
  rateLimit(`otp:ip:${clientIp(req)}`, 10, 15 * 60 * 1000, "Too many code requests. Please wait a few minutes.");
  rateLimit(`otp:phone:${phone}`, 3, 10 * 60 * 1000, "Too many code requests for this number. Please wait a few minutes.");
  const result = await sendPhoneOtp(phone);
  return { sent: true, ...result };
});
