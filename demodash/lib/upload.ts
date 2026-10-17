import { createHash, randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { ApiError } from "./api";
import { config } from "./config";

const ALLOWED: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const UPLOAD_DIR = path.join(process.cwd(), ".uploads");

function sniff(buf: Buffer): string | null {
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "image/webp";
  return null;
}

/** Stores an image and returns its public URL. Cloudinary when configured, else local disk (dev / self-hosted). */
export async function storeImage(file: File): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) throw new ApiError(400, "Image must be 5 MB or smaller");
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniff(buf);
  if (!mime || !ALLOWED[mime]) throw new ApiError(400, "Only JPG, PNG or WebP images are allowed");

  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (cloud && key && secret) {
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = process.env.CLOUDINARY_FOLDER || "demodash";
    const signature = createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${secret}`).digest("hex");
    const form = new FormData();
    form.set("file", new Blob([buf], { type: mime }), `upload.${ALLOWED[mime]}`);
    form.set("api_key", key);
    form.set("timestamp", String(timestamp));
    form.set("folder", folder);
    form.set("signature", signature);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body: form });
    if (!res.ok) throw new ApiError(502, "Image upload failed (Cloudinary)");
    const json = (await res.json()) as { secure_url: string };
    return json.secure_url;
  }

  if (config.isProd && process.env.UPLOAD_LOCAL !== "true") {
    throw new ApiError(
      503,
      "Image storage is not configured. Set the CLOUDINARY_* variables (serverless hosts have no persistent disk).",
    );
  }
  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${ALLOWED[mime]}`;
  await writeFile(path.join(UPLOAD_DIR, name), buf);
  return `/uploads/${name}`;
}
