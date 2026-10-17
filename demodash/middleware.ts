import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// Fast gate for the staff/delivery areas. Route handlers and layouts still re-check role + active status in the DB.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  const isAdminArea = pathname.startsWith("/admin");
  const isDeliveryArea = pathname.startsWith("/delivery");

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = isDeliveryArea ? "?as=delivery" : "";
    return NextResponse.redirect(url);
  }
  if (isAdminArea && session.role === "DELIVERY") return NextResponse.redirect(new URL("/delivery", req.url));
  if (isDeliveryArea && session.role !== "DELIVERY") return NextResponse.redirect(new URL("/admin", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/delivery/:path*"] };
