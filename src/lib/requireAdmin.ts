import { connectDB } from "@/lib/mongodb";
import { Session } from "@/models/Session";
import { User } from "@/models/User";
import { getSessionToken } from "@/lib/auth";

export type SessionUser = {
  id: string;
  email: string;
  name?: string;
  companyName?: string;
  role: "customer" | "admin" | "agent";
  pricingApproved: boolean;
  canViewForwardStock: boolean;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = await getSessionToken();
  if (!token) return null;
  await connectDB();
  const session = await Session.findOne({ token, expiresAt: { $gt: new Date() } });
  if (!session) return null;
  const user = await User.findById(session.userId).select("email name companyName role pricingApproved canViewForwardStock");
  if (!user) return null;
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    companyName: user.companyName,
    role: (user.role as "customer" | "admin" | "agent") ?? "customer",
    pricingApproved: user.pricingApproved ?? false,
    canViewForwardStock: user.canViewForwardStock ?? user.role === "admin",
  };
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    const err = new Error("Unauthorized");
    (err as Error & { status?: number }).status = 401;
    throw err;
  }
  if (user.role !== "admin") {
    const err = new Error("Forbidden: admin only");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
  return user;
}

/**
 * Require a logged-in **agent** (field sales rep) OR an admin. Admins pass so
 * they can exercise/QA agent endpoints. Throws a `.status`-tagged error (401 no
 * session, 403 wrong role) just like `requireAdmin`.
 */
export async function requireAgent(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    const err = new Error("Unauthorized");
    (err as Error & { status?: number }).status = 401;
    throw err;
  }
  if (user.role !== "agent" && user.role !== "admin") {
    const err = new Error("Forbidden: agents only");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
  return user;
}
