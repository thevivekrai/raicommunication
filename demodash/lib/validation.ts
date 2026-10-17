import { z } from "zod";

/** Normalises an Indian mobile number to 10 digits, or returns null. */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  // Strip country code / trunk prefix only when the length proves it is one (a bare 10-digit number may itself start with 91).
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

export const phoneSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const n = normalizePhone(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "Enter a valid 10-digit mobile number" });
      return z.NEVER;
    }
    return n;
  });

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const bookingSchema = z.object({
  productId: z.string().min(1),
  name: z.string().trim().min(2, "Enter your full name").max(80),
  phone: phoneSchema,
  email: z.string().trim().email("Enter a valid email").max(120).optional().nullable().or(z.literal("").transform(() => null)),
  address: z.string().trim().min(10, "Please enter a complete delivery address").max(400),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  preferredTime: z.string().datetime().optional().nullable(), // null/undefined = ASAP
  notes: optionalText(300),
  otpToken: z.string().optional().nullable(),
});

export const productSchema = z.object({
  brand: z.string().trim().min(1, "Brand is required").max(40),
  model: z.string().trim().min(1, "Model is required").max(80),
  price: z.coerce.number().int().min(1, "Price must be greater than 0").max(10_000_000),
  ramStorage: z.string().trim().min(1, "RAM / storage is required").max(40),
  color: z.string().trim().min(1, "Color is required").max(40),
  shortDescription: optionalText(240),
  specs: z.record(z.string().max(60), z.string().max(200)).default({}),
  images: z.array(z.string().max(500)).max(8).default([]),
  demoAvailable: z.boolean().default(true),
  category: z.string().trim().min(1).max(30).default("MOBILE"),
});

export const statusEnum = z.enum(["PENDING", "ASSIGNED", "OUT_FOR_DEMO", "ARRIVED", "DEMO_IN_PROGRESS", "COMPLETED", "CANCELLED"]);
export const outcomeEnum = z.enum(["PURCHASED_OFFLINE", "NOT_PURCHASED", "CUSTOMER_UNAVAILABLE"]);

export const outcomeInputSchema = z
  .object({
    outcome: outcomeEnum,
    saleAmount: z.coerce.number().int().min(1).max(10_000_000).optional().nullable(),
    notes: optionalText(500),
  })
  .superRefine((v, ctx) => {
    if (v.outcome === "PURCHASED_OFFLINE" && !v.saleAmount) {
      ctx.addIssue({ code: "custom", path: ["saleAmount"], message: "Sale amount is required for a purchase" });
    }
    if (v.outcome === "NOT_PURCHASED" && !v.notes) {
      ctx.addIssue({ code: "custom", path: ["notes"], message: "Please add the reason" });
    }
  });

export const userCreateSchema = z.object({
  role: z.enum(["EMPLOYEE", "DELIVERY"]),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120).optional().nullable().or(z.literal("").transform(() => null)),
  phone: phoneSchema,
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  vehicle: optionalText(60),
  photo: optionalText(500),
});

/** yyyy-mm-dd */
export const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
