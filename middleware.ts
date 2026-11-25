import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-only-insecure-secret"
);

// Middleware melindungi semua halaman panel: belum login → redirect ke /login
export async function middleware(req: NextRequest) {
  const token = req.cookies.get("rtnp_session")?.value;
  let valid = false;
  if (token) {
    try {
      await jwtVerify(token, secret);
      valid = true;
    } catch {}
  }
  if (!valid) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/routers/:path*",
    "/monitoring/:path*",
    "/profiles/:path*",
    "/vouchers/:path*",
    "/pppoe/:path*",
    "/invoices/:path*",
    "/agents/:path*",
    "/reports/:path*",
    "/tickets/:path*",
    "/guide/:path*",
    "/settings/:path*",
    "/profile/:path*",
  ],
};
