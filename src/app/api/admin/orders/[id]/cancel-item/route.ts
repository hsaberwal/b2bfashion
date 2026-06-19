import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAdmin } from "@/lib/requireAdmin";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { User } from "@/models/User";
import { Payment } from "@/models/Payment";
import { lineValue, sumPayments, sumCredited } from "@/lib/pricing";
import { buildOrderPdf } from "@/lib/buildOrderPdf";
import { sendItemRemovedEmail } from "@/lib/adminNotifications";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

const bodySchema = z.object({
  itemId: z.string().min(1),
  creditType: z.enum(["balance", "refund"]),
  reason: z.string().max(500).optional(),
});

// Statuses where the reserved stock has already been consumed from packsInStock.
const CONSUMED_STATUSES = ["confirmed", "picked", "ready_to_ship", "shipped", "delivered"];

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * POST /api/admin/orders/[id]/cancel-item — remove a single pack (line item)
 * from an otherwise-live order. Releases the stock, records a credit (added to
 * the customer's balance or marked as a refund owed), emails the customer + the
 * admin team a revised invoice, and audits the change.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const { itemId, creditType, reason } = parsed.data;

    await connectDB();
    const order = await Order.findById(id);
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.status === "pending" || order.status === "cancelled") {
      return NextResponse.json({ error: "This order is not active." }, { status: 400 });
    }

    const item = order.items.id(itemId);
    if (!item) return NextResponse.json({ error: "Line item not found" }, { status: 404 });
    if (item.cancelled) return NextResponse.json({ error: "That pack has already been removed." }, { status: 400 });

    // Credit is capped at what the customer has actually paid, net of any prior
    // credits/refunds — never credit more than they've handed over.
    const payments = (await Payment.find({ orderId: order._id }).select("amount refunded").lean()) as unknown as { amount: number; refunded?: boolean }[];
    const paid = round(sumPayments(payments) - (order.refundedTotal ?? 0));
    const alreadyCredited = sumCredited(order.items);
    const value = lineValue(item);
    const creditAmount = Math.max(0, Math.min(value, round(paid - alreadyCredited)));

    // Release stock: reservations for signed orders, physical stock for orders
    // whose stock has already been consumed.
    const packs = Math.floor(item.quantity / (item.packSize ?? 1));
    if (packs > 0) {
      if (order.status === "signed") {
        await Product.updateOne({ _id: item.productId }, { $inc: { packsReserved: -packs } }).catch(() => {});
      } else if (CONSUMED_STATUSES.includes(order.status)) {
        await Product.updateOne({ _id: item.productId }, { $inc: { packsInStock: packs } }).catch(() => {});
      }
    }

    item.cancelled = true;
    item.cancelledAt = new Date();
    if (reason) item.cancelledReason = reason;
    item.creditAmount = creditAmount;
    if (creditAmount > 0) {
      item.creditType = creditType;
      item.refundStatus = creditType === "refund" ? "owed" : "none";
    } else {
      item.creditType = undefined;
      item.refundStatus = "none";
    }

    // If every line is now cancelled, the order itself is cancelled.
    const allCancelled = order.items.every((i: { cancelled?: boolean }) => i.cancelled);
    if (allCancelled) order.status = "cancelled";

    await order.save();

    if (creditAmount > 0 && creditType === "balance") {
      await User.updateOne({ _id: order.userId }, { $inc: { creditBalance: creditAmount } });
    }

    await audit({
      action: "order_item_cancelled",
      userId: admin.id,
      targetType: "order",
      targetId: id,
      ip: getClientIp(request),
      details: { itemId, sku: item.sku, creditAmount, creditType, allCancelled },
    });

    // Build the revised invoice and email it to the customer + admin team.
    const removedDescription = `${item.sku}${packs > 0 ? ` — ${packs} pack${packs === 1 ? "" : "s"}` : ""}`;
    (async () => {
      const built = await buildOrderPdf(id, { invoice: true }).catch((err) => {
        console.error("buildOrderPdf (invoice) failed:", err);
        return null;
      });
      await sendItemRemovedEmail({
        customerEmail: built?.customerEmail,
        customerName: built?.customerName,
        orderShortCode: order._id.toString().slice(-8),
        removedDescription,
        creditType: creditAmount > 0 ? creditType : undefined,
        creditAmount,
        summary: await invoiceSummary(order, payments),
        attachment: built ? { filename: built.filename, content: built.buffer } : undefined,
      });
    })().catch((err) => console.error("item-removed email failed:", err));

    return NextResponse.json({ ok: true, creditAmount, creditType: creditAmount > 0 ? creditType : null });
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 401) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
    console.error("cancel-item error:", e);
    return NextResponse.json({ error: "Failed to remove pack" }, { status: 500 });
  }
}

/** Recompute the paid/credited/refund-owed/balance summary from the saved order. */
async function invoiceSummary(
  order: { items: { cancelled?: boolean; creditAmount?: number; creditType?: string; refundStatus?: string }[]; refundedTotal?: number },
  payments: { amount: number; refunded?: boolean }[],
) {
  const { calculateOrderTotal } = await import("@/lib/pricing");
  const remainingTotal = calculateOrderTotal(order.items as { pricePerPiece?: number; quantity: number; cancelled?: boolean }[]);
  const paid = round(sumPayments(payments) - (order.refundedTotal ?? 0));
  const credited = sumCredited(order.items as { cancelled?: boolean; creditAmount?: number; quantity: number }[]);
  const refundOwed = round(
    order.items.reduce((s, i) => (i.cancelled && i.creditType === "refund" && i.refundStatus === "owed" ? s + (i.creditAmount ?? 0) : s), 0),
  );
  const balanceDue = Math.max(0, round(remainingTotal - (paid - credited)));
  return { paid, credited, refundOwed, balanceDue };
}
