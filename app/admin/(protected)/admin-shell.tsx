"use client";

// app/admin/(protected)/admin-shell.tsx — client wrapper that provides the
// responsive nav behavior (mobile drawer toggle + active-link highlighting).
//
// The auth gate stays in layout.tsx (server). This component only owns
// presentation + interactivity: on mobile the sidebar is an off-canvas drawer
// opened by a top bar button; on tablet/desktop it's a persistent column.
// Closing on route change keeps the drawer from lingering after navigation.

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/profile", label: "Profile" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/skills", label: "Skills" },
  { href: "/admin/stats", label: "Platform stats" },
  { href: "/admin/themes", label: "Themes" },
  { href: "/admin/engagement", label: "Engagement" },
  { href: "/admin/messages", label: "Messages" },
];

// Active when the path matches exactly, or is a child route (but "/admin" only
// matches itself, never every page under it).
function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

export function AdminShell({
  userEmail,
  logoutAction,
  unreadMessages = 0,
  children,
}: {
  userEmail: string;
  logoutAction: () => void;
  unreadMessages?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="admin-shell" data-open={open}>
      {/* Mobile top bar — only visible below the sidebar breakpoint. */}
      <header className="admin-topbar">
        <button
          type="button"
          className="admin-menu-btn"
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="admin-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="admin-menu-icon" aria-hidden="true" />
          Menu
        </button>
        <span className="admin-topbar-brand">Portfolio CMS</span>
      </header>

      {/* Scrim behind the drawer (mobile only). */}
      <div
        className="admin-scrim"
        hidden={!open}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <aside className="admin-nav" id="admin-nav">
        <div className="admin-brand">Portfolio CMS</div>
        <nav aria-label="Admin sections">
          {NAV.map((item) => {
            const showBadge = item.href === "/admin/messages" && unreadMessages > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
              >
                {item.label}
                {showBadge && (
                  <span className="nav-badge" aria-label={`${unreadMessages} unread`}>
                    {unreadMessages}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <form action={logoutAction} className="admin-logout">
          <span className="admin-user">{userEmail}</span>
          <button type="submit">Sign out</button>
        </form>
      </aside>

      <main className="admin-main">{children}</main>
    </div>
  );
}
