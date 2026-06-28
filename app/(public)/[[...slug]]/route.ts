// app/(public)/[[...slug]]/route.ts
//
// The PUBLIC site, served as a Route Handler (not a React page). The engine
// produces a COMPLETE HTML document from the active theme, so we return it
// verbatim as an HTTP response — no React root layout wrapping it, which avoids
// nesting the theme's <html> inside Next's <html>. (Themes own their whole doc.)
//
// ANY public URL (/, /about, /contact, /projects/<slug>) lands here. The admin
// lives at app/admin/... — a more specific segment that Next matches BEFORE this
// optional catch-all, so /admin is never swallowed.
//
// dangerouslySetInnerHTML isn't used; the HTML is the response body. It's
// produced by YOUR theme files via the sandboxed Liquid engine, not visitor input.

import { renderPage } from "../../lib/render-theme";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  const urlPath = "/" + (slug?.join("/") ?? "");

  // The contact handler redirects back with ?sent=1 or ?error=1.
  const url = new URL(req.url);
  const formStatus = url.searchParams.get("sent")
    ? "sent"
    : url.searchParams.get("error")
      ? "error"
      : undefined;

  const { html, status } = await renderPage(urlPath, { formStatus });

  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
