import { readFile } from "fs/promises";
import path from "path";
import { UPLOAD_DIR } from "@/lib/upload";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

// Serves locally stored uploads (used when Cloudinary isn't configured).
export async function GET(_req: Request, { params }: { params: { name: string } }) {
  const name = params.name;
  const ext = name.split(".").pop() ?? "";
  if (!/^[\w-]+\.(jpg|png|webp)$/.test(name) || !TYPES[ext]) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(path.join(UPLOAD_DIR, name));
    return new Response(data, { headers: { "Content-Type": TYPES[ext], "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
