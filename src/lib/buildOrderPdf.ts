import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { Product } from "@/models/Product";
import { User } from "@/models/User";
import { calculateOrderTotal, sumCredited, sumPayments } from "@/lib/pricing";
import { decrypt } from "@/lib/encrypt";
import { generateOrderPdf, type OrderPdfItem } from "@/lib/orderPdf";

export type BuiltOrderPdf = {
  buffer: Buffer;
  shortCode: string;
  filename: string;
  customerEmail?: string;
  customerName?: string;
};

type OrderItemDoc = {
  productId: mongoose.Types.ObjectId;
  sku: string;
  quantity: number;
  pricePerPiece?: number;
  pricePerPack?: number;
  packSize?: number;
  size?: string;
  cancelled?: boolean;
  creditAmount?: number;
  creditType?: "balance" | "refund";
  refundStatus?: "none" | "owed" | "refunded";
};

/**
 * Load an order and its related product/customer data, then render the per-order
 * sales sheet (which doubles as the packing list). Shared by the admin PDF
 * download route and the automated order emails so both produce an identical
 * document (including the customer's signature drawn on the signature line).
 *
 * With `{ invoice: true }` the document is titled INVOICE and a payment summary
 * (paid / credited / refund owed / balance due) is shown — used after a pack is
 * removed from an order. Cancelled lines are always excluded from the table.
 *
 * Returns null if the order does not exist.
 */
export async function buildOrderPdf(
  orderId: string,
  opts: { invoice?: boolean } = {},
): Promise<BuiltOrderPdf | null> {
  if (!mongoose.Types.ObjectId.isValid(orderId)) return null;
  await connectDB();
  const order = await Order.findById(orderId).lean();
  if (!order) return null;

  const o = order as unknown as {
    _id: unknown;
    userId: unknown;
    signedAt?: Date;
    signatureDataUrl?: string;
    specialInstructions?: string;
    refundedTotal?: number;
    items?: OrderItemDoc[];
    deliverySnapshot?: Record<string, string>;
  };

  const items = o.items ?? [];
  const activeItems = items.filter((i) => !i.cancelled);

  const [user, products, payments] = await Promise.all([
    User.findById(o.userId).select("email name companyName vatNumber").lean(),
    Product.find({ _id: { $in: activeItems.map((i) => i.productId) } })
      .select("sku name colour sizes sizeRatio packSize")
      .lean(),
    opts.invoice ? Payment.find({ orderId: o._id }).select("amount refunded").lean() : Promise.resolve([]),
  ]);

  const productById = new Map<string, { sku: string; name: string; colour?: string; sizes?: string[]; sizeRatio?: number[]; packSize?: number }>();
  for (const p of products) {
    productById.set(String((p as unknown as { _id: unknown })._id), p as unknown as {
      sku: string; name: string; colour?: string; sizes?: string[]; sizeRatio?: number[]; packSize?: number;
    });
  }

  const pdfItems: OrderPdfItem[] = activeItems.map((i) => {
    const p = productById.get(String(i.productId));
    return {
      sku: i.sku,
      productName: p?.name ?? i.sku,
      colour: p?.colour,
      quantity: i.quantity,
      packSize: i.packSize ?? p?.packSize ?? 1,
      sizes: p?.sizes,
      sizeRatio: p?.sizeRatio,
      // Legacy docs may still hold `pricePerPack`; treat it as per-piece (the historical value).
      pricePerPiece: i.pricePerPiece ?? i.pricePerPack,
    };
  });

  const u = user as unknown as { name?: string; companyName?: string; email?: string; vatNumber?: string } | null;
  const shortCode = String(o._id).slice(-8);

  // The signature is stored encrypted at rest; decrypt it so PDFKit can draw it.
  const signatureImage = o.signatureDataUrl ? decrypt(o.signatureDataUrl) : null;

  const remainingTotal = calculateOrderTotal(items);

  let invoiceSummary: { paid: number; credited: number; refundOwed: number; balanceDue: number } | null = null;
  if (opts.invoice) {
    const paid = Math.round((sumPayments(payments as { amount: number; refunded?: boolean }[]) - (o.refundedTotal ?? 0)) * 100) / 100;
    const credited = sumCredited(items);
    const refundOwed = Math.round(
      items.reduce((s, i) => (i.cancelled && i.creditType === "refund" && i.refundStatus === "owed" ? s + (i.creditAmount ?? 0) : s), 0) * 100,
    ) / 100;
    const balanceDue = Math.max(0, Math.round((remainingTotal - (paid - credited)) * 100) / 100);
    invoiceSummary = { paid, credited, refundOwed, balanceDue };
  }

  const buffer = await generateOrderPdf({
    shortCode,
    signedAt: o.signedAt ?? null,
    customer: u ? {
      name: u.name,
      companyName: u.companyName,
      email: u.email,
      vatNumber: u.vatNumber,
    } : null,
    deliverySnapshot: o.deliverySnapshot ?? null,
    specialInstructions: o.specialInstructions ?? null,
    items: pdfItems,
    total: remainingTotal,
    signatureImage,
    isInvoice: opts.invoice ?? false,
    invoiceSummary,
  });

  return {
    buffer,
    shortCode,
    filename: `${opts.invoice ? "invoice" : "order"}-${shortCode}.pdf`,
    customerEmail: u?.email,
    customerName: u?.name,
  };
}
