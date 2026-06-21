import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import type { SessionUser } from "@/lib/requireAdmin";

type OwnedCustomer = { id: string; email: string; name?: string; pricingApproved?: boolean };

/**
 * Verify the session user is allowed to act on the given customer:
 *  - admins may act on any customer (override),
 *  - an agent may act only on a customer whose `agentId` is them.
 *
 * Throws a `.status`-tagged error (404 if no such customer, 403 if not theirs)
 * so route catch-blocks reuse the existing 401/403/404 pattern. Returns the
 * customer on success.
 */
export async function assertOwnsCustomer(sessionUser: SessionUser, customerId: string): Promise<OwnedCustomer> {
  await connectDB();
  const customer = await User.findById(customerId).select("email name role agentId pricingApproved").lean();
  const c = customer as unknown as { _id: unknown; email: string; name?: string; role?: string; agentId?: unknown; pricingApproved?: boolean } | null;
  if (!c || c.role !== "customer") {
    const err = new Error("Customer not found") as Error & { status?: number };
    err.status = 404;
    throw err;
  }
  if (sessionUser.role !== "admin" && String(c.agentId ?? "") !== sessionUser.id) {
    const err = new Error("Forbidden: not your customer") as Error & { status?: number };
    err.status = 403;
    throw err;
  }
  return { id: String(c._id), email: c.email, name: c.name, pricingApproved: c.pricingApproved };
}
