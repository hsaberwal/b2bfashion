import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAdmin } from "@/lib/requireAdmin";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Session } from "@/models/Session";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { calculateOrderTotal, sumPayments, calculateOutstanding } from "@/lib/pricing";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";

/** GET /api/admin/agents/[id] — agent profile + assigned customers with outstanding balances. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid agent ID" }, { status: 400 });
    }
    await connectDB();
    const agent = await User.findById(id).select("email name role active emailVerified createdAt").lean();
    if (!agent || (agent as unknown as { role?: string }).role !== "agent") {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const customers = await User.find({ agentId: id, role: "customer" })
      .select("email name companyName createdAt")
      .sort({ createdAt: -1 })
      .lean();
    const customerIds = customers.map((c) => (c as unknown as { _id: unknown })._id);

    // Per-customer outstanding, computed the same way as the customer detail page.
    const orders = await Order.find({ userId: { $in: customerIds }, status: { $nin: ["pending", "cancelled"] } })
      .select("userId items")
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
    const outstandingByCustomer = new Map<string, number>();
    for (const o of orders) {
      const oid = String((o as unknown as { _id: unknown })._id);
      const uid = String((o as unknown as { userId: unknown }).userId);
      const items = (o as unknown as { items?: { pricePerPiece?: number; pricePerPack?: number; quantity: number; cancelled?: boolean }[] }).items ?? [];
      const outstanding = calculateOutstanding(calculateOrderTotal(items), sumPayments(paymentsByOrder.get(oid) ?? []));
      outstandingByCustomer.set(uid, (outstandingByCustomer.get(uid) ?? 0) + outstanding);
    }

    const a = agent as unknown as { _id: unknown; email: string; name?: string; active?: boolean; emailVerified?: boolean; createdAt: Date };
    return NextResponse.json({
      id: String(a._id),
      email: a.email,
      name: a.name,
      active: a.active ?? true,
      emailVerified: a.emailVerified ?? false,
      createdAt: a.createdAt,
      customers: customers.map((c) => {
        const cid = String((c as unknown as { _id: unknown })._id);
        return {
          id: cid,
          email: c.email,
          name: c.name,
          companyName: c.companyName,
          outstanding: Math.round((outstandingByCustomer.get(cid) ?? 0) * 100) / 100,
          createdAt: c.createdAt,
        };
      }),
    });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    console.error("agent detail error:", e);
    return NextResponse.json({ error: "Failed to load agent" }, { status: 500 });
  }
}

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  active: z.boolean().optional(),
});

/** PATCH /api/admin/agents/[id] — rename or (de)activate an agent (admin only). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await requireAdmin();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid agent ID" }, { status: 400 });
    }
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    await connectDB();
    const agent = await User.findById(id);
    if (!agent || agent.role !== "agent") {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    if (parsed.data.name !== undefined) agent.name = parsed.data.name;
    if (parsed.data.active !== undefined) {
      agent.active = parsed.data.active;
      // Deactivating an agent kills their live sessions so they're logged out.
      if (!parsed.data.active) await Session.deleteMany({ userId: agent._id });
    }
    await agent.save();
    await audit({
      action: "agent_updated",
      userId: sessionUser.id,
      targetType: "user",
      targetId: id,
      ip: getClientIp(request),
      details: { name: parsed.data.name, active: parsed.data.active },
    });
    return NextResponse.json({ id: agent._id.toString(), name: agent.name, active: agent.active });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    console.error("update agent error:", e);
    return NextResponse.json({ error: "Failed to update agent" }, { status: 500 });
  }
}

/** DELETE /api/admin/agents/[id] — unassign their customers, end sessions, delete the agent. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await requireAdmin();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid agent ID" }, { status: 400 });
    }
    await connectDB();
    const agent = await User.findById(id);
    if (!agent || agent.role !== "agent") {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    // Orphan the agent's customers (keep the customers; past orders retain agentId for history).
    await User.updateMany({ agentId: agent._id }, { $unset: { agentId: 1 } });
    await Session.deleteMany({ userId: agent._id });
    await User.deleteOne({ _id: agent._id });
    await audit({
      action: "agent_deleted",
      userId: sessionUser.id,
      targetType: "user",
      targetId: id,
      ip: getClientIp(request),
      details: { email: agent.email },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    console.error("delete agent error:", e);
    return NextResponse.json({ error: "Failed to delete agent" }, { status: 500 });
  }
}
