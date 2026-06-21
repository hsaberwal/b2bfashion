import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

/** GET /api/admin/users — list all users (admin only). */
export async function GET() {
  try {
    await requireAdmin();
    await connectDB();
    const users = await User.find({})
      .select("email name companyName role pricingApproved canViewForwardStock canViewCurrentStock canViewPreviousStock applicationMessage emailVerified deliveryAddress vatNumber agentId createdAt")
      .sort({ createdAt: -1 })
      .lean();

    // Resolve assigned-agent names in one pass for display.
    const agentIds = [...new Set(users.map((u) => u.agentId).filter(Boolean).map(String))];
    const agents = agentIds.length
      ? await User.find({ _id: { $in: agentIds } }).select("name email").lean()
      : [];
    const agentById = new Map(agents.map((a) => [String(a._id), (a.name as string) || (a.email as string)]));

    return NextResponse.json({
      users: users.map((u) => ({
        id: String(u._id),
        email: u.email,
        name: u.name,
        companyName: u.companyName,
        role: u.role ?? "customer",
        pricingApproved: u.pricingApproved ?? false,
        canViewForwardStock: u.canViewForwardStock ?? u.role === "admin",
        canViewCurrentStock: u.canViewCurrentStock ?? true,
        canViewPreviousStock: u.canViewPreviousStock ?? true,
        applicationMessage: u.applicationMessage ?? undefined,
        emailVerified: u.emailVerified ?? false,
        deliveryAddress: u.deliveryAddress ?? undefined,
        vatNumber: u.vatNumber ?? undefined,
        agentId: u.agentId ? String(u.agentId) : undefined,
        agentName: u.agentId ? agentById.get(String(u.agentId)) : undefined,
        createdAt: u.createdAt,
      })),
    });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    console.error(e);
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
  }
}
