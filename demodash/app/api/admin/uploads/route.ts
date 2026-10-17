import { ApiError, handler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { storeImage } from "@/lib/upload";

export const dynamic = "force-dynamic";

export const POST = handler(async (req) => {
  await requireRole("ADMIN", "EMPLOYEE");
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "Attach an image in the 'file' field");
  return { url: await storeImage(file) };
});
