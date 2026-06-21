"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type SessionUser = { id: string; email: string; name?: string; role: string } | null;

/** Layout + role gate for the agent portal. Allows role "agent" or "admin". */
export function AgentShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | undefined>(undefined);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null));
  }, []);

  if (user === undefined) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 text-sm">Loading…</div>;
  }
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm text-center bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
          <h1 className="font-serif text-2xl text-gray-900 mb-2">Sign in required</h1>
          <p className="text-sm text-gray-500 mb-6">Sign in to access the agent portal.</p>
          <Link href="/login" className="inline-block px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800">Sign in</Link>
        </div>
      </div>
    );
  }
  if (user.role !== "agent" && user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm text-center bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
          <h1 className="font-serif text-2xl text-gray-900 mb-2">Agents only</h1>
          <p className="text-sm text-gray-500 mb-6">This area is for sales agents.</p>
          <Link href="/" className="inline-block px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50">← Back to store</Link>
        </div>
      </div>
    );
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 bg-gray-900 text-white">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/agent" className="font-serif text-lg tracking-tight">Claudia.C · Agent</Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-white/70 hidden sm:inline">{user.name || user.email}</span>
            <button type="button" onClick={handleLogout} className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-xs">Log out</button>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
