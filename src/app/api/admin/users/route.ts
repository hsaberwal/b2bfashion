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
      .select("email name companyName role pricingApproved canViewForwardStock createdAt")
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({
      users: users.map((u) => ({
        id: String(u._id),
        email: u.email,
        name: u.name,
        companyName: u.companyName,
        role: u.role ?? "customer",
        pricingApproved: u.pricingApproved ?? false,
        canViewForwardStock: u.canViewForwardStock ?? u.role === "admin",
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
