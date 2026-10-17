import { createHash, randomInt } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";
import { ApiError } from "./api";
import { authSecret, config } from "./config";
import { sendSms } from "./notify";

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const hash = (phone: string, code: string) =>
  createHash("sha256").update(`${phone}:${code}:${Buffer.from(authSecret()).toString("base64")}`).digest("hex");

export async function sendPhoneOtp(phone: string): Promise<{ devCode?: string }> {
  const code = String(randomInt(0, 10000)).padStart(4, "0");
  await db.phoneOtp.create({
    data: { phone, codeHash: hash(phone, code), expiresAt: new Date(Date.now() + OTP_TTL_MS) },
  });
  await sendSms("PHONE_OTP", phone, `${code} is your ${config.shopName} verification code. Valid for 5 minutes.`);
  const provider = (process.env.SMS_PROVIDER || "console").toLowerCase();
  // In local dev with the console provider, hand the code back so the flow can be tested without an SMS gateway.
  return !config.isProd && provider === "console" ? { devCode: code } : {};
}

export async function verifyPhoneOtp(phone: string, code: string): Promise<string> {
  const record = await db.phoneOtp.findFirst({
    where: { phone, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!record) throw new ApiError(400, "Code expired. Please request a new one.");
  if (record.attempts >= MAX_ATTEMPTS) throw new ApiError(429, "Too many wrong attempts. Request a new code.");

  if (record.codeHash !== hash(phone, code)) {
    await db.phoneOtp.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    throw new ApiError(400, "Incorrect code");
  }
  await db.phoneOtp.update({ where: { id: record.id }, data: { usedAt: new Date() } });

  return new SignJWT({ phone, purpose: "phone-verified" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30m")
    .sign(authSecret());
}

export async function assertPhoneToken(token: string | null | undefined, phone: string) {
  if (!config.requirePhoneOtp) return;
  if (!token) throw new ApiError(400, "Please verify your phone number first");
  try {
    const { payload } = await jwtVerify(token, authSecret());
    if (payload.purpose !== "phone-verified" || payload.phone !== phone) throw new Error("mismatch");
  } catch {
    throw new ApiError(400, "Phone verification expired. Please verify again.");
  }
}
