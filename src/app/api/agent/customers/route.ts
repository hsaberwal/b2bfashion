import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAgent } from "@/lib/requireAdmin";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { hashPassword } from "@/lib/auth";
import { nanoid } from "nanoid";
import { calculateOrderTotal, sumPayments, calculateOutstanding } from "@/lib/pricing";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import mongoose from "mongoose";

/** GET /api/agent/customers — the agent's assigned customers, each with outstanding balance. */
export async function GET() {
  try {
    const agent = await requireAgent();
    await connectDB();
    // Admins acting as an agent would have no assigned customers; this list is per-agent.
    const customers = await User.find({ agentId: agent.id, role: "customer" })
      .select("email name companyName createdAt")
      .sort({ createdAt: -1 })
      .lean();
    const customerIds = customers.map((c) => (c as unknown as { _id: unknown })._id);

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

    return NextResponse.json({
      customers: customers.map((c) => {
        const cid = String((c as unknown as { _id: unknown })._id);
        return {
          id: cid,
          email: c.email,
          name: c.name,
          companyName: c.companyName,
          outstanding: Math.round((outstandingByCustomer.get(cid) ?? 0) * 100) / 100,
        };
      }),
    });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: "Forbidden: agents only" }, { status: 403 });
    console.error("agent customers list error:", e);
    return NextResponse.json({ error: "Failed to load customers" }, { status: 500 });
  }
}

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().max(120).optional(),
  companyName: z.string().max(200).optional(),
});

/** POST /api/agent/customers — add a customer record linked to this agent (no login until invited/reset). */
export async function POST(request: NextRequest) {
  try {
    const agent = await requireAgent();
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "A valid email is required", details: parsed.error.flatten() }, { status: 400 });
    }
    const email = parsed.data.email.trim().toLowerCase();
    await connectDB();
    if (await User.findOne({ email }).select("_id").lean()) {
      return NextResponse.json({ error: "A user with that email already exists." }, { status: 409 });
    }
    const customer = await User.create({
      email,
      name: parsed.data.name?.trim(),
      companyName: parsed.data.companyName?.trim(),
      role: "customer",
      agentId: new mongoose.Types.ObjectId(agent.id),
      pricingApproved: false, // admin still controls storefront pricing; agent orders price regardless
      emailVerified: true,
      passwordHash: await hashPassword(nanoid(40)),
    });
    await audit({
      action: "customer_assigned_agent",
      userId: agent.id,
      targetType: "user",
      targetId: customer._id.toString(),
      ip: getClientIp(request),
      details: { createdByAgent: true, email },
    });
    return NextResponse.json({ id: customer._id.toString(), email, name: parsed.data.name, companyName: parsed.data.companyName, outstanding: 0 }, { status: 201 });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: "Forbidden: agents only" }, { status: 403 });
    console.error("agent create customer error:", e);
    return NextResponse.json({ error: "Failed to add customer" }, { status: 500 });
  }
}
