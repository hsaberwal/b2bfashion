import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import mongoose from "mongoose";
import { z } from "zod";

const updateSchema = z.object({
  pricingApproved: z.boolean().optional(),
  canViewForwardStock: z.boolean().optional(),
});

/** PATCH /api/admin/users/[id] — update user permissions (admin only). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    await connectDB();
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (parsed.data.pricingApproved !== undefined) {
      user.pricingApproved = parsed.data.pricingApproved;
    }
    if (parsed.data.canViewForwardStock !== undefined) {
      user.canViewForwardStock = parsed.data.canViewForwardStock;
    }
    await user.save();
    return NextResponse.json({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      companyName: user.companyName,
      role: user.role ?? "customer",
      pricingApproved: user.pricingApproved,
      canViewForwardStock: user.canViewForwardStock ?? user.role === "admin",
    });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    console.error(e);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
