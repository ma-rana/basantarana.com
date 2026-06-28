// middleware.ts — hostname-based routing for the admin subdomain.
// Public site and admin live in ONE Next.js app; this splits them by Host.
//
//   admin.basantarana.com/foo   →  rewrites to  /admin/foo  (internally)
//   basantarana.com/foo         →  served as-is (public)
//
// The URL in the browser stays clean (admin.basantarana.com/projects); the
// rewrite is internal. Put your real /admin route group under app/admin/.
//
// IMPORTANT: this is ROUTING, not AUTH. The /admin routes must STILL check the
// session on every request (in a layout/server action). The subdomain just
// decides which routes render — it does not authenticate anyone.
// (CVE-2025-29927: never treat middleware as the auth boundary.)

import { NextRequest, NextResponse } from "next/server";

const ADMIN_HOST = "admin.basantarana.com";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const url = req.nextUrl;

  // Strip any port (e.g. localhost:3000) for a clean compare.
  const hostname = host.split(":")[0];

  const isAdminHost =
    hostname === ADMIN_HOST ||
    // local dev convenience: admin.localhost
    hostname === "admin.localhost";

  if (isAdminHost) {
    // API routes must be served at their literal path on both hosts — do NOT
    // rewrite them. Without this, /api/media/upload on the admin host becomes
    // /admin/api/media/upload, which doesn't exist (405).
    if (url.pathname.startsWith("/api/")) {
      return NextResponse.next();
    }
    // Avoid double-prefixing if the path already starts with /admin.
    if (!url.pathname.startsWith("/admin")) {
      url.pathname = `/admin${url.pathname}`;
    }
    return NextResponse.rewrite(url);
  }

  // If someone hits /admin on the PUBLIC host, hide it (404) so the admin tree
  // is only reachable via the admin subdomain.
  if (url.pathname.startsWith("/admin")) {
    return new NextResponse("Not found", { status: 404 });
  }

  return NextResponse.next();
}

// Don't run middleware on static assets / Next internals.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
