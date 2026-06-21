"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type SessionUser = { id?: string; email?: string; name?: string; role?: string } | null;

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  match: (path: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/admin",
    label: "Home",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10" />
      </svg>
    ),
    match: (p) => p === "/admin",
  },
  {
    href: "/admin/products",
    label: "Products",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    ),
    match: (p) => p.startsWith("/admin/products"),
  },
  {
    href: "/admin/orders",
    label: "Orders",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
    ),
    match: (p) => p.startsWith("/admin/orders"),
  },
  {
    href: "/admin/users",
    label: "Customers",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    match: (p) => p.startsWith("/admin/users"),
  },
  {
    href: "/admin/pages",
    label: "Pages",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="15" y2="17" />
      </svg>
    ),
    match: (p) => p.startsWith("/admin/pages"),
  },
  {
    href: "/admin/agents",
    label: "Agents",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    match: (p) => p.startsWith("/admin/agents"),
  },
  {
    href: "/admin/banners",
    label: "Banners",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="8.5" cy="10" r="1.5" />
        <path d="M21 15l-5-5-6 6" />
      </svg>
    ),
    match: (p) => p.startsWith("/admin/banners"),
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
    match: (p) => p.startsWith("/admin/settings"),
  },
];

const SECONDARY_NAV: { href: string; label: string }[] = [
  { href: "/admin/products/import", label: "Bulk import" },
  { href: "/admin/products/new", label: "Add product" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [user, setUser] = useState<SessionUser>(undefined as unknown as SessionUser);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null));
  }, []);

  // Close drawer on navigation
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Loading
  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 text-sm">
        Loading…
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm text-center bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
          <h1 className="font-serif text-2xl text-gray-900 mb-2">Sign in required</h1>
          <p className="text-sm text-gray-500 mb-6">You need to sign in to access the admin area.</p>
          <Link href="/login" className="inline-block px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  // Not admin
  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm text-center bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
          <h1 className="font-serif text-2xl text-gray-900 mb-2">Admin only</h1>
          <p className="text-sm text-gray-500 mb-6">You need an admin account to view this page.</p>
          <Link href="/" className="inline-block px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">
            ← Back to store
          </Link>
        </div>
      </div>
    );
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  const initials = (user.name?.[0] ?? user.email?.[0] ?? "A").toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-gray-200 sticky top-0 h-screen">
        <SidebarContent pathname={pathname} initials={initials} user={user} onLogout={handleLogout} />
      </aside>

      {/* Sidebar — mobile drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col shadow-xl">
            <SidebarContent pathname={pathname} initials={initials} user={user} onLogout={handleLogout} />
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between gap-3 px-4 md:px-6 h-14">
            <button
              type="button"
              className="lg:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="lg:hidden font-serif text-lg text-gray-900">Claudia.C Admin</div>

            <div className="hidden lg:flex items-center gap-2">
              {SECONDARY_NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="text-sm text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
                >
                  {n.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-gray-600 hover:text-gray-900 px-2.5 sm:px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 whitespace-nowrap"
                aria-label="View store"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                <span>View store</span>
              </Link>
              <div className="w-8 h-8 rounded-full bg-gray-900 text-white text-sm flex items-center justify-center font-semibold">
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({
  pathname,
  initials,
  user,
  onLogout,
}: {
  pathname: string;
  initials: string;
  user: NonNullable<SessionUser>;
  onLogout: () => void;
}) {
  return (
    <>
      {/* Brand */}
      <div className="h-14 px-4 flex items-center border-b border-gray-200">
        <Link href="/admin" className="font-serif text-lg text-gray-900 tracking-tight">
          Claudia.C
        </Link>
        <span className="ml-2 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">
          Admin
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-gray-900 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span className={active ? "text-white" : "text-gray-500"}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-gray-200">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="w-8 h-8 rounded-full bg-gray-900 text-white text-sm flex items-center justify-center font-semibold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user.name || user.email?.split("@")[0] || "Admin"}
            </p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="mt-1 w-full text-left text-xs text-gray-500 hover:text-gray-900 px-2 py-1.5 rounded hover:bg-gray-100"
        >
          Sign out
        </button>
      </div>
    </>
  );
}
