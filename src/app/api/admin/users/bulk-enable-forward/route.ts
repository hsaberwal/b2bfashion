import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

/** POST /api/admin/users/bulk-enable-forward — set canViewForwardStock = true for all customers (admin only). */
export async function POST() {
  try {
    await requireAdmin();
    await connectDB();
    const result = await User.updateMany(
      { role: { $ne: "admin" } },
      { $set: { canViewForwardStock: true } }
    );
    return NextResponse.json({
      ok: true,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
    });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    console.error(e);
    return NextResponse.json({ error: "Failed to update users" }, { status: 500 });
  }
}
