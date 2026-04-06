"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getGuestCartCount } from "@/lib/guestCart";

type User = {
  name?: string;
  role?: string;
};

export function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Check auth
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => {})
      .finally(() => setLoaded(true));

    // Guest cart count
    setCartCount(getGuestCartCount());

    // Listen for storage changes (guest cart updates from other tabs/pages)
    const handleStorage = () => setCartCount(getGuestCartCount());
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Re-check cart count periodically (for same-tab updates)
  useEffect(() => {
    const interval = setInterval(() => {
      setCartCount(getGuestCartCount());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // If logged in, fetch server cart count
  useEffect(() => {
    if (!user) return;
    fetch("/api/orders")
      .then((r) => r.json())
      .then((d) => {
        const cart = d.cart;
        if (cart?.items?.length) {
          setCartCount(cart.items.reduce((sum: number, i: { quantity: number }) => sum + i.quantity, 0));
        }
      })
      .catch(() => {});
  }, [user]);

  if (!loaded) return null;

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-je-border">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Logo */}
        <Link href="/" className="text-lg font-serif text-je-black tracking-tight">
          Claudia
        </Link>

        {/* Center links */}
        <div className="hidden md:flex items-center gap-8">
          <Link
            href="/products"
            className="text-[11px] uppercase tracking-widest text-je-muted hover:text-je-black transition-colors font-medium"
          >
            Shop
          </Link>
          {user?.role === "admin" && (
            <Link
              href="/admin/products"
              className="text-[11px] uppercase tracking-widest text-je-muted hover:text-je-black transition-colors font-medium"
            >
              Admin
            </Link>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Cart */}
          <Link href="/cart" className="relative p-1 text-je-charcoal hover:text-je-black transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-je-black text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {cartCount > 99 ? "99" : cartCount}
              </span>
            )}
          </Link>

          {/* Account / Login */}
          {user ? (
            <Link
              href="/account"
              className="text-[11px] uppercase tracking-widest text-je-muted hover:text-je-black transition-colors font-medium"
            >
              Account
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-[11px] uppercase tracking-widest text-je-muted hover:text-je-black transition-colors font-medium"
            >
              Log in
            </Link>
          )}

          {/* Mobile menu */}
          <Link
            href="/products"
            className="md:hidden text-[11px] uppercase tracking-widest text-je-muted hover:text-je-black transition-colors font-medium"
          >
            Shop
          </Link>
        </div>
      </div>
    </nav>
  );
}
