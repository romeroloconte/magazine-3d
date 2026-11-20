import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, isValidToken } from "@/lib/auth";

/* Everything under /admin requires a session, except the login screen. */
export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/admin/login") return NextResponse.next();
  if (await isValidToken(req.cookies.get(COOKIE)?.value)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
