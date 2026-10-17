export const config = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || "DemoDash",
  shopName: process.env.SHOP_NAME || "Rai Communication",
  timezone: process.env.SHOP_TIMEZONE || "Asia/Kolkata",
  appUrl: (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, ""),
  requirePhoneOtp: (process.env.REQUIRE_PHONE_OTP ?? "true") === "true",
  isProd: process.env.NODE_ENV === "production",
};

export function authSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 24) {
    if (config.isProd) throw new Error("AUTH_SECRET must be set (>= 24 chars) in production");
    return new TextEncoder().encode("dev-only-insecure-secret-do-not-use-in-prod");
  }
  return new TextEncoder().encode(secret);
}
