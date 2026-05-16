import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Session } from "@/models/Session";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { calculateOrderTotal, sumPayments, calculateOutstanding } from "@/lib/pricing";
import mongoose from "mongoose";
import { z } from "zod";

/** GET /api/admin/users/[id] — full customer profile + order history + balance. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }
    await connectDB();
    const user = await User.findById(id).lean();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const orders = await Order.find({ userId: id, status: { $ne: "pending" } })
      .sort({ createdAt: -1 })
      .lean();
    const orderIds = orders.map((o) => (o as unknown as { _id: unknown })._id);
    const payments = await Payment.find({ orderId: { $in: orderIds } }).select("orderId amount refunded").lean();
    const paymentsByOrder = new Map<string, { amount: number; refunded?: boolean }[]>();
    for (const p of payments) {
      const key = String((p as unknown as { orderId: unknown }).orderId);
      const arr = paymentsByOrder.get(key) ?? [];
      arr.push({ amount: (p as unknown as { amount: number }).amount, refunded: (p as unknown as { refunded?: boolean }).refunded });
      paymentsByOrder.set(key, arr);
    }

    let lifetimeSpend = 0;
    let totalOutstanding = 0;
    const orderList = orders.map((o) => {
      const oid = String((o as unknown as { _id: unknown })._id);
      const items = (o as unknown as { items?: { pricePerPiece?: number; pricePerPack?: number; quantity: number }[] }).items ?? [];
      const total = calculateOrderTotal(items);
      const paid = sumPayments(paymentsByOrder.get(oid) ?? []);
      const outstanding = calculateOutstanding(total, paid);
      lifetimeSpend += paid;
      if ((o as unknown as { status: string }).status !== "cancelled") totalOutstanding += outstanding;
      return {
        id: oid,
        shortCode: oid.slice(-8),
        createdAt: (o as unknown as { createdAt: Date }).createdAt,
        signedAt: (o as unknown as { signedAt?: Date }).signedAt,
        status: (o as unknown as { status: string }).status,
        paymentStatus: (o as unknown as { paymentStatus: string }).paymentStatus,
        paymentOption: (o as unknown as { paymentOption: string }).paymentOption,
        total,
        paid,
        outstanding,
      };
    });

    const u = user as unknown as {
      _id: unknown;
      email: string;
      name?: string;
      companyName?: string;
      vatNumber?: string;
      role?: string;
      pricingApproved?: boolean;
      canViewForwardStock?: boolean;
      canViewCurrentStock?: boolean;
      canViewPreviousStock?: boolean;
      emailVerified?: boolean;
      deliveryAddress?: Record<string, string>;
      applicationMessage?: string;
      stripeCustomerId?: string;
      createdAt: Date;
    };

    return NextResponse.json({
      id: String(u._id),
      email: u.email,
      name: u.name,
      companyName: u.companyName,
      vatNumber: u.vatNumber,
      role: u.role ?? "customer",
      pricingApproved: u.pricingApproved ?? false,
      canViewForwardStock: u.canViewForwardStock ?? false,
      canViewCurrentStock: u.canViewCurrentStock ?? true,
      canViewPreviousStock: u.canViewPreviousStock ?? true,
      emailVerified: u.emailVerified ?? false,
      deliveryAddress: u.deliveryAddress ?? null,
      applicationMessage: u.applicationMessage,
      stripeCustomerId: u.stripeCustomerId,
      createdAt: u.createdAt,
      orders: orderList,
      lifetimeSpend,
      totalOutstanding,
      orderCount: orderList.length,
    });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    console.error("admin user detail error:", e);
    return NextResponse.json({ error: "Failed to load user" }, { status: 500 });
  }
}

const updateSchema = z.object({
  pricingApproved: z.boolean().optional(),
  canViewForwardStock: z.boolean().optional(),
  canViewCurrentStock: z.boolean().optional(),
  canViewPreviousStock: z.boolean().optional(),
  role: z.enum(["customer", "admin"]).optional(),
  emailVerified: z.boolean().optional(),
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
    if (parsed.data.emailVerified !== undefined) {
      user.emailVerified = parsed.data.emailVerified;
      if (parsed.data.emailVerified) {
        user.verificationToken = undefined;
      }
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
      emailVerified: user.emailVerified ?? false,
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
