import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Session } from "@/models/Session";
import { Order } from "@/models/Order";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import mongoose from "mongoose";
import { z } from "zod";

const updateSchema = z.object({
  pricingApproved: z.boolean().optional(),
  canViewForwardStock: z.boolean().optional(),
  canViewCurrentStock: z.boolean().optional(),
  canViewPreviousStock: z.boolean().optional(),
  role: z.enum(["customer", "admin"]).optional(),
});

/** PATCH /api/admin/users/[id] — update user permissions (admin only). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await requireAdmin();
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
    if (parsed.data.canViewCurrentStock !== undefined) {
      user.canViewCurrentStock = parsed.data.canViewCurrentStock;
    }
    if (parsed.data.canViewPreviousStock !== undefined) {
      user.canViewPreviousStock = parsed.data.canViewPreviousStock;
    }
    if (parsed.data.role !== undefined) {
      if (id === sessionUser.id) {
        return NextResponse.json(
          { error: "You cannot change your own role" },
          { status: 400 }
        );
      }
      user.role = parsed.data.role;
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
      canViewCurrentStock: user.canViewCurrentStock ?? true,
      canViewPreviousStock: user.canViewPreviousStock ?? true,
    });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    console.error(e);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

/** DELETE /api/admin/users/[id] — delete a user and their sessions/orders (admin only). */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await requireAdmin();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }
    if (id === sessionUser.id) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    }
    await connectDB();
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete all sessions for this user
    await Session.deleteMany({ userId: id });
    // Delete all pending orders (keep signed/confirmed for records)
    await Order.deleteMany({ userId: id, status: "pending" });
    // Delete the user
    await User.deleteOne({ _id: id });

    await audit({
      action: "admin_action",
      userId: sessionUser.id,
      userEmail: sessionUser.email,
      targetType: "user",
      targetId: id,
      ip: getClientIp(request),
      details: { action: "delete_user", deletedEmail: user.email },
    });

    return NextResponse.json({ ok: true, message: `User ${user.email} deleted` });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    console.error(e);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
